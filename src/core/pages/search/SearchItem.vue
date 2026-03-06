<script setup lang="ts">
import { FuzzySearchResult } from '@/lib/fuzzy-search'
import { LocateFixed, MapPin } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import useArticleStore from '@/stores/article'
import { computed } from 'vue'

const props = defineProps<{
  item: FuzzySearchResult
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
  if (props.item.matches && props.item.matches.length > 0 && props.item.matches[0].indices.length > 0) {
    const matchPosition = props.item.matches[0].indices[0][0]
    articleStore.setMatchPosition(matchPosition)
  }
  
  const filePath = props.item.item.path as string
  if (!filePath) return

  await articleStore.setActiveFilePath(filePath)
  
  const pathParts = filePath.split('/')
  // Remove filename to get directory path
  if (pathParts.length > 1) {
    pathParts.pop()
  } else {
    // If it's just a file in root, pathParts might be empty or just filename
    // If just filename, no parent folder to expand.
  }
  
  let currentPath = ''
  for (const part of pathParts) {
      // Skip empty parts or filename if logic above didn't pop correctly (it did)
      if (part === filePath) continue; // Safety check

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
  <div class="flex items-center justify-between p-4 border rounded overflow-hidden border-border hover:bg-muted/50 transition-colors">
    <div class="flex flex-col gap-4 w-full">
      <div class="flex flex-col flex-1 justify-between">
        <div class="flex gap-2 mb-2 items-center">
          <LocateFixed class="size-4 cursor-pointer text-primary hover:text-primary/80" @click="handleRouteTo" />
          <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
            文章
          </span>
          <span class="font-medium">{{ item.item.title || '无标题' }}</span>
        </div>
        
        <div class="flex flex-col gap-1 flex-1 mb-4">
          <div class="flex items-start gap-2">
            <MapPin class="size-3 mt-1 flex-shrink-0 text-muted-foreground" />
            <p class="text-sm overflow-hidden flex-1 search-highlight text-muted-foreground break-all" v-html="snippet"></p>
          </div>
        </div>
        
        <div class="flex gap-2 items-center">
          <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
            {{ item.matches?.[0]?.indices.length || 0 }} 处匹配
          </span>
          <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
            {{ item.item.path }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.search-highlight i) {
  @apply bg-yellow-200 dark:bg-yellow-900/50 not-italic rounded px-0.5 text-foreground font-medium;
}
</style>