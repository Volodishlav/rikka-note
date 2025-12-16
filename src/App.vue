<script setup lang="ts">
import ThemeProvider from '@/components/ThemeProvider.vue'
</script>

<template>
  <ThemeProvider>
    <!-- 路由渲染出口 - 核心修改 -->
    <router-view />
  </ThemeProvider>
</template>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

/* 主题过渡禁用类 */
.disable-theme-transition * {
  transition: none !important;
  animation: none !important;
}
</style>