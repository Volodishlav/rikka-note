<template>
  <div class="p-4 border-t bg-background">
    <div class="relative">
      <Textarea 
        v-model="input" 
        placeholder="Type a message... (Shift+Enter for new line)" 
        class="min-h-[80px] pr-12 pl-12 resize-none focus-visible:ring-1"
        @keydown.enter="handleEnter"
      />
      <ChatLanguage />
      <Button 
        class="absolute bottom-2 right-2 h-8 w-8" 
        size="icon" 
        :disabled="!input.trim() || isSending"
        @click="sendMessage"
      >
        <Send class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useTagStore } from '@/stores/tag'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-vue-next'
import { fetchAiStream } from '@/lib/ai'
import ChatLanguage from './ChatLanguage.vue'

const input = ref('')
const isSending = ref(false)
const chatStore = useChatStore()
const tagStore = useTagStore()

const handleEnter = (e: KeyboardEvent) => {
  if (!e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const sendMessage = async () => {
  if (!input.value.trim() || isSending.value) return
  
  const content = input.value
  input.value = ''
  isSending.value = true
  
  try {
    const currentTagId = tagStore.currentTagId
    
    // 1. Insert User Message
    await chatStore.insert({
      tagId: currentTagId,
      role: 'user',
      content: content,
      type: 'chat',
      inserted: false
    })
    
    // 2. Insert AI Placeholder
    const aiChat = await chatStore.insert({
      tagId: currentTagId,
      role: 'assistant',
      content: 'Thinking...',
      type: 'chat',
      inserted: false
    })
    
    if (aiChat) {
      // 3. Stream AI Response
      console.log('--- Sending AI Request ---')
      console.log('User Content:', content)
      
      // 构建历史消息上下文
      // 取出当前聊天记录中除了最新的一条（即刚插入的placeholder）之外的所有消息
      // 注意：Pinia store中的chats已经包含了刚插入的user message和system placeholder
      // 我们需要排除最后一条(placeholder)，并将倒数第二条(user message)作为当前text发送，
      // 所以历史记录应该是 chats.slice(0, -2)
      // 但是 fetchAiStream 的设计是 text 是当前消息，history 是之前的消息。
      // 所以 history 应该是 chats.slice(0, -2)
      
      const history = chatStore.chats.slice(0, -2).map(chat => ({
        role: chat.role === 'user' ? 'user' : 'assistant',
        content: chat.content || ''
      }))

      let fullContent = ''
      await fetchAiStream(content, (chunk) => {
        // console.log('Stream Chunk:', chunk)
        fullContent = chunk
        chatStore.updateChat({
          ...aiChat,
          content: fullContent
        })
      }, undefined, history)
      
      // 4. Save Final AI Message
      await chatStore.saveChat({
        ...aiChat,
        content: fullContent
      }, true)
      
      console.log('--- AI Request Completed ---')
      console.log('Final Content:', fullContent)
    }
  } catch (e) {
    console.error('Failed to send message', e)
  } finally {
    isSending.value = false
  }
}
</script>
