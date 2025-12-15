<script setup lang="ts">
import { computed } from "vue";
import { useSettingStore } from '@/stores/setting'

const settingStore = useSettingStore()

// 计算当前主题类名 - 保留主题功能，应用到根容器
const themeClass = computed(() => {
  if (settingStore.theme === 'system') {
    // 检测系统主题
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : ''
  }
  return settingStore.theme === 'dark' ? 'dark' : ''
})
</script>

<template>
  <!-- 根容器，应用主题类 -->
  <div class="app-container" :class="themeClass">
    <!-- 路由渲染出口 - 核心修改 -->
    <router-view />
  </div>
</template>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

/* 深色主题变量 */
.dark {
  --background: #2f2f2f;
  --foreground: #f6f6f6;
  --card-bg: #0f0f0f98;
  --accent-color: #24c8db;
}

.app-container {
  min-height: 100vh;
  background-color: var(--background, #f6f6f6);
  color: var(--foreground, #0f0f0f);
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>