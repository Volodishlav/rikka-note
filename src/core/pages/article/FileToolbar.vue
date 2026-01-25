//FileToolbar.vue
<template>
  <div class="flex justify-between items-center h-12 border-b px-2">
    <!-- 左侧按钮组 -->
    <div class="flex gap-1">
      <!-- 新建文件 -->
      <TooltipButton
          :icon="FilePlus"
          tooltip-text="New Article (Ctrl+N)"
          @click="handleNewFile"
      />

      <!-- 新建文件夹 -->
      <TooltipButton
          :icon="FolderPlus"
          tooltip-text="New Folder (Ctrl+Shift+N)"
          @click="handleNewFolder"
      />

      <!-- 向量数据库 -->
      <TooltipButton
          :icon="isProcessing ? LoaderCircle : BookA"
          :class="{ 'animate-spin': isProcessing }"
          :tooltip-text="isProcessing ? 'Processing vectors...' : (isVectorDbEnabled ? 'Calculate vectors' : 'Enable vector DB')"
          :disabled="isProcessing"
          @click="handleVectorDb"
      />

      <!-- 同步到GitHub/Gitee -->
      <TooltipButton
          v-if="primaryBackupMethod && username"
          :icon="fileTreeLoading ? LoaderCircle : FolderGit2"
          :class="{ 'animate-spin': fileTreeLoading }"
          :tooltip-text="fileTreeLoading ? 'Syncing...' : 'Open repository'"
          :disabled="!username || fileTreeLoading"
          @click="handleOpenRepo"
      />
    </div>

    <!-- 右侧按钮组 -->
    <div class="flex gap-1">
      <!-- 排序菜单 -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <TooltipButton
              :icon="sortDirection === 'asc' ? SortAsc : SortDesc"
              :class="{ 'text-primary': sortType !== 'none' }"
              tooltip-text="Sort"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
              @click="handleSortType('name')"
              :class="{ 'bg-accent': sortType === 'name' }"
          >
            <ArrowDownAZ class="mr-2 h-4 w-4" />
            Sort by Name
          </DropdownMenuItem>
          <DropdownMenuItem
              @click="handleSortType('created')"
              :class="{ 'bg-accent': sortType === 'created' }"
          >
            <Calendar class="mr-2 h-4 w-4" />
            Sort by Created
          </DropdownMenuItem>
          <DropdownMenuItem
              @click="handleSortType('modified')"
              :class="{ 'bg-accent': sortType === 'modified' }"
          >
            <Clock class="mr-2 h-4 w-4" />
            Sort by Modified
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleSortDirection">
            <component
                :is="sortDirection === 'asc' ? SortDesc : SortAsc"
                class="mr-2 h-4 w-4"
            />
            {{ sortDirection === 'asc' ? 'Descending' : 'Ascending' }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- 展开/收缩所有 -->
      <TooltipButton
          :icon="collapsibleList.length > 0 ? ChevronsDownUp : ChevronsUpDown"
          :tooltip-text="collapsibleList.length > 0 ? 'Collapse All' : 'Expand All'"
          @click="handleToggleFolders"
      />

      <!-- 刷新 -->
      <TooltipButton
          :icon="FolderSync"
          tooltip-text="Refresh"
          @click="handleRefresh"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { debounce } from 'lodash-es'
import { open } from '@tauri-apps/plugin-shell'
import {
  FilePlus,
  FolderPlus,
  BookA,
  FolderGit2,
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
import TooltipButton from '@/components/TooltipButton.vue'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { useArticleStore } from '@/stores/article'
import { useSettingStore } from '@/stores/setting'
import { useToast } from '@/composables/useToast'
import { appDataDir, join } from '@tauri-apps/api/path'
import { exists, mkdir, writeTextFile } from '@tauri-apps/plugin-fs'
// import { useUsername } from '@/composables/useUsername'

const articleStore = useArticleStore()
const settingStore = useSettingStore()
const { show } = useToast()
// const { username } = useUsername()

// 计算属性映射到 store
const sortType = computed(() => articleStore.sortType)
const sortDirection = computed(() => articleStore.sortDirection)
const collapsibleList = computed(() => articleStore.collapsibleList)
const fileTreeLoading = computed(() => articleStore.fileTreeLoading)
const primaryBackupMethod = computed(() => settingStore.primaryBackupMethod)
const isProcessing = computed(() => articleStore.isProcessing)
const isVectorDbEnabled = computed(() => articleStore.isVectorDbEnabled)

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
    show({ title: 'File created', variant: 'success' })
  } catch (err) {
    console.error('Create file failed:', err)
    show({ title: 'Create file failed', variant: 'error' })
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
    show({ title: 'Folder created', variant: 'success' })
  } catch (err) {
    console.error('Create folder failed:', err)
    show({ title: 'Create folder failed', variant: 'error' })
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
  show({ title: 'Refreshed' })
}

// 向量数据库处理
const handleVectorDb = async () => {
  if (isVectorDbEnabled.value) {
    await articleStore.processAllDocuments()
  } else {
    await articleStore.setVectorDbEnabled(true)
  }
}

// 打开仓库
const handleOpenRepo = async () => {
  const urls = {
    github: `https://github.com/${username.value}/rikka-sync`,
    gitee: `https://gitee.com/${username.value}/rikka-sync`,
    gitlab: `https://gitlab.com/${username.value}/rikka-sync`
  }
  const url = urls[primaryBackupMethod.value as keyof typeof urls]
  if (url) {
    await open(url)
  }
}
</script>