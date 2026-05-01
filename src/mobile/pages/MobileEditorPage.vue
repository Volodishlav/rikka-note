<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { ChevronLeft, MoreVertical } from 'lucide-vue-next'
import MdEditor from '@/core/panels/editor/MdEditor.vue'

const route = useRoute()
const router = useRouter()

const path = computed(() => route.query.path as string || '')
const filename = computed(() => {
  if (!path.value) return '新建笔记'
  return path.value.split('/').pop() || '未命名'
})

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="flex flex-col h-full w-full bg-white dark:bg-zinc-950 absolute inset-0 z-50">
    <!-- 顶栏 -->
    <header class="flex items-center justify-between px-2 h-14 bg-white dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-900 shrink-0">
      <button @click="goBack" class="p-2 text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-zinc-800 rounded-full transition-colors">
        <ChevronLeft :size="24" />
      </button>
      <div class="flex-1 px-4 truncate text-center">
        <span class="text-[15px] font-bold text-slate-800 dark:text-slate-200 truncate">{{ filename }}</span>
      </div>
      <button class="p-2 text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-zinc-800 rounded-full transition-colors">
        <MoreVertical :size="20" />
      </button>
    </header>

    <!-- 编辑器主体 -->
    <main class="flex-1 w-full overflow-hidden relative">
      <!-- 复用桌面端编辑器 -->
      <MdEditor 
        v-if="path" 
        :path="path" 
        :id="path" 
      />
      <!-- 如果没有path（新建页面），可以留一个空白或者提示先输入文件名。这里简单做暂不处理新建文件名的复杂交互 -->
      <div v-else class="flex items-center justify-center h-full text-slate-400 text-sm">
        请先创建文件
      </div>
    </main>
  </div>
</template>
