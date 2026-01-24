// FolderItem.vue
<template>
  <Collapsible :open="isExpanded">

    <ContextMenu>
      <ContextMenuTrigger as-child>
        <div
            class="folder-item-wrapper w-full"
            @click="handleFolderClick"
            :class="{ 'active': isSelected }"
            @drop="handleDrop"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
        >
          <div class="flex items-center gap-1 w-full select-none">
            <ChevronRight
                class="transition-transform size-4 flex-shrink-0 cursor-pointer text-muted-foreground"
                :class="isExpanded && 'rotate-90'"
                @click.stop="toggleExpand"
            />

            <Folder class="size-4 flex-shrink-0 text-blue-500 fill-blue-500/20" />

            <input
                v-if="isEditing"
                ref="inputRef"
                v-model="name"
                class="h-5 rounded-sm text-xs px-1 font-normal flex-1 mr-1 bg-background border border-primary focus:outline-none min-w-0"
                @blur="handleBlur"
                @input="handleInputChange"
                @compositionstart="isComposing = true"
                @compositionend="handleCompositionEnd"
                @keydown.enter="handleRename"
                @keydown.escape="handleEditEnd"
                @click.stop
            />

            <span
                v-else
                class="text-xs flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-left"
            >
              {{ item.name }}
            </span>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem @click="handleNewFile">New File</ContextMenuItem>
        <ContextMenuItem @click="handleNewFolder">New Folder</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem @click="handleShowFileManager">Show in File Manager</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem @click="handleStartRename">Rename</ContextMenuItem>
        <ContextMenuItem
            @click="handleDeleteFolder"
            class="text-red-900"
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

    <CollapsibleContent>
      <div class="pl-4 w-full border-l ml-2 border-border/40">
        <TreeItem
            v-for="child in item.children"
            :key="child.name"
            :item="child"
        />
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, ref} from 'vue'
import {ChevronRight, Folder} from 'lucide-vue-next'
import {ask} from '@tauri-apps/plugin-dialog'
import {openPath} from '@tauri-apps/plugin-opener'
import {appDataDir, join} from '@tauri-apps/api/path'
import {exists, mkdir, readTextFile, remove, rename, writeTextFile} from '@tauri-apps/plugin-fs'
import type {DirTree} from '@/stores/article'
import {useArticleStore} from '@/stores/article'
import TreeItem from './TreeItem.vue'
import {Collapsible, CollapsibleContent} from '@/components/ui/collapsible'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import {useToast} from '@/composables/useToast'
import useClipboardStore from '@/stores/clipboard'

interface Props {
  item: DirTree
}

const props = defineProps<Props>()
const articleStore = useArticleStore()
const { show } = useToast()
const clipboardStore = useClipboardStore()

// --- 状态定义 (仿照 FileItem) ---
const isEditing = ref(props.item.isEditing ?? false)
const name = ref(props.item.name)
const isComposing = ref(false)
const inputRef = ref<HTMLInputElement>()

// --- 计算属性 ---
const path = computed(() => computePath(props.item))

const isExpanded = computed({
  get() {
    return articleStore.collapsibleList.includes(path.value)
  },
  set(value) {
    articleStore.collapsibleList = value
        ? [...new Set([...articleStore.collapsibleList, path.value])]
        : articleStore.collapsibleList.filter(p => p !== path.value)
  }
})

const isSelected = computed(() => articleStore.selectedFolder === path.value)

// --- 核心逻辑: 输入与重命名 (完全仿照 FileItem) ---

// IME 输入处理（支持中文输入）
const handleInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const value = input.value
  const cursorPos = input.selectionStart ?? 0

  if (isComposing.value) {
    name.value = value
    return
  }

  if (value.includes(' ')) {
    name.value = value.replace(/\s+/g, '_')

    nextTick(() => {
      input.setSelectionRange(cursorPos, cursorPos)
    })
  } else {
    name.value = value
  }
}

const handleCompositionEnd = (e: CompositionEvent) => {
  isComposing.value = false
  const input = e.currentTarget as HTMLInputElement
  const value = input.value
  const cursorPos = input.selectionStart ?? 0

  if (value.includes(' ')) {
    name.value = value.replace(/\s+/g, '_')

    nextTick(() => {
      input.setSelectionRange(cursorPos, cursorPos)
    })
  }
}

const handleStartRename = async () => {
  isEditing.value = true
  await nextTick()
  inputRef.value?.focus()
}

const handleRename = async () => {
  // 1. 空值检查，如果为空则取消编辑
  if (!name.value.trim()) {
    handleEditEnd()
    return
  }

  // 2. 格式化名称 (仿照 FileItem)
  const finalName = name.value.replace(/\s+/g, '_')

  // 3. 计算新路径 (注意：文件夹没有后缀名)
  const newPath = path.value.replace(/[^/]*$/, finalName)

  // 如果名称没变，直接结束编辑
  if (finalName === props.item.name) {
    isEditing.value = false
    return
  }

  try {
    // 4. 执行文件系统操作
    if (props.item.name) {
      // --- 情况 A: 现有文件夹重命名 ---
      const oldFullPath = await join(
          await appDataDir(),
          'article',
          path.value
      )
      const newFullPath = await join(
          await appDataDir(),
          'article',
          newPath
      )

      // 检查目标是否存在
      if (await exists(newFullPath)) {
        show({ title: 'Folder already exists', variant: 'warning' })
        // 恢复原名并退出编辑，或者保持编辑状态让用户重试
        // 此处仿照 FileItem 逻辑，如果存在则警告并不做操作，但 FileItem 此处逻辑是 return
        return
      }

      await rename(oldFullPath, newFullPath)
    } else {
      // --- 情况 B: 新建文件夹创建 ---
      const fullPath = await join(
          await appDataDir(),
          'article',
          newPath
      )

      if (await exists(fullPath)) {
        show({ title: 'Folder already exists', variant: 'warning' })
        return
      }

      await mkdir(fullPath)
    }

    // 5. 更新状态与 Store
    isEditing.value = false
    await articleStore.loadFileTree()

    // 如果之前选中了这个文件夹，更新选中路径
    if (isSelected.value) {
      articleStore.setSelectedFolder(newPath)
    }

  } catch (error) {
    console.error('Rename failed:', error)
    show({
      title: 'Rename failed',
      variant: 'error'
    })
  }
}

const handleEditEnd = () => {
  isEditing.value = false
  // 如果是新建的空文件夹（没有名字），需要从UI中移除
  if (!props.item.name) {
    // 逻辑：如果是根节点，从 store 移除；如果是子节点，从父节点移除
    if (props.item.parent) {
      props.item.parent.children = props.item.parent.children?.filter(c => c !== props.item)
    } else {
      articleStore.fileTree = articleStore.fileTree.filter(f => f.name !== '')
    }
  }
}

// --- 辅助逻辑 ---

function computePath(item: DirTree): string {
  const parts: string[] = []
  let current: DirTree | undefined = item

  while (current) {
    parts.unshift(current.name)
    current = current.parent
  }

  return parts.join('/')
}

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const handleExpandChange = (open: boolean) => {
  isExpanded.value = open
}

const handleFolderClick = (e: MouseEvent) => {
  // 防止右键或编辑状态下触发
  if (e.button === 2 || isEditing.value) return

  articleStore.setSelectedFolder(path.value)
  isExpanded.value = !isExpanded.value
}

// --- 其他文件夹特有操作 (保持原有逻辑，确保不冲突) ---

const handleNewFile = async () => {
  try {
    const fullPath = await join(await appDataDir(), 'article', path.value)
    let newFileName = 'New Article.md'
    let counter = 1
    while (await exists(await join(fullPath, newFileName))) {
      newFileName = `New Article ${counter}.md`
      counter++
    }
    const newFilePath = await join(fullPath, newFileName)
    await writeTextFile(newFilePath, '')
    // 展开当前文件夹以便看到新文件
    isExpanded.value = true
    await articleStore.loadFileTree()
  } catch (err) {
    console.error('Create file failed:', err)
    show({ title: 'Create file failed', variant: 'error' })
  }
}

const handleNewFolder = async () => {
  // 这里其实应该插入一个临时的空 DirTree item 到 children 触发编辑模式
  // 但为了简化，这里保持原有逻辑创建一个默认名字的文件夹
  try {
    const fullPath = await join(await appDataDir(), 'article', path.value)
    let newFolderName = 'New Folder'
    let counter = 1
    while (await exists(await join(fullPath, newFolderName))) {
      newFolderName = `New Folder ${counter}`
      counter++
    }
    const newFolderPath = await join(fullPath, newFolderName)
    await mkdir(newFolderPath)
    isExpanded.value = true
    await articleStore.loadFileTree()
  } catch (err) {
    console.error('Create folder failed:', err)
    show({ title: 'Create folder failed', variant: 'error' })
  }
}

const handleShowFileManager = async () => {
  try {
    const fullPath = await join(await appDataDir(), 'article', path.value)
    await openPath(fullPath)
  } catch (err) {
    console.error('Open file manager failed:', err)
    show({ title: 'Open file manager failed', variant: 'error' })
  }
}

const handleDeleteFolder = async () => {
  const confirmed = await ask(`Delete folder "${props.item.name}"? This will delete all its contents.`, {
    title: 'Confirm Delete',
    kind: 'warning'
  })

  if (!confirmed) return

  try {
    const fullPath = await join(await appDataDir(), 'article', path.value)
    await remove(fullPath, { recursive: true })
    await articleStore.loadFileTree()

    if (articleStore.selectedFolder === path.value) {
      articleStore.setSelectedFolder('')
    }
  } catch (error) {
    console.error('Delete folder failed:', error)
    show({ title: 'Delete failed', variant: 'error' })
  }
}

// 拖拽相关
const isDragging = ref(false)
const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false

  try {
    const pathData = e.dataTransfer?.getData('text')
    if (!pathData) return

    const clipboardItem = clipboardStore.clipboardItem
    if (!clipboardItem) return

    const targetFullPath = await join(await appDataDir(), 'article', path.value)

    if (!clipboardItem.isDirectory) {
      const sourcePath = await join(await appDataDir(), 'article', clipboardItem.path)
      const targetFilePath = await join(targetFullPath, clipboardItem.name)

      if (await exists(targetFilePath)) {
        const confirmOverwrite = await ask(`"${clipboardItem.name}" already exists. Overwrite?`, {
          title: 'Confirm',
          kind: 'warning'
        })
        if (!confirmOverwrite) return
      }

      const content = await readTextFile(sourcePath)
      await writeTextFile(targetFilePath, content)

      if (clipboardStore.clipboardOperation === 'cut') {
        await remove(sourcePath)
        clipboardStore.setClipboardItem(null, 'none')
      }

      await articleStore.loadFileTree()
      show({ title: 'File moved', variant: 'success' })
    }
  } catch (err) {
    console.error('Drop failed:', err)
    show({ title: 'Drop failed', variant: 'error' })
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
}

// 生命周期
onMounted(() => {
  if (props.item.isEditing) {
    isEditing.value = true
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})
</script>

<style scoped>
.folder-item-wrapper {
  @apply flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-accent rounded w-full;
  white-space: nowrap;
  box-sizing: border-box;
}

.folder-item-wrapper.active {
  @apply bg-accent text-accent-foreground;
}

.folder-item-wrapper > div {
  @apply w-full flex items-center justify-start;
}

.folder-item-wrapper .size-4 {
  @apply flex-shrink-0 w-4 h-4;
}

/* 样式优化，确保 input 行为和显示模式一致 */
.folder-item-wrapper input {
  @apply flex-1 bg-transparent border-none outline-none text-left min-w-0;
  margin: 0;
  padding-left: 0;
  &:focus {
    @apply ring-1 ring-primary rounded-sm;
    outline: none;
  }
}

.folder-item-wrapper span {
  @apply flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis;
  margin: 0;
  padding: 0;
}

.box-sizing-border-box {
  box-sizing: border-box;
}

[data-collapsible-trigger] {
  width: 100%;
  display: block;
}
</style>