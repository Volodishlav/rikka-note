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
import SettingPage from '@/core/pages/setting/SettingPage.vue' // 设置页面（独占窗口）
import Start from '../../shared/pages/start.vue'
const layoutStore = useLayoutStore()

</script>

<template>
  <div class="h-screen w-full flex flex-col overflow-hidden">
    <title-bar></title-bar>
    <div class="flex-1 overflow-hidden bg-background">
      <!-- 设置页面：独占整个窗口 -->
      <SettingPage v-if="layoutStore.isSettingPageVisible" class="h-full w-full" />
      
      <!-- 正常布局：分割面板 -->
      <splitpanes v-else class="default-theme h-full w-full">
        <!-- 左侧导航面板 -->
        <pane v-if="layoutStore.isLeftSidebarVisible && !layoutStore.isSearchPanelVisible" size="20" min-size="15">
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
        <pane v-if="layoutStore.isRightSidebarVisible" size="30" min-size="20">
          <ChatLayout/>
        </pane>
        <!-- 没有面板处于打开状态时显示应用图标+应用名 -->
        <pane v-if="!layoutStore.isLeftSidebarVisible&&!layoutStore.isRightSidebarVisible&&!layoutStore.isEditorVisible" size="100">
          <!-- 外层容器：相对定位，作为绝对定位的参考 -->
          <div class="h-full w-full relative overflow-hidden">
            <!-- 动态 Canvas 背景（Start 组件） -->
            <Start class="absolute inset-0 z-0" />

            <!-- 图标+名称：绝对定位，居中显示，层级高于 Canvas -->
            <div class="absolute inset-0 flex flex-col items-center justify-center z-10 p-1">
              <!-- 径向渐变模糊遮罩：中间最模糊、最不透明，向四周渐变透明 -->
              <div class="relative rounded-xl p-6">
                <!-- 伪元素实现径向渐变背景 + 模糊 -->
                <div class="absolute inset-0 rounded-xl
                bg-background/40
                backdrop-blur-sm
                [mask-image:radial-gradient(circle_at_center,rgba(0,0,0,1)_0%,rgba(0,0,0,0.8)_60%,rgba(0,0,0,0)_100%)]
                -z-10"></div>

                <!-- 图标和文字 -->
                <img
                    src="../../assets/icon.png"
                    class="w-24 h-24 mb-4 mx-auto relative z-10"
                    alt="应用图标"/>
                <h1 class="text-2xl font-bold text-foreground text-center drop-shadow-md relative z-10">rikka-note</h1>
              </div>
            </div>
          </div>
        </pane>
      </splitpanes>
    </div>
  </div>
</template>