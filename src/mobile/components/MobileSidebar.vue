<script setup lang="ts">
import { computed } from 'vue'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ChevronDown, Folder, Settings, FileText, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useArticleStore } from '@/stores/article'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const router = useRouter()
const articleStore = useArticleStore()

const navigateToSettings = () => {
  emit('update:open', false)
  router.push('/mobile/setting')
}

// 递归过滤，只保留文件夹
const filterFolders = (tree: any[]): any[] => {
  if (!tree) return []
  return tree
    .filter(node => node.isDirectory)
    .map(node => ({
      ...node,
      children: node.children ? filterFolders(node.children) : []
    }))
}

const folders = computed(() => {
  return filterFolders(articleStore.fileTree || [])
})

const selectFolder = (path: string) => {
  articleStore.setSelectedFolder(path)
  emit('update:open', false)
}

const selectAllNotes = () => {
  articleStore.clearSelectedFolder()
  emit('update:open', false)
}

// 辅助方法：生成从根到当前目录的完整相对路径
const getFullPath = (node: any, parentPath: string = ''): string => {
  return parentPath ? `${parentPath}/${node.name}` : node.name
}

// 递归组件模板，直接在内部用，这里因为只有两层，如果有多层可能需要递归组件。
// 但考虑到移动端体验，通常最多支持两层或三层展示。为了简单起见，我们支持两层展示，
// 因为原来的 mock 数据只有两层。如果需要无限层级最好提取为独立的 TreeItem 组件。
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
        <button 
          @click="selectAllNotes"
          class="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors"
          :class="!articleStore.selectedFolder ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'"
        >
          <FileText :size="18" />
          <span class="text-sm font-medium">全部笔记</span>
        </button>

        <div class="h-4"></div>

        <!-- 目录树 (支持2层) -->
        <div v-for="folder in folders" :key="folder.name" class="w-full">
          <Collapsible v-if="folder.children && folder.children.length > 0" class="w-full group/collapsible">
            <div class="flex items-center w-full rounded-lg transition-colors"
                 :class="articleStore.selectedFolder === folder.name ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800'">
              <button 
                @click="selectFolder(folder.name)"
                class="flex-1 flex items-center gap-3 px-3 py-2.5 text-slate-700 dark:text-slate-300 text-left"
              >
                <Folder :size="18" class="text-slate-400" />
                <span class="text-sm line-clamp-1">{{ folder.name }}</span>
              </button>
              <CollapsibleTrigger class="p-2.5 text-slate-400 flex-shrink-0">
                <ChevronRight :size="16" class="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </div>
            
            <CollapsibleContent class="pl-7 pr-1 py-1 space-y-1">
              <button 
                v-for="child in folder.children" 
                :key="child.name" 
                @click="selectFolder(getFullPath(child, folder.name))"
                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                :class="articleStore.selectedFolder === getFullPath(child, folder.name) ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'"
              >
                <Folder :size="16" class="text-slate-400" />
                <span class="text-sm line-clamp-1">{{ child.name }}</span>
              </button>
            </CollapsibleContent>
          </Collapsible>
          
          <button 
            v-else 
            @click="selectFolder(folder.name)"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left"
            :class="articleStore.selectedFolder === folder.name ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'"
          >
            <Folder :size="18" class="text-slate-400" />
            <span class="text-sm line-clamp-1">{{ folder.name }}</span>
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
