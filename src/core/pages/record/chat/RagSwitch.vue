<template>
  <div class="hidden md:block">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="handleClick"
          >
            <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
            <BookCheck v-else-if="isRagEnabled" class="h-4 w-4" />
            <Book v-else class="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ isRagEnabled ? 'RAG Enabled' : 'RAG Disabled' }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Book, BookCheck, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useVectorStore } from '@/stores/vector'
import { checkEmbeddingModelAvailable } from '@/lib/rag'
import { toast } from '@/components/ui/toast/use-toast'
import { storeToRefs } from 'pinia'

const vectorStore = useVectorStore()
const { isRagEnabled, isVectorDbEnabled } = storeToRefs(vectorStore)
const loading = ref(false)

const handleClick = async () => {
  if (isRagEnabled.value) {
    // 如果已启用，则禁用
    await vectorStore.setRagEnabled(false)
  } else {
    // 启用
    loading.value = true
    const result = await checkEmbeddingModelAvailable()
    loading.value = false
    
    if (result !== true) {
      toast({
        variant: "destructive",
        description: typeof result === 'string' ? result : 'Embedding model not available or not configured.'
      })
      return
    }
    
    // 如果未启用且向量数据库已启用，则启用RAG
    if (isVectorDbEnabled.value) {
      await vectorStore.setRagEnabled(true)
    } else {
      // 如果向量数据库未启用，则先启用向量数据库
      await vectorStore.setVectorDbEnabled(true)
      // 然后启用RAG
      await vectorStore.setRagEnabled(true)
    }
  }
}
</script>
