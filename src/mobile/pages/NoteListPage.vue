<script setup lang="ts">
import { ref } from 'vue'
import { Menu, ArrowUpDown, Search, Plus } from 'lucide-vue-next'
import MobileSidebar from '@/mobile/components/MobileSidebar.vue'
import NoteCard from '@/mobile/components/NoteCard.vue'

const isSidebarOpen = ref(false)
const searchQuery = ref('')

// 模拟笔记数据
const notes = ref([
  {
    id: 1,
    title: '笔记 A.md',
    date: '10:42',
    excerpt: '包含内容 此错误可以通过代码 Java NullPointerException 0x123...',
    folder: '杂项测试'
  },
  {
    id: 2,
    title: 'New Article.md',
    date: '昨天',
    excerpt: '这是一篇新的文章测试，用来验证移动端的首屏排版...',
    folder: 'UI 优化方案'
  },
  {
    id: 3,
    title: '扩写内容.md',
    date: '04-19',
    excerpt: '# OCR 功能 功能介绍：识别图片中的文字...',
    folder: '测试编辑功能'
  }
])

const openSidebar = () => {
  isSidebarOpen.value = true
}

const createNote = () => {
  // 触发新建笔记逻辑
  console.log('Create new note')
}
</script>

<template>
  <div class="flex flex-col h-full relative">
    <!-- 顶栏 Header -->
    <header class="flex items-center justify-between px-4 h-14 bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
      <button @click="openSidebar" class="p-2 -ml-2 text-slate-700 dark:text-slate-300 active:scale-95 transition-transform">
        <Menu :size="24" />
      </button>
      <h1 class="text-[17px] font-bold text-slate-800 dark:text-slate-100">全部笔记</h1>
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
      <NoteCard 
        v-for="note in notes" 
        :key="note.id"
        :title="note.title"
        :date="note.date"
        :excerpt="note.excerpt"
        :folder="note.folder"
      />
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
