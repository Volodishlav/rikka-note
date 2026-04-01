<template>
  <div class="relative flex-1 overflow-hidden">
    <div ref="scrollRef" class="h-full overflow-y-auto scroll-smooth" @scroll="onScroll">
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

    <!-- Scroll to bottom button -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0 translate-y-2"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 translate-y-2"
    >
      <button
          v-if="showScrollButton"
          @click="handleScrollToBottom"
          class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border shadow-lg hover:bg-accent transition-all duration-300 group z-10 flex items-center gap-1.5"
          aria-label="Scroll to bottom"
      >
        <span class="relative flex items-center justify-center">
          <ChevronDown class="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span v-if="hasNewMessages" class="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border-2 border-background"></span>
        </span>
        <span class="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {{ hasNewMessages ? t('record.chat.list.newMessages') : t('record.chat.list.scrollToBottom') }}
        </span>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useI18n } from '@/composables/useI18n'
import MessageItem from './MessageItem.vue'
import { Bot, ChevronDown } from 'lucide-vue-next'

const chatStore = useChatStore()
const scrollRef = ref<HTMLDivElement | null>(null)
const { t } = useI18n()

const showScrollButton = ref(false)
const hasNewMessages = ref(false)
const isNearBottom = ref(true)

const checkScroll = () => {
  if (!scrollRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollRef.value
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight
  
  // Consider "near bottom" if within 100px
  isNearBottom.value = distanceFromBottom < 100
  // Show button if more than 300px from bottom
  showScrollButton.value = distanceFromBottom > 300

  if (isNearBottom.value) {
    hasNewMessages.value = false
  }
}

const onScroll = () => {
  checkScroll()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  })
}

const handleScrollToBottom = () => {
  scrollToBottom()
  hasNewMessages.value = false
}

// Watch for list changes
watch(() => chatStore.chats.length, () => {
  if (isNearBottom.value) {
    scrollToBottom()
  } else {
    hasNewMessages.value = true
  }
})

// Watch for the last message content changes (streaming)
watch(() => chatStore.chats[chatStore.chats.length - 1]?.content, () => {
  if (isNearBottom.value) {
    scrollToBottom()
  }
}, { deep: true })

onMounted(() => {
  scrollToBottom()
  // Initial check after content might have rendered
  setTimeout(checkScroll, 100)
})
</script>
