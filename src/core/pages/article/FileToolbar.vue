//FileToolbar.vue
<template>
  <div class="flex justify-between items-center h-12 border-b px-2">
    <!-- 左侧按钮组 -->
    <div class="flex gap-1">
      <!-- 新建文件 -->
      <Tooltip>
        <TooltipTrigger as-child>
          <button
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleNewFile"
          >
            <FilePlus class="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ t('article.fileToolbar.newFileShortcut') }}</p>
        </TooltipContent>
      </Tooltip>

      <!-- 新建文件夹 -->
      <Tooltip>
        <TooltipTrigger as-child>
          <button
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleNewFolder"
          >
            <FolderPlus class="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ t('article.fileToolbar.newFolderShortcut') }}</p>
        </TooltipContent>
      </Tooltip>

      <!-- 向量数据库 -->
      <Tooltip>
        <TooltipTrigger as-child>
          <button
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="{ 'animate-spin': isProcessing }"
              :disabled="isProcessing"
              @click="handleVectorDb"
          >
            <component :is="isProcessing ? LoaderCircle : BookA" class="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ isProcessing ? t('article.fileToolbar.processingVectors') : (isVectorDbEnabled ? t('article.fileToolbar.calculateVectors') : t('article.fileToolbar.enableVectorDb')) }}</p>
        </TooltipContent>
      </Tooltip>

    </div>

    <!-- 右侧按钮组 -->
    <div class="flex gap-1">
      <!-- 排序菜单 -->
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger as-child>
            <DropdownMenuTrigger as-child>
              <button
                  class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="{ 'text-primary': sortType !== 'none' }"
              >
                <component :is="sortDirection === 'asc' ? SortAsc : SortDesc" class="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="handleSortType('name')" :class="{ 'bg-accent': sortType === 'name' }">
              <ArrowDownAZ class="mr-2 h-4 w-4" />
              {{ t('article.fileToolbar.sortByName') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleSortType('created')" :class="{ 'bg-accent': sortType === 'created' }">
              <Calendar class="mr-2 h-4 w-4" />
              {{ t('article.fileToolbar.sortByCreated') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleSortType('modified')" :class="{ 'bg-accent': sortType === 'modified' }">
              <Clock class="mr-2 h-4 w-4" />
              {{ t('article.fileToolbar.sortByModified') }}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="handleSortDirection">
              <component :is="sortDirection === 'asc' ? SortDesc : SortAsc" class="mr-2 h-4 w-4"/>
              {{ sortDirection === 'asc' ? t('article.fileToolbar.descending') : t('article.fileToolbar.ascending') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipContent>
          <p>{{ t('article.fileToolbar.sort') }}</p>
        </TooltipContent>
      </Tooltip>

      <!-- 展开/收缩所有 -->
      <Tooltip>
        <TooltipTrigger as-child>
          <button
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleToggleFolders"
          >
            <component :is="collapsibleList.length > 0 ? ChevronsDownUp : ChevronsUpDown" class="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ collapsibleList.length > 0 ? t('article.fileToolbar.collapseAll') : t('article.fileToolbar.expandAll') }}</p>
        </TooltipContent>
      </Tooltip>

      <!-- 刷新 -->
      <Tooltip>
        <TooltipTrigger as-child>
          <button
              class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleRefresh"
          >
            <FolderSync class="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ t('article.fileToolbar.refresh') }}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import debounce from 'lodash-es/debounce'
import {
  FilePlus,
  FolderPlus,
  BookA,
  LoaderCircle,
  SortAsc,
  SortDesc,
  ArrowDownAZ,
  Calendar,
  Clock,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderSync
} from 'lucide-vue-next'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { useArticleStore } from '@/stores/article'
import { useVectorStore } from '@/stores/vector'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/hooks/useI18n'
import { appDataDir, join } from '@tauri-apps/api/path'
import { exists, mkdir, writeTextFile } from '@tauri-apps/plugin-fs'
// import { useUsername } from '@/composables/useUsername'

const articleStore = useArticleStore()
const vectorStore = useVectorStore()
const { show } = useToast()
const { t } = useI18n()
// const { username } = useUsername()

// 计算属性映射到 store
const sortType = computed(() => articleStore.sortType)
const sortDirection = computed(() => articleStore.sortDirection)
const collapsibleList = computed(() => articleStore.collapsibleList as string[])
const isProcessing = computed(() => vectorStore.isProcessing)
const isVectorDbEnabled = computed(() => vectorStore.isVectorDbEnabled)

// 防抖处理（避免快速点击导致多次创建）
const handleNewFile = debounce(async () => {
  try {
    // 获取当前选中的文件夹路径，如果没有选中则使用根目录
    const selectedPath = articleStore.selectedFolder
    const appData = await appDataDir()
    const fullPath = selectedPath 
      ? await join(appData, 'article', selectedPath) 
      : await join(appData, 'article')
    
    // 生成新文件名
    let newFileName = 'New Article.md'
    let counter = 1
    
    // 检查文件是否已存在
    while (await exists(await join(fullPath, newFileName))) {
      newFileName = `New Article ${counter}.md`
      counter++
    }
    
    // 创建新文件
    const newFilePath = await join(fullPath, newFileName)
    await writeTextFile(newFilePath, '')
    
    // 如果有选中的文件夹，确保它被展开
    if (selectedPath) {
      // 检查文件夹是否已在展开列表中
      if (!articleStore.collapsibleList.includes(selectedPath)) {
        // 添加到展开列表
        articleStore.collapsibleList = [...new Set([...articleStore.collapsibleList, selectedPath])]
      }
    }
    
    // 重新加载文件树
    await articleStore.loadFileTree()
    show({ title: t('article.fileToolbar.fileCreated'), variant: 'success' })
  } catch (err) {
    console.error('Create file failed:', err)
    show({ title: t('article.fileToolbar.createFileFailed'), variant: 'error' })
  }
}, 200)

const handleNewFolder = debounce(async () => {
  try {
    // 获取当前选中的文件夹路径，如果没有选中则使用根目录
    const selectedPath = articleStore.selectedFolder
    const appData = await appDataDir()
    const fullPath = selectedPath 
      ? await join(appData, 'article', selectedPath) 
      : await join(appData, 'article')
    
    // 生成新文件夹名
    let newFolderName = 'New Folder'
    let counter = 1
    
    // 检查文件夹是否已存在
    while (await exists(await join(fullPath, newFolderName))) {
      newFolderName = `New Folder ${counter}`
      counter++
    }
    
    // 创建新文件夹
    const newFolderPath = await join(fullPath, newFolderName)
    await mkdir(newFolderPath)
    
    // 重新加载文件树
    await articleStore.loadFileTree()
    show({ title: t('article.fileToolbar.folderCreated'), variant: 'success' })
  } catch (err) {
    console.error('Create folder failed:', err)
    show({ title: t('article.fileToolbar.createFolderFailed'), variant: 'error' })
  }
}, 200)

// 排序处理
const handleSortType = async (type: typeof sortType.value) => {
  await articleStore.setSortType(type)
}

const handleSortDirection = async () => {
  const newDirection = sortDirection.value === 'asc' ? 'desc' : 'asc'
  await articleStore.setSortDirection(newDirection)
}

// 展开/收缩处理
const handleToggleFolders = async () => {
  await articleStore.toggleAllFolders()
}

// 刷新处理
const handleRefresh = async () => {
  await articleStore.loadFileTree()
  show({ title: t('article.fileToolbar.refreshed') })
}

// 向量数据库处理
const handleVectorDb = async () => {
  if (isVectorDbEnabled.value) {
    await vectorStore.processAllDocuments()
  } else {
    await vectorStore.setVectorDbEnabled(true)
  }
}

</script>