//FileSidebar.vue
<template>
  <div class="w-full h-full flex flex-col bg-sidebar text-sidebar-foreground">
    <!-- 工具栏 -->
    <FileToolbar />

    <!-- 文件树滚动区域 -->
    <div 
      ref="scrollContainer"
      class="flex-1 overflow-x-hidden overflow-y-auto scrollbar-activity-show"
      :class="{ 'is-scrolling': isScrolling }"
    >
      <FileManager />
    </div>

    <!-- 底部工作区选择器 -->
    <WorkspaceSelector />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useScroll } from '@vueuse/core'
import { useArticleStore } from '@/stores/article'
import FileToolbar from './components/FileToolbar.vue'
import FileManager from './components/FileManager.vue'
import WorkspaceSelector from './components/WorkspaceSelector.vue'

const articleStore = useArticleStore()
const scrollContainer = ref<HTMLElement | null>(null)
const { isScrolling } = useScroll(scrollContainer)

// 初始化时加载折叠列表（决定哪些文件夹是展开还是收起的）
onMounted(async () => {
  await articleStore.initCollapsibleList()
})
</script>