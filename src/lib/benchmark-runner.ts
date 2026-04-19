import { logger } from '@/utils/logger'
import { Store } from '@tauri-apps/plugin-store'
import { invoke } from '@tauri-apps/api/core'
import { getRetrievedDocsWithMetrics, type Keyword } from './rag'
import {
  evaluateRAGTriad,
  evaluateContextRecall,
  evaluateAnswerCorrectness,
  getJudgeModelName
} from './rag-evaluator'
import { fetchAiStream } from './ai'
import {
  type BenchmarkItem,
  type BenchmarkRun,
  type BenchmarkRunDetail,
  readEvalFile,
  appendEvalRecord,
  EVAL_FILES,
  generateEvalId
} from './eval-storage'

// ==========================================
// 回归测试执行器
// ==========================================

/**
 * 获取当前 RAG 参数快照
 */
async function getConfigSnapshot() {
  const store = await Store.load('store.json')
  return {
    chunkSize: (await store.get<number>('ragChunkSize')) || 1000,
    chunkOverlap: (await store.get<number>('ragChunkOverlap')) || 200,
    resultCount: (await store.get<number>('ragResultCount')) || 5,
    similarityThreshold: (await store.get<number>('ragSimilarityThreshold')) || 0.7
  }
}

/**
 * 对单个测试用例执行 RAG 查询 + 多维度评估
 */
async function runSingleCase(
  benchmark: BenchmarkItem
): Promise<BenchmarkRunDetail | null> {
  try {
    const query = benchmark.question
    const startTime = performance.now()

    // 1. 提取关键词
    let keywords: Keyword[]
    if (query.length > 10) {
      const rawKeywords = await invoke<{ text: string; weight: number }[]>('rank_keywords', {
        text: query,
        topK: 3
      })
      keywords = rawKeywords.map(k => ({ text: k.text, weight: 1.0 }))
    } else {
      keywords = [{ text: query, weight: 1.0 }]
    }

    // 2. 检索文档（带指标）
    const { docs, metrics } = await getRetrievedDocsWithMetrics(query, keywords)
    const contexts = docs.map(d => d.content)

    // 3. 生成回答
    let ragContext = ''
    if (docs.length > 0) {
      ragContext = docs.map(ctx => `文件：${ctx.filename}\n${ctx.content}\n`).join('\n---\n\n')
    }

    const finalPrompt = `${ragContext ? `以下是相关的参考资料：\n${ragContext}\n\n` : ''}请回答以下问题：\n${query}`

    let answer = ''
    await fetchAiStream(finalPrompt, (chunk) => {
      answer = chunk
    })

    const totalLatency = Math.round(performance.now() - startTime)

    // 4. 三元组评估（含上下文召回率实时模式和答案完整性）
    const evalResult = await evaluateRAGTriad(query, answer, contexts, {
      retrievalLatencyMs: metrics.totalLatencyMs,
      totalLatencyMs: totalLatency,
      vectorCount: metrics.vectorCount,
      fuzzyCount: metrics.fuzzyCount,
      rerankApplied: metrics.rerankApplied
    })

    // 5. 回归测试独有的额外指标（需要 ground truth）——串行执行
    const contextRecallGT = await evaluateContextRecall(answer, contexts, benchmark.expectedAnswer)
    const answerCorrectness = await evaluateAnswerCorrectness(answer, benchmark.expectedAnswer)

    return {
      benchmarkId: benchmark.id,
      question: query,
      actualAnswer: answer.slice(0, 1000),
      contexts: contexts.map(c => c.slice(0, 300)),
      faithfulness: evalResult?.faithfulness ?? -1,
      answerRelevance: evalResult?.answerRelevance ?? -1,
      contextPrecision: evalResult?.contextPrecision ?? -1,
      contextRecall: contextRecallGT,
      answerCorrectness,
      answerCompleteness: evalResult?.answerCompleteness ?? -1,
      latencyMs: totalLatency
    }
  } catch (e) {
    logger.evaluation.error(`测试用例执行失败 (${benchmark.question.slice(0, 30)}...):`, e)
    return null
  }
}

/**
 * 执行回归测试
 * @param benchmarkIds 指定测试用例 ID 列表，为空则测试全部
 * @param runName 本次运行的名称
 * @param onProgress 进度回调
 */
export async function runBenchmark(
  benchmarkIds?: string[],
  runName?: string,
  onProgress?: (current: number, total: number, question: string) => void
): Promise<BenchmarkRun | null> {
  try {
    const allBenchmarks = await readEvalFile<BenchmarkItem>(EVAL_FILES.benchmarks)

    // 过滤要运行的用例
    const casesToRun = benchmarkIds
      ? allBenchmarks.filter(b => benchmarkIds.includes(b.id))
      : allBenchmarks

    if (casesToRun.length === 0) {
      logger.evaluation.warn('没有可运行的测试用例')
      return null
    }

    logger.evaluation.info(`开始回归测试，共 ${casesToRun.length} 个用例...`)

    const configSnapshot = await getConfigSnapshot()
    const results: BenchmarkRunDetail[] = []

    for (let i = 0; i < casesToRun.length; i++) {
      const benchmark = casesToRun[i]
      onProgress?.(i + 1, casesToRun.length, benchmark.question.slice(0, 30))

      const result = await runSingleCase(benchmark)
      if (result) {
        results.push(result)
      }
    }

    // 计算聚合指标
    const validResults = results.filter(r => r.faithfulness >= 0)
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    // 过滤有效值（>= 0）后再平均
    const avgValid = (arr: (number | undefined)[]) => {
      const valid = arr.filter((v): v is number => v !== undefined && v >= 0)
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
    }

    const judgeModel = await getJudgeModelName()

    const run: BenchmarkRun = {
      id: generateEvalId(),
      runName: runName || `回归测试 ${new Date().toLocaleString('zh-CN')}`,
      configSnapshot,
      avgFaithfulness: avg(validResults.map(r => r.faithfulness)),
      avgRelevance: avg(validResults.map(r => r.answerRelevance)),
      avgPrecision: avg(validResults.map(r => r.contextPrecision)),
      avgRecall: avgValid(results.map(r => r.contextRecall)),
      avgCorrectness: avgValid(results.map(r => r.answerCorrectness)),
      avgCompleteness: avgValid(results.map(r => r.answerCompleteness)),
      judgeModel,
      avgLatencyMs: avg(results.map(r => r.latencyMs)),
      totalCases: casesToRun.length,
      results,
      createdAt: Date.now()
    }

    // 持久化
    await appendEvalRecord(EVAL_FILES.benchmarkRuns, run)

    logger.evaluation.info(
      `回归测试完成 — 忠实度: ${run.avgFaithfulness.toFixed(2)}, ` +
      `相关性: ${run.avgRelevance.toFixed(2)}, ` +
      `精度: ${run.avgPrecision.toFixed(2)}, ` +
      `召回: ${(run.avgRecall ?? 0).toFixed(2)}, ` +
      `正确性: ${(run.avgCorrectness ?? 0).toFixed(2)}, ` +
      `完整性: ${(run.avgCompleteness ?? 0).toFixed(2)}, ` +
      `平均延迟: ${run.avgLatencyMs.toFixed(0)}ms`
    )

    return run
  } catch (e) {
    logger.evaluation.error('回归测试执行失败:', e)
    return null
  }
}

/**
 * 获取所有回归测试运行记录
 */
export async function getAllBenchmarkRuns(): Promise<BenchmarkRun[]> {
  return await readEvalFile<BenchmarkRun>(EVAL_FILES.benchmarkRuns)
}
