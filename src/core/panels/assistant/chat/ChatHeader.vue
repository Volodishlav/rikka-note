<template>
  <div class="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur z-10 gap-2">
<!--    <div class="font-semibold text-sm shrink-0">{{ t('record.chat.header.title') }}</div>-->
    <div class="flex items-center gap-2 flex-1 justify-end min-w-0">
      <ChatLanguage />
      <RagSwitch />
      <ThinkSwitch />
      <!-- Prompt Selector -->
      <Select :model-value="promptStore.currentPrompt?.id || ''" @update:model-value="onPromptSelect">
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
      <Select :model-value="settingStore.primaryModel || ''" @update:model-value="onModelSelect">
        <SelectTrigger class="w-[140px] h-8 text-xs truncate">
          <SelectValue :placeholder="t('record.chat.header.modelPlaceholder')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="model in settingStore.chatModels" :key="model.key" :value="model.key">
            {{ model.title }}
          </SelectItem>
        </SelectContent>
      </Select>
      
      <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" @click="isSessionsOpen = true" :title="t('record.chat.header.historyButtonTitle')">
        <History class="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary" @click="createNewSession" :title="t('record.chat.header.newChatButtonTitle')">
        <MessageSquarePlus class="h-4 w-4" />
      </Button>
    </div>
    
    <ChatSessionsSheet :isOpen="isSessionsOpen" @update:open="isSessionsOpen = $event" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettingStore } from '@/stores/setting'
import { useChatStore } from '@/stores/chat'
import { usePromptStore } from '@/stores/prompt'
import { useI18n } from '@/composables/useI18n'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { History, MessageSquarePlus } from 'lucide-vue-next'
import ChatLanguage from "./ChatLanguage.vue"
import RagSwitch from "./RagSwitch.vue"
import ThinkSwitch from "./ThinkSwitch.vue"
import ChatSessionsSheet from './ChatSessionsSheet.vue'

const settingStore = useSettingStore()
const chatStore = useChatStore()
const promptStore = usePromptStore()
const { t } = useI18n()

const isSessionsOpen = ref(false)

onMounted(() => {
  promptStore.initPromptData()
})

const onModelSelect = (val: any) => {
  if (typeof val === 'string') {
    settingStore.setPrimaryModel(val)
  }
}

const onPromptSelect = (val: any) => {
  if (val === null || val === undefined) return
  const idValue = val.toString()
  const prompt = promptStore.promptList.find((p) => p.id === idValue)
  if (prompt) {
    promptStore.setCurrentPrompt(prompt)
  }
}

const createNewSession = async () => {
  if (chatStore.currentSessionId && chatStore.chats.length === 0) {
    return
  }
  await chatStore.createSession()
}
</script>
