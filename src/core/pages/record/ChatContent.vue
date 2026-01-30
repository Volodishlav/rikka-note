<template>
  <div
      ref="scrollContainerRef"
      class="flex-1 w-full overflow-y-auto overflow-x-hidden bg-background relative"
  >
    <div class="flex flex-col gap-4 p-4 max-w-4xl mx-auto w-full">
      <!-- 空状态 -->
      <ChatEmpty v-if="chats.length === 0" />

      <!-- 消息列表 -->
      <template v-else>
        <ChatMessage
            v-for="(chat, index) in chats"
            :key="chat.id"
            :chat="chat"
            :is-last-message="index === chats.length - 1"
            @delete="handleDeleteMessage"
            @copy="handleCopyMessage"
            @insert-to-note="handleInsertToNote"
        />
      </template>

      <!-- 滚动到底部按钮 -->
      <button
          v-if="!isAtBottom && chats.length > 0"
          @click="scrollToBottom"
          class="sticky bottom-4 right-4 p-2 rounded-full bg-primary text-primary-foreground
               hover:opacity-90 transition-opacity shadow-lg self-end"
          :title="t('record.chat.scrollToBottom')"
      >
        <ArrowDownIcon class="size-5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { useChatStore } from '@/stores/chat'
import { useTagStore } from '@/stores/tag'
import ChatEmpty from './ChatEmpty.vue'
import ChatMessage from './ChatMessage.vue'
import { ArrowDownIcon } from 'lucide-vue-next'

const { t } = useI18n()
const chatStore = useChatStore()
const tagStore = useTagStore()

const scrollContainerRef = ref<HTMLDivElement>()
const isAtBottom = ref(true)

const chats = computed(() => chatStore.chats)

// 处理滚动事件
function handleScroll() {
  if (!scrollContainerRef.value) return
  const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.value
  // 判断是否在底部（留50px的缓冲区）
  isAtBottom.value = scrollHeight - scrollTop - clientHeight < 50
}

// 滚动到底部
async function scrollToBottom() {
  await nextTick()
  if (scrollContainerRef.value) {
    scrollContainerRef.value.scrollTop = scrollContainerRef.value.scrollHeight
  }
}

// 初始化：加载当前标签的聊天记录
async function initChats() {
  const currentTagId = tagStore.currentTagId
  if (currentTagId) {
    await chatStore.init(currentTagId)
    await scrollToBottom()
  }
}

// 删除消息
async function handleDeleteMessage(chatId: number) {
  await chatStore.deleteChat(chatId)
}

// 复制消息
function handleCopyMessage(content: string) {
  // TODO: 显示toast提示
  console.log('Copied:', content)
}

// 插入到笔记
function handleInsertToNote(content: string) {
  // TODO: 实现插入笔记的逻辑（第4.7步）
  console.log('Insert to note:', content)
}

// 监听聊天列表变化，自动滚动到底部
watch(chats, async () => {
  if (isAtBottom.value) {
    await scrollToBottom()
  }
})

// 监听当前标签变化，重新加载聊天
watch(
    () => tagStore.currentTagId,
    () => initChats()
)

// 生命周期
onMounted(() => {
  if (scrollContainerRef.value) {
    scrollContainerRef.value.addEventListener('scroll', handleScroll)
  }
  initChats()
})

onUnmounted(() => {
  if (scrollContainerRef.value) {
    scrollContainerRef.value.removeEventListener('scroll', handleScroll)
  }
})
</script>