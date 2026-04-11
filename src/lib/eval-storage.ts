import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { getWorkspacePath } from './workspace'
import { logger } from '@/utils/logger'

// ==========================================
// 类型定义
// ==========================================

/** 单次 RAG 评估记录 */
export interface RagEvaluation {
  id: string
  query: string
  answer: string
  contexts: string[]
  faithfulness: number
  answerRelevance: number
  contextPrecision: number
  retrievalLatencyMs: number
  totalLatencyMs: number
  vectorCount: number
  fuzzyCount: number
  rerankApplied: boolean
  createdAt: number
}

/** 测试 Q&A 对 */
export interface BenchmarkItem {
  id: string
  question: string
  expectedAnswer: string
  sourceFile: string
  createdAt: number
}

/** 回归测试单条结果 */
export interface BenchmarkRunDetail {
  benchmarkId: string
  question: string
  actualAnswer: string
  contexts: string[]
  faithfulness: number
  answerRelevance: number
  contextPrecision: number
  latencyMs: number
}

/** 回归测试运行结果 */
export interface BenchmarkRun {
  id: string
  runName: string
  configSnapshot: {
    chunkSize: number
    chunkOverlap: number
    resultCount: number
    similarityThreshold: number
  }
  avgFaithfulness: number
  avgRelevance: number
  avgPrecision: number
  avgLatencyMs: number
  totalCases: number
  results: BenchmarkRunDetail[]
  createdAt: number
}

// 评估目录名
const EVAL_DIR = '.rikka_eval'

// 文件名常量
export const EVAL_FILES = {
  evaluations: 'evaluations.json',
  benchmarks: 'benchmarks.json',
  benchmarkRuns: 'benchmark_runs.json',
} as const

// ==========================================
// 核心读写函数
// ==========================================

/** 获取评估目录的绝对路径 */
async function getEvalDirPath(): Promise<string> {
  const workspace = await getWorkspacePath()
  return await join(workspace.path, EVAL_DIR)
}

/** 确保评估目录存在 */
async function ensureEvalDir(): Promise<string> {
  const evalDir = await getEvalDirPath()
  try {
    const dirExists = await exists(evalDir)
    if (!dirExists) {
      await mkdir(evalDir, { recursive: true })
      logger.evaluation.info('已创建评估数据目录:', evalDir)
    }
  } catch (e) {
    logger.evaluation.error('创建评估目录失败:', e)
  }
  return evalDir
}

/** 读取 JSON 文件并解析 */
export async function readEvalFile<T>(filename: string): Promise<T[]> {
  try {
    const evalDir = await ensureEvalDir()
    const filePath = await join(evalDir, filename)
    const fileExists = await exists(filePath)
    if (!fileExists) {
      return []
    }
    const content = await readTextFile(filePath)
    return JSON.parse(content) as T[]
  } catch (e) {
    logger.evaluation.error(`读取评估文件 ${filename} 失败:`, e)
    return []
  }
}

/** 将数据写入 JSON 文件 */
export async function writeEvalFile<T>(filename: string, data: T[]): Promise<void> {
  try {
    const evalDir = await ensureEvalDir()
    const filePath = await join(evalDir, filename)
    await writeTextFile(filePath, JSON.stringify(data, null, 2))
  } catch (e) {
    logger.evaluation.error(`写入评估文件 ${filename} 失败:`, e)
  }
}

/** 向数组型 JSON 文件追加一条记录 */
export async function appendEvalRecord<T>(filename: string, record: T): Promise<void> {
  const records = await readEvalFile<T>(filename)
  records.push(record)
  await writeEvalFile(filename, records)
}

/** 从数组型 JSON 文件删除指定 id 的记录 */
export async function deleteEvalRecord(filename: string, id: string): Promise<void> {
  const records = await readEvalFile<{ id: string }>(filename)
  const filtered = records.filter(r => r.id !== id)
  await writeEvalFile(filename, filtered)
}

/** 清空评估文件 */
export async function clearEvalFile(filename: string): Promise<void> {
  await writeEvalFile(filename, [])
}

/** 生成唯一 ID */
export function generateEvalId(): string {
  return `eval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
