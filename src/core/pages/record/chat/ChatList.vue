<template>
  <div ref="scrollRef" class="flex-1 overflow-y-auto scroll-smooth">
    <div class="flex flex-col min-h-full">
      <div v-if="chatStore.chats.length === 0" class="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <Bot class="h-12 w-12 mb-4 opacity-20" />
        <p>{{ t('record.chat.list.emptyState') }}</p>
      </div>
      <MessageItem v-for="chat in chatStore.chats" :key="chat.id" :message="chat" />
      <div v-if="chatStore.loading && chatStore.chats.length === 0" class="p-4 text-center text-sm text-muted-foreground">
        {{ t('record.chat.list.loading') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useI18n } from '@/hooks/useI18n'
import MessageItem from './MessageItem.vue'
import { Bot } from 'lucide-vue-next'

const chatStore = useChatStore()
const scrollRef = ref<HTMLDivElement | null>(null)
const { t } = useI18n()

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  })
}

watch(() => chatStore.chats.length, scrollToBottom)
watch(() => chatStore.chats[chatStore.chats.length - 1]?.content, scrollToBottom, { deep: true })

onMounted(scrollToBottom)
</script>
