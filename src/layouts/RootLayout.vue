<template>
  <ThemeProvider>
    <slot />
    <!-- 全局Toast容器 -->
    <ToastContainer />
  </ThemeProvider>
</template>

<script setup lang="ts">
import {onMounted, ref, watch} from 'vue'
import ThemeProvider from '@/components/ThemeProvider.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import { useSettingStore } from '@/stores/setting'
import { useI18n } from '@/hooks/useI18n'
import dayjs from 'dayjs'
import zh from 'dayjs/locale/zh-cn'
import en from 'dayjs/locale/en'
import { initAllDatabases } from '@/db'
import {useToast} from "@/composables/useToast.ts";
const settingStore = useSettingStore()
const { locale } = useI18n()
const toast = useToast()
const dbInitialized = ref(false)
onMounted(async () => {
  // 初始化设置数据
  if (typeof settingStore.initSettingData === 'function') {
    await settingStore.initSettingData()
  }
  
  // 初始化图床（如果有）
  if (typeof (settingStore as any).initMainHosting === 'function') {
    await (settingStore as any).initMainHosting()
  }

  try {
    // 直接调用初始化函数（内部已包含重试/检测逻辑）
    await initAllDatabases();
    console.log('应用数据库初始化成功');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('应用数据库初始化失败:', errorMsg);
    alert(`数据库初始化失败：\n${errorMsg}\n请检查配置后重启应用`);
  }
  
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