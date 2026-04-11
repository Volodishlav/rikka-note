import { fetchAi } from './ai'
import { fetchEmbedding } from './ai'
import { logger } from '@/utils/logger'
import {
  type RagEvaluation,
  appendEvalRecord,
  EVAL_FILES,
  generateEvalId
} from './eval-storage'

// ==========================================
// RAG 三元组评估器 (RAGAS-inspired LLM-as-Judge)
// ==========================================

/**
 * 评估忠实度 (Faithfulness)
 * 衡量：答案中的事实陈述是否都能被检索上下文所支持
 * 方法：让 LLM 提取 claims 并判断每条是否有上下文支撑
 */
export async function evaluateFaithfulness(
  answer: string,
  contexts: string[]
): Promise<number> {
  try {
    if (!answer.trim() || contexts.length === 0) return 0

    const contextText = contexts.map((c, i) => `[上下文 ${i + 1}] ${c}`).join('\n\n')

    const prompt = `你是一个严谨的事实评估专家。请完成以下任务：

**任务**：评估以下"回答"中的事实陈述是否都能被"上下文"所支持。

**上下文**：
${contextText}

**回答**：
${answer}

**评估步骤**：
1. 从"回答"中提取所有事实性陈述（claims）
2. 逐条判断每个陈述是否能在"上下文"中找到支撑证据
3. 计算忠实度分数 = 有支撑的陈述数 / 总陈述数

**输出格式**（严格按此格式，只输出 JSON，不输出其他内容）：
{"total_claims": <数字>, "supported_claims": <数字>, "score": <0到1的小数>}`

    const result = await fetchAi(prompt)
    return parseScoreFromJSON(result, 'score')
  } catch (e) {
    logger.evaluation.error('忠实度评估失败:', e)
    return -1
  }
}

/**
 * 评估回答相关性 (Answer Relevance)
 * 衡量：答案是否正面回答了用户的问题
 * 方法：让 LLM 从答案反向生成问题，再与原问题做语义相似度比对
 */
export async function evaluateAnswerRelevance(
  query: string,
  answer: string
): Promise<number> {
  try {
    if (!query.trim() || !answer.trim()) return 0

    const prompt = `你是一个语义分析专家。请根据以下"回答"，反向推导出 3 个最可能产生该回答的问题。

**回答**：
${answer}

**输出格式**（严格按此格式，只输出 JSON，不输出其他内容）：
{"questions": ["问题1", "问题2", "问题3"]}`

    const result = await fetchAi(prompt)
    const parsed = safeParseJSON(result)
    if (!parsed?.questions || !Array.isArray(parsed.questions)) {
      // 回退：直接让 LLM 打分
      return await fallbackRelevanceScore(query, answer)
    }

    // 计算生成问题与原始 query 的语义相似度
    const queryEmbedding = await fetchEmbedding(query)
    if (!queryEmbedding) return await fallbackRelevanceScore(query, answer)

    let totalSim = 0
    let validCount = 0
    for (const q of parsed.questions) {
      const qEmbedding = await fetchEmbedding(q)
      if (qEmbedding) {
        totalSim += cosineSimilarity(queryEmbedding, qEmbedding)
        validCount++
      }
    }

    return validCount > 0 ? Math.max(0, Math.min(1, totalSim / validCount)) : 0
  } catch (e) {
    logger.evaluation.error('回答相关性评估失败:', e)
    return -1
  }
}

/**
 * 评估上下文精度 (Context Precision)
 * 衡量：检索出的片段中，有用信息的密度如何
 * 方法：让 LLM 判断每个检索上下文是否与 query 相关，加权计算精度
 */
export async function evaluateContextPrecision(
  query: string,
  contexts: string[]
): Promise<number> {
  try {
    if (!query.trim() || contexts.length === 0) return 0

    const contextList = contexts.map((c, i) => `[片段 ${i + 1}] ${c.slice(0, 300)}`).join('\n\n')

    const prompt = `你是一个信息检索评估专家。请判断以下每个检索片段是否与用户查询相关。

**用户查询**：${query}

**检索片段**：
${contextList}

**评估标准**：如果片段包含有助于回答查询的信息，则标记为相关(1)，否则标记为不相关(0)。

**输出格式**（严格按此格式，只输出 JSON，不输出其他内容）：
{"relevance": [1, 0, 1, ...], "score": <0到1的小数>}`

    const result = await fetchAi(prompt)
    const parsed = safeParseJSON(result)

    if (parsed?.relevance && Array.isArray(parsed.relevance)) {
      // 加权精度：排名靠前的相关文档权重更高
      let weightedSum = 0
      let cumulativeRelevant = 0
      for (let i = 0; i < parsed.relevance.length; i++) {
        if (parsed.relevance[i] === 1) {
          cumulativeRelevant++
          weightedSum += cumulativeRelevant / (i + 1)
        }
      }
      const totalRelevant = parsed.relevance.filter((r: number) => r === 1).length
      return totalRelevant > 0 ? weightedSum / totalRelevant : 0
    }

    return parseScoreFromJSON(result, 'score')
  } catch (e) {
    logger.evaluation.error('上下文精度评估失败:', e)
    return -1
  }
}

/**
 * 执行完整的 RAG 三元组评估
 */
export async function evaluateRAGTriad(
  query: string,
  answer: string,
  contexts: string[],
  metrics?: {
    retrievalLatencyMs: number
    totalLatencyMs: number
    vectorCount: number
    fuzzyCount: number
    rerankApplied: boolean
  }
): Promise<RagEvaluation | null> {
  try {
    logger.evaluation.info('开始 RAG 三元组评估...')
    const startTime = Date.now()

    // 并行执行三项评估以减少耗时
    const [faithfulness, answerRelevance, contextPrecision] = await Promise.all([
      evaluateFaithfulness(answer, contexts),
      evaluateAnswerRelevance(query, answer),
      evaluateContextPrecision(query, contexts)
    ])

    const evalRecord: RagEvaluation = {
      id: generateEvalId(),
      query,
      answer: answer.slice(0, 2000), // 限制存储大小
      contexts: contexts.map(c => c.slice(0, 500)),
      faithfulness,
      answerRelevance,
      contextPrecision,
      retrievalLatencyMs: metrics?.retrievalLatencyMs ?? 0,
      totalLatencyMs: metrics?.totalLatencyMs ?? (Date.now() - startTime),
      vectorCount: metrics?.vectorCount ?? 0,
      fuzzyCount: metrics?.fuzzyCount ?? 0,
      rerankApplied: metrics?.rerankApplied ?? false,
      createdAt: Date.now()
    }

    // 持久化
    await appendEvalRecord(EVAL_FILES.evaluations, evalRecord)

    logger.evaluation.info(
      `RAG 评估完成 — 忠实度: ${faithfulness.toFixed(2)}, ` +
      `相关性: ${answerRelevance.toFixed(2)}, ` +
      `精度: ${contextPrecision.toFixed(2)}`
    )

    return evalRecord
  } catch (e) {
    logger.evaluation.error('RAG 三元组评估失败:', e)
    return null
  }
}

// ==========================================
// 辅助函数
// ==========================================

/** 安全解析 JSON（从 LLM 响应中提取） */
function safeParseJSON(text: string): any {
  try {
    // 尝试直接解析
    return JSON.parse(text)
  } catch {
    // 尝试从 markdown 代码块中提取
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1]) } catch { /* 继续尝试 */ }
    }
    // 尝试匹配花括号包裹的内容
    const braceMatch = text.match(/\{[\s\S]*\}/)
    if (braceMatch) {
      try { return JSON.parse(braceMatch[0]) } catch { /* 放弃 */ }
    }
    return null
  }
}

/** 从 JSON 响应中解析分数字段 */
function parseScoreFromJSON(text: string, field: string): number {
  const parsed = safeParseJSON(text)
  if (parsed && typeof parsed[field] === 'number') {
    return Math.max(0, Math.min(1, parsed[field]))
  }
  // 尝试匹配数字
  const numMatch = text.match(/\d+\.?\d*/g)
  if (numMatch) {
    const num = parseFloat(numMatch[numMatch.length - 1])
    if (num >= 0 && num <= 1) return num
  }
  return -1
}

/** 回退方案：直接让 LLM 打分 */
async function fallbackRelevanceScore(query: string, answer: string): Promise<number> {
  const prompt = `请评估以下"回答"对"问题"的相关程度，输出 0 到 1 之间的分数。
问题：${query}
回答：${answer}
只输出一个 JSON：{"score": <0到1的小数>}`
  const result = await fetchAi(prompt)
  return parseScoreFromJSON(result, 'score')
}

/** 余弦相似度计算 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
