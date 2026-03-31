<script setup lang="ts">
import {onMounted, ref, watch, computed} from 'vue'
import {Search, CaseSensitive, WholeWord, Regex, Brain, Loader2, ArrowUpDown} from 'lucide-vue-next'
import {useI18n} from '@/hooks/useI18n'
import useArticleStore from '@/stores/article'
import {useVectorStore} from '@/stores/vector'
import {FuzzySearchResult, RustFuzzySearch, SearchItem as ISearchItem} from '@/lib/fuzzy-search'
import {advancedSearch} from '@/lib/search-utils'
import {reciprocalRankFusion} from '@/lib/search-fusion'
import {fetchEmbedding} from '@/lib/ai'
import {getSimilarDocuments} from '@/db/vector'
import SearchItem from '../../pages/search/SearchItem.vue'
import { logger } from '@/utils/logger'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const { t } = useI18n()

// 搜索状态
const searchValue = ref('')
const searchResult = ref<FuzzySearchResult[]>([])
const articleStore = useArticleStore()
const searchList = ref<ISearchItem[]>([])

// 高级搜索选项
const isCaseSensitive = ref(false)
const isWholeWord = ref(false)
const isRegexp = ref(false)
const isSemanticEnabled = ref(false)
const isSearchingSemantic = ref(false)
const vectorStore = useVectorStore()
const currentSort = ref('relevance')

const extractTitleFromPath = (path: string): string => {
  if (!path) return ''
  const parts = path.split(/[/\\]/)
  const fileName = parts[parts.length - 1]
  return fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName
}

const setSearchData = () => {
  searchList.value = articleStore.allArticle.map((item, index) => {
    const title = extractTitleFromPath(item.path || '')
    return {
      ...item,
      searchType: 'article',
      title,
      id: `article-${index}-${item.path?.replace(/[^a-zA-Z0-9]/g, '-')}`,
      path: item.path,
      createdAt: item.createdAt,
      modifiedAt: item.modifiedAt
    }
  })
}

// 计算排序后的结果
const sortedResults = computed(() => {
  const results = [...searchResult.value]
  
  if (currentSort.value === 'relevance') {
    return results
  }
  
  return results.sort((a, b) => {
    const itemA = a.item as any
    const itemB = b.item as any
    
    let result = 0
    if (currentSort.value === 'name') {
      result = (itemA.title || '').localeCompare(itemB.title || '')
    } else if (currentSort.value === 'modified') {
      const timeA = itemA.modifiedAt ? new Date(itemA.modifiedAt).getTime() : 0
      const timeB = itemB.modifiedAt ? new Date(itemB.modifiedAt).getTime() : 0
      result = timeB - timeA
    } else if (currentSort.value === 'created') {
      const timeA = itemA.createdAt ? new Date(itemA.createdAt).getTime() : 0
      const timeB = itemB.createdAt ? new Date(itemB.createdAt).getTime() : 0
      result = timeB - timeA
    }
    
    // 如果排序结果相同，使用名称作为保底
    if (result === 0) {
      return (itemA.title || '').localeCompare(itemB.title || '')
    }
    return result
  })
})

const search = async (value: string) => {
  if (!value) {
    searchResult.value = []
    isSearchingSemantic.value = false
    return
  }

  // 记录搜索行为
  logger.search.info('Performing search:', {
    query: value,
    caseSensitive: isCaseSensitive.value,
    wholeWord: isWholeWord.value,
    regexp: isRegexp.value,
    semantic: isSemanticEnabled.value
  })

  const startTime = Date.now()
  // --- 第 1 阶段：执行传统的字面匹配（快） ---
  let primaryResults: FuzzySearchResult[] = []
  
  if (isCaseSensitive.value || isWholeWord.value || isRegexp.value) {
    try {
      primaryResults = advancedSearch(searchList.value, value, {
        caseSensitive: isCaseSensitive.value,
        wholeWord: isWholeWord.value,
        isRegexp: isRegexp.value
      })
      logger.search.debug(`Advanced search phase took ${Date.now() - startTime}ms. Found ${primaryResults.length} items.`);
    } catch (error) {
      logger.search.error('Advanced search error:', error)
    }
  } else {
    const fuzzySearch = new RustFuzzySearch(searchList.value, {
      keys: ['article', 'title', 'path'],
      includeMatches: true,
      includeScore: true,
      threshold: 0.3,
    })

    try {
      primaryResults = await fuzzySearch.searchParallel(value)
      logger.search.debug(`Fuzzy search phase took ${Date.now() - startTime}ms. Found ${primaryResults.length} items.`);
    } catch (error) {
      logger.search.error('Fuzzy search error:', error)
    }
  }

  // 优先展示第一版结果
  searchResult.value = primaryResults

  // --- 第 2 阶段：如果开启，执行语义搜索并融合（慢） ---
  if (isSemanticEnabled.value && !isRegexp.value && value.trim().length > 1) {
    isSearchingSemantic.value = true
    const semanticStartTime = Date.now()
    try {
      const queryEmbedding = await fetchEmbedding(value)
      if (queryEmbedding) {
        const similarDocs = await getSimilarDocuments(queryEmbedding, 10, 0.4)
        logger.search.info(`Vector retrieval found ${similarDocs.length} candidates in ${Date.now() - semanticStartTime}ms`);
        
        if (similarDocs.length > 0) {
          // 将语意结果转换为 FuzzySearchResult 兼容格式
          const semanticResults: FuzzySearchResult[] = similarDocs.map((doc, idx) => {
            const originalItem = searchList.value.find(item => item.path === doc.filename)
            return {
              item: originalItem || { title: doc.filename, path: doc.filename, article: doc.content } as any,
              refIndex: 999 + idx,
              matches: [{ key: 'article', value: doc.content, indices: [] }],
              score: doc.similarity,
              isSemantic: true
            }
          })

          // 使用 RRF 融合两组结果
          const sources = [
            { name: 'primary', items: primaryResults.map(r => ({ id: r.item.path || '', score: r.score, data: r })), weight: 1.0 },
            { name: 'semantic', items: semanticResults.map(r => ({ id: r.item.path || '', score: r.score, data: r })), weight: 0.8 }
          ]
          
          searchResult.value = reciprocalRankFusion(sources, 60, 30)
          logger.search.debug(`Hybrid fusion completed in ${Date.now() - startTime}ms`);
        }
      }
    } catch (error) {
      logger.search.error('Semantic search failed:', error)
    } finally {
      isSearchingSemantic.value = false
    }
  }
}

// 监听搜索词和选项变化
watch([searchValue, isCaseSensitive, isWholeWord, isRegexp, isSemanticEnabled], async () => {
  await search(searchValue.value)
})

onMounted(async () => {
  await articleStore.loadAllArticle()
  setSearchData()
})

watch(() => articleStore.allArticle, () => {
  setSearchData()
}, { deep: true })
</script>

<template>
  <div class="w-full h-full flex flex-col bg-sidebar text-sidebar-foreground">
    <!-- 搜索栏区 -->
    <div :class="['w-full h-14 flex justify-center items-center flex-shrink-0 transition-all px-4', searchValue ? 'border-b bg-background/50 backdrop-blur-sm' : '']">
      <div class="relative w-full max-w-2xl group">
        <div class="flex items-center gap-2 px-3 py-1.5 border rounded-lg bg-background shadow-sm focus-within:ring-2 ring-brand-purple/30 focus-within:border-brand-purple transition-all duration-300 overflow-hidden">
          <Search class="size-3.5 opacity-40 group-focus-within:opacity-100 transition-opacity shrink-0" />
          
          <input 
            class="flex-1 border-none outline-none bg-transparent h-7 text-xs placeholder:text-muted-foreground/60 min-w-0" 
            :placeholder="t('search.placeholder')" 
            v-model="searchValue" 
          />

          <!-- 高级搜索控制组 -->
          <div class="hidden md:flex items-center gap-0.5 pl-2 border-l border-border/50 shrink-0">
            <button 
              @click="isCaseSensitive = !isCaseSensitive"
              :title="t('search.caseSensitive')"
              :class="['p-1 rounded-md transition-all hover:bg-muted shrink-0', isCaseSensitive ? 'text-brand-purple bg-brand-purple/10' : 'text-muted-foreground opacity-60']"
            >
              <CaseSensitive class="size-3.5" />
            </button>
            <button 
              @click="isWholeWord = !isWholeWord"
              :title="t('search.wholeWord')"
              :class="['p-1 rounded-md transition-all hover:bg-muted shrink-0', isWholeWord ? 'text-brand-purple bg-brand-purple/10' : 'text-muted-foreground opacity-60']"
            >
              <WholeWord class="size-3.5" />
            </button>
            <button 
              @click="isRegexp = !isRegexp"
              :title="t('search.useRegexp')"
              :class="['p-1 rounded-md transition-all hover:bg-muted shrink-0', isRegexp ? 'text-brand-purple bg-brand-purple/10' : 'text-muted-foreground opacity-60']"
            >
              <Regex class="size-3.5" />
            </button>
            <div class="w-[1px] h-3 bg-border/50 mx-1"></div>
            <button 
              @click="isSemanticEnabled = !isSemanticEnabled"
              :title="!vectorStore.isVectorDbEnabled ? t('search.semanticSearchDisabledDesc') : t('search.useSemanticDesc')"
              :disabled="!vectorStore.isVectorDbEnabled"
              :class="['p-1 rounded-md transition-all hover:bg-muted shrink-0 flex items-center gap-1', 
                isSemanticEnabled ? 'text-brand-cyan bg-brand-cyan/10' : 'text-muted-foreground opacity-60',
                !vectorStore.isVectorDbEnabled ? 'cursor-not-allowed opacity-20' : ''
              ]"
            >
              <Loader2 v-if="isSearchingSemantic" class="size-3.5 animate-spin" />
              <Brain v-else class="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 结果显示区 -->
    <div v-if="searchValue" class="flex-1 w-full overflow-y-auto custom-scrollbar">
      <div v-if="searchResult.length === 0" class="flex flex-col items-center justify-center h-64 text-muted-foreground opacity-60">
        <span class="text-sm">{{ t('search.noResults') }}</span>
      </div>
      <div v-else class="max-w-4xl mx-auto p-6 space-y-6">
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {{ t('search.resultsCount', { count: searchResult.length }) }}
            </h3>
            
            <!-- 排序选择 -->
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-muted-foreground">{{ t('search.sortBy') }}:</span>
              <Select v-model="currentSort">
                <SelectTrigger class="h-7 w-[110px] text-[10px] bg-transparent border-none shadow-none focus:ring-0 px-2 hover:bg-muted/50 rounded-md transition-colors">
                  <div class="flex items-center gap-1.5 overflow-hidden text-muted-foreground">
                    <ArrowUpDown class="size-3 shrink-0 opacity-60" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent align="end" class="min-w-[120px]">
                  <SelectItem value="relevance" class="text-xs cursor-pointer">{{ t('search.relevance') }}</SelectItem>
                  <SelectItem value="name" class="text-xs cursor-pointer">{{ t('search.name') }}</SelectItem>
                  <SelectItem value="modified" class="text-xs cursor-pointer">{{ t('search.modified') }}</SelectItem>
                  <SelectItem value="created" class="text-xs cursor-pointer">{{ t('search.created') }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
        </div>
        <SearchItem
            v-for="item in sortedResults"
            :key="item.refIndex"
            :item="item"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.3);
}
</style>