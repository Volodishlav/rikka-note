<script setup lang="ts">
import { defineProps } from 'vue'
import { Folder } from 'lucide-vue-next'

interface Props {
  title: string
  date: string
  excerpt: string
  folder?: string
}

const props = withDefaults(defineProps<Props>(), {
  folder: '全部笔记'
})
</script>

<template>
  <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-[0.98] transition-transform">
    <!-- 头部信息：标题与时间 -->
    <div class="flex justify-between items-start mb-2">
      <h3 class="text-base font-bold text-slate-800 dark:text-slate-200 line-clamp-1 flex-1 pr-2">
        {{ title }}
      </h3>
      <span class="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap pt-1">
        {{ date }}
      </span>
    </div>

    <!-- 摘要信息 -->
    <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
      {{ excerpt }}
    </p>

    <!-- 底部标签：所属文件夹 -->
    <div class="flex items-center">
      <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
        <Folder :size="12" />
        <span>{{ folder }}</span>
      </div>
    </div>
  </div>
</template>
