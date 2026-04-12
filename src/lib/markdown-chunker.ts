import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { visit } from "unist-util-visit";
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import { fetchEmbedding } from "./ai";
import { logger } from "../utils/logger";

export interface ChunkerOptions {
  chunkSize: number;
  chunkOverlap: number;
  enableSemantic: boolean;
  semanticThreshold: number;
}

export class MarkdownChunker {
  private processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify);

  constructor(private options: ChunkerOptions) {}

  /**
   * 将 Markdown 文本切分为结构化 Chunk
   */
  async chunk(text: string, filename: string = "unknown"): Promise<string[]> {
    logger.rag.info(`🧩 [切块审计] 开始处理文件: ${filename} (长度: ${text.length} 字符)`);
    logger.rag.debug(`⚙️ [切块配置] size: ${this.options.chunkSize}, overlap: ${this.options.chunkOverlap}, semantic: ${this.options.enableSemantic}`);

    const tree = this.processor.parse(text);
    const blocks: any[] = [];
    
    // 提取顶层块节点
    // @ts-ignore
    for (const node of tree.children) {
      blocks.push(node);
    }

    logger.rag.debug(`🌳 [AST解析] 提取到 ${blocks.length} 个顶级节点`);

    const initialChunks: string[][] = [];
    let currentHeaders: string[] = [];
    let currentGroup: any[] = [];

    // 第一步：基于标题进行初步逻辑聚类
    for (const block of blocks) {
      if (block.type === 'heading') {
        if (currentGroup.length > 0) {
          initialChunks.push(this.serializeGroup(currentGroup, currentHeaders));
          currentGroup = [];
        }
        const depth = block.depth;
        const headingText = this.getNodeText(block);
        currentHeaders = currentHeaders.slice(0, depth - 1);
        currentHeaders[depth - 1] = headingText;
      }
      currentGroup.push(block);
    }
    
    if (currentGroup.length > 0) {
      initialChunks.push(this.serializeGroup(currentGroup, currentHeaders));
    }

    logger.rag.debug(`📁 [逻辑分组] 识别到 ${initialChunks.length} 个初步逻辑块`);

    // 第二步：处理超长 Chunk（细拆）
    const finalChunks: string[] = [];
    let tableSubstitutedCount = 0;
    
    for (let i = 0; i < initialChunks.length; i++) {
      const rawChunks = initialChunks[i];
      for (const chunk of rawChunks) {
        if (chunk.length <= this.options.chunkSize) {
          finalChunks.push(chunk);
        } else {
          logger.rag.debug(`⚠️ [分块过长] 逻辑块 #${i} 长度 ${chunk.length} > ${this.options.chunkSize}，触发细拆...`);
          const subChunks = await this.subSplit(chunk);
          finalChunks.push(...subChunks);
        }
        
        // 统计摘要
        if (chunk.includes('<table')) tableSubstitutedCount++;
      }
    }

    logger.rag.info(`✅ [切块完成] 产出 ${finalChunks.length} 个 Chunks (HTML表格转换: ${tableSubstitutedCount})`);
    
    // 完整输出所有分块详情以便审计
    finalChunks.forEach((chunk, index) => {
      logger.rag.debug(`📦 [分块详情] #${index + 1} (${chunk.length} 字符):\n${chunk}`);
    });

    return finalChunks;
  }

  /**
   * 序列化一组节点
   */
  private serializeGroup(nodes: any[], headers: string[]): string[] {
    const breadcrumb = headers.length > 0 ? `${headers.filter(h => !!h).join(" > ")}: \n` : "";
    
    // 如果整体能放下，直接序列化
    // 这里简单处理：将 nodes 转换回 Markdown
    const contentTree = { type: 'root', children: nodes };
    // @ts-ignore
    const mdContent = this.processor.stringify(contentTree);
    
    // 检查是否有特殊的复杂表（如跨度大的表格）需要 HTML 处理
    // 在这里我们遍历节点，如果发现是表格且很大，可以考虑单独转换
    let hasComplexTable = false;
    for (const node of nodes) {
      if (node.type === 'table' && this.options.chunkSize < 1000) { // 简单预防逻辑
        hasComplexTable = true;
        break;
      }
    }

    if (!hasComplexTable) {
        return [breadcrumb + mdContent];
    }

    // 处理带 HTML 的版本
    let processedContent = "";
    for (const node of nodes) {
      if (node.type === 'table') {
        const hast = toHast(node);
        // @ts-ignore
        processedContent += toHtml(hast) + "\n\n";
      } else {
        // @ts-ignore
        processedContent += this.processor.stringify({ type: 'root', children: [node] }) + "\n\n";
      }
    }
    return [breadcrumb + processedContent];
  }

  /**
   * 细拆逻辑：级联处理器
   * 层级：段落重组 -> 语义感知 -> 字符定长
   */
  private async subSplit(text: string): Promise<string[]> {
    // 1. 尝试按段落切分
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
      const pChunks: string[] = [];
      let buffer = "";
      
      for (const p of paragraphs) {
        if (p.length > this.options.chunkSize) {
          // 当前段落本身就超长，先清空 buffer，再对这一段进行语义细拆
          if (buffer) pChunks.push(buffer);
          const sChunks = await this.subSplit(p); // 递归调用（下一层级会处理它）
          pChunks.push(...sChunks);
          buffer = "";
        } else if (buffer.length + p.length > this.options.chunkSize && buffer) {
          pChunks.push(buffer);
          buffer = p;
        } else {
          buffer = buffer ? buffer + "\n\n" + p : p;
        }
      }
      if (buffer) pChunks.push(buffer);
      return pChunks;
    }

    // 2. 如果单段依然超长，尝试语义分块
    if (this.options.enableSemantic) {
      const sChunks = await this.semanticSplit(text);
      // 检查语义切分后的块是否依然超大（应对超长句子）
      const checkedChunks: string[] = [];
      for (const sc of sChunks) {
        if (sc.length > this.options.chunkSize) {
           checkedChunks.push(...this.naiveSplit(sc));
        } else {
           checkedChunks.push(sc);
        }
      }
      return checkedChunks;
    }

    // 3. 兜底：定长切分
    return this.naiveSplit(text);
  }

  /**
   * 最后的保底：定长字符切分
   */
  private naiveSplit(text: string): string[] {
    const chunks: string[] = [];
    const size = this.options.chunkSize;
    const overlap = Math.min(this.options.chunkOverlap || 0, Math.floor(size * 0.5));
    
    if (text.length <= size) return [text];
    
    for (let i = 0; i < text.length; i += size - overlap) {
      const chunk = text.slice(i, i + size);
      if (chunk) chunks.push(chunk);
      if (i + size >= text.length) break;
    }
    return chunks;
  }

  /**
   * 语义分块实现
   */
  private async semanticSplit(text: string): Promise<string[]> {
    const sentences = text.match(/[^。！？.!?]+[。！？.!?]*/g) || [text];
    if (sentences.length <= 1) return [text];

    logger.rag.debug(`🧠 [语义分块] 正在计算 ${sentences.length} 个句子的相似度...`);

    const chunks: string[] = [];
    const embeds: number[][] = [];
    
    for (let i = 0; i < sentences.length; i++) {
        // 对于极长的句子，截断后计算向量以防止 Embedding 阶段报错
        const sampleText = sentences[i].slice(0, 500); 
        const e = await fetchEmbedding(sampleText, false, true); 
        if (e) embeds.push(e);
        else embeds.push([]);
    }

    let buffer = sentences[0];
    let splitCount = 0;
    for (let i = 0; i < sentences.length - 1; i++) {
        const sim = this.cosineSimilarity(embeds[i], embeds[i+1]);
        // 关键改进：即使相似度高，如果加上下一句超过 chunkSize，也必须强制切分
        const overSize = (buffer.length + sentences[i+1].length > this.options.chunkSize);
        
        if (sim < this.options.semanticThreshold || overSize) {
            if (overSize) {
                logger.rag.debug(`   - 强制切分 (Size Limit): idx=${i}, length=${buffer.length}`);
            } else {
                logger.rag.debug(`   - 语义切分: idx=${i}, sim=${sim.toFixed(4)}`);
            }
            chunks.push(buffer);
            buffer = sentences[i+1];
            splitCount++;
        } else {
            buffer += sentences[i+1];
        }
    }
    if (buffer) chunks.push(buffer);
    
    logger.rag.info(`🧠 [子级细拆] 语义层级产出 ${chunks.length} 个分块 (包含 ${splitCount} 个自然转折点)`);
    return chunks;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private getNodeText(node: any): string {
    let text = "";
    visit(node, 'text', (child: any) => {
      text += child.value;
    });
    return text.trim();
  }
}
