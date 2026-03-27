<template>
  <div class="p-4 border-t bg-background">
    <!-- RAG 显式授权确认区域 -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-4 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-4 opacity-0"
    >
      <div v-if="isConfirmingRag" class="mx-[5px] mb-4 space-y-2">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2 text-xs font-medium text-primary">
            <AlertCircle class="h-3.5 w-3.5" />
            <span>系统将提取以下本地笔记发送至云端，请确认：</span>
          </div>
          <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-destructive/10 hover:text-destructive transition-colors" @click="cancelRag">
            <X class="h-3 w-3" />
          </Button>
        </div>
        
        <div class="grid gap-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
          <div 
            v-for="(doc, index) in retrievedDocs" 
            :key="doc.filename + index"
            class="group relative flex flex-col p-3 bg-muted/30 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/50 cursor-pointer transition-all duration-200 shadow-sm overflow-hidden"
            @click="navigateToDoc(doc.filename)"
          >
            <!-- 单个移除按钮 -->
            <Button 
              variant="ghost" 
              size="icon" 
              class="absolute top-0 right-0 h-6 w-6 rounded-full bg-background/50 backdrop-blur-sm border opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-white transition-all z-10"
              @click.stop="removeDoc(index)"
            >
              <X class="h-3 w-3" />
            </Button>

            <div class="flex items-center gap-2 mb-1.5">
              <div class="p-1 bg-primary/10 rounded-md">
                <FileText class="h-3.5 w-3.5 text-primary" />
              </div>
              <span class="text-sm font-semibold truncate flex-1 pr-6">{{ doc.filename }}</span>
              <span class="text-[10px] font-medium px-1.5 py-0 bg-primary/5 text-primary/70 rounded-full border border-primary/10">
                相关度: {{ (doc.score * 100).toFixed(0) }}%
              </span>
            </div>
            <p class="text-xs text-muted-foreground line-clamp-2 leading-relaxed pl-7">
              {{ doc.content.slice(0, 50).replace(/\n/g, ' ').trim() }}{{ doc.content.length > 50 ? '...' : '' }}
            </p>
          </div>
        </div>

        <div class="text-[10px] text-center text-muted-foreground pt-1 flex items-center justify-center gap-1">
          <span>再次敲击 Enter 或点击发送按钮确认并提交</span>
        </div>
      </div>
    </Transition>

    <!-- AI 编辑模式上下文提示 -->
    <div v-if="chatStore.isEditMode && articleStore.activeFilePath" class="mb-2 px-1 flex items-center justify-between">
      <div class="flex items-center gap-2 text-[10px] font-medium text-purple-500 animate-pulse">
        <Sparkles class="h-3 w-3" />
        <span v-if="chatStore.editSelection">正在编辑：选中片段 ({{ chatStore.editSelection.length }} 字)</span>
        <span v-else>正在编辑：全文件内容</span>
      </div>
      <Button variant="ghost" size="xs" class="h-5 text-[10px] text-muted-foreground hover:text-foreground" @click="chatStore.toggleEditMode(false)">
        关闭编辑模式
      </Button>
    </div>

    <div class="relative">
      <Textarea 
        v-model="input" 
        :placeholder="isConfirmingRag ? '点击发送或 Enter 确认...' : t('record.chat.input.placeholder')" 
        class="min-h-[80px] pr-12 pl-4 resize-none focus-visible:ring-1 transition-all"
        :class="{ 'border-primary ring-1 ring-primary/20': isConfirmingRag }"
        @keydown.enter="handleEnter"
      />
      <Button 
        class="absolute bottom-2 right-2 h-8 w-8 transition-all" 
        :class="{ 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 scale-110': isConfirmingRag }"
        size="icon" 
        :disabled="!input.trim() || isSending"
        @click="sendMessage"
      >
        <Send class="h-4 w-4" />
      </Button>
      
      <!-- AI 编辑模式切换按钮 -->
      <Button 
        variant="ghost" 
        size="icon" 
        class="absolute bottom-2 right-11 h-8 w-8 transition-all hover:bg-purple-500/10 hover:text-purple-500" 
        :class="{ 'text-purple-500 bg-purple-500/10': chatStore.isEditMode }"
        @click="chatStore.toggleEditMode()"
        title="AI 编辑模式"
      >
        <Wand2 class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useVectorStore } from '@/stores/vector'
import { useI18n } from '@/hooks/useI18n'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send, FileText, X, AlertCircle, Wand2, Sparkles } from 'lucide-vue-next'
import { fetchAiStream } from '@/lib/ai'
import { getRetrievedDocs, type RetrievedDoc } from '@/lib/rag'
import { invoke } from '@tauri-apps/api/core'
import { storeToRefs } from 'pinia'
import { toast } from '@/components/ui/toast/use-toast'
import { useArticleStore } from '@/stores/article'

const input = ref('')
const isSending = ref(false)
const isConfirmingRag = ref(false)
const retrievedDocs = ref<RetrievedDoc[]>([])
const pendingContent = ref('')

const chatStore = useChatStore()
const vectorStore = useVectorStore()
const articleStore = useArticleStore()
const { isRagEnabled, documentCount } = storeToRefs(vectorStore)
const { t } = useI18n()

const handleEnter = (e: KeyboardEvent) => {
  if (!e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const cancelRag = () => {
  isConfirmingRag.value = false
  retrievedDocs.value = []
  pendingContent.value = ''
}

const removeDoc = (index: number) => {
  retrievedDocs.value.splice(index, 1)
  if (retrievedDocs.value.length === 0) {
    cancelRag()
  }
}

const navigateToDoc = async (filename: string) => {
  try {
    // 确保已加载所有文章，以便查找路径
    if (articleStore.allArticle.length === 0) {
      await articleStore.loadAllArticle()
    }
    
    // 在全量文章列表中寻找路径匹配的文件
    const match = articleStore.allArticle.find(a => a.path.endsWith(filename))
    
    if (match) {
      await articleStore.setActiveFilePath(match.path)
      await articleStore.readArticle(match.path)
      toast({
        title: '已跳转至笔记',
        description: `正在查看: ${filename}`,
      })
    } else {
      toast({
        variant: 'destructive',
        title: '跳转失败',
        description: `未能在当前工作区找到文件: ${filename}`,
      })
    }
  } catch (err) {
    console.error('Navigation failed:', err)
  }
}

const sendMessage = async () => {
  const content = input.value.trim()
  if (!content && !pendingContent.value) return
  if (isSending.value) return

  // 1. 如果当前处于 RAG 确认状态，且内容未变，则执行真正的发送
  if (isConfirmingRag.value && (content === pendingContent.value || !content)) {
    const finalContentToUse = content || pendingContent.value
    await performSendMessage(finalContentToUse, retrievedDocs.value)
    cancelRag()
    return
  }

  // 2. 如果开启了 RAG，进行检索预检
  if (isRagEnabled.value && documentCount.value > 0) {
    isSending.value = true
    try {
      console.log('Pre-fetching RAG context for verification...')
      
      let keywords: { text: string; weight: number }[]
      if (content.length > 10) {
        const rawKeywords = await invoke<{text: string, weight: number}[]>('rank_keywords', { 
          text: content, 
          topK: 3 
        })
        keywords = rawKeywords.map(k => ({ text: k.text, weight: 1.0 }))
      } else {
        keywords = [{ text: content, weight: 1.0 }]
      }

      const docs = await getRetrievedDocs(content, keywords)
      
      if (docs.length > 0) {
        retrievedDocs.value = docs
        isConfirmingRag.value = true
        pendingContent.value = content
        isSending.value = false
        return
      }
    } catch (error) {
      console.error('Failed to pre-fetch RAG docs:', error)
    } finally {
      isSending.value = false
    }
  }

  // 3. 不使用 RAG 或未检索到任何内容，直接发送
  await performSendMessage(content, [])
}

const performSendMessage = async (content: string, docs: RetrievedDoc[]) => {
  isSending.value = true
  try {
    // 1. Insert User Message
    await chatStore.insert({
      role: 'user',
      content: content,
      type: 'chat',
      inserted: false
    })

    // 2. Insert AI Placeholder
    const aiChat = await chatStore.insert({
      role: 'assistant',
      content: 'Thinking...',
      type: 'chat',
      inserted: false
    })

    if (aiChat) {
      // 3. Prepare Context String
      let ragContext = ''
      if (docs.length > 0) {
        ragContext = `
Your knowledge library is the most relevant content related to this question. Please use these information to answer the question:
${docs.map(ctx => `文件：${ctx.filename}\n${ctx.content}\n`).join('\n---\n\n')}
`
      }

      // 构建最终提示词
      let finalContent = ''
      
      if (chatStore.isEditMode) {
        // AI 编辑模式专项 Prompt
        const targetText = chatStore.editSelection || chatStore.editFullContent
        const isFullFile = !chatStore.editSelection
        
        finalContent = `
IMPORTANT: You are in "Edit Mode". Your task is to modify the provided text based on the user's instruction.
Return the modified version wrapped in a \`\`\`proposal\`\`\` code block. 

TARGET TEXT (${isFullFile ? 'Full File' : 'Selected Fragment'}):
${targetText}

USER INSTRUCTION:
${content.trim()}

Please provide the revised content inside a \`\`\`proposal\`\`\` block.
`.trim()
      } else {
        // 普通聊天模式
        finalContent = `
${ragContext.trim()}
${content.trim()}
`.trim()
      }

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

      // 6. 如果是编辑模式，附加元数据
      if (chatStore.isEditMode) {
        const originalText = chatStore.editSelection || chatStore.editFullContent;
        // 使用 Base64 编码原文以避免 HTML/Markdown 冲突 (处理中文需要 encodeURIComponent)
        const encodedOriginal = btoa(encodeURIComponent(originalText));
        fullContent += `\n\n<!-- rikka-edit-meta: {"original": "${encodedOriginal}", "status": "suggestion", "isFull": ${!chatStore.editSelection}} -->`;
      }

      // 7. Save Final AI Message
      await chatStore.saveChat({
        ...aiChat,
        content: fullContent
      }, true)

      console.log('--- AI Request Completed ---')
    }
  } catch (e) {
    console.error('Failed to perform send message', e)
    toast({
      variant: 'destructive',
      title: '发送失败',
      description: '请求 AI 时发生错误，请重试'
    })
  } finally {
    isSending.value = false
    input.value = ''
  }
}
</script>