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
          @contextmenu.prevent="showContextMenu"
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
            <ImageIcon class="size-4" />
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
import { ref, computed, nextTick, onMounted } from 'vue'
import { ask } from '@tauri-apps/plugin-dialog'
import {
  BaseDirectory,
  readTextFile,
  writeTextFile,
  rename,
  remove,
  exists
} from '@tauri-apps/plugin-fs'
import { openPath } from '@tauri-apps/plugin-opener'
import { appDataDir, join } from '@tauri-apps/api/path'
import type { DirTree } from '@/stores/article'
import { useArticleStore } from '@/stores/article'
import { useToast } from '@/composables/useToast'
import FileIcon from './FileIcon.vue'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from '@/components/ui/context-menu'

interface Props {
  item: DirTree
}

const props = defineProps<Props>()

const articleStore = useArticleStore()
const { showToast } = useToast()

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
    const sanitized = value.replace(/\s+/g, '_')
    name.value = sanitized

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
    const sanitized = value.replace(/\s+/g, '_')
    name.value = sanitized

    nextTick(() => {
      input.setSelectionRange(cursorPos, cursorPos)
    })
  }
}

// 文件操作处理
const handleSelectFile = async () => {
  if (isImageFile.value) {
    // 图片：显示预览
    // TODO: 实现图片预览
  } else {
    // 文件：读取内容
    articleStore.setActiveFilePath(path.value)
    await articleStore.readArticle(path.value, props.item.sha, props.item.isLocale)
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
        showToast({ title: 'File already exists' })
        return
      }

      await writeTextFile(fullPath, '')
    }

    isEditing.value = false
    await articleStore.loadFileTree()
    articleStore.setActiveFilePath(newPath)
  } catch (error) {
    console.error('Rename failed:', error)
    showToast({
      title: 'Rename failed',
      variant: 'destructive'
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
    showToast({
      title: 'Delete failed',
      variant: 'destructive'
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

const handleCutFile = () => {
  // TODO: 实现剪切逻辑
  showToast({ title: 'Cut' })
}

const handleCopyFile = () => {
  // TODO: 实现复制逻辑
  showToast({ title: 'Copied' })
}

const handlePasteFile = async () => {
  // TODO: 实现粘贴逻辑
  showToast({ title: 'Paste not implemented yet' })
}

const handleDeleteSyncFile = async () => {
  // TODO: 实现同步文件删除逻辑
  showToast({ title: 'Delete sync not implemented yet' })
}

const showContextMenu = () => {
  // Vue 的 ContextMenu 自动处理
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