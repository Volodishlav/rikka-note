import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getGraphByPath, upsertGraph, type Graph } from '@/db/graph'
import { fetchAi } from '@/lib/ai'
import { useArticleStore } from '@/stores/article'
import { useWorkspaceStore } from '@/stores/workspace'
import { logger } from '@/utils/logger'

export const useGraphStore = defineStore('graph', () => {
  const currentGraph = ref<Graph | null>(null)
  const isGenerating = ref(false)
  const articleStore = useArticleStore()
  const workspaceStore = useWorkspaceStore()

  // 用户配置状态
  const selectedType = ref('auto')
  const granularity = ref('medium')

  // 加载当前笔记的图谱
  const loadGraph = async (path: string) => {
    if (!path) {
      currentGraph.value = null
      return
    }
    try {
      logger.graph.debug(`[GraphStore] 正在加载图谱: ${path}`)
      const graph = await getGraphByPath(path)
      currentGraph.value = graph
      if (graph) {
        logger.graph.info(`[GraphStore] 图谱加载成功: ${path}`)
        // 恢复上次使用的配置（可选，目前通过界面驱动）
        if (graph.diagramType) selectedType.value = graph.diagramType
        if (graph.granularity) granularity.value = graph.granularity
      } else {
        logger.graph.debug(`[GraphStore] 该笔记尚未生成图谱: ${path}`)
      }
    } catch (err) {
      logger.graph.error(`[GraphStore] 加载图谱失败: ${path}`, err)
      currentGraph.value = null
    }
  }

  // 生成图谱
  const generateGraph = async (path: string, content: string) => {
    if (!content) {
      logger.graph.warn(`[GraphStore] 笔记内容为空，取消生成: ${path}`)
      return
    }
    isGenerating.value = true
    logger.graph.info(`[GraphStore] 开始为笔记生成图谱: ${path}`)
    try {
      const typeDesc = selectedType.value === 'auto' 
        ? '从以下 Mermaid 支持的类型中自主选择最合适的一种：flowchart, sequenceDiagram, mindmap, timeline, classDiagram, stateDiagram-v2, erDiagram, journey, gantt, pie, quadrantChart, requirementDiagram, gitGraph, block-beta' 
        : `强制使用 Mermaid 的 ${selectedType.value} 类型`
      const granularityDesc = {
        coarse: '大纲级别，只保留核心概念和主线逻辑，节点数量控制在 5-8 个',
        medium: '标准级别，展示主要逻辑、关键步骤和重要关联，节点数量控制在 10-20 个',
        fine: '详细级别，深度解析每一个细节、分支和数据流向，节点数量不限'
      }[granularity.value as 'coarse' | 'medium' | 'fine']

      const prompt = `
你是一个专业的知识管理专家。请根据以下 Markdown 笔记内容，生成一段 Mermaid 代码来可视化展示其中的知识结构。

**生成配置：**
1. **图表类型**：${typeDesc}。
2. **详细程度**：${granularityDesc}。

**关键指令（行号映射，极其重要）：**
- 请务必在每个节点/参与者的显示文本末尾，附加该内容在原笔记中对应的行号。
- **格式严格为：\`【L行号】\`**（请严格使用中文全角方括号，绝对不要使用英文 []，以免破坏语法）。
- 无论你选择哪种图表类型，行号标记都必须作为纯文本的一部分。

**通用要求：**
- 确保生成的代码语法标准，能够被最新版本的 Mermaid 渲染。
- 只输出 Mermaid 代码块内容，不要包含解释性文字。

**笔记内容：**
${content}
`
      logger.graph.debug(`[GraphStore] 发送 AI 请求，Prompt 长度: ${prompt.length}`)
      const aiResponse = await fetchAi(prompt)
      logger.graph.debug(`[GraphStore] AI 响应原始内容: \n${aiResponse}`)
      
      // 只需要保留基础的 Markdown 代码块清理，兼容大模型可能多输出的 ```mermaid 标记
      // 注意：加了 /i 忽略大小写，且兼容有些模型不写 mermaid 的情况
      let mermaidCode = aiResponse.trim().replace(/^```(?:mermaid)?\s*\n?/i, '').replace(/\n?\s*```$/i, '')

      if (mermaidCode) {
        const newGraph: Graph = {
          articlePath: path,
          content: mermaidCode,
          updatedAt: Date.now(),
          diagramType: selectedType.value,
          granularity: granularity.value
        }
        await upsertGraph(newGraph)
        currentGraph.value = newGraph
        logger.graph.info(`[GraphStore] 图谱已保存并更新: ${path}`)
      } else {
        logger.graph.warn(`[GraphStore] AI 未返回有效的 Mermaid 代码`)
      }
    } catch (err) {
      logger.graph.error(`[GraphStore] 生成图谱过程中发生错误: ${path}`, err)
    } finally {
      isGenerating.value = false
    }
  }

  // 监听当前活跃文件变化
  watch(() => articleStore.activeFilePath, async (newPath) => {
    if (newPath) {
      await loadGraph(newPath)
    } else {
      currentGraph.value = null
    }
  }, { immediate: true })

  // 监听工作区变化
  watch(() => workspaceStore.activeWorkspace, () => {
    currentGraph.value = null
  })

  return {
    currentGraph,
    isGenerating,
    selectedType,
    granularity,
    loadGraph,
    generateGraph
  }
})
