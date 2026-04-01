<template>
  <div class="flex gap-3 p-4 group text-sm" :class="{'bg-muted/50': message.role === 'user'}">
    <Avatar class="h-8 w-8 shrink-0 mt-1">
      <AvatarImage v-if="message.role === 'user'" src="" />
      <AvatarFallback>{{ message.role === 'user' ? t('record.chat.message.userAvatar') : t('record.chat.message.aiAvatar') }}</AvatarFallback>
    </Avatar>
    <div class="flex-1 overflow-hidden min-w-0">
      <div class="flex items-center justify-between mb-1">
        <span class="font-semibold text-xs text-muted-foreground">{{ message.role === 'user' ? t('record.chat.message.userName') : t('record.chat.message.aiName') }}</span>
        <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <Button variant="ghost" size="icon" class="h-6 w-6" @click="copyContent">
            <Copy class="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div class="prose dark:prose-invert max-w-none break-words leading-relaxed">
        <!-- 如果消息包含提案代码块，且是助手回复，渲染 Diff 预览 -->
        <template v-if="proposalData">
          <div v-if="proposalData.prefix" class="mb-2">
            <MdPreview :modelValue="proposalData.prefix" :editorId="'msg-pre-' + message.id" :theme="isDark ? 'dark' : 'light'" />
          </div>
          
          <DiffPreview 
            :message-id="message.id"
            :original="proposalData.original" 
            :proposed="proposalData.proposed" 
            :isFullFile="proposalData.isFullFile"
            :status="proposalData.status"
          />
          
          <div v-if="proposalData.suffix" class="mt-2">
            <MdPreview :modelValue="proposalData.suffix" :editorId="'msg-post-' + message.id" :theme="isDark ? 'dark' : 'light'" />
          </div>
        </template>
        
        <MdPreview v-else :modelValue="message.content || ''" :editorId="'msg-' + message.id" :theme="isDark ? 'dark' : 'light'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Chat } from '@/db/chats'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-vue-next'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import { useToast } from '@/components/ui/toast/use-toast'
import { useI18n } from '@/composables/useI18n'
import { useChatStore } from '@/stores/chat'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import DiffPreview from './DiffPreview.vue'
import { logger } from '@/utils/logger'
import { computed } from 'vue'

const props = defineProps<{
  message: Chat
}>()

const { toast } = useToast()
const { t } = useI18n()
const chatStore = useChatStore()

// 解析消息中的提案内容
const proposalData = computed(() => {
  if (props.message.role !== 'assistant' || !props.message.content) return null;
  
  // 1. 优先尝试解析隐藏元数据 (新方案)
  const metaMatch = props.message.content.match(/<!-- rikka-edit-meta: (\{.*?\}) -->/);
  let metadata: any = null;
  if (metaMatch) {
    try {
      metadata = JSON.parse(metaMatch[1]);
      // 解码原文 (处理中文)
      metadata.original = decodeURIComponent(atob(metadata.original));
    } catch (e) {
      logger.assistant.error('Failed to parse rikka-edit-meta:', e);
    }
  }

  // 2. 匹配 ```proposal 内容 ```
  const proposalMatch = props.message.content.match(/([\s\S]*?)```proposal\s*([\s\S]*?)```([\s\S]*)/);
  if (proposalMatch) {
    const [_, prefix, proposed, suffix] = proposalMatch;
    
    // 如果有元数据，使用元数据中的原文和状态，实现状态锁定
    // 否则回退到 chatStore (旧消息兼容性)
    const original = metadata ? metadata.original : (chatStore.editSelection || chatStore.editFullContent);
    const isFullFile = metadata ? metadata.isFull : !chatStore.editSelection;
    const status = metadata ? metadata.status : 'suggestion';
    
    return {
      prefix: prefix.trim(),
      proposed: proposed.trim(),
      suffix: suffix.trim(),
      original: original,
      isFullFile: isFullFile,
      status: status
    };
  }
  return null;
});

// 主题状态 - 检测当前是否为深色模式
const isDark = ref(document.documentElement.classList.contains('dark'))

// 监听主题变化
let observer: MutationObserver | null = null

onMounted(() => {
  // 使用 MutationObserver 监听 class 变化
  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        isDark.value = document.documentElement.classList.contains('dark')
      }
    })
  })
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

onUnmounted(() => {
  // 组件卸载时断开观察
  if (observer) {
    observer.disconnect()
  }
})

const copyContent = async () => {
  if (props.message.content) {
    try {
      await writeText(props.message.content)
      toast({ description: t('record.chat.message.copiedToClipboard') })
    } catch (e) {
      logger.assistant.error('Copy failed', e)
    }
  }
}
</script>

<style scoped>
:deep(.md-editor-preview-wrapper) {
  padding: 0;
}
:deep(.md-editor-preview) {
  color: inherit;
  font-size: inherit;
  background-color: transparent;
}

/* 深色主题适配 */
:deep(.md-editor-dark) {
  --md-bk-color: transparent;
}

/* 代码块深色主题适配 */
:deep(.md-editor-dark .md-editor-preview pre) {
  background-color: hsl(var(--muted));
}

/* 引用块深色主题适配 */
:deep(.md-editor-dark .md-editor-preview blockquote) {
  border-color: hsl(var(--border));
  background-color: hsl(var(--muted) / 0.5);
}

/* 表格深色主题适配 */
:deep(.md-editor-dark .md-editor-preview table) {
  border-color: hsl(var(--border));
}

:deep(.md-editor-dark .md-editor-preview th),
:deep(.md-editor-dark .md-editor-preview td) {
  border-color: hsl(var(--border));
}
</style>
