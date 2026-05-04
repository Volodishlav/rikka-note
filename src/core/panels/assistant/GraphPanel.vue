<template>
  <div class="flex flex-col h-full w-full bg-background border-l relative overflow-hidden select-none">
    <!-- 头部：切换和操作 -->
    <div class="flex flex-col border-b bg-muted/30">
      <div class="flex items-center justify-between p-3 pb-2">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-bold flex items-center gap-2">
            <Share2 class="w-4 h-4 text-brand-purple" />
            {{ t('graph.title') }}
          </h3>
        </div>
        <div class="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-8 w-8" 
            @click="handleRefresh"
            :disabled="graphStore.isGenerating || !articleStore.activeFilePath"
            :title="t('graph.refresh')"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': graphStore.isGenerating }" />
          </Button>
        </div>
      </div>

      <!-- 高级控制栏 -->
      <div class="px-3 pb-3 flex flex-wrap items-center gap-2">
        <!-- 类型选择 -->
        <select 
          v-model="graphStore.selectedType"
          class="text-[10px] bg-background border rounded px-1.5 py-1 outline-none focus:ring-1 ring-brand-purple/50 flex-1 min-w-[80px] appearance-none cursor-pointer hover:bg-muted/50 transition-colors"
          :disabled="graphStore.isGenerating"
        >
          <option v-for="(label, key) in (tm('graph.types') as Record<string, string>)" :key="key" :value="key">
            {{ label }}
          </option>
        </select>

        <!-- 粒度选择 -->
        <div class="flex items-center bg-background border rounded p-0.5">
          <button 
            v-for="(label, key) in (tm('graph.granularityLabels') as Record<string, string>)" 
            :key="key"
            @click="graphStore.granularity = key"
            class="px-2 py-0.5 text-[10px] rounded transition-colors whitespace-nowrap"
            :class="graphStore.granularity === key ? 'bg-brand-purple text-white shadow-sm' : 'hover:bg-muted text-muted-foreground'"
            :disabled="graphStore.isGenerating"
          >
            {{ label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主体区域 -->
    <div 
      class="flex-1 relative overflow-hidden p-4 flex items-center justify-center min-h-0 cursor-grab active:cursor-grabbing"
      @mousedown="startPan"
      @mousemove="onPan"
      @mouseup="endPan"
      @mouseleave="endPan"
      @wheel.prevent="handleWheel"
    >
      <!-- 无笔记打开 -->
      <div v-if="!articleStore.activeFilePath" class="flex flex-col items-center gap-4 text-muted-foreground opacity-60">
        <FileQuestion class="w-12 h-12" />
        <p class="text-sm">{{ t('graph.noActiveFile') }}</p>
      </div>

      <!-- 有笔记但无图谱 -->
      <div v-else-if="!graphStore.currentGraph && !graphStore.isGenerating" class="flex flex-col items-center gap-4">
        <div class="p-6 rounded-2xl bg-muted/20 border-2 border-dashed border-muted flex flex-col items-center gap-4 max-w-[280px] text-center">
          <div class="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple">
            <Sparkles class="w-8 h-8" />
          </div>
          <div class="space-y-1">
            <h4 class="font-bold">{{ t('graph.emptyTitle') }}</h4>
            <p class="text-xs text-muted-foreground">{{ t('graph.emptyDesc') }}</p>
          </div>
          <Button @click="handleGenerate" class="w-full bg-brand-purple hover:bg-brand-purple/90 text-white gap-2">
            <Zap class="w-4 h-4" />
            {{ t('graph.generateBtn') }}
          </Button>
        </div>
      </div>

      <!-- 生成中 -->
      <div v-else-if="graphStore.isGenerating" class="flex flex-col items-center gap-6">
        <div class="relative w-20 h-20">
          <div class="absolute inset-0 border-4 border-brand-purple/20 rounded-full"></div>
          <div class="absolute inset-0 border-4 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
          <div class="absolute inset-0 flex items-center justify-center text-brand-purple">
            <Sparkles class="w-8 h-8 animate-pulse" />
          </div>
        </div>
        <div class="text-center space-y-2">
          <p class="font-medium animate-pulse">{{ t('graph.generating') }}</p>
          <p class="text-xs text-muted-foreground max-w-[200px]">{{ t('graph.generatingDesc') }}</p>
        </div>
      </div>

      <!-- 图谱显示区域 -->
      <div 
        v-else-if="graphStore.currentGraph" 
        ref="graphContainer" 
        class="w-full h-full flex items-center justify-center mermaid-container transition-transform duration-75 ease-out"
        :style="{ 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: 'center center' 
        }"
      >
        <!-- 渲染后的 SVG 会插入到这里 -->
        <div v-html="svgContent" class="w-full h-full flex items-center justify-center overflow-visible"></div>
      </div>
    </div>

    <!-- 底部控制：缩放 -->
    <div v-if="graphStore.currentGraph" class="absolute bottom-4 right-4 flex items-center gap-2 p-1.5 rounded-full bg-background/80 backdrop-blur border shadow-lg z-10">
      <Button variant="ghost" size="icon" class="h-8 w-8 rounded-full" @click="zoomOut">
        <Minus class="w-4 h-4" />
      </Button>
      <span class="text-[10px] font-mono min-w-[32px] text-center">{{ Math.round(zoom * 100) }}%</span>
      <Button variant="ghost" size="icon" class="h-8 w-8 rounded-full" @click="zoomIn">
        <Plus class="w-4 h-4" />
      </Button>
      <div class="w-px h-4 bg-border mx-1"></div>
      <Button variant="ghost" size="icon" class="h-8 w-8 rounded-full" @click="resetZoom">
        <Maximize2 class="w-4 h-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { 
  Share2, RefreshCw, Sparkles, Zap, Minus, Plus, Maximize2, 
  FileQuestion 
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useGraphStore } from '@/stores/graph'
import { useArticleStore } from '@/stores/article'
import { useI18n } from '@/composables/useI18n'
import mermaid from 'mermaid'
import { logger } from '@/utils/logger'

const { t, tm } = useI18n()
const graphStore = useGraphStore()
const articleStore = useArticleStore()

const graphContainer = ref<HTMLElement | null>(null)
const svgContent = ref('')
const zoom = ref(1)
const offset = ref({ x: 0, y: 0 })

// 平移逻辑
const isPanning = ref(false)
const startPos = ref({ x: 0, y: 0 })

const startPan = (e: MouseEvent) => {
  if (!graphStore.currentGraph) return
  isPanning.value = true
  startPos.value = { x: e.clientX - offset.value.x, y: e.clientY - offset.value.y }
}

const onPan = (e: MouseEvent) => {
  if (!isPanning.value) return
  offset.value = {
    x: e.clientX - startPos.value.x,
    y: e.clientY - startPos.value.y
  }
}

const endPan = () => {
  isPanning.value = false
}

const handleWheel = (e: WheelEvent) => {
  if (!graphStore.currentGraph) return
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  zoom.value = Math.min(Math.max(zoom.value + delta, 0.3), 3)
}

// ============================================
// 全局跳转逻辑
// ============================================
const setupNodeClickHandlers = () => {
  if (!graphContainer.value) return
  
  const svg = graphContainer.value.querySelector('svg')
  if (!svg) return

  // 查找所有可能的文本节点
  const labels = svg.querySelectorAll('.label, text, tspan, .actor')
  
  labels.forEach(label => {
    const text = label.textContent || ''
    
    // 匹配我们的专属格式：【L数字】
    const match = text.match(/【L(\d+)】/)
    
    if (match) {
      const line = parseInt(match[1])
      
      // 视觉优化：将 【Lxx】 从图表中移除，让用户看不到这个标记
      if (label.childNodes.length > 0) {
          // 如果是复杂的 text/tspan 结构，安全地替换文本节点内容
          label.childNodes.forEach(child => {
              if (child.nodeType === Node.TEXT_NODE && child.textContent) {
                  child.textContent = child.textContent.replace(/【L\d+】/, '')
              }
          })
      } else {
          label.textContent = text.replace(/【L\d+】/, '')
      }
      
      // 找到最近的祖先交互节点元素 (.node, .actor 等)
      let nodeEl = label.parentElement
      while (nodeEl && !nodeEl.classList.contains('node') && !nodeEl.classList.contains('actor') && nodeEl !== svg) {
        nodeEl = nodeEl.parentElement
      }

      // 绑定点击事件
      if (nodeEl && (nodeEl.classList.contains('node') || nodeEl.classList.contains('actor'))) {
        nodeEl.style.cursor = 'pointer'
        // 添加悬浮反馈
        nodeEl.addEventListener('mouseenter', () => (nodeEl as HTMLElement).style.opacity = '0.8')
        nodeEl.addEventListener('mouseleave', () => (nodeEl as HTMLElement).style.opacity = '1')

        nodeEl.onclick = (e) => {
          e.stopPropagation()
          logger.graph.info(`[GraphPanel] 点击节点，精确跳转到行: ${line}`)
          articleStore.setMatchPosition(line) 
        }
      }
    }
  })
}

// 初始化 Mermaid
logger.graph.debug('[GraphPanel] 正在初始化 Mermaid (HandDrawn 模式)')
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  look: 'handDrawn',
  fontFamily: 'inherit',
  securityLevel: 'loose', // 允许交互
  flowchart: { htmlLabels: true, useMaxWidth: false },
  mindmap: { useMaxWidth: false }
})

const renderGraph = async () => {
  if (!graphStore.currentGraph?.content) {
    logger.graph.debug('[GraphPanel] 没有图谱内容可渲染')
    return
  }
  
  try {
    const id = `mermaid-${Date.now()}`
    logger.graph.debug(`[GraphPanel] 开始渲染 Mermaid 图表, ID: ${id}`)
    const { svg } = await mermaid.render(id, graphStore.currentGraph.content)
    svgContent.value = svg
    logger.graph.info('[GraphPanel] Mermaid 渲染成功')
    nextTick(() => {
        resetZoom()
        setupNodeClickHandlers()
    })
  } catch (err) {
    logger.graph.error('[GraphPanel] Mermaid 渲染失败:', err)
    svgContent.value = `<div class="p-4 text-destructive border-2 border-dashed border-destructive/20 rounded-xl text-center">
      <p class="font-bold">渲染失败</p>
      <p class="text-xs opacity-70 mt-1">代码语法有误，请尝试点击刷新重试</p>
    </div>`
  }
}

const handleGenerate = async () => {
  if (articleStore.activeFilePath) {
    logger.graph.info(`[GraphPanel] 用户触发生成图谱: ${articleStore.activeFilePath}`)
    const content = articleStore.fileBuffers[articleStore.activeFilePath] || ''
    await graphStore.generateGraph(articleStore.activeFilePath, content)
  }
}

const handleRefresh = async () => {
  await handleGenerate()
}

// 缩放逻辑
const zoomIn = () => { zoom.value = Math.min(zoom.value + 0.1, 3) }
const zoomOut = () => { zoom.value = Math.max(zoom.value - 0.1, 0.3) }
const resetZoom = () => { 
  zoom.value = 1 
  offset.value = { x: 0, y: 0 }
}

watch(() => graphStore.currentGraph, async () => {
  await renderGraph()
})

onMounted(async () => {
  if (graphStore.currentGraph) {
    await renderGraph()
  }
})
</script>

<style scoped>
.mermaid-container :deep(svg) {
  height: auto !important;
  max-width: none !important; /* 允许超出容器平移 */
  filter: drop-shadow(0 10px 15px rgba(0,0,0,0.05));
}

.mermaid-container :deep(.node:hover rect),
.mermaid-container :deep(.node:hover circle),
.mermaid-container :deep(.node:hover ellipse),
.mermaid-container :deep(.node:hover polygon),
.mermaid-container :deep(.node:hover path) {
  stroke: var(--brand-purple) !important;
  stroke-width: 2.5px !important;
  transition: all 0.2s ease;
}

/* 注入一些 CSS 增强手绘感 */
.mermaid-container :deep(.node rect),
.mermaid-container :deep(.node circle),
.mermaid-container :deep(.node ellipse),
.mermaid-container :deep(.node polygon),
.mermaid-container :deep(.node path) {
  stroke-width: 1.5px !important;
}

.mermaid-container :deep(.label) {
  font-family: 'Comic Sans MS', 'Cursive', inherit !important;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}


.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
