<script setup lang="ts">
import { FuzzySearchResult } from '@/lib/fuzzy-search'
import { MapPin, Brain } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useI18n } from '@/hooks/useI18n'
import useArticleStore from '@/stores/article'
import { computed } from 'vue'
import { logger } from '@/utils/logger'

const { t } = useI18n()

const props = defineProps<{
  item: FuzzySearchResult & { isSemantic?: boolean }
}>()

const router = useRouter()
const articleStore = useArticleStore()

const highlightMatches = (inputString: string, matches: [number, number][]): string[] => {
  const highlightedStringArray: string[] = [];
  let lastIndex = 0;
  for (const match of matches) {
    const startIndex = match[0];
    const endIndex = match[1];
    highlightedStringArray.push(inputString.slice(lastIndex, startIndex));
    highlightedStringArray.push(`<i>${inputString.slice(startIndex, endIndex + 1)}</i>`);
    lastIndex = endIndex + 1;
  }
  highlightedStringArray.push(inputString.slice(lastIndex));
  return highlightedStringArray;
}

const snippet = computed(() => {
  const original = props.item.item.article || ''
  const indices = props.item.matches?.[0]?.indices || []
  
  if (indices.length === 0) return original.slice(0, 200)
  
  const firstMatchStart = indices[0][0]
  const lastMatchEnd = indices[indices.length - 1][1]
  
  const contextStart = Math.max(0, firstMatchStart - 50)
  const contextEnd = Math.min(original.length, lastMatchEnd + 200)
  
  const contextText = original.slice(contextStart, contextEnd)
  
  // Adjust indices relative to contextText
  const relativeIndices = indices.map(([s, e]) => [s - contextStart, e - contextStart] as [number, number])
    .filter(([s, e]) => s >= 0 && e < contextText.length)
    
  return highlightMatches(contextText, relativeIndices).join('')
})

const handleRouteTo = async () => {
  const filePath = props.item.item.path as string
  if (!filePath) return

  logger.search.info('Navigating to article from search result:', {
    path: filePath
  })

  await articleStore.setActiveFilePath(filePath)
  
  const pathParts = filePath.split('/')
  if (pathParts.length > 1) {
    pathParts.pop()
  }
  
  let currentPath = ''
  for (const part of pathParts) {
      if (part === filePath) continue;
      if (currentPath) {
        currentPath += '/' + part
      } else {
        currentPath = part
      }
      if (currentPath) {
        await articleStore.setCollapsibleListItem(currentPath, true)
      }
  }
  
  localStorage.setItem('pendingReadArticle', filePath)
  router.push('/core/article')
}
</script>

<template>
  <div 
    class="group flex flex-col p-3 border rounded-xl overflow-hidden border-border bg-card/40 hover:bg-muted/50 hover:border-brand-purple/50 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
    @click="handleRouteTo"
  >
    <div class="flex flex-col gap-1 w-full text-left">
      <!-- 标题与路径 -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
            <div class="flex flex-col">
                <span class="text-sm font-semibold text-foreground group-hover:text-brand-purple transition-colors">
                    {{ item.item.title || t('search.noTitle') }}
                </span>
                <div class="font-normal flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin class="size-2.5" />
                    <span>{{ item.item.path }}</span>
                </div>
            </div>
        </div>
        
        <div class="flex gap-2">
            <span v-if="item.isSemantic" class="inline-flex items-center gap-1 rounded-full bg-brand-cyan/10 px-2 py-0.5 text-[10px] font-medium text-brand-cyan">
                <Brain class="size-2.5" />
                {{ t('search.semanticMatch') }}
            </span>
            <span class="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                {{ t('search.matchesCount', { count: item.matches?.[0]?.indices.length || 0 }) }}
            </span>
        </div>
      </div>
      
      <!-- 片段预览 -->
      <div class="relative pl-0">
        <p class="text-xs leading-relaxed search-highlight text-muted-foreground/80 break-all line-clamp-3" v-html="snippet"></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.search-highlight i) {
  @apply bg-brand-purple/20 text-brand-purple not-italic rounded px-1 font-bold shadow-sm;
}
</style>
