<script setup lang="ts">
import TitleBar from '@/layouts/TitleBar.vue'
import {useLayoutStore} from '@/stores/layout'
import {Splitpanes, Pane} from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

// 引入将作为面板的组件
import FileSidebar from '@/core/pages/article/FileSidebar.vue' // 左侧面板：文件和标签导航
import MdEditor from '@/core/pages/article/MdEditor.vue' // 中间面板：Markdown 编辑器
import ChatLayout from '@/core/pages/record/chat/ChatLayout.vue' // 右侧面板：AI 聊天
import SearchPage from '@/core/pages/SearchPage.vue' // 搜索面板

const layoutStore = useLayoutStore()

</script>

<template>
  <div class="h-screen w-full flex flex-col overflow-hidden">
    <title-bar></title-bar>
    <div class="flex-1 overflow-hidden bg-background">
      <splitpanes class="default-theme h-full w-full">
        <!-- 左侧导航面板 -->
        <pane v-if="layoutStore.isLeftSidebarVisible && !layoutStore.isSearchPanelVisible" size="20" min-size="15"
              max-size="40">
          <FileSidebar/>
        </pane>

        <!-- 搜索面板 -->
        <pane v-else-if="layoutStore.isLeftSidebarVisible &&layoutStore.isSearchPanelVisible" size="20" min-size="15"
              max-size="40">
          <SearchPage/>
        </pane>

        <!-- 中间编辑器面板 -->
        <pane v-if="layoutStore.isEditorVisible" size="50" min-size="30">
          <div class="h-full w-full p-1 overflow-hidden flex flex-col">
            <!-- w-full flex flex-col确保其子组件也能完美继承高度-->
            <MdEditor/>
          </div>
        </pane>

        <!-- 右侧 AI 聊天面板 -->
        <pane v-if="layoutStore.isRightSidebarVisible" size="30" min-size="20" max-size="50">
          <ChatLayout/>
        </pane>
        <!-- 没有面板处于打开状态时显示应用图标+应用名 -->
        <pane v-if="!layoutStore.isLeftSidebarVisible&&!layoutStore.isRightSidebarVisible&&!layoutStore.isEditorVisible" size="100">
          <div class="h-full p-1 overflow-hidden flex flex-col items-center justify-center">
            <!-- 应用图标 -->
            <img 
              src="../../assets/icon.png"
              class="w-24 h-24 mb-4"
             alt="应用图标"/>
            <!-- 应用名称 -->
            <h1 class="text-2xl font-bold text-foreground">rikka-note</h1>
          </div>
        </pane>
      </splitpanes>
    </div>
  </div>
</template>