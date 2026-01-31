<script setup lang="ts">
import { onMounted, watch } from 'vue'
import ChatHeader from './ChatHeader.vue'
import ChatContent from './ChatContent.vue'
import ChatInput from './ChatInput.vue'
import { useChatStore } from '@/stores/chat'
import { useTagStore } from '@/stores/tag'

const chatStore = useChatStore()
const tagStore = useTagStore()

// 当选中的标签改变时，重新加载聊天记录
watch(() => tagStore.currentTagId, (newId) => {
  if (newId) {
    chatStore.init(newId)
  }
}, { immediate: true })

</script>

<template>
  <div class="flex flex-col h-full w-full relative overflow-hidden bg-background">
    <!-- 顶部工具栏 -->
    <ChatHeader />

    <!-- 聊天内容区域 -->
    <div class="flex-1 overflow-hidden relative">
      <ChatContent />
    </div>

    <!-- 底部输入框 -->
    <ChatInput />
  </div>
</template>