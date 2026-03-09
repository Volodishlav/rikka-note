<template>
  <div class="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur z-10 gap-2">
<!--    <div class="font-semibold text-sm shrink-0">{{ t('record.chat.header.title') }}</div>-->
    <div class="flex items-center gap-2 flex-1 justify-end min-w-0">
      <ChatLanguage />
      <RagSwitch />
      <!-- Prompt Selector -->
      <Select :model-value="promptStore.currentPrompt?.id" @update:model-value="setPrompt">
        <SelectTrigger class="w-[120px] h-8 text-xs truncate">
          <SelectValue :placeholder="t('record.chat.header.promptPlaceholder')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="prompt in promptStore.promptList" :key="prompt.id" :value="prompt.id">
            {{ prompt.title }}
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- Model Selector -->
      <Select :model-value="settingStore.primaryModel || ''" @update:model-value="setModel">
        <SelectTrigger class="w-[140px] h-8 text-xs truncate">
          <SelectValue :placeholder="t('record.chat.header.modelPlaceholder')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="model in settingStore.aiModelList" :key="model.key" :value="model.key">
            {{ model.title }}
          </SelectItem>
        </SelectContent>
      </Select>
      
      <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" @click="clearChats" :title="t('record.chat.header.clearButtonTitle')">
        <Trash2 class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingStore } from '@/stores/setting'
import { useChatStore } from '@/stores/chat'
import { useTagStore } from '@/stores/tag'
import { usePromptStore } from '@/stores/prompt'
import { useI18n } from '@/hooks/useI18n'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-vue-next'
import { ask } from '@tauri-apps/plugin-dialog'
import ChatLanguage from "@/core/pages/record/chat/ChatLanguage.vue";
import RagSwitch from "@/core/pages/record/chat/RagSwitch.vue";

const settingStore = useSettingStore()
const chatStore = useChatStore()
const tagStore = useTagStore()
const promptStore = usePromptStore()
const { t } = useI18n()

onMounted(() => {
  promptStore.initPromptData()
})

const setModel = (val: string) => {
  settingStore.setPrimaryModel(val)
}

const setPrompt = (val: string) => {
  const prompt = promptStore.promptList.find(p => p.id === val)
  if (prompt) {
    promptStore.setCurrentPrompt(prompt)
  }
}

const clearChats = async () => {
  // 使用 Tauri 的异步 ask 函数显示确认对话框
  const confirmed = await ask(t('record.chat.header.clearDialogMessage'), {
    title: t('record.chat.header.clearDialogTitle'),
    kind: 'warning'
  })
  
  // 只有用户确认后才执行清空操作
  if (confirmed) {
    console.log('Clearing chats for tag:', tagStore.currentTagId)
    await chatStore.clearChats(tagStore.currentTagId)
    console.log('Chats cleared')
  }
}
</script>
