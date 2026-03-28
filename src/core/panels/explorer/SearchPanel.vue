<script setup lang="ts">
import {onMounted, ref, watch} from 'vue'
import {Input} from '@/components/ui/input'
import {Search} from 'lucide-vue-next'
import {useI18n} from '@/hooks/useI18n'
import useArticleStore from '@/stores/article'
import {FuzzySearchResult, RustFuzzySearch, SearchItem as ISearchItem} from '@/lib/fuzzy-search'
import SearchItem from '../../pages/search/SearchItem.vue'
import { logger } from '@/utils/logger'

const { t } = useI18n()

const searchValue = ref('')
const searchResult = ref<FuzzySearchResult[]>([])
const articleStore = useArticleStore()
const searchList = ref<Partial<ISearchItem>[]>([])

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

  const fuzzySearch = new RustFuzzySearch(searchList.value, {
    keys: ['desc', 'article', 'title', 'path'],
    includeMatches: true,
    includeScore: true,
    threshold: 0.3,
  })

  try {
    searchResult.value = await fuzzySearch.searchParallel(value)
  } catch (error) {
    logger.search.error('Error during search:', error)
    searchResult.value = []
  }
}

watch(searchValue, async (newVal) => {
  await search(newVal)
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
    <div :class="['w-full h-20 flex justify-center items-center flex-shrink-0', searchValue ? 'border-b' : '']">
      <div class="relative w-[560px]">
        <div class="w-[90%] mx-auto flex items-center gap-2 px-3 py-1 border rounded-md bg-white focus-within:ring-2 ring-brand-purple">
          <Search class="size-4 opacity-50" />
          <input class="flex-1 border-none outline-none bg-transparent h-8" :placeholder="t('search.placeholder')" v-model="searchValue" />
          <p v-if="searchResult.length" class="text-sm select-none opacity-50">
            {{ searchResult.length }} {{ t('search.resultsCount') }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="searchValue" class="flex-1 w-full overflow-y-auto p-4">
      <div v-if="searchResult.length === 0" class="text-center mt-12 text-muted-foreground text-sm">
        {{ t('search.noResults') }}
      </div>
      <div v-else class="space-y-4">
        <SearchItem
            v-for="item in searchResult"
            :key="item.refIndex"
            :item="item"
        />
      </div>
    </div>
  </div>
</template>