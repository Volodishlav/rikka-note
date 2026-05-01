<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Menu, ArrowUpDown, Search, Plus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import MobileSidebar from '@/mobile/components/MobileSidebar.vue'
import NoteCard from '@/mobile/components/NoteCard.vue'
import { useArticleStore } from '@/stores/article'

const router = useRouter()
const articleStore = useArticleStore()

const isSidebarOpen = ref(false)
const searchQuery = ref('')

onMounted(async () => {
  // 加载真实数据
  if (articleStore.fileTree.length === 0) {
    await articleStore.loadFileTree()
  }
  await articleStore.loadAllArticle()
})

// 提取摘要逻辑：去除 MD 语法，最多100字
const getExcerpt = (md: string) => {
  if (!md) return '无内容'
  let text = md.replace(/!\[.*?\]\(.*?\)/g, '[图片]')
  text = text.replace(/\[.*?\]\(.*?\)/g, '')
  text = text.replace(/[#*`>]/g, '')
  text = text.replace(/\n+/g, ' ').trim()
  return text.substring(0, 100) + (text.length > 100 ? '...' : '')
}

// 格式化日期：当天显示时间，当年显示月日，往年显示年月日
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '未知时间'
  const date = dayjs(dateStr)
  const now = dayjs()
  if (date.isSame(now, 'day')) {
    return date.format('HH:mm')
  } else if (date.isSame(now.subtract(1, 'day'), 'day')) {
    return '昨天'
  } else if (date.isSame(now, 'year')) {
    return date.format('MM-DD')
  } else {
    return date.format('YYYY-MM-DD')
  }
}

// 根据选择的文件夹和搜索词过滤笔记
const filteredNotes = computed(() => {
  let notes = articleStore.allArticle || []

  // 按文件夹过滤
  if (articleStore.selectedFolder) {
    notes = notes.filter(note => note.path.startsWith(articleStore.selectedFolder + '/'))
  }

  // 按搜索词过滤
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    notes = notes.filter(note => 
      note.path.toLowerCase().includes(q) || 
      (note.article && note.article.toLowerCase().includes(q))
    )
  }

  // 排序：按修改时间降序
  notes = notes.sort((a, b) => {
    const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0
    const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0
    return timeB - timeA
  })

  return notes.map(note => {
    // 提取文件名和所在文件夹
    const parts = note.path.split('/')
    const title = parts.pop() || '未命名'
    const folder = parts.length > 0 ? parts.join('/') : '全部笔记'

    return {
      path: note.path,
      title,
      date: formatDate(note.modifiedAt || note.createdAt),
      excerpt: getExcerpt(note.article),
      folder
    }
  })
})

const openSidebar = () => {
  isSidebarOpen.value = true
}

const createNote = () => {
  // 移动端目前可以先跳转到一个专门的新建页，或者直接生成一个带有默认名称的无内容笔记然后打开。
  // 为了简单，我们直接进入带有 query.new=1 的编辑器页
  router.push('/mobile/editor?new=1')
}

const openNote = (path: string) => {
  router.push(`/mobile/editor?path=${encodeURIComponent(path)}`)
}
</script>

<template>
  <div class="flex flex-col h-full relative">
    <!-- 顶栏 Header -->
    <header class="flex items-center justify-between px-4 h-14 bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
      <button @click="openSidebar" class="p-2 -ml-2 text-slate-700 dark:text-slate-300 active:scale-95 transition-transform">
        <Menu :size="24" />
      </button>
      <h1 class="text-[17px] font-bold text-slate-800 dark:text-slate-100 truncate flex-1 text-center px-4">
        {{ articleStore.selectedFolder ? articleStore.selectedFolder.split('/').pop() : '全部笔记' }}
      </h1>
      <button class="p-2 -mr-2 text-slate-500 dark:text-slate-400 active:scale-95 transition-transform">
        <ArrowUpDown :size="20" />
      </button>
    </header>

    <!-- 搜索栏 -->
    <div class="px-4 py-2 sticky top-14 z-10 bg-slate-50 dark:bg-slate-900">
      <div class="relative flex items-center w-full h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border-none px-3">
        <Search :size="18" class="text-slate-400 mr-2" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜索笔记..." 
          class="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
        />
      </div>
    </div>

    <!-- 笔记列表 -->
    <div class="flex-1 overflow-y-auto px-4 py-3 space-y-4">
      <div v-if="articleStore.loading || articleStore.fileTreeLoading" class="text-center py-10 text-slate-400 text-sm">
        加载中...
      </div>
      <div v-else-if="filteredNotes.length === 0" class="text-center py-10 text-slate-400 text-sm">
        这里空空如也
      </div>
      <template v-else>
        <NoteCard 
          v-for="note in filteredNotes" 
          :key="note.path"
          :title="note.title"
          :date="note.date"
          :excerpt="note.excerpt"
          :folder="note.folder"
          @click="openNote(note.path)"
        />
      </template>
      <!-- 底部留白 -->
      <div class="h-4"></div>
    </div>

    <!-- 悬浮新建按钮 FAB -->
    <button 
      @click="createNote"
      class="absolute right-5 bottom-5 w-14 h-14 bg-slate-800 dark:bg-white rounded-[20px] shadow-lg flex items-center justify-center text-white dark:text-slate-800 active:scale-90 transition-transform z-20"
    >
      <Plus :size="28" />
    </button>

    <!-- 侧边栏抽屉 -->
    <MobileSidebar v-model:open="isSidebarOpen" />
  </div>
</template>
