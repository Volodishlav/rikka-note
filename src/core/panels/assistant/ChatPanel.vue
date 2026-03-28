<template>
  <div class="flex flex-col h-full w-full bg-background border-l">
    <ChatHeader />
    <ChatList />
    <ChatInput />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import ChatHeader from './chat/ChatHeader.vue'
import ChatList from './chat/ChatList.vue'
import ChatInput from './chat/ChatInput.vue'
import { logger } from '@/utils/logger'

const chatStore = useChatStore()

onMounted(async () => {
  logger.assistant.debug('Initializing global chat workspace context')
  await chatStore.init()
  logger.assistant.debug('Chats loaded:', chatStore.chats.length)
})
</script>
