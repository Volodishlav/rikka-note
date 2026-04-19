import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/utils/logger'
import {
  type RagEvaluation,
  type BenchmarkItem,
  type BenchmarkRun,
  readEvalFile,
  deleteEvalRecord,
  clearEvalFile,
  EVAL_FILES
} from '@/lib/eval-storage'
import { evaluateRAGTriad } from '@/lib/rag-evaluator'
import { generateBenchmarkFromFiles, getAllBenchmarks } from '@/lib/benchmark-generator'
import { runBenchmark, getAllBenchmarkRuns } from '@/lib/benchmark-runner'

export const useEvaluationStore = defineStore('evaluation', () => {
  // ==========================================
  // 状态
  // ==========================================
  const evaluations = ref<RagEvaluation[]>([])
  const benchmarks = ref<BenchmarkItem[]>([])
  const benchmarkRuns = ref<BenchmarkRun[]>([])

  // 进行中状态
  const isEvaluating = ref(false)
  const isGenerating = ref(false)
  const isRunningBenchmark = ref(false)

  // 进度
  const generationProgress = ref({ current: 0, total: 0, fileName: '' })
  const benchmarkProgress = ref({ current: 0, total: 0, question: '' })

  // ==========================================
  // 计算属性 — 聚合统计
  // ==========================================
  const stats = computed(() => {
    const valid = evaluations.value.filter(
      e => e.faithfulness >= 0 && e.answerRelevance >= 0 && e.contextPrecision >= 0
    )
    const avg = (arr: number[]) => arr.length > 0
      ? arr.reduce((a, b) => a + b, 0) / arr.length
      : 0

    return {
      totalEvaluations: evaluations.value.length,
      avgFaithfulness: avg(valid.map(e => e.faithfulness)),
      avgRelevance: avg(valid.map(e => e.answerRelevance)),
      avgPrecision: avg(valid.map(e => e.contextPrecision)),
      // 新增维度（兼容旧数据：过滤掉无该字段的记录）
      avgRecall: avg(valid.filter(e => (e.contextRecall ?? -1) >= 0).map(e => e.contextRecall!)),
      avgCompleteness: avg(valid.filter(e => (e.answerCompleteness ?? -1) >= 0).map(e => e.answerCompleteness!)),
      avgLatency: avg(valid.map(e => e.retrievalLatencyMs)),
      rerankUsageRate: valid.length > 0
        ? valid.filter(e => e.rerankApplied).length / valid.length
        : 0
    }
  })

  // ==========================================
  // 计算属性 — 趋势分析（最近10条 vs 之前10条）
  // ==========================================
  const trends = computed(() => {
    const valid = evaluations.value.filter(
      e => e.faithfulness >= 0 && e.answerRelevance >= 0 && e.contextPrecision >= 0
    )
    if (valid.length < 6) return null // 数据太少无法判断趋势

    const avg = (arr: number[]) => arr.length > 0
      ? arr.reduce((a, b) => a + b, 0) / arr.length
      : 0

    const halfPoint = Math.floor(valid.length / 2)
    const recent = valid.slice(halfPoint)
    const previous = valid.slice(0, halfPoint)

    const calcTrend = (recentVal: number, prevVal: number): 'up' | 'down' | 'stable' => {
      const diff = recentVal - prevVal
      if (diff > 0.03) return 'up'    // 上升超过 3%
      if (diff < -0.03) return 'down' // 下降超过 3%
      return 'stable'
    }

    return {
      faithfulness: calcTrend(avg(recent.map(e => e.faithfulness)), avg(previous.map(e => e.faithfulness))),
      relevance: calcTrend(avg(recent.map(e => e.answerRelevance)), avg(previous.map(e => e.answerRelevance))),
      precision: calcTrend(avg(recent.map(e => e.contextPrecision)), avg(previous.map(e => e.contextPrecision))),
      recall: calcTrend(
        avg(recent.filter(e => (e.contextRecall ?? -1) >= 0).map(e => e.contextRecall!)),
        avg(previous.filter(e => (e.contextRecall ?? -1) >= 0).map(e => e.contextRecall!))
      ),
      completeness: calcTrend(
        avg(recent.filter(e => (e.answerCompleteness ?? -1) >= 0).map(e => e.answerCompleteness!)),
        avg(previous.filter(e => (e.answerCompleteness ?? -1) >= 0).map(e => e.answerCompleteness!))
      ),
    }
  })

  // ==========================================
  // 计算属性 — 回归测试 diff 对比
  // ==========================================
  const latestRunDiff = computed(() => {
    if (benchmarkRuns.value.length < 2) return null
    const sorted = [...benchmarkRuns.value].sort((a, b) => b.createdAt - a.createdAt)
    const current = sorted[0]
    const previous = sorted[1]
    return {
      faithfulness: current.avgFaithfulness - previous.avgFaithfulness,
      relevance: current.avgRelevance - previous.avgRelevance,
      precision: current.avgPrecision - previous.avgPrecision,
      recall: (current.avgRecall ?? 0) - (previous.avgRecall ?? 0),
      correctness: (current.avgCorrectness ?? 0) - (previous.avgCorrectness ?? 0),
      completeness: (current.avgCompleteness ?? 0) - (previous.avgCompleteness ?? 0),
      latency: current.avgLatencyMs - previous.avgLatencyMs,
    }
  })

  // ==========================================
  // Actions — 数据加载
  // ==========================================
  async function loadEvaluations() {
    try {
      evaluations.value = await readEvalFile<RagEvaluation>(EVAL_FILES.evaluations)
    } catch (e) {
      logger.evaluation.error('加载评估记录失败:', e)
    }
  }

  async function loadBenchmarks() {
    try {
      benchmarks.value = await getAllBenchmarks()
    } catch (e) {
      logger.evaluation.error('加载测试集失败:', e)
    }
  }

  async function loadBenchmarkRuns() {
    try {
      benchmarkRuns.value = await getAllBenchmarkRuns()
    } catch (e) {
      logger.evaluation.error('加载回归测试记录失败:', e)
    }
  }

  async function loadAll() {
    await Promise.all([loadEvaluations(), loadBenchmarks(), loadBenchmarkRuns()])
  }

  // ==========================================
  // Actions — 评估操作
  // ==========================================

  /** 异步后台评估（聊天时调用，不阻塞） */
  async function evaluateInBackground(
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
  ) {
    if (isEvaluating.value) return
    isEvaluating.value = true
    try {
      const result = await evaluateRAGTriad(query, answer, contexts, metrics)
      if (result) {
        evaluations.value.push(result)
      }
    } catch (e) {
      logger.evaluation.error('后台评估失败:', e)
    } finally {
      isEvaluating.value = false
    }
  }

  // ==========================================
  // Actions — 测试集管理
  // ==========================================

  /** 从指定文件列表生成测试集，返回生成的用例数 */
  async function generateBenchmarks(
    filePaths: string[],
    pairsPerFile: number = 3
  ): Promise<number> {
    if (isGenerating.value) {
      logger.evaluation.warn('[Store] generateBenchmarks: 已在生成中，跳过')
      return 0
    }
    isGenerating.value = true
    generationProgress.value = { current: 0, total: filePaths.length, fileName: '' }
    logger.evaluation.info(`[Store] generateBenchmarks: 开始, ${filePaths.length} 个文件, 每文件 ${pairsPerFile} 对`)
    try {
      const items = await generateBenchmarkFromFiles(filePaths, pairsPerFile, (current, total, fileName) => {
        generationProgress.value = { current, total, fileName }
      })
      logger.evaluation.info(`[Store] generateBenchmarks: 生成完成, 共 ${items.length} 个用例`)
      await loadBenchmarks()
      return items.length
    } catch (e) {
      logger.evaluation.error('[Store] generateBenchmarks 失败:', e)
      throw e
    } finally {
      isGenerating.value = false
    }
  }

  /** 删除单个测试用例 */
  async function deleteBenchmark(id: string) {
    await deleteEvalRecord(EVAL_FILES.benchmarks, id)
    benchmarks.value = benchmarks.value.filter(b => b.id !== id)
  }

  /** 清空所有测试用例 */
  async function clearBenchmarks() {
    await clearEvalFile(EVAL_FILES.benchmarks)
    benchmarks.value = []
  }

  // ==========================================
  // Actions — 回归测试
  // ==========================================

  /** 执行回归测试 */
  async function executeBenchmarkRun(runName?: string) {
    if (isRunningBenchmark.value) return
    isRunningBenchmark.value = true
    benchmarkProgress.value = { current: 0, total: 0, question: '' }
    try {
      const run = await runBenchmark(undefined, runName, (current, total, question) => {
        benchmarkProgress.value = { current, total, question }
      })
      if (run) {
        benchmarkRuns.value.push(run)
      }
      return run
    } catch (e) {
      logger.evaluation.error('回归测试执行失败:', e)
      return null
    } finally {
      isRunningBenchmark.value = false
    }
  }

  /** 删除回归测试运行记录 */
  async function deleteBenchmarkRun(id: string) {
    await deleteEvalRecord(EVAL_FILES.benchmarkRuns, id)
    benchmarkRuns.value = benchmarkRuns.value.filter(r => r.id !== id)
  }

  // ==========================================
  // Actions — 清理
  // ==========================================

  /** 清空评估历史 */
  async function clearEvaluations() {
    await clearEvalFile(EVAL_FILES.evaluations)
    evaluations.value = []
  }

  /** 清空回归测试记录 */
  async function clearBenchmarkRuns() {
    await clearEvalFile(EVAL_FILES.benchmarkRuns)
    benchmarkRuns.value = []
  }

  return {
    // 状态
    evaluations,
    benchmarks,
    benchmarkRuns,
    isEvaluating,
    isGenerating,
    isRunningBenchmark,
    generationProgress,
    benchmarkProgress,
    stats,
    trends,
    latestRunDiff,
    // Actions
    loadAll,
    loadEvaluations,
    loadBenchmarks,
    loadBenchmarkRuns,
    evaluateInBackground,
    generateBenchmarks,
    deleteBenchmark,
    clearBenchmarks,
    executeBenchmarkRun,
    deleteBenchmarkRun,
    clearEvaluations,
    clearBenchmarkRuns
  }
})
