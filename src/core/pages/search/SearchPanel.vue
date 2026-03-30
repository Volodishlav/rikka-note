<script setup lang="ts">
import {onMounted, ref, watch} from 'vue'
import {Search, CaseSensitive, WholeWord, Regex} from 'lucide-vue-next'
import {useI18n} from '@/hooks/useI18n'
import useArticleStore from '@/stores/article'
import {FuzzySearchResult, RustFuzzySearch, SearchItem as ISearchItem} from '@/lib/fuzzy-search'
import {advancedSearch} from '@/lib/search-utils'
import SearchItem from '../../pages/search/SearchItem.vue'
import { logger } from '@/utils/logger'

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
      path: item.path
    }
  })
}

const search = async (value: string) => {
  if (!value) {
    searchResult.value = []
    return
  }

  // 记录搜索行为
  logger.search.info('Performing search:', {
    query: value,
    caseSensitive: isCaseSensitive.value,
    wholeWord: isWholeWord.value,
    regexp: isRegexp.value
  })

  // 如果启用了任何高级选项，使用高级搜索引擎
  if (isCaseSensitive.value || isWholeWord.value || isRegexp.value) {
    try {
      searchResult.value = advancedSearch(searchList.value, value, {
        caseSensitive: isCaseSensitive.value,
        wholeWord: isWholeWord.value,
        isRegexp: isRegexp.value
      })
    } catch (error) {
      logger.search.error('Advanced search error:', error)
      searchResult.value = []
    }
    return
  }

  // 否则使用原有的模糊搜索
  const fuzzySearch = new RustFuzzySearch(searchList.value, {
    keys: ['article', 'title', 'path'],
    includeMatches: true,
    includeScore: true,
    threshold: 0.3,
  })

  try {
    searchResult.value = await fuzzySearch.searchParallel(value)
  } catch (error) {
    logger.search.error('Fuzzy search error:', error)
    searchResult.value = []
  }
}

// 监听搜索词和选项变化
watch([searchValue, isCaseSensitive, isWholeWord, isRegexp], async () => {
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
        </div>
        <SearchItem
            v-for="item in searchResult"
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