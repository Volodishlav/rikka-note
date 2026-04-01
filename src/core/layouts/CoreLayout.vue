<script setup lang="ts">
import { ref } from 'vue'
import TitleBar from '@/core/layouts/TitleBar.vue'
import {useLayoutStore} from '@/stores/layout'
import {Splitpanes, Pane} from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

// 引入将作为面板的组件
import FileSidebar from '@/core/panels/explorer/FileSidebar.vue' // 左侧面板：文件和标签导航
import LayoutNode from '@/core/panels/editor/LayoutNode.vue' // 递归编辑器布局
import ChatPanel from '@/core/panels/assistant/ChatPanel.vue' // 右侧面板：AI 聊天
import SearchPanel from '@/core/pages/search/SearchPanel.vue' // 搜索面板
import SettingPage from '@/core/pages/setting/SettingPage.vue' // 设置页面（独占窗口）
import Start from '@/shared/pages/start.vue'
import ArtTitle from '@/shared/components/ArtTitle.vue'
import { OcrCapture } from '@/core/pages/ocr'
import OcrScreenSelector from '@/core/pages/ocr/OcrScreenSelector.vue'
import { useWorkspaceLayoutStore } from '@/stores/workspaceLayout'

const layoutStore = useLayoutStore()
const workspaceLayoutStore = useWorkspaceLayoutStore()
const ocrCaptureRef = ref<any>(null)

/**
 * 当选区完成时，由 OcrScreenSelector 调用
 */
const handleSelectionDone = (bytes: number[]) => {
  if (ocrCaptureRef.value) {
    ocrCaptureRef.value.handleSelectedImage(bytes)
  }
}

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
          <SearchPanel/>
        </pane>

        <!-- 中间编辑器面板 -->
        <pane v-if="layoutStore.isEditorVisible" size="50" min-size="30">
          <div class="h-full w-full overflow-hidden flex flex-col">
            <!-- 接入递归布局引擎 -->
            <LayoutNode :node="workspaceLayoutStore.rootNode" />
          </div>
        </pane>

        <!-- 右侧 AI 聊天面板 -->
        <pane v-if="layoutStore.isRightSidebarVisible" size="30" min-size="20">
          <ChatPanel/>
        </pane>
        <!-- 没有面板处于打开状态时显示应用图标+应用名 -->
        <pane v-if="!layoutStore.isLeftSidebarVisible&&!layoutStore.isRightSidebarVisible&&!layoutStore.isEditorVisible" size="100">
          <!-- 外层容器：相对定位 -->
          <div class="h-full w-full relative overflow-hidden">
            <!-- 1. 动态 Canvas 背景（底层） -->
            <Start class="absolute inset-0 z-0" />

            <!-- 2. 全屏径向渐变模糊遮罩（核心层） -->
            <div
                class="absolute inset-0 z-0 backdrop-blur-xl"
                style="
        /* 径向渐变 Mask：中心不透明（显示模糊）→ 边缘透明（隐藏模糊） */
        mask-image: radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 70%);
        -webkit-mask-image: radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 70%);
      "
            ></div>

            <!-- 3. 图标+名称（顶层内容） -->
            <div class="absolute inset-0 flex flex-col items-center justify-center z-10 p-1">
              <div class="relative rounded-xl p-8">
                <!-- 内容区域 -->
                <div class="flex flex-col items-center relative z-10">
                  <!-- 应用图标 -->
                  <img
                      src="../../assets/icon.png"
                      class="w-24 h-24 mb-2 drop-shadow-lg"
                      alt="应用图标"
                  />
                  <!-- 艺术标题 -->
                  <ArtTitle class="w-full max-w-2xl" showBackground="graphic"></ArtTitle>
                </div>
              </div>
            </div>
          </div>
        </pane>
      </splitpanes>

      <!-- OCR 全局悬浮层 (主界面) -->
      <div 
        v-if="layoutStore.isOcrVisible" 
        class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm transition-all"
        @click.self="layoutStore.toggleOcr"
      >
        <div class="w-full max-w-xl animate-in fade-in zoom-in duration-200">
          <OcrCapture ref="ocrCaptureRef" />
        </div>
      </div>

      <!-- 截屏选区交互层 (全局最顶层) -->
      <OcrScreenSelector 
        v-if="layoutStore.isScreenSelecting" 
        @selected="handleSelectionDone"
      />
    </div>
  </div>
</template>