<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useSettingStore } from '@/stores/setting'

const settingStore = useSettingStore()

/**
 * 将主题类应用到 document.documentElement
 */
function applyThemeClass(themeVal: 'dark' | 'light') {
  const doc = document.documentElement
  
  // 临时禁用过渡避免闪烁
  doc.classList.add('disable-theme-transition')
  
  if (themeVal === 'dark') {
    doc.classList.add('dark')
  } else {
    doc.classList.remove('dark')
  }

  // 使用 requestAnimationFrame 和 micro-task 清理禁用类
  requestAnimationFrame(() => {
    setTimeout(() => doc.classList.remove('disable-theme-transition'), 0)
  })
}

onMounted(() => {
  // 初始应用
  applyThemeClass(settingStore.effectiveTheme)
})

// 响应式监听最终生效的主题并同步到 DOM
watch(() => settingStore.effectiveTheme, (newVal) => {
  applyThemeClass(newVal)
})

/* 调试接口导出 */
if (typeof window !== 'undefined') {
  ;(window as any).__theme = {
    get theme() { return settingStore.theme },
    get effective() { return settingStore.effectiveTheme },
    setTheme: settingStore.setTheme,
    toggleTheme: async () => {
      const next = settingStore.theme === 'dark' ? 'light' : 'dark'
      await settingStore.setTheme(next)
    },
  }
}
</script>

<style scoped>
/* 禁用切换时的过渡防止闪烁（全局生效） */
:global(.disable-theme-transition *) {
  transition: none !important;
  animation: none !important;
}
</style>