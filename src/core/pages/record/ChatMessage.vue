<template>
  <div
      :class="[
      'flex w-full gap-3 md:gap-4 group',
      chat.role === 'user' ? 'justify-end' : 'justify-start',
    ]"
  >
    <!-- 左侧头像/图标（AI消息） -->
    <div v-if="chat.role !== 'user' && chat.role !== 'system'" class="flex-shrink-0 hidden md:flex">
      <div class="flex items-center justify-center w-6 h-6">
        <component
            :is="getIconForChat(chat)"
            class="size-5 text-primary"
        />
      </div>
    </div>

    <!-- 消息气泡内容 -->
    <div
        :class="[
        'flex-1 max-w-[80%] md:max-w-2xl',
        chat.role === 'user' ? 'items-end' : 'items-start',
      ]"
    >
      <!-- 消息主体 -->
      <div
          :class="[
          'rounded-lg px-4 py-2 text-sm leading-relaxed break-words',
          chat.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        ]"
      >
        <!-- 不同类型的消息内容 -->
        <template v-if="chat.type === 'clear'">
          <!-- 清空上下文分隔线 -->
          <div class="flex items-center gap-2 px-2 py-1">
            <Separator class="flex-1" />
            <span class="text-xs text-muted-foreground">
              {{ t('record.chat.message.clearContext') }}
            </span>
            <button
                @click="handleRemoveMessage"
                class="hover:opacity-70"
                :title="t('common.delete')"
            >
              <XIcon class="size-4" />
            </button>
            <Separator class="flex-1" />
          </div>
        </template>

        <!-- 普通文本/AI回复 -->
        <template v-else>
          <!-- 思考过程（如果有） -->
          <ChatThinking v-if="chat.content?.includes('<thinking>')" :thinking="chat.content" />

          <!-- 实际内容 -->
          <ChatPreview :content="getCleanContent(chat.content || '')" />

          <!-- 加载状态 -->
          <div v-if="isLoading && isLastMessage" class="flex items-center gap-1 mt-2">
            <div class="flex gap-1">
              <div
                  v-for="i in 3"
                  :key="i"
                  class="w-1.5 h-1.5 bg-current rounded-full animate-pulse"
                  :style="{ animationDelay: `${i * 100}ms` }"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- 消息控制按钮（hover显示） -->
      <div v-if="chat.role !== 'user' && chat.role !== 'system'" class="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
            @click="handleCopy"
            :title="t('record.chat.message.copy')"
            class="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
        >
          <CopyIcon class="size-4" />
        </button>
        <button
            v-if="chat.role !== 'user' && chat.role !== 'system' && chat.type === 'chat'"
            @click="handleInsertToNote"
            :title="t('record.chat.message.insertToNote')"
            class="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
        >
          <ArrowRightIcon class="size-4" />
        </button>
      </div>
    </div>

    <!-- 右侧头像（用户消息） -->
    <div v-if="chat.role === 'user'" class="flex-shrink-0 hidden md:flex">
      <Avatar class="size-6">
        <AvatarImage v-if="userAvatar" :src="userAvatar" />
        <AvatarFallback>{{ userInitial }}</AvatarFallback>
      </Avatar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { useChatStore } from '@/stores/chat'
import { Chat } from '@/db/chats'
import ChatPreview from './ChatPreview.vue'
import ChatThinking from './ChatThinking.vue'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  BotIcon,
  ClipboardIcon,
  LoaderIcon,
  XIcon,
  CopyIcon,
  ArrowRightIcon,
} from 'lucide-vue-next'

const { t } = useI18n()
const chatStore = useChatStore()

interface Props {
  chat: Chat
  isLastMessage?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLastMessage: false,
})

const emit = defineEmits<{
  delete: [chatId: number]
  copy: [content: string]
  insertToNote: [content: string]
}>()

// 计算属性
const isLoading = computed(() => chatStore.loading)
const userAvatar = computed(() => {
  // TODO: 从sync store获取用户头像
  return ''
})
const userInitial = computed(() => 'U')

// 获取消息对应的图标
function getIconForChat(chat: Chat) {
  switch (chat.type) {
    case 'clipboard':
      return ClipboardIcon
    default:
      return BotIcon
  }
}

// 清理内容，移除 <thinking> 标签及其内容
function getCleanContent(content: string): string {
  if (content.includes('<thinking>')) {
    // 提取 <thinking> 标签之后的内容
    return content.split('<thinking>')[2] || ''
  }
  return content
}

// 删除消息
function handleRemoveMessage() {
  emit('delete', props.chat.id)
}

// 复制消息内容
async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.chat.content || '')
    // TODO: 显示toast提示
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}

// 插入到笔记
function handleInsertToNote() {
  emit('insertToNote', props.chat.content || '')
}
</script>