<template>
  <div class="p-4 border-t bg-background">
    <div class="relative">
      <Textarea 
        v-model="input" 
        :placeholder="t('record.chat.input.placeholder')" 
        class="min-h-[80px] pr-12 pl-12 resize-none focus-visible:ring-1"
        @keydown.enter="handleEnter"
      />
      <div class="absolute bottom-2 left-2 flex gap-1">
        <ChatLanguage />
        <RagSwitch />
      </div>
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
import { useVectorStore } from '@/stores/vector'
import { useI18n } from '@/hooks/useI18n'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-vue-next'
import { fetchAiStream } from '@/lib/ai'
import { getContextForQuery } from '@/lib/rag'
import { invoke } from '@tauri-apps/api/core'
import ChatLanguage from './ChatLanguage.vue'
import RagSwitch from './RagSwitch.vue'
import { storeToRefs } from 'pinia'
import { toast } from '@/components/ui/toast/use-toast'

const input = ref('')
const isSending = ref(false)
const chatStore = useChatStore()
const tagStore = useTagStore()
const vectorStore = useVectorStore()
const { isRagEnabled, documentCount } = storeToRefs(vectorStore)
const { t } = useI18n()

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
      // 3. Prepare RAG Context
      let ragContext = ''
      if (isRagEnabled.value) {
        // Check if vector DB is empty
        if (documentCount.value === 0) {
          toast({
            variant: 'destructive',
            title: 'Vector Database Empty',
            description: 'Please build the vector index in the file sidebar to use RAG features.'
          })
          console.warn('Vector database is empty, skipping RAG search')
        } else {
          try {
            console.log('Fetching RAG context for:', content)
            // Extract keywords
            const keywords = await invoke<{text: string, weight: number}[]>('rank_keywords', { 
              text: content, 
              topK: 5 
            })
            
            console.log('Extracted keywords:', keywords)

            if (!keywords || keywords.length === 0) {
              console.log('No keywords extracted')
              // 如果没有提取到关键词，尝试直接使用原句进行搜索
              keywords.push({ text: content, weight: 1.0 })
            }

            ragContext = await getContextForQuery(keywords)
            
            if (ragContext) {
              ragContext = `
Your knowledge library is the most relevant content related to this question. Please use these information to answer the question:
${ragContext}
`
              console.log('RAG Context found:', ragContext.slice(0, 100) + '...')
            } else {
              console.log('No RAG Context found')
            }
          } catch (error) {
            console.error('Failed to get RAG context:', error)
          }
        }
      }

      // 4. Construct Final Prompt
      // Combine user content with RAG context
      // Note: We might want to pass this as a system message or append to user message.
      // In note-gen, it constructs a big string `request_content`.
      
      const finalContent = `
${ragContext.trim()}
${content.trim()}
`.trim()

      // 5. Stream AI Response
      console.log('--- Sending AI Request ---')
      
      const history = chatStore.chats.slice(0, -2).map(chat => ({
        role: chat.role === 'user' ? 'user' : 'assistant',
        content: chat.content || ''
      }))

      let fullContent = ''
      await fetchAiStream(finalContent, (chunk) => {
        fullContent = chunk
        chatStore.updateChat({
          ...aiChat,
          content: fullContent
        })
      }, undefined, history)
      
      // 6. Save Final AI Message
      await chatStore.saveChat({
        ...aiChat,
        content: fullContent
      }, true)
      
      console.log('--- AI Request Completed ---')
    }
  } catch (e) {
    console.error('Failed to send message', e)
  } finally {
    isSending.value = false
  }
}
</script>
