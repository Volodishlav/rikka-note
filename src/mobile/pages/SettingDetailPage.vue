<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'

// 导入桌面端设置组件
import GeneralSetting from '@/core/pages/setting/general/GeneralSetting.vue'
import EditorSetting from '@/core/pages/setting/editor/EditorSetting.vue'
import SyncSetting from '@/core/pages/setting/sync/SyncSetting.vue'
import EncryptionSetting from '@/core/pages/setting/encryption/EncryptionSetting.vue'
import LocalModelSetting from '@/core/pages/setting/local/LocalModelSetting.vue'
import AiSetting from '@/core/pages/setting/ai/AiSetting.vue'
import PromptSetting from '@/core/pages/setting/prompt/PromptSetting.vue'
import RagSetting from '@/core/pages/setting/rag/RagSetting.vue'
import VisionSetting from '@/core/pages/setting/vision/VisionSetting.vue'
import SpeechSetting from '@/core/pages/setting/speech/SpeechSetting.vue'

const route = useRoute()
const router = useRouter()

const settingId = computed(() => route.params.id as string)

// 映射组件
const componentMap: Record<string, any> = {
  general: GeneralSetting,
  editor: EditorSetting,
  sync: SyncSetting,
  encryption: EncryptionSetting,
  local: LocalModelSetting,
  ai: AiSetting,
  prompt: PromptSetting,
  rag: RagSetting,
  vision: VisionSetting,
  speech: SpeechSetting
}

// 映射标题
const titleMap: Record<string, string> = {
  general: '常规设置',
  editor: '编辑器设置',
  sync: '同步设置',
  encryption: '加密与安全',
  local: '本地模型',
  ai: 'AI 模型配置',
  prompt: 'Prompt 管理',
  rag: 'RAG 设置',
  vision: 'OCR 与视觉',
  speech: '语音输入'
}

const currentComponent = computed(() => componentMap[settingId.value] || GeneralSetting)
const currentTitle = computed(() => titleMap[settingId.value] || '设置')

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-900 absolute inset-0 z-50">
    <!-- 顶栏 -->
    <header class="flex items-center justify-between px-2 h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
      <button @click="goBack" class="p-2 text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800 rounded-full transition-colors">
        <ChevronLeft :size="24" />
      </button>
      <div class="flex-1 px-4 truncate text-center">
        <span class="text-[17px] font-bold text-slate-800 dark:text-slate-200">{{ currentTitle }}</span>
      </div>
      <div class="w-10"></div> <!-- 占位保持居中 -->
    </header>

    <!-- 设置内容容器 -->
    <main class="flex-1 overflow-y-auto p-4 pb-10">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
        <!-- 动态挂载桌面端的设置组件 -->
        <component :is="currentComponent" />
      </div>
    </main>
  </div>
</template>
