import { fetchAi } from './ai'
import { logger } from '@/utils/logger'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { getFilePathOptions } from './workspace'
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

    const prompt = `你是一个专业的测试用例生成专家。请根据以下笔记内容，生成 ${count} 个高质量的问答对，用于测试 RAG（检索增强生成）系统的检索和回答能力。

**要求**：
1. 问题应该多样化，涵盖细节、概念、关系等不同层次
2. 答案应该能从笔记内容中直接找到依据
3. 问题应该自然、像真实用户会问的

**笔记内容**：
${truncated}

**输出格式**（严格按此格式，只输出 JSON，不输出其他内容）：
{"pairs": [{"question": "问题文本", "answer": "答案文本"}, ...]}`

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

    const items: BenchmarkItem[] = parsed.pairs
      .filter((p: any) => p.question && p.answer)
      .map((p: any) => ({
        id: generateEvalId(),
        question: p.question,
        expectedAnswer: p.answer,
        sourceFile,
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
 * 从工作区批量生成测试集
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

  logger.evaluation.info(`[generateBenchmarkFromFiles] 全部完成，共 ${allItems.length} 个用例`)
  return allItems
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
