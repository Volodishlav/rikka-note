<template>
  <ThemeProvider>
    <TooltipProvider>
      <slot />
      <!-- 全局Toast容器 -->
      <Toaster />
      <WelcomeGuide ref="welcomeGuideRef" />
    </TooltipProvider>
  </ThemeProvider>
</template>

<script setup lang="ts">
import {onMounted, ref, watch} from 'vue'
import ThemeProvider from '@/components/ThemeProvider.vue'
import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from 'reka-ui'
import { useSettingStore } from '@/stores/setting'
import { useVectorStore } from '@/stores/vector'
import { useI18n } from '@/hooks/useI18n'
import dayjs from 'dayjs'
import zh from 'dayjs/locale/zh-cn'
import en from 'dayjs/locale/en'
import { initAllDatabases } from '@/db'
import { useToast } from "@/composables/useToast"
import WelcomeGuide from '@/components/WelcomeGuide.vue'
import { useWorkspaceStore } from '@/stores/workspace'

const settingStore = useSettingStore()
const vectorStore = useVectorStore()
const { locale } = useI18n()
const toast = useToast()
const dbInitialized = ref(false)
const welcomeGuideRef = ref<InstanceType<typeof WelcomeGuide> | null>(null)

onMounted(async () => {
  // 初始化设置数据
  if (typeof settingStore.initSettingData === 'function') {
    await settingStore.initSettingData()
  }
  
  // 初始化图床（如果有）
  if (typeof (settingStore as any).initMainHosting === 'function') {
    await (settingStore as any).initMainHosting()
  }

  // 1. 检查并提示工作区初始化（内部会调用 initWorkspaceData）
  if (welcomeGuideRef.value) {
    await welcomeGuideRef.value.checkVisibility()
  }

  // 2. 仅当有激活的仓库时才加载对应的数据库
  const workspaceStore = useWorkspaceStore()
  if (workspaceStore.activeWorkspace) {
    try {
      // 内部已包含指向当前工作区 DB 的逻辑
      await initAllDatabases();
      
      // 初始化向量数据库状态
      await vectorStore.initVectorDb()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('应用数据库初始化失败:', errorMsg);
      toast.show({ title: '数据库初始化失败', message: errorMsg, variant: 'error' })
    }
  }
  
  console.log('TooltipProvider has been added to RootLayout')
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