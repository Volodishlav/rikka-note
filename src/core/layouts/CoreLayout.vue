<script setup lang="ts">
import TitleBar from '@/layouts/TitleBar.vue'
import { useLayoutStore } from '@/stores/layout'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

// 引入将作为面板的组件
import FileSidebar from '@/core/pages/article/FileSidebar.vue' // 左侧面板：文件和标签导航
import MdEditor from '@/core/pages/article/MdEditor.vue' // 中间面板：Markdown 编辑器
import ChatLayout from '@/core/pages/record/chat/ChatLayout.vue' // 右侧面板：AI 聊天

const layoutStore = useLayoutStore()

</script>

<template>
  <title-bar></title-bar>
  <div class="flex-1 overflow-hidden bg-background">
    <splitpanes class="default-theme h-full w-full">
      <!-- 左侧导航面板 -->
      <pane v-if="layoutStore.isLeftSidebarVisible" size="20" min-size="15" max-size="40">
        <FileSidebar />
      </pane>

      <!-- 中间编辑器面板 -->
      <pane v-if="layoutStore.isEditorVisible" size="50" min-size="30">
        <div class="h-full p-1 overflow-hidden">
          <MdEditor />
        </div>
      </pane>

      <!-- 右侧 AI 聊天面板 -->
      <pane v-if="layoutStore.isRightSidebarVisible" size="30" min-size="20" max-size="50">
        <ChatLayout />
      </pane>
      <!-- 至少保留一个面板 -->
      <pane v-else size="100">
        <div class="h-full p-1 overflow-hidden">
          <MdEditor />
        </div>
      </pane>
    </splitpanes>
  </div>
</template>