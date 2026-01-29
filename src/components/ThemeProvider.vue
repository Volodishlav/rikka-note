<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { readTheme } from '@/utils/themeStorage'
import { useSettingStore } from '@/stores/setting'

const settingStore = useSettingStore()

const preferDarkQuery = window.matchMedia?.('(prefers-color-scheme: dark)')

const systemIsDark = ref<boolean>(preferDarkQuery ? preferDarkQuery.matches : false)

function effectiveThemeValue(): 'dark' | 'light' {
  if (settingStore.theme === 'system') {
    return systemIsDark.value ? 'dark' : 'light'
  }
  return settingStore.theme === 'dark' ? 'dark' : 'light'
}

function applyThemeClass(themeVal: 'dark' | 'light') {
  // 临时禁用过渡避免闪烁
  const doc = document.documentElement
  doc.classList.add('disable-theme-transition')
  if (themeVal === 'dark') doc.classList.add('dark')
  else doc.classList.remove('dark')
  // micro-task 清理禁用类
  requestAnimationFrame(() => {
    setTimeout(() => doc.classList.remove('disable-theme-transition'), 0)
  })
}

async function init() {
  const stored = await readTheme()
  if (stored) {
    await settingStore.setTheme(stored)
  }
  applyThemeClass(effectiveThemeValue())
}

onMounted(async () => {
  // 监听系统设置变化（当 theme === 'system' 时生效）
  if (preferDarkQuery) {
    const handler = (e: MediaQueryListEvent) => {
      systemIsDark.value = e.matches
      if (settingStore.theme === 'system') applyThemeClass(e.matches ? 'dark' : 'light')
    }
    preferDarkQuery.addEventListener('change', handler)
    onBeforeUnmount(() => preferDarkQuery.removeEventListener('change', handler))
  }
  await init()
})

// 当 theme 或 system 改变时应用实际 theme
watch([() => settingStore.theme, systemIsDark], () => {
  applyThemeClass(effectiveThemeValue())
})

/* 导出到全局（可选） —— 让其它组件通过 window.__theme 快速调试 */
;(window as any).__theme = {
  get theme() { return settingStore.theme },
  setTheme: settingStore.setTheme,
  toggleTheme: async () => {
    const next = settingStore.theme === 'dark' ? 'light' : 'dark'
    await settingStore.setTheme(next)
  },
}
</script>

<style scoped>
/* 禁用切换时的过渡防止闪烁（全局生效） */
:global(.disable-theme-transition *) {
  transition: none !important;
  animation: none !important;
}
</style>