//FileItem.vue
<template>
  <ContextMenu>
    <ContextMenuTrigger>
      <div
          class="file-item-wrapper"
          :class="[
          path === activeFilePath && 'active',
          !isRoot && 'translate-x-5'
        ]"
          @click="handleSelectFile"
      >
        <!-- 编辑模式 -->
        <div v-if="isEditing" class="flex gap-1 items-center w-full select-none">
          <span :class="item.parent ? 'size-0' : 'size-4 ml-1'" />
          <FileIcon :item="item" />
          <input
              ref="inputRef"
              v-model="name"
              class="h-5 rounded-sm text-xs px-1 font-normal flex-1 mr-1"
              @blur="handleRename"
              @input="handleInputChange"
              @compositionstart="isComposing = true"
              @compositionend="handleCompositionEnd"
              @keydown.enter="handleRename"
              @keydown.escape="handleEditEnd"
          />
        </div>

        <!-- 显示模式 -->
        <template v-else>
          <!-- 图片文件 -->
          <div v-if="isImageFile" class="flex gap-1 items-center flex-1 select-none">
            <span :class="item.parent ? 'size-0' : 'size-4 ml-1'" />
            <Image class="size-4" />
            <span
                class="text-xs flex-1 line-clamp-1"
                draggable
                @dragstart="handleDragStart"
            >
              {{ item.name }}
            </span>
          </div>

          <!-- 其他文件 -->
          <div v-else class="flex gap-1 items-center flex-1 select-none">
            <span :class="item.parent ? 'size-0' : 'size-4 ml-1'" />
            <FileIcon :item="item" />
            <span
                class="text-xs flex-1 line-clamp-1"
                draggable
                @dragstart="handleDragStart"
            >
              {{ item.name }}
            </span>
          </div>
        </template>
      </div>
    </ContextMenuTrigger>

    <!-- 右键菜单 -->
    <ContextMenuContent>
      <ContextMenuItem @click="handleShowFileManager">
        Show in File Manager
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
          :disabled="!item.isLocale"
          @click="handleCutFile"
      >
        Cut
      </ContextMenuItem>
      <ContextMenuItem @click="handleCopyFile">
        Copy
      </ContextMenuItem>
      <ContextMenuItem
          :disabled="!clipboardItem"
          @click="handlePasteFile"
      >
        Paste
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
          :disabled="!item.isLocale"
          @click="handleStartRename"
      >
        Rename
      </ContextMenuItem>
      <ContextMenuItem
          :disabled="!item.sha"
          @click="handleDeleteSyncFile"
          class="text-red-900"
      >
        Delete from Sync
      </ContextMenuItem>
      <ContextMenuItem
          :disabled="!item.isLocale || !item.name"
          @click="handleDeleteFile"
          class="text-red-900"
      >
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, ref} from 'vue'
import {ask} from '@tauri-apps/plugin-dialog'
import {BaseDirectory, exists, readTextFile, remove, rename, writeTextFile} from '@tauri-apps/plugin-fs'
import {openPath} from '@tauri-apps/plugin-opener'
import {appDataDir, join} from '@tauri-apps/api/path'
import {Image} from 'lucide-vue-next'
import type {DirTree} from '@/stores/article'
import {useArticleStore} from '@/stores/article'
import {useToast} from '@/composables/useToast'
import FileIcon from './FileIcon.vue'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import useClipboardStore from '@/stores/clipboard'
import {convertImageByWorkspace} from '@/lib/utils'

interface Props {
  item: DirTree
}

const props = defineProps<Props>()

const articleStore = useArticleStore()
const { show } = useToast()
const clipboardStore = useClipboardStore()
const clipboardItem = computed(() => clipboardStore.clipboardItem)
const clipboardOperation = computed(() => clipboardStore.clipboardOperation)
const setClipboardItem = (item: any, op: 'copy' | 'cut' | 'none') => clipboardStore.setClipboardItem(item, op)

const isEditing = ref(props.item.isEditing ?? false)
const name = ref(props.item.name)
const isComposing = ref(false)
const inputRef = ref<HTMLInputElement>()

// 计算属性
const activeFilePath = computed(() => articleStore.activeFilePath)
const path = computed(() => computePath(props.item))
const isRoot = computed(() => path.value.split('/').length === 1)
const isImageFile = computed(() =>
    props.item.name.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)
)

// 路径计算工具函数
function computePath(item: DirTree): string {
  const parts: string[] = []
  let current: DirTree | undefined = item

  while (current) {
    parts.unshift(current.name)
    current = current.parent
  }

  return parts.join('/')
}

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

// 文件操作处理
const handleSelectFile = async () => {
  if (isImageFile.value) {
    try {
      const imgUrl = await convertImageByWorkspace(path.value)
      // 简单方案：在新窗口打开图片（若项目已有图片预览组件，可改为触发 modal）
      window.open(imgUrl, '_blank')
    } catch (err) {
      console.error('Show image failed:', err)
      show({ title: 'Show image failed', variant: 'error' })
    }
  } else {
    // 文件：设置为活动文件
    articleStore.setActiveFilePath(path.value)
  }
}

const handleStartRename = async () => {
  isEditing.value = true
  await nextTick()
  inputRef.value?.focus()
}

const handleRename = async () => {
  if (!name.value.trim()) {
    handleEditEnd()
    return
  }

  const finalName = name.value.replace(/\s+/g, '_')
  const newPath = path.value.replace(/[^/]*$/, finalName + '.md')

  try {
    // 重命名或创建文件
    if (props.item.name) {
      // 现有文件：重命名
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

      await rename(oldFullPath, newFullPath)
    } else {
      // 新文件：创建
      const fullPath = await join(
          await appDataDir(),
          'article',
          newPath
      )

      if (await exists(fullPath)) {
        show({ title: 'File already exists', variant: 'warning' })
      return
    }

      await writeTextFile(fullPath, '')
    }

    isEditing.value = false
    await articleStore.loadFileTree()
    articleStore.setActiveFilePath(newPath)
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
  if (!props.item.name) {
    // 删除空的新建文件项
    articleStore.fileTree = articleStore.fileTree.filter(
        f => f.name !== ''
    )
  }
}

const handleDeleteFile = async () => {
  const confirmed = await ask(`Delete ${props.item.name}?`, {
    title: 'Confirm',
    kind: 'warning'
  })

  if (!confirmed) return

  try {
    const fullPath = await join(
        await appDataDir(),
        'article',
        path.value
    )

    await remove(fullPath)
    await articleStore.loadFileTree()

    if (path.value === activeFilePath.value) {
      articleStore.setActiveFilePath('')
    }
  } catch (error) {
    console.error('Delete failed:', error)
    show({
      title: 'Delete failed',
      variant: 'error'
    })
  }
}

const handleShowFileManager = async () => {
  const parentPath = path.value.substring(0, path.value.lastIndexOf('/'))
  const fullPath = await join(
      await appDataDir(),
      'article',
      parentPath || '.'
  )

  await openPath(fullPath)
}

const handleDragStart = (e: DragEvent) => {
  e.dataTransfer!.setData('text', path.value)
}

const handleCopyFile = () => {
  setClipboardItem({ path: path.value, name: props.item.name, isDirectory: false, sha: props.item.sha, isLocale: props.item.isLocale }, 'copy')
  show({ title: 'Copied', variant: 'success' })
}

const handleCutFile = () => {
  setClipboardItem({ path: path.value, name: props.item.name, isDirectory: false, sha: props.item.sha, isLocale: props.item.isLocale }, 'cut')
  show({ title: 'Cut', variant: 'success' })
}

const handlePasteFile = async () => {
  const item = clipboardItem.value
  if (!item) {
    show({ title: 'Clipboard is empty', variant: 'error' })
    return
  }
  if (item.isDirectory) {
    show({ title: 'Pasting directories is not supported', variant: 'error' })
    return
  }

  try {
    const sourcePath = `article/${item.path}`
    const targetDir = path.value.includes('/') ? path.value.substring(0, path.value.lastIndexOf('/')) : ''
    const targetPath = targetDir ? `article/${targetDir}/${item.name}` : `article/${item.name}`

    const existsTarget = await exists(targetPath, { baseDir: BaseDirectory.AppData })
    if (existsTarget) {
      const confirmOverwrite = await ask(`"${item.name}" already exists. Overwrite?`, { title: 'Confirm', kind: 'warning' })
      if (!confirmOverwrite) return
    }

    const content = await readTextFile(sourcePath, { baseDir: BaseDirectory.AppData })
    await writeTextFile(targetPath, content, { baseDir: BaseDirectory.AppData })

    if (clipboardOperation.value === 'cut') {
      // 删除源文件并清空剪贴板
      await remove(sourcePath, { baseDir: BaseDirectory.AppData })
      setClipboardItem(null, 'none')
    }

    await articleStore.loadFileTree()
    show({ title: 'Pasted', variant: 'success' })
  } catch (err) {
    console.error('Paste failed:', err)
    show({ title: 'Paste failed', variant: 'error' })
  }
}

const handleDeleteSyncFile = async () => {
  // 项目中已移除/不使用远程删除时，提示或在未来实现
  show({ title: 'Remote delete not enabled in this build', variant: 'error' })
}



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
.file-item-wrapper {
  @apply flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-accent rounded;
}

.file-item-wrapper.active {
  @apply bg-accent;
}
</style>