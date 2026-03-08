<template>
  <div class="flex flex-col h-full w-full bg-background border-l">
    <ChatHeader />
    <ChatList />
    <ChatInput />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useTagStore } from '@/stores/tag'
import ChatHeader from './ChatHeader.vue'
import ChatList from './ChatList.vue'
import ChatInput from './ChatInput.vue'

const chatStore = useChatStore()
const tagStore = useTagStore()

// Initialize chats when tag changes
watch(() => tagStore.currentTagId, async (newId) => {
  if (newId) {
    console.log('Switching chat context to tag:', newId)
    await chatStore.init(newId)
    console.log('Chats loaded:', chatStore.chats.length)
  }
}, { immediate: true })
</script>
