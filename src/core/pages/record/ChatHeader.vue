<template>
  <header class="h-12 w-full border-b bg-background px-4 flex items-center justify-between gap-4 flex-shrink-0">
    <!-- 左侧：提示词信息 -->
    <div class="flex items-center gap-2 min-w-0">
      <SparklesIcon class="size-4 flex-shrink-0 text-yellow-500" />
      <span class="text-sm font-medium truncate">
        {{ currentPrompt?.title || t('record.chat.header.noPrompt') }}
      </span>
    </div>

    <!-- 中间：模型信息 -->
    <div v-if="primaryModel" class="flex items-center gap-2 justify-center min-w-0">
      <BotIcon class="size-4 flex-shrink-0" />
      <span class="text-xs text-muted-foreground truncate">
        {{ modelInfo }}
      </span>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="flex items-center gap-1 flex-shrink-0">
      <button
          @click="handleNewChat"
          :title="t('record.chat.header.newChat')"
          class="p-1.5 hover:bg-muted rounded-md transition-colors"
      >
        <PlusIcon class="size-4" />
      </button>
      <button
          @click="handleClearAll"
          :title="t('record.chat.header.clearAll')"
          class="p-1.5 hover:bg-muted rounded-md transition-colors"
      >
        <TrashIcon class="size-4" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { useChatStore } from '@/stores/chat'
import { useSettingStore } from '@/stores/setting'
import {
  SparklesIcon,
  BotIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-vue-next'

const { t } = useI18n()
const chatStore = useChatStore()
const settingStore = useSettingStore()

// 计算属性
const currentPrompt = computed(() => {
  // TODO: 从prompt store获取
  return { title: 'Default Prompt' }
})

const primaryModel = computed(() => settingStore.primaryModel)

const modelInfo = computed(() => {
  if (!primaryModel.value) return ''
  const model = settingStore.aiModelList?.find(m => m.key === primaryModel.value)
  return model ? `${model.title}` : primaryModel.value
})

// 事件处理
async function handleNewChat() {
  // TODO: 清空当前聊天但保留历史
  await chatStore.clearChats(chatStore.currentTagId)
}

async function handleClearAll() {
  if (confirm(t('record.chat.header.confirmClear'))) {
    await chatStore.clearChats(chatStore.currentTagId)
  }
}
</script>