<script setup lang="ts">
import {getCurrentWindow} from '@tauri-apps/api/window';
import {onMounted, onUnmounted, ref} from 'vue';

// 初始化窗口实例
const appWindow = getCurrentWindow();
// 响应式跟踪窗口最大化状态
const isMaximized = ref(false);
// 存储监听器引用，用于组件卸载时清理
let maximizeListener: (() => void) | null = null;
let unmaximizeListener: (() => void) | null = null;

// 窗口控制方法（带错误捕获）
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
    <!-- 拖拽区域 -->
    <div data-tauri-drag-region class="drag-area"></div>

    <!-- 控制按钮组（使用Vue原生@click绑定） -->
    <div class="controls">
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
  height: 30px;
  @apply bg-brand-cyan text-foreground select-none grid grid-cols-[auto_max-content] w-full;
}

/* 优化拖拽区域，确保全屏可拖拽 */
.titlebar .drag-area {
  width: 100%;
  height: 100%;
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
  @apply inline-flex justify-center items-center w-[30px] h-[30px] bg-transparent text-foreground cursor-pointer transition-colors duration-200;
}

.titlebar-btn:hover:not(.close-btn) {
  @apply bg-brand-cyan/80;
}

/* 关闭按钮特殊hover样式，符合系统习惯 */
.close-btn:hover {
  @apply bg-destructive;
}

/* 修复子元素继承scoped样式问题 */
:deep(svg) {
  width: 16px;
  height: 16px; /* 缩小图标，视觉更协调 */
}
</style>