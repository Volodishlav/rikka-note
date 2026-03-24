<script setup lang="ts">
import {getCurrentWindow} from '@tauri-apps/api/window';
import {onMounted, onUnmounted, ref} from 'vue';
import ArtTitle from "@/shared/components/ArtTitle.vue";
import { useLayoutStore } from '@/stores/layout';
import {ScanText} from "lucide-vue-next";

// 初始化布局状态
const layoutStore = useLayoutStore();
// 初始化窗口实例
const appWindow = getCurrentWindow();
// 响应式跟踪窗口最大化状态
const isMaximized = ref(false);
// 存储监听器引用，用于组件卸载时清理
let maximizeListener: (() => void) | null = null;
let unmaximizeListener: (() => void) | null = null;

// 窗口控制方法（带错误捕获）
const handleSearch = () => {
  layoutStore.toggleSearchPanel();
};
const handleSetting = () => {
  layoutStore.toggleSettingPage();
};
const handleLeftSiderbar = () => {
  layoutStore.toggleLeftSidebar();
};
const handleEditor = () => {
  layoutStore.toggleEditor();
};
const handleRightSiderbar = () => {
  layoutStore.toggleRightSidebar();
};
const handleOcr = () => {
  layoutStore.toggleOcr();
};
const handleMinimize = async () => {
  try {
    await appWindow.minimize();
  } catch (err) {
    console.warn('最小化窗口失败:', err);
  }
};

const handleToggleMaximize = async () => {
  try {
    await appWindow.toggleMaximize();
    // 同步更新最大化状态
    isMaximized.value = await appWindow.isMaximized();
  } catch (err) {
    console.warn('切换最大化状态失败:', err);
  }
};

const handleClose = async () => {
  try {
    await appWindow.close();
  } catch (err) {
    console.error('关闭窗口失败:', err);
  }
};

// 组件挂载时初始化
onMounted(async () => {
  try {
    // 初始化最大化状态
    isMaximized.value = await appWindow.isMaximized();

    // 监听窗口最大化事件
    maximizeListener = await appWindow.listen('window-maximized', () => {
      isMaximized.value = true;
    });

    // 监听窗口还原事件
    unmaximizeListener = await appWindow.listen('window-unmaximized', () => {
      isMaximized.value = false;
    });

  } catch (err) {
    console.error('标题栏初始化失败:', err);
  }
});

// 组件卸载时清理资源（关键：防止内存泄漏）
onUnmounted(() => {
  // 移除窗口状态监听器
  if (maximizeListener) maximizeListener();
  if (unmaximizeListener) unmaximizeListener();
});
</script>

<template>
  <div class="titlebar">
    <!-- 拖拽区域（包含应用图标和名称） -->
    <div data-tauri-drag-region class="drag-area">
      <!-- 应用信息区域 -->
      <div class="app-info">
        <!-- 应用图标 -->
        <img src="@/assets/icon.png" alt="应用图标" class="app-icon" />
        <!-- 应用名称 -->
<!--        <span class="app-name">rikka-note</span>-->
        <div class="art-title-container">
          <ArtTitle showBackground="brush" />
        </div>
      </div>
    </div>

    <!-- 控制按钮组（使用Vue原生@click绑定） -->
    <div class="controls">
      <!-- OCR 按钮 -->
      <button
          @click="handleOcr"
          title="OCR 文字识别"
          class="panel-btn"
          :class="{ 'active-btn': layoutStore.isOcrVisible }"
      >
        <ScanText :size="20" />
      </button>
      <!-- 搜索按钮 -->
      <button
          @click="handleSearch"
          title="搜索"
          class="panel-btn"
          :class="{ 'active-btn': layoutStore.isSearchPanelVisible }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
      </button>
      <!-- 设置按钮 -->
      <button
          @click="handleSetting"
          title="设置"
          class="panel-btn"
          :class="{ 'active-btn': layoutStore.isSettingPageVisible }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
      <!-- 左侧边栏按钮 -->
      <button
          @click="handleLeftSiderbar"
          title="左侧侧边栏"
          class="panel-btn"
          :class="{ 'active-btn': layoutStore.isLeftSidebarVisible }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 38" fill="currentColor">
          <rect x="6" y="6" width="32" height="26" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/>
          <rect x="10" y="9" width="5" height="20" rx="2" ry="2" fill="currentColor"/>
        </svg>
      </button>
      <!-- 编辑器按钮 -->
      <button
          @click="handleEditor"
          title="编辑器"
          class="panel-btn"
          :class="{ 'active-btn': layoutStore.isEditorVisible }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 38" fill="currentColor">
          <rect x="6" y="6" width="32" height="26" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/>
          <rect x="17" y="9" width="10" height="20" rx="2" ry="2" fill="currentColor"/>
        </svg>
      </button>
      <!-- 右侧边栏按钮 -->
      <button
          @click="handleRightSiderbar"
          title="右侧侧边栏"
          class="panel-btn"
          :class="{ 'active-btn': layoutStore.isRightSidebarVisible }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 38" fill="currentColor">
          <rect x="6" y="6" width="32" height="26" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/>
          <rect x="28" y="9" width="5" height="20" rx="2" ry="2" fill="currentColor"/>
        </svg>
      </button>
      <!-- 最小化按钮 -->
      <button
          @click="handleMinimize"
          title="最小化"
          class="titlebar-btn"
      >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
        >
          <path fill="currentColor" d="M19 13H5v-2h14z" />
        </svg>
      </button>

      <!-- 最大化/还原按钮（根据状态切换图标） -->
      <button
          @click="handleToggleMaximize"
          :title="isMaximized ? '还原' : '最大化'"
          class="titlebar-btn"
      >
        <svg
            v-if="!isMaximized"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
        >
          <path fill="currentColor" d="M4 4h16v16H4zm2 4v10h12V8z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
          <path fill="currentColor"
                d="M9.8 4H5.27c.193-.334.479-.606.824-.782C6.522 3 7.082 3 8.204 3h1.6c1.12 0 1.68 0 2.11.218c.376.192.682.498.874.874c.218.428.218.988.218 2.11v1.6c0 1.12 0 1.68-.218 2.11a2 2 0 0 1-.782.824v-4.53c0-.577 0-.949-.024-1.23c-.022-.272-.06-.372-.085-.422a1 1 0 0 0-.437-.437c-.05-.025-.15-.063-.422-.085a17 17 0 0 0-1.23-.024z"/>
          <path fill="currentColor" fill-rule="evenodd"
                d="M3 8.2c0-1.12 0-1.68.218-2.11c.192-.376.498-.682.874-.874c.428-.218.988-.218 2.11-.218h1.6c1.12 0 1.68 0 2.11.218c.376.192.682.498.874.874c.218.428.218.988.218 2.11v1.6c0 1.12 0 1.68-.218 2.11a2 2 0 0 1-.874.874c-.428.218-.988.218-2.11.218h-1.6c-1.12 0-1.68 0-2.11-.218a2 2 0 0 1-.874-.874C3 11.482 3 10.922 3 9.8zM6.2 6h1.6c.577 0 .949 0 1.23.024c.272.022.372.06.422.085c.188.096.341.249.437.437c.025.05.063.15.085.422c.023.283.024.656.024 1.23v1.6c0 .577 0 .949-.024 1.23c-.022.272-.06.372-.085.422a1 1 0 0 1-.437.437c-.05.025-.15.063-.422.085c-.283.023-.656.024-1.23.024H6.2c-.577 0-.949 0-1.23-.024c-.272-.022-.372-.06-.422-.085a1 1 0 0 1-.437-.437c-.025-.05-.063-.15-.085-.422a17 17 0 0 1-.024-1.23v-1.6c0-.577 0-.949.024-1.23c.022-.272.06-.372.085-.422c.096-.188.249-.341.437-.437c.05-.025.15-.063.422-.085C5.253 6 5.626 6 6.2 6"
                clip-rule="evenodd"/>
        </svg>
      </button>

      <!-- 关闭按钮 -->
      <button
          @click="handleClose"
          title="关闭"
          class="titlebar-btn close-btn"
      >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
        >
          <path
              fill="currentColor"
              d="M13.46 12L19 17.54V19h-1.46L12 13.46L6.46 19H5v-1.46L10.54 12L5 6.46V5h1.46L12 10.54L17.54 5H19v1.46z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  height: 36px; /* 略微增加标题栏高度 */
  @apply bg-background text-foreground select-none grid grid-cols-[auto_max-content] w-full;
}

/* 优化拖拽区域，确保全屏可拖拽 */
.titlebar .drag-area {
  width: 100%;
  height: 100%;
  @apply flex items-center;
}

/* 应用信息区域样式 */
.app-info {
  @apply flex items-center gap-2 px-3;
}
/* 艺术标题容器：控制尺寸适配标题栏 */
.art-title-container {
  @apply h-full flex items-center;
  /* 缩放艺术标题组件，适配36px高的标题栏 */
  & :deep(.art-title-wrapper) {
    padding: 0 !important; /* 清空原组件的2rem内边距 */
    width: auto;
    height: 36px; /* 标题栏内显示高度，可按需调整 */
  }
  & :deep(svg) {
    width: auto !important;
    height: 100% !important;
    max-width: none !important; /* 取消原组件的宽度限制 */
  }
}

/* 应用图标样式 */
.app-icon {
  @apply w-6 h-6 rounded-sm;
}

/* 应用名称样式 */
.app-name {
  @apply text-sm font-medium text-foreground;
}

.titlebar > .controls {
  @apply flex;
}

/* 统一按钮样式，优化hover效果 */
.titlebar-btn {
  appearance: none;
  padding: 0;
  margin: 0;
  border: none;
  @apply inline-flex justify-center items-center w-[36px] h-[36px] bg-transparent text-foreground cursor-pointer transition-colors duration-200; /* 按钮尺寸随标题栏高度调整 */
  /*@apply inline-flex justify-center items-center;  Flex布局：让内部SVG图标水平+垂直居中，这是图标按钮的核心布局方式 */
  /*@apply w-[36px] h-[36px];  按钮宽高固定为36px，与标题栏高度（36px）完全一致，保证按钮填满标题栏垂直空间 */
  /*@apply bg-transparent;     初始背景透明，hover时才显示背景，符合原生窗口标题栏按钮的交互逻辑 */
  /*@apply text-foreground;    文字/图标颜色继承自父级的text-foreground（项目主题色），保证风格统一 */
  /*@apply cursor-pointer;     鼠标悬浮时显示手型，明确按钮可点击 */
  /*@apply transition-colors duration-200;  背景色变化时添加200ms过渡动画，让hover效果更丝滑，无突兀感 */
}

.titlebar-btn:hover:not(.close-btn) {
  @apply bg-secondary; /* 改用secondary主题色（浅色模式#E5E7EB，深色模式#242D39），hover时出现浅灰/深灰背景 */
}
/* 关闭按钮特殊hover样式，符合系统习惯 */
.close-btn:hover {
  @apply bg-destructive;/* 悬浮时背景色改为项目的destructive（危险操作）主题色，通常为红色，符合系统习惯 */
}

.panel-btn {
  appearance: none;
  padding: 0;
  margin: 0;
  border: none;
  @apply inline-flex justify-center items-center w-[36px] h-[36px] bg-transparent text-muted-foreground cursor-pointer transition-colors duration-200; /* 按钮尺寸随标题栏高度调整 */
}
.panel-btn:hover{
  @apply bg-secondary;
}
/* 激活态：SVG 线条颜色为 foreground */
.panel-btn.active-btn {
  @apply text-foreground;
}
.panel-btn.active-btn :deep(svg) {
  stroke: theme('colors.foreground');
  transition: stroke 0.2s, fill 0.2s;
}


/* 修复子元素继承scoped样式问题 */
:deep(svg) {
  width: 20px;
  height: 20px; /* 增大图标尺寸，与标题栏高度匹配 */
}
</style>