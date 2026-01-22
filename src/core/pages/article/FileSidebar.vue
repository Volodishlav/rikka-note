<template>
  <div class="w-full h-screen flex flex-col bg-sidebar text-sidebar-foreground">
    <!-- 工具栏 -->
    <FileToolbar />

    <!-- 文件树滚动区域 -->
    <div class="flex-1 overflow-x-hidden overflow-y-auto">
      <FileManager />
    </div>

    <!-- 底部工作区选择器 -->
<!--    <WorkspaceSelector />-->
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useArticleStore } from '@/stores/article'
import FileToolbar from './FileToolbar.vue'
import FileManager from './FileManager.vue'
// import WorkspaceSelector from './WorkspaceSelector.vue'

const articleStore = useArticleStore()

// 初始化时加载折叠列表（决定哪些文件夹是展开还是收起的）
onMounted(async () => {
  await articleStore.initCollapsibleList()
})
</script>