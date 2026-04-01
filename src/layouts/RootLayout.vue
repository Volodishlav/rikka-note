<template>
  <ThemeProvider>
    <TooltipProvider>
      <slot />
    </TooltipProvider>
    <!-- 全局Toast容器 -->
    <Toaster />
    <WelcomeGuide ref="welcomeGuideRef" />
  </ThemeProvider>
</template>

<script setup lang="ts">
import {onMounted, ref, watch} from 'vue'
import ThemeProvider from '@/components/providers/ThemeProvider.vue'
import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSettingStore } from '@/stores/setting'
import { useVectorStore } from '@/stores/vector'
import { useEncryptionStore } from '@/stores/encryption'
import { useI18n } from '@/composables/useI18n'
import dayjs from 'dayjs'
import zh from 'dayjs/locale/zh-cn'
import en from 'dayjs/locale/en'
import WelcomeGuide from '@/shared/components/WelcomeGuide.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { logger } from '@/utils/logger'

const settingStore = useSettingStore()
const vectorStore = useVectorStore()
const encryptionStore = useEncryptionStore()
const { locale } = useI18n()
// const toast = useToast()
const welcomeGuideRef = ref<InstanceType<typeof WelcomeGuide> | null>(null)

onMounted(async () => {
  // 初始化设置数据
  if (typeof settingStore.initSettingData === 'function') {
    await settingStore.initSettingData()
  }

  // 初始化加密模块
  await encryptionStore.initEncryption()
  
  // 初始化图床（如果有）
  if (typeof (settingStore as any).initMainHosting === 'function') {
    await (settingStore as any).initMainHosting()
  }

  // 1. 检查并提示工作区初始化（内部会调用 initWorkspaceData）
  if (welcomeGuideRef.value) {
    await welcomeGuideRef.value.checkVisibility()
  }

  // 2. 仅当有激活的仓库时，初始化相关业务状态（数据库连接已在 workspaceStore.initWorkspaceData 中处理）
  const workspaceStore = useWorkspaceStore()
  if (workspaceStore.activeWorkspace) {
    try {
      // 初始化向量数据库状态
      await vectorStore.initVectorDb()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.general.error('业务初始化失败:', errorMsg);
    }
  } else {
    logger.general.info('未激活任何笔记仓库，跳过业务状态初始化');
  }
  
  logger.general.debug('TooltipProvider has been added to RootLayout')
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