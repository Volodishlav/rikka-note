<template>
  <div class="p-4 border-t bg-background">
    <div class="relative">
      <Textarea 
        v-model="input" 
        :placeholder="t('record.chat.input.placeholder')" 
        class="min-h-[80px] pr-12 pl-4 resize-none focus-visible:ring-1"
        @keydown.enter="handleEnter"
      />
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
            // 注意：Rust 命令通常期望参数使用蛇形命名法（snake_case），需核对定义。
            // 在 keywords.rs 文件中：pub fn rank_keywords(text: &str, top_k: usize, allowed_pos: Option<Vec<String>>)
            // Tauri 会自动将参数的小驼峰命名（camelCase）转换为蛇形命名（snake_case）吗？
            // Tauri 2 通常在 JS 中使用小驼峰命名，对应 Rust 中的蛇形命名？
            // 核对 fuzzy_search.rs 文件：pub fn fuzzy_search(items: ..., query: ..., keys: ...)
            // 在 rag.ts 中调用：invoke('fuzzy_search', { items, query, keys, threshold... })
            // 由此可见参数名要么完全一致，要么按小驼峰映射。
            // 若 `topK` 会映射到 `top_k`，则使用小驼峰的 `topK`，否则确认是否需要用 `top_k`。
            // 在 note-gen 项目中：invoke('rank_keywords', { text: inputValue, topK: 5 })
            // 但在 rikka-note 项目的 keywords.rs 中：rank_keywords(text: &str, top_k: usize...)
            // Tauri 1.x 版本会将小驼峰自动转为蛇形命名，Tauri 2.x 可能相同或不同。
            // 若 note-gen 用 React 且依赖旧版 Tauri 行为，为稳妥起见先尝试 `top_k`。
            // 实际开发中，尽可能沿用 note-gen 的写法，但需确认 note-gen 是否基于 React/Tauri2？
            // 需求明确说明是 "Tauri 2 + Vue 3" 技术栈。
            // 先按 note-gen 的写法使用 `topK`，假设 Tauri 会处理命名映射。
            // 但注意 Rust 函数签名中明确是 `top_k`。
            // 先按 note-gen 用 `topK` 尝试，若失败再切换。
            // 注意：当前是在 Vue 项目中编写代码。
            // 为保持与 note-gen 调用风格一致，最终使用 `topK`。
            // 备注：note-gen 项目中使用的是 `topK`，而 rikka-note 的 Rust 代码中参数是 `top_k`。
            // Tauri 约定：invoke('命令名', { 参数名: 值 }) 会映射到 Rust 中的 fn 命令名(参数名_蛇形: 类型)
            // 因此 `topK` -> `top_k` 是正确的映射关系。
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

// 4. 构建最终提示词
// 将用户输入内容与 RAG 上下文合并
// 备注：可考虑将此作为系统消息传递，或追加到用户消息中。
// 在 note-gen 项目中，是将内容拼接成一个大字符串 `request_content`。
      
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
