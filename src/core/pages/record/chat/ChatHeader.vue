<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Trash2, AlignVerticalJustifyCenter } from 'lucide-vue-next'
import { useChatStore } from '@/stores/chat'
import { useTagStore } from '@/stores/tag'
// 引入 shadcn-vue 的组件
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const chatStore = useChatStore()
const tagStore = useTagStore()

const handleClear = () => {
  if (confirm('Are you sure you want to clear all chats?')) {
    chatStore.clearChats(tagStore.currentTagId)
  }
}

const handleClearContext = async () => {
  await chatStore.insert({
    tagId: tagStore.currentTagId,
    role: 'system',
    content: 'Context cleared. Future messages will only carry content after this point.',
    type: 'clear',
    inserted: true
  })
}
</script>

<template>
  <div class="flex items-center justify-between p-2 border-b h-12 shrink-0">
    <div class="font-medium text-sm pl-2">Chat</div>

    <div class="flex items-center gap-1">
      <!-- 这里可以放置模型选择器 ModelSelect -->

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" @click="handleClearContext">
              <AlignVerticalJustifyCenter class="w-4 h-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear Context</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" @click="handleClear">
              <Trash2 class="w-4 h-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear All Chat</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>