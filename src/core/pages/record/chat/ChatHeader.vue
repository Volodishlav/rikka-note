<template>
  <div class="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur z-10 gap-2">
    <div class="font-semibold text-sm shrink-0">AI Chat</div>
    <div class="flex items-center gap-2 flex-1 justify-end min-w-0">
      
      <!-- Prompt Selector -->
      <Select :model-value="promptStore.currentPrompt?.id" @update:model-value="setPrompt">
        <SelectTrigger class="w-[120px] h-8 text-xs truncate">
          <SelectValue placeholder="Prompt" />
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
          <SelectValue placeholder="Model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="model in settingStore.aiModelList" :key="model.key" :value="model.key">
            {{ model.title }}
          </SelectItem>
        </SelectContent>
      </Select>
      
      <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" @click="clearChats" title="Clear Chat History">
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-vue-next'

const settingStore = useSettingStore()
const chatStore = useChatStore()
const tagStore = useTagStore()
const promptStore = usePromptStore()

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
  if (confirm('Are you sure you want to clear chat history for this tag?')) {
    console.log('Clearing chats for tag:', tagStore.currentTagId)
    await chatStore.clearChats(tagStore.currentTagId)
    console.log('Chats cleared')
  }
}
</script>
