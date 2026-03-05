<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css' // 或者你喜欢的样式
import { Copy, PlusSquare, Check,X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useInsertChat } from '@/composables/useInsertChat'
const chatStore = useChatStore()
const { insertChatToMark } = useInsertChat()
const scrollRef = ref<HTMLElement | null>(null)

const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return ''; // use external default escaping
  }
})

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  })
}

// 监听聊天记录变化，自动滚动到底部
watch(() => chatStore.chats.length, scrollToBottom)
watch(() => chatStore.chats[chatStore.chats.length - 1]?.content, scrollToBottom) // 监听最新一条消息内容变化（流式输出时）

onMounted(scrollToBottom)

const renderMarkdown = (content: string) => {
  let text = content || ''
  // Hide thinking block
  text = text.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim()
  // If result is empty but original had thinking, show indicator
  if (!text && content?.includes('<thinking>')) {
      return '<span class="text-muted-foreground italic text-xs">Thinking...</span>'
  }
  return md.render(text)
}

const copyContent = (content: string) => {
  navigator.clipboard.writeText(content)
  // 可以加个 toast 提示
}
const handleInsert = async (chat: any) => {
  await insertChatToMark(chat)
}
</script>

<template>
  <div ref="scrollRef" class="h-full overflow-y-auto p-4 space-y-4">
    <div v-if="chatStore.chats.length === 0" class="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
      <p>No messages yet.</p>
    </div>

    <div
        v-for="chat in chatStore.chats"
        :key="chat.id"
        class="flex flex-col gap-2"
        :class="chat.type === 'clear' ? 'items-center' : (chat.role === 'user' ? 'items-end' : 'items-start')"
    >
<!--      分割线-->
      <div v-if="chat.type === 'clear'" class="w-full flex justify-center items-center gap-4 px-4 py-2 group">
        <div class="h-[1px] flex-1 bg-border"></div>
        <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground whitespace-nowrap">{{ chat.content }}</span>
            <Button variant="ghost" size="icon" class="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" @click="chatStore.deleteChat(chat.id)">
<!--                分割线的叉号-->
              <X class="w-3 h-3 text-muted-foreground" />
            </Button>
        </div>
        <div class="h-[1px] flex-1 bg-border"></div>
      </div>

      <div
          v-else
          class="max-w-[85%] rounded-lg p-3 text-sm relative group"
          :class="chat.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'"
      >
        <!-- 简单的工具栏，仅在 hover 时显示 -->
        <div
            class="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background border rounded shadow-sm scale-90"
            v-if="chat.role === 'system'"
        >
          <Button variant="ghost" size="icon" class="h-6 w-6" @click="copyContent(chat.content || '')">
            <Copy class="w-3 h-3" />
          </Button>
          <Button
              variant="ghost"
              size="icon"
              class="h-6 w-6"
              @click="handleInsert(chat)"
              :disabled="chat.inserted"
              :title="chat.inserted ? 'Inserted' : 'Insert to Note'"
          >
            <Check v-if="chat.inserted" class="w-3 h-3 text-green-500" />
            <PlusSquare v-else class="w-3 h-3" />
          </Button>

        </div>

        <div class="markdown-body" v-html="renderMarkdown(chat.content || '')"></div>

        <div v-if="chat.image" class="mt-2">
          <img :src="chat.image" class="max-w-full rounded border" />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* 简单的 Markdown 样式修正 */
.markdown-body p { margin-bottom: 0.5em; }
.markdown-body pre { background: #1e1e1e; padding: 1em; border-radius: 0.5em; overflow-x: auto; color: #fff; }
</style>