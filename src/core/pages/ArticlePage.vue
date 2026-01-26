//ArticlePage.vue
<template>
  <div class="flex h-screen w-full bg-background">
    <splitpanes class="default-theme h-full w-full">
      <!-- 左侧文件树 (初始 25%) -->
      <pane size="25" min-size="5" max-size="35">
        <div class="h-full overflow-hidden">
          <FileSidebar />
        </div>
      </pane>

      <!-- 右侧编辑器 (剩余 75%) -->
      <pane size="75" min-size="65">
        <div class="h-full p-4 overflow-hidden">
          <MdEditor />
        </div>
      </pane>
    </splitpanes>
  </div>
</template>

<script setup lang="ts">
// @ts-ignore 若还没处理类型声明，先临时忽略（后续用自定义 .d.ts 解决）
import { Splitpanes, Pane } from 'splitpanes'
// 官方标准导入路径（必须）
import 'splitpanes/dist/splitpanes.css'

import FileSidebar from './article/FileSidebar.vue'
import MdEditor from './article/MdEditor.vue'
</script>

<style scoped>
/* 自定义分割线样式（基于官方 default-theme 扩展） */
:deep(.splitpanes__splitter) {
  background-color: #e5e7eb;
  width: 4px;
  cursor: col-resize;
}

:deep(.splitpanes__splitter:hover),
:deep(.splitpanes__splitter.dragging) {
  background-color: #3b82f6;
}

/* 确保面板高度 100%（官方样式基础上增强） */
:deep(.splitpanes__pane) {
  height: 100%;
  overflow: hidden;
}
</style>