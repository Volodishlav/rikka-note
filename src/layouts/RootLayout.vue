<template>
  <ThemeProvider>
    <slot />
  </ThemeProvider>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import ThemeProvider from '@/components/ThemeProvider.vue'
import { useSettingStore } from '@/stores/setting'
import { useI18n } from '@/hooks/useI18n'
import dayjs from 'dayjs'
import zh from 'dayjs/locale/zh-cn'
import en from 'dayjs/locale/en'

const settingStore = useSettingStore()
const { locale } = useI18n()

onMounted(async () => {
  // 初始化设置数据
  if (typeof settingStore.initSettingData === 'function') {
    await settingStore.initSettingData()
  }
  
  // 初始化图床（如果有）
  if (typeof (settingStore as any).initMainHosting === 'function') {
    await (settingStore as any).initMainHosting()
  }
  
  // 初始化数据库（如果有）
  // if (typeof initAllDatabases === 'function') {
  //   await initAllDatabases()
  // }
  
  // 初始化向量数据库（如果有）
  // if (typeof (settingStore as any).initVectorDb === 'function') {
  //   await (settingStore as any).initVectorDb()
  // }
})

// UI 缩放
watch(() => settingStore.uiScale, (val) => {
  if (val && val !== 100) {
    document.documentElement.style.fontSize = `${val}%`
  } else {
    document.documentElement.style.fontSize = ''
  }
}, { immediate: true })

// dayjs locale
watch(() => locale.value, (locale) => {
  switch (locale) {
    case 'zh':
      dayjs.locale(zh); break
    case 'en':
      dayjs.locale(en); break
    default: break
  }
}, { immediate: true })
</script>