import { fetchAi, fetchEmbedding } from './ai'
import { logger } from '@/utils/logger'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { getFilePathOptions } from './workspace'
import { cosineSimilarity } from './rag-evaluator'
import {
  type BenchmarkItem,
  appendEvalRecord,
  readEvalFile,
  EVAL_FILES,
  generateEvalId
} from './eval-storage'

// ==========================================
// 测试集自动生成器
// ==========================================

/**
 * 从单篇笔记内容自动生成 Q&A 对
 * @param noteContent 笔记文本内容
 * @param sourceFile 来源文件名
 * @param count 生成数量
 */
export async function generateQAPairs(
  noteContent: string,
  sourceFile: string,
  count: number = 3
): Promise<BenchmarkItem[]> {
  try {
    logger.evaluation.info(`[generateQAPairs] 开始处理文件: ${sourceFile}, 内容长度: ${noteContent.length}`)
    
    if (!noteContent.trim()) {
      logger.evaluation.warn(`[generateQAPairs] 笔记内容为空，跳过: ${sourceFile}`)
      return []
    }

    // 截取合理长度避免超出 token 限制
    const truncated = noteContent.slice(0, 3000)

    // 根据数量决定是否强制难度分布
    const difficultyRequirement = count >= 3
      ? `4. 难度分布要求：至少包含 1 个 easy（简单事实查询）、1 个 medium（概念理解）、1 个 hard（跨段落推理/关系类）问题`
      : `4. 为每个问题标注合理的难度等级`

    const prompt = `你是一个专业的测试用例生成专家。请根据以下笔记内容，生成 ${count} 个高质量的问答对，用于测试 RAG（检索增强生成）系统的检索和回答能力。

**要求**：
1. 问题应该多样化，涵盖细节、概念、关系等不同层次
2. 答案应该能从笔记内容中直接找到依据
3. 问题应该自然、像真实用户会问的
${difficultyRequirement}

**难度等级说明**：
- easy: 简单事实查询，答案直接出现在文本中
- medium: 概念理解，需要理解文本含义
- hard: 跨段落推理或关系推导，需要综合多处信息

**问题类型说明**：
- factual: 事实性问题（"是什么"、"有多少"）
- conceptual: 概念性问题（"为什么"、"如何理解"）
- relational: 关系性问题（"A与B的关系"、"比较X和Y"）

**笔记内容**：
${truncated}

**输出格式**（严格按此格式，只输出 JSON，不输出其他内容）：
{"pairs": [{"question": "问题文本", "answer": "答案文本", "difficulty": "easy|medium|hard", "type": "factual|conceptual|relational"}, ...]}`

    logger.evaluation.info(`[generateQAPairs] 即将调用 fetchAi, prompt 长度: ${prompt.length}`)
    const result = await fetchAi(prompt)
    logger.evaluation.info(`[generateQAPairs] fetchAi 返回长度: ${result.length}, 前200字: ${result.slice(0, 200)}`)

    if (!result || result.trim().length === 0) {
      logger.evaluation.error(`[generateQAPairs] fetchAi 返回空字符串! 可能是 AI 模型配置问题`)
      return []
    }

    const parsed = safeParseJSON(result)
    logger.evaluation.info(`[generateQAPairs] JSON 解析结果: ${parsed ? 'OK' : '失败'}, pairs数量: ${parsed?.pairs?.length ?? 'N/A'}`)

    if (!parsed?.pairs || !Array.isArray(parsed.pairs)) {
      logger.evaluation.warn('[generateQAPairs] Q&A 生成结果解析失败, 原始响应:', result.slice(0, 500))
      return []
    }

    const validDifficulties = ['easy', 'medium', 'hard']
    const validTypes = ['factual', 'conceptual', 'relational']

    const items: BenchmarkItem[] = parsed.pairs
      .filter((p: any) => p.question && p.answer)
      .map((p: any) => ({
        id: generateEvalId(),
        question: p.question,
        expectedAnswer: p.answer,
        sourceFile,
        difficulty: validDifficulties.includes(p.difficulty) ? p.difficulty : 'medium',
        type: validTypes.includes(p.type) ? p.type : 'factual',
        createdAt: Date.now()
      }))

    // 持久化
    logger.evaluation.info(`[generateQAPairs] 准备持久化 ${items.length} 个用例`)
    for (const item of items) {
      await appendEvalRecord(EVAL_FILES.benchmarks, item)
    }

    logger.evaluation.info(`[generateQAPairs] 从 ${sourceFile} 成功生成 ${items.length} 个测试用例`)
    return items
  } catch (e) {
    logger.evaluation.error(`[generateQAPairs] 生成 Q&A 对失败 (${sourceFile}):`, e)
    return []
  }
}

/**
 * 从工作区批量生成测试集（含 Embedding 语义去重）
 */
export async function generateBenchmarkFromFiles(
  filePaths: string[],
  pairsPerFile: number = 3,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<BenchmarkItem[]> {
  const allItems: BenchmarkItem[] = []
  logger.evaluation.info(`[generateBenchmarkFromFiles] 开始处理 ${filePaths.length} 个文件`)

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i]
    const fileName = filePath.split('/').pop() || filePath

    onProgress?.(i + 1, filePaths.length, fileName)
    logger.evaluation.info(`[generateBenchmarkFromFiles] [${i + 1}/${filePaths.length}] 处理: ${filePath}`)

    try {
      // allArticle 中的 path 是相对路径，需转为绝对路径
      logger.evaluation.debug(`[generateBenchmarkFromFiles] 调用 getFilePathOptions('${filePath}')`)
      const { path: absPath, baseDir } = await getFilePathOptions(filePath)
      logger.evaluation.info(`[generateBenchmarkFromFiles] 绝对路径: ${absPath}, baseDir: ${baseDir ?? '无'}`)
      
      const content = baseDir
        ? await readTextFile(absPath, { baseDir })
        : await readTextFile(absPath)
      logger.evaluation.info(`[generateBenchmarkFromFiles] 文件读取成功, 内容长度: ${content.length}`)

      const items = await generateQAPairs(content, fileName, pairsPerFile)
      logger.evaluation.info(`[generateBenchmarkFromFiles] 文件 ${fileName} 生成了 ${items.length} 个用例`)
      allItems.push(...items)
    } catch (e) {
      logger.evaluation.error(`[generateBenchmarkFromFiles] 处理文件 ${filePath} 失败:`, e)
    }
  }

  // Embedding 语义去重
  const deduped = await deduplicateByEmbedding(allItems)
  logger.evaluation.info(`[generateBenchmarkFromFiles] 全部完成，原始 ${allItems.length} 个，去重后 ${deduped.length} 个用例`)
  return deduped
}

/**
 * 使用 Embedding 语义相似度对测试用例去重
 * 与已有测试集 + 本批次内部互相去重，相似度阈值 0.9
 */
async function deduplicateByEmbedding(newItems: BenchmarkItem[]): Promise<BenchmarkItem[]> {
  if (newItems.length === 0) return []

  try {
    // 加载已有测试集
    const existingItems = await readEvalFile<BenchmarkItem>(EVAL_FILES.benchmarks)

    // 获取已有问题的 embeddings（去重仅比较 question）
    const existingEmbeddings: number[][] = []
    for (const item of existingItems) {
      // 跳过本批次刚写入的（它们已经在 newItems 里了）
      if (newItems.some(n => n.id === item.id)) continue
      const emb = await fetchEmbedding(item.question, false, true)
      if (emb) existingEmbeddings.push(emb)
    }

    const kept: BenchmarkItem[] = []
    const keptEmbeddings: number[][] = []

    for (const item of newItems) {
      const emb = await fetchEmbedding(item.question, false, true)
      if (!emb) {
        // Embedding 获取失败则保留该项（宁多勿漏）
        kept.push(item)
        continue
      }

      let isDuplicate = false

      // 与已有测试集比较
      for (const existingEmb of existingEmbeddings) {
        if (cosineSimilarity(emb, existingEmb) > 0.9) {
          isDuplicate = true
          break
        }
      }

      // 与本批次已保留的比较
      if (!isDuplicate) {
        for (const keptEmb of keptEmbeddings) {
          if (cosineSimilarity(emb, keptEmb) > 0.9) {
            isDuplicate = true
            break
          }
        }
      }

      if (isDuplicate) {
        logger.evaluation.info(`[去重] 过滤重复问题: "${item.question.slice(0, 40)}..."`)
      } else {
        kept.push(item)
        keptEmbeddings.push(emb)
      }
    }

    // 如果有被去重掉的，需要从持久化文件中也删除
    const removedIds = newItems.filter(n => !kept.some(k => k.id === n.id)).map(n => n.id)
    if (removedIds.length > 0) {
      const allBenchmarks = await readEvalFile<BenchmarkItem>(EVAL_FILES.benchmarks)
      const filtered = allBenchmarks.filter(b => !removedIds.includes(b.id))
      // 直接导入 writeEvalFile 来覆写
      const { writeEvalFile } = await import('./eval-storage')
      await writeEvalFile(EVAL_FILES.benchmarks, filtered)
      logger.evaluation.info(`[去重] 从持久化文件中移除了 ${removedIds.length} 条重复记录`)
    }

    return kept
  } catch (e) {
    logger.evaluation.warn('[去重] 语义去重失败，返回原始数据:', e)
    return newItems
  }
}

/**
 * 获取当前所有测试用例
 */
export async function getAllBenchmarks(): Promise<BenchmarkItem[]> {
  return await readEvalFile<BenchmarkItem>(EVAL_FILES.benchmarks)
}

// ==========================================
// 辅助函数
// ==========================================

function safeParseJSON(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1]) } catch { /* 继续 */ }
    }
    const braceMatch = text.match(/\{[\s\S]*\}/)
    if (braceMatch) {
      try { return JSON.parse(braceMatch[0]) } catch { /* 放弃 */ }
    }
    return null
  }
}
