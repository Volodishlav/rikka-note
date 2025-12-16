// src/composables/useTheme.ts
import { computed } from 'vue'
import { useSettingStore } from '@/stores/setting'

export type ThemeKey = 'light' | 'dark' | 'system'

export function useTheme() {
  const settingStore = useSettingStore()
  const theme = computed<ThemeKey>(() => settingStore.theme)

  function setTheme(t: ThemeKey) { return settingStore.setTheme(t) }
  function toggleTheme() {
    const next = settingStore.theme === 'dark' ? 'light' : 'dark'
    return settingStore.setTheme(next)
  }

  return { theme, setTheme, toggleTheme }
}