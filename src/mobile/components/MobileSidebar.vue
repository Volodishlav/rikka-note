<script setup lang="ts">
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ChevronDown, Folder, Settings, FileText } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const router = useRouter()

const navigateToSettings = () => {
  emit('update:open', false)
  router.push('/mobile/setting')
}

// 模拟的目录树数据，实际应从 workspace/sidebar store 获取
const folders = [
  { id: '1', name: '杂项测试', children: [{ id: '1-1', name: 'UI 优化方案' }, { id: '1-2', name: '性能测试' }] },
  { id: '2', name: '测试编辑功能' },
  { id: '3', name: '本地模型' },
  { id: '4', name: 'RAG 评估' }
]
</script>

<template>
  <Sheet :open="props.open" @update:open="(val: boolean) => emit('update:open', val)">
    <SheetContent side="left" class="w-[80%] max-w-[320px] p-0 flex flex-col h-full bg-white dark:bg-slate-900 border-r-0">
      <SheetHeader class="p-6 text-left border-b border-slate-100 dark:border-slate-800">
        <SheetTitle class="flex flex-col items-start gap-1">
          <span class="text-2xl font-black italic bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">RIKKA NOTE</span>
          <span class="text-xs text-slate-400 dark:text-slate-500 font-normal">本地优先的智能笔记</span>
        </SheetTitle>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto p-4 space-y-1">
        <!-- 全部笔记固定项 -->
        <button class="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors">
          <FileText :size="18" />
          <span class="text-sm font-medium">全部笔记</span>
        </button>

        <div class="h-4"></div> <!-- 间距 -->

        <!-- 目录树 -->
        <div v-for="folder in folders" :key="folder.id" class="w-full">
          <Collapsible v-if="folder.children" class="w-full">
            <CollapsibleTrigger class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div class="flex items-center gap-3">
                <Folder :size="18" class="text-slate-400" />
                <span class="text-sm">{{ folder.name }}</span>
              </div>
              <ChevronDown :size="16" class="text-slate-400" />
            </CollapsibleTrigger>
            <CollapsibleContent class="pl-10 pr-3 py-1 space-y-1">
              <button v-for="child in folder.children" :key="child.id" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Folder :size="16" class="text-slate-400" />
                <span class="text-sm">{{ child.name }}</span>
              </button>
            </CollapsibleContent>
          </Collapsible>
          
          <button v-else class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Folder :size="18" class="text-slate-400" />
            <span class="text-sm">{{ folder.name }}</span>
          </button>
        </div>
      </div>

      <!-- 底部设置入口 -->
      <div class="p-4 border-t border-slate-100 dark:border-slate-800">
        <button @click="navigateToSettings" class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <Settings :size="18" />
          <span class="text-sm font-medium">应用设置</span>
        </button>
      </div>
    </SheetContent>
  </Sheet>
</template>
