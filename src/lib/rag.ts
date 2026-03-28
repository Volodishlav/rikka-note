import { readTextFile, readDir, BaseDirectory, DirEntry } from "@tauri-apps/plugin-fs";
import { fetchEmbedding, rerankDocuments, checkRerankModelAvailable } from "./ai";
import { 
  upsertVectorDocument, 
  deleteVectorDocumentsByFilename, 
  getSimilarDocuments,
  initVectorDb,
  getVectorDocumentCount
} from "@/db/vector";
import { invoke } from "@tauri-apps/api/core";

// 重新导出initVectorDb和checkRerankModelAvailable，使其可在其他模块中导入
export { initVectorDb, getVectorDocumentCount, checkRerankModelAvailable };
import { getFilePathOptions, getWorkspacePath } from "./workspace";
import { DirTree } from "@/stores/article";
import { toast } from "@/components/ui/toast/use-toast";
import { join } from "@tauri-apps/api/path";
import { Store } from "@tauri-apps/plugin-store";
import { logger } from "@/utils/logger";

/**
 * 文本分块函数，用于将大文本分成小块
 */
export function chunkText(
  text: string, 
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): string[] {
  const chunks: string[] = [];
  
  // 检查文本是否足够长，需要分块
  if (text.length <= chunkSize) {
    chunks.push(text);
    return chunks;
  }
  
  // 尝试在段落边界进行分块
  const paragraphs = text.split('\n\n');
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // 如果加上当前段落后超出了块大小，则保存当前块并开始新块
    if (currentChunk.length + paragraph.length + 2 > chunkSize) {
      // 如果当前块非空，保存它
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        // 保留重叠部分到新块
        const lastChunkParts = currentChunk.split('\n\n');
        const overlapLength = Math.min(chunkOverlap, currentChunk.length);
        const overlapParts = [];
        let currentLength = 0;
        
        // 从后向前取段落，直到达到重叠大小
        for (let i = lastChunkParts.length - 1; i >= 0; i--) {
          const part = lastChunkParts[i];
          if (currentLength + part.length + 2 <= overlapLength) {
            overlapParts.unshift(part);
            currentLength += part.length + 2;
          } else {
            break;
          }
        }
        
        currentChunk = overlapParts.join('\n\n');
      }
      
      // 如果单个段落过长，需要强制分割
      if (paragraph.length > chunkSize) {
        // 先尝试按句子分割
        const sentences = paragraph.split(/(?:\.|\?|\!)\s+/);
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length > chunkSize) {
            if (sentenceChunk) {
              chunks.push(sentenceChunk);
              // 保留重叠
              const overlapLength = Math.min(chunkOverlap, sentenceChunk.length);
              sentenceChunk = sentenceChunk.slice(-overlapLength);
            }
          }
          
          sentenceChunk += sentence + ' ';
        }
        
        if (sentenceChunk) {
          currentChunk += sentenceChunk;
        }
      } else {
        currentChunk += paragraph + '\n\n';
      }
    } else {
      currentChunk += paragraph + '\n\n';
    }
  }
  
  // 添加最后一个块
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * 处理单个Markdown文件，计算向量并存储到数据库
 */
export async function processMarkdownFile(
  filePath: string, 
  fileContent?: string
): Promise<boolean> {
  try {
    const workspace = await getWorkspacePath()
    let content: string
    if (workspace.isCustom) {
      content = fileContent || await readTextFile(filePath)
    } else {
      const { path, baseDir } = await getFilePathOptions(filePath)
      content = fileContent || await readTextFile(path, { baseDir })
    }
    const store = await Store.load('store.json')
    const chunkSize = await store.get<number>('ragChunkSize');
    const chunkOverlap = await store.get<number>('ragChunkOverlap');
    const chunks = chunkText(content, chunkSize, chunkOverlap);
    // 文件名（不含路径）
    const filename = filePath.split('/').pop() || filePath;
    
    // 先删除该文件的旧记录
    await deleteVectorDocumentsByFilename(filename);
    
    // 处理每个文本块
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // 计算嵌入向量
      const embedding = await fetchEmbedding(chunk);
      
      if (!embedding) {
        logger.rag.error(`无法计算文件 ${filename} 第 ${i+1} 块的向量`);
        continue;
      }
      
      // 保存到数据库
      await upsertVectorDocument({
        filename,
        chunk_id: i,
        content: chunk,
        embedding: JSON.stringify(embedding),
        updated_at: Date.now()
      });
    }
    
    return true;
  } catch (error) {
    logger.rag.error(`处理文件 ${filePath} 失败:`, error);
    return false;
  }
}

/**
 * 获取工作区目录树
 */
async function getWorkspaceFiles(): Promise<DirTree[]> {
  const workspace = await getWorkspacePath();
  
  // 递归处理目录的辅助函数
  async function processDirectory(dirPath: string, useCustomPath: boolean): Promise<DirTree[]> {
    let entries: DirEntry[];
    
    if (useCustomPath) {
      entries = await readDir(dirPath);
    } else {
      entries = await readDir(dirPath, { baseDir: BaseDirectory.AppData });
    }
    
    const result: DirTree[] = [];
    
    for (const entry of entries) {
      if (entry.name === '.DS_Store' || entry.name.startsWith('.')) continue;
      if (!entry.isDirectory && !entry.name.endsWith('.md')) continue;
      
      // 创建DirTree对象
      const item: DirTree = {
        name: entry.name,
        isFile: !entry.isDirectory,
        isDirectory: entry.isDirectory,
        isSymlink: false, // Tauri FS API不直接提供isSymlink
        children: [],
        isLocale: true,
        isEditing: false
      };
      
      // 如果是目录，递归读取子目录
      if (entry.isDirectory) {
        const childPath = await join(dirPath, entry.name);
        // 递归处理子目录
        item.children = await processDirectory(childPath, useCustomPath);
        
        // 设置父级关系
        item.children.forEach(child => {
          child.parent = item;
        });
      }
      
      result.push(item);
    }
    
    return result;
  }
  
  // 开始处理根目录
  const rootPath = workspace.isCustom ? workspace.path : 'article';
  return await processDirectory(rootPath, workspace.isCustom);
}

/**
 * 处理工作区中的所有Markdown文件
 */
export async function processAllMarkdownFiles(): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  try {
    // 获取工作区中的所有文件
    const fileTree = await getWorkspaceFiles();
    
    // 统计结果
    const result = {
      total: 0,
      success: 0,
      failed: 0
    };
    
    // 递归处理文件树
    async function processTree(tree: DirTree[]): Promise<void> {
      for (const item of tree) {
        if (item.isFile && item.name.endsWith('.md')) {
          result.total++;
          // 获取完整路径
          const filePath = await getFilePath(item);
          const success = await processMarkdownFile(filePath);
          if (success) {
            result.success++;
          } else {
            result.failed++;
          }
        }
        
        // 递归处理子目录
        if (item.children && item.children.length > 0) {
          await processTree(item.children);
        }
      }
    }
    await processTree(fileTree);
    return result;
  } catch (error) {
    logger.rag.error('处理工作区Markdown文件失败:', error);
    throw error;
  }
}

/**
 * 根据DirTree项获取完整文件路径
 */
async function getFilePath(item: DirTree): Promise<string> {
  const workspace = await getWorkspacePath();
  let path = item.name;
  let parent = item.parent;
  
  // 构建相对路径
  while (parent) {
    path = `${parent.name}/${path}`;
    parent = parent.parent;
  }
  
  // 转换为完整路径
  if (workspace.isCustom) {
    return await join(workspace.path, path);
  } else {
    return path; // 返回相对于AppData/article的路径
  }
}

/**
 * 为fuzzy_search准备的搜索项结构
 */
interface SearchItem {
  id?: string;
  desc?: string;
  title?: string;
  article?: string;
  url?: string;
  search_type?: string;
  score?: number;
  matches?: {
    key: string;
    indices: [number, number][];
    value: string;
  }[];
}

/**
 * fuzzy_search返回的结果结构
 */
interface FuzzySearchResult {
  item: SearchItem;
  refindex: number;
  score: number;
  matches: {
    key: string;
    indices: [number, number][];
    value: string;
  }[];
}

/**
 * 从工作区中收集所有Markdown文件内容，用于模糊搜索
 */
async function collectMarkdownContents(): Promise<SearchItem[]> {
  try {
    // 获取工作区中的所有文件
    const fileTree = await getWorkspaceFiles();
    const items: SearchItem[] = [];
    
    // 递归处理文件树
    async function processTree(tree: DirTree[]): Promise<void> {
      for (const item of tree) {
        if (item.isFile && item.name.endsWith('.md')) {
          // 获取完整路径
          const filePath = await getFilePath(item);
          
          try {
            // 读取文件内容
            let content = '';
            const workspace = await getWorkspacePath();
            if (workspace.isCustom) {
              content = await readTextFile(filePath);
            } else {
              const { path, baseDir } = await getFilePathOptions(filePath);
              content = await readTextFile(path, { baseDir });
            }
            
            items.push({
              id: filePath,
              title: item.name,
              article: content,
              search_type: 'markdown'
            });
          } catch (error) {
            logger.rag.error(`读取文件 ${filePath} 内容失败:`, error);
          }
        }
        
        // 递归处理子目录
        if (item.children && item.children.length > 0) {
          await processTree(item.children);
        }
      }
    }
    
    await processTree(fileTree);
    return items;
  } catch (error) {
    logger.rag.error('收集Markdown内容失败:', error);
    return [];
  }
}

/**
 * 关键词及其权重类型定义
 */
export interface Keyword {
  text: string;
  weight: number;
}

/**
 * 检索到的文档片段结构
 */
export interface RetrievedDoc {
  filename: string;
  content: string;
  score: number;
  type?: string;
  keyword?: string;
}

/**
 * 根据关键词数组获取检索到的文档列表
 * @param query 
 * @param keywords 
 */
export async function getRetrievedDocs(query: string, keywords: Keyword[]): Promise<RetrievedDoc[]> {
  try {
    const store = await Store.load('store.json');
    const resultCount = await store.get<number>('ragResultCount') || 5;
    const similarityThreshold = await store.get<number>('ragSimilarityThreshold') || 0.5;
    const allContexts: { filename: string, content: string, score: number, keyword?: string, type?: string }[] = [];
    const isMeaningfulQuery = query.trim().length > 2 && /[\u4e00-\u9fa5\u3040-\u30ffa-zA-Z0-9]/i.test(query);

    if (!isMeaningfulQuery) {
      logger.rag.debug('Query is too short or meaningless, skipping vector search.');
    }
    // ==========================================
    // 核心改进 1：使用【完整原句】进行一次向量检索 (最重要)
    // ==========================================
    if (isMeaningfulQuery && query && query.trim().length > 0) {
      logger.rag.debug(`Searching vector for full query: ${query}`);
      const queryEmbedding = await fetchEmbedding(query);
      if (queryEmbedding) {
        let similarDocs = await getSimilarDocuments(queryEmbedding, resultCount, similarityThreshold);
        logger.rag.debug(`Found ${similarDocs.length} vector docs for full query`);

        if (similarDocs.length > 0) {
          for (const doc of similarDocs) {
            allContexts.push({
              filename: doc.filename,
              content: doc.content,
              score: doc.similarity || 0,
              type: 'vector'
            });
          }
        }
      }
    }

    // ==========================================
    // 核心改进 2：过滤垃圾关键词
    // ==========================================
    // 过滤掉单字、限制权重上限
    const validKeywords = keywords
        .filter(k => k.text.length > 1 && k.weight < 1000)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3);

    // ==========================================
    // 核心改进 3：仅使用【有效关键词】进行模糊匹配 (作为兜底)
    // ==========================================
    if (validKeywords.length > 0) {
      const items = await collectMarkdownContents();
      if (items.length > 0) {
        for (const keyword of validKeywords) {
          const fuzzyResults = await invoke<FuzzySearchResult[]>('fuzzy_search', {
            items,
            query: keyword.text,
            keys: ['title', 'article'],
            threshold: 0.3,
            includeScore: true,
            includeMatches: true
          });

          for (const result of fuzzyResults) {
            if (result.score > 0) {
              const articleMatches = result.matches.filter(m => m.key === 'article');
              if (articleMatches.length > 0) {
                const match = articleMatches[0];
                const content = match.value;
                let startIdx = 0, endIdx = content.length;
                if (match.indices.length > 0) {
                  startIdx = Math.max(0, match.indices[0][0] - 250);
                  endIdx = Math.min(content.length, match.indices[0][1] + 250);
                }
                // 标准化权重
                const normalizedWeight = Math.min(keyword.weight, 2.0);
                const finalScore = result.score * normalizedWeight;

                allContexts.push({
                  filename: result.item.title || '未命名文件',
                  content: content.substring(startIdx, endIdx),
                  score: finalScore,
                  keyword: keyword.text,
                  type: 'fuzzy'
                });
              }
            }
          }
        }
      }
    }

    // 注意：这里删除了原来的旧代码循环

    if (allContexts.length === 0) return [];

    // 使用 RRF (Reciprocal Rank Fusion) 合并不同检索源的结果
    // 1. 按 type 分组排序
    const vectorResults = allContexts.filter(c => c.type === 'vector').sort((a, b) => b.score - a.score);
    const fuzzyResults = allContexts.filter(c => c.type === 'fuzzy').sort((a, b) => b.score - a.score);

    // 2. 计算 RRF 分数 (保留标准常量 k=60)
    const k = 60;
    const rrfScores = new Map<string, { ctx: any, rrfScore: number }>();

    const processRank = (results: typeof allContexts) => {
      results.forEach((ctx, index) => {
        const identifier = `${ctx.filename}-${ctx.content.substring(0, 100)}`;
        const rank = index + 1;
        const scoreToAdd = 1 / (k + rank);
        
        if (rrfScores.has(identifier)) {
          rrfScores.get(identifier)!.rrfScore += scoreToAdd;
        } else {
          rrfScores.set(identifier, { ctx, rrfScore: scoreToAdd });
        }
      });
    };

    processRank(vectorResults);
    processRank(fuzzyResults);

    // 3. 根据 RRF 分数排序并初步去重
    let uniqueContexts = Array.from(rrfScores.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .map(item => item.ctx);

    // ==========================================
    // 核心改进 4：【精排阶段】对混合结果进行二次重排
    // ==========================================
    // 如果启用重排模型，对 RRF 筛选出的前 N 个结果进行最终的语意校验
    if (uniqueContexts.length > 0) {
      const rerankAvailable = await checkRerankModelAvailable();
      if (rerankAvailable) {
        logger.rag.debug('Applying Rerank to top candidates...');
        // 准备重排格式 (rerankDocuments 需要 id, filename,内容,相似度)
        const candidates = uniqueContexts.slice(0, 10).map((ctx, idx) => ({
          id: idx,
          filename: ctx.filename,
          content: ctx.content,
          similarity: ctx.score // 传入原始得分供参考
        }));
        
        const reranked = await rerankDocuments(query, candidates);
        
        // 使用重排后的顺序替换前面的顺位
        const rerankedCtxs = reranked.map(r => ({
          filename: r.filename,
          content: r.content,
          score: r.similarity,
          type: 'rerank'
        }));
        
        // 将重排后的结果补回 uniqueContexts 的头部
        const remaining = uniqueContexts.slice(10);
        uniqueContexts = [...rerankedCtxs, ...remaining];
      }
    }

    return uniqueContexts.slice(0, resultCount);
  } catch (error) {
    logger.rag.error('获取查询文档失败:', error);
    return [];
  }
}

/**
 * 根据关键词数组获取格式化后的上下文字符串
 * @param query
 * @param keywords 关键词数组，每个元素包含关键词文本和权重
 */
export async function getContextForQuery(query: string, keywords: Keyword[]): Promise<string> {
  const docs = await getRetrievedDocs(query, keywords);
  if (docs.length === 0) return '';
  return docs.map(ctx => `文件：${ctx.filename}\n${ctx.content}\n`).join('\n---\n\n');
}

/**
 * 当文件被更新时处理，更新向量数据库
 */
export async function handleFileUpdate(filename: string, content: string): Promise<void> {
  if (!filename.endsWith('.md')) return;
  
  try {
    await processMarkdownFile(filename, content);
  } catch (error) {
    logger.rag.error(`更新文件 ${filename} 的向量失败:`, error);
  }
}

/**
 * 检查是否有嵌入模型可用
 * @returns true if available, or error message string if failed
 */
export async function checkEmbeddingModelAvailable(): Promise<boolean | string> {
  try {
    // 尝试计算一个简单文本的向量，传入 true 以抛出错误
    const embedding = await fetchEmbedding('测试嵌入模型', true);
    return !!embedding;
  } catch (error) {
    logger.rag.error('嵌入模型检查失败:', error);
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * 显示向量处理进度的toast
 */
export function showVectorProcessingToast(message: string) {
  toast({
    title: '向量数据库更新',
    description: message,
  });
}
