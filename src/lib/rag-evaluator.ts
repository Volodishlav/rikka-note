import { fetchAi } from './ai'
import { fetchEmbedding } from './ai'
import { logger } from '@/utils/logger'
import { Store } from '@tauri-apps/plugin-store'
import { AiConfig } from '@/lib/ai.types'
import {
  type RagEvaluation,
  appendEvalRecord,
  EVAL_FILES,
  generateEvalId
} from './eval-storage'

// ==========================================
// RAG 多维度评估器 (RAGAS-inspired LLM-as-Judge)
// 覆盖维度：忠实度、回答相关性、上下文精度、上下文召回率、答案完整性
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
 * 评估上下文召回率 (Context Recall) — P0 关键新增
 * 衡量：回答所需的信息有多少被检索上下文所覆盖
 * 
 * 方案 A（有 ground truth）：将 expectedAnswer 拆解为关键信息点，判断上下文覆盖度
 * 方案 B（无 ground truth）：从 answer 中提取关键信息点，检查上下文覆盖度
 */
export async function evaluateContextRecall(
  answer: string,
  contexts: string[],
  expectedAnswer?: string
): Promise<number> {
  try {
    if (contexts.length === 0) return 0

    const contextText = contexts.map((c, i) => `[上下文 ${i + 1}] ${c}`).join('\n\n')

    // 选择参照源：优先使用 ground truth
    const referenceText = expectedAnswer?.trim() || answer
    const referenceLabel = expectedAnswer?.trim() ? '期望答案' : '回答'

    if (!referenceText.trim()) return 0

    const prompt = `你是一个信息完整性评估专家。

**任务**：判断以下"上下文"是否覆盖了"${referenceLabel}"中的所有关键信息。

**${referenceLabel}**：
${referenceText}

**上下文**：
${contextText}

**评估步骤**：
1. 从"${referenceLabel}"中提取所有关键信息点（每个独立的事实或概念为一个信息点）
2. 逐一判断每个信息点是否能在"上下文"中找到支撑或覆盖
3. 计算召回率 = 被上下文覆盖的信息点数 / 总信息点数

**输出格式**（严格按此格式，只输出 JSON，不输出其他内容）：
{"total_points": <数字>, "covered_points": <数字>, "score": <0到1的小数>}`

    const result = await fetchAi(prompt)
    return parseScoreFromJSON(result, 'score')
  } catch (e) {
    logger.evaluation.error('上下文召回率评估失败:', e)
    return -1
  }
}

/**
 * 评估答案正确性 (Answer Correctness) — P1
 * 衡量：生成答案与期望答案的匹配程度
 * 方法：Embedding 语义相似度 + LLM 事实匹配判断的加权融合
 * 仅在回归测试场景中使用（需要 expectedAnswer）
 */
export async function evaluateAnswerCorrectness(
  actualAnswer: string,
  expectedAnswer: string
): Promise<number> {
  try {
    if (!actualAnswer.trim() || !expectedAnswer.trim()) return 0

    // 并行执行两种评估方法
    const [semanticScore, factScore] = await Promise.all([
      // 方法 1：Embedding 语义相似度
      (async () => {
        try {
          const actualEmb = await fetchEmbedding(actualAnswer)
          const expectedEmb = await fetchEmbedding(expectedAnswer)
          if (actualEmb && expectedEmb) {
            return Math.max(0, cosineSimilarity(actualEmb, expectedEmb))
          }
          return -1
        } catch {
          return -1
        }
      })(),
      // 方法 2：LLM 事实匹配
      (async () => {
        const prompt = `你是一个答案评估专家。请比较以下"实际答案"与"期望答案"的事实一致性。

**期望答案**：
${expectedAnswer}

**实际答案**：
${actualAnswer}

**评估标准**：
- 1.0：完全一致，覆盖了所有关键事实
- 0.7-0.9：大部分一致，可能遗漏少量细节
- 0.4-0.6：部分一致，有明显遗漏或偏差
- 0.1-0.3：少量一致，大部分不匹配
- 0.0：完全不一致或答非所问

**输出格式**（严格按此格式，只输出 JSON，不输出其他内容）：
{"score": <0到1的小数>}`

        const result = await fetchAi(prompt)
        return parseScoreFromJSON(result, 'score')
      })()
    ])

    // 加权融合：若某一方法失败则使用另一方法的结果
    if (semanticScore < 0 && factScore < 0) return -1
    if (semanticScore < 0) return factScore
    if (factScore < 0) return semanticScore
    return 0.4 * semanticScore + 0.6 * factScore
  } catch (e) {
    logger.evaluation.error('答案正确性评估失败:', e)
    return -1
  }
}

/**
 * 评估答案完整性 (Answer Completeness) — P2
 * 衡量：答案是否覆盖了用户问题的所有要点
 * 方法：LLM 判断答案对问题各要点的覆盖度
 */
export async function evaluateAnswerCompleteness(
  query: string,
  answer: string
): Promise<number> {
  try {
    if (!query.trim() || !answer.trim()) return 0

    const prompt = `你是一个答案质量评估专家。

**任务**：判断以下"回答"是否完整地覆盖了"问题"中的所有要点。

**问题**：
${query}

**回答**：
${answer}

**评估步骤**：
1. 分析"问题"中包含的所有要点和子问题
2. 逐一检查"回答"是否对每个要点都给出了回应
3. 计算完整度 = 被回答覆盖的要点数 / 问题中的总要点数

**输出格式**（严格按此格式，只输出 JSON，不输出其他内容）：
{"total_aspects": <数字>, "covered_aspects": <数字>, "score": <0到1的小数>}`

    const result = await fetchAi(prompt)
    return parseScoreFromJSON(result, 'score')
  } catch (e) {
    logger.evaluation.error('答案完整性评估失败:', e)
    return -1
  }
}

/**
 * 获取当前评审模型名称
 */
export async function getJudgeModelName(): Promise<string> {
  try {
    const store = await Store.load('store.json')
    const modelKey = await store.get<string>('primaryModel')

    // 本地推理模型
    if (modelKey === 'local-llama-server') {
      const modelStr = await store.get<string>('localChatModelStr') || 'local-model'
      return `local:${modelStr}`
    }

    // 云端模型：从 aiModelList 中查找
    const aiConfigs = await store.get<AiConfig[]>('aiModelList')
    const config = aiConfigs?.find(item => item.key === modelKey)
    if (config) {
      return config.model || config.title || modelKey || 'unknown'
    }

    return modelKey || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * 执行完整的 RAG 多维度评估（从三元组扩展为五维度）
 * 维度：忠实度、回答相关性、上下文精度、上下文召回率、答案完整性
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
    logger.evaluation.info('开始 RAG 多维度评估...')
    const startTime = Date.now()

    // 串行执行五项评估，避免对弱模型造成并发压力
    const faithfulness = await evaluateFaithfulness(answer, contexts)
    const answerRelevance = await evaluateAnswerRelevance(query, answer)
    const contextPrecision = await evaluateContextPrecision(query, contexts)
    const contextRecall = await evaluateContextRecall(answer, contexts)           // 无 ground truth 模式
    const answerCompleteness = await evaluateAnswerCompleteness(query, answer)

    // 获取评审模型名称
    const judgeModel = await getJudgeModelName()

    const evalRecord: RagEvaluation = {
      id: generateEvalId(),
      query,
      answer: answer.slice(0, 2000), // 限制存储大小
      contexts: contexts.map(c => c.slice(0, 500)),
      faithfulness,
      answerRelevance,
      contextPrecision,
      contextRecall,
      answerCompleteness,
      judgeModel,
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
      `精度: ${contextPrecision.toFixed(2)}, ` +
      `召回: ${contextRecall.toFixed(2)}, ` +
      `完整性: ${answerCompleteness.toFixed(2)}`
    )

    return evalRecord
  } catch (e) {
    logger.evaluation.error('RAG 多维度评估失败:', e)
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
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
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
