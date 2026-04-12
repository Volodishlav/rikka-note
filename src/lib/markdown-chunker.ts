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
   * 细拆逻辑：逻辑递进 -> 语义/字符
   */
  private async subSplit(text: string): Promise<string[]> {
    // 1. 尝试按段落切分
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length > 1) {
      const results: string[] = [];
      let temp = "";
      for (const p of paragraphs) {
        if (temp.length + p.length > this.options.chunkSize && temp) {
          results.push(temp);
          temp = p;
        } else {
          temp = temp ? temp + "\n\n" + p : p;
        }
      }
      if (temp) results.push(temp);
      return results;
    }

    // 2. 如果单段依然超长，尝试语义分块
    if (this.options.enableSemantic) {
      return await this.semanticSplit(text);
    }

    // 3. 兜底：定长切分
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += this.options.chunkSize - this.options.chunkOverlap) {
      chunks.push(text.slice(i, i + this.options.chunkSize));
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
      const e = await fetchEmbedding(sentences[i], false, true); // 使用静默模式
      if (e) embeds.push(e);
      else embeds.push([]);
    }

    let buffer = sentences[0];
    let splitCount = 0;
    for (let i = 0; i < sentences.length - 1; i++) {
        const sim = this.cosineSimilarity(embeds[i], embeds[i+1]);
        const overSize = (buffer.length + sentences[i+1].length > this.options.chunkSize);
        
        if (sim < this.options.semanticThreshold || overSize) {
            logger.rag.debug(`   - 发生切分: idx=${i}, sim=${sim.toFixed(4)}, overSize=${overSize}`);
            chunks.push(buffer);
            buffer = sentences[i+1];
            splitCount++;
        } else {
            buffer += sentences[i+1];
        }
    }
    if (buffer) chunks.push(buffer);
    
    logger.rag.info(`🧠 [语言分块] 识别到 ${splitCount} 个语义转折点`);
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
