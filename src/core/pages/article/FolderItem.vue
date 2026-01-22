<template>
  <Collapsible>
    <CollapsibleTrigger>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
              class="folder-item-wrapper"
              @drop="handleDrop"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
          >
            <ChevronRight
                class="transition-transform size-4"
                :class="isExpanded && 'rotate-90'"
            />
            <FolderIcon :is-open="isExpanded" />
            <input
                v-if="isEditing"
                ref="inputRef"
                v-model="name"
                @blur="handleRename"
                @input="handleInputChange"
                @compositionstart="isComposing = true"
                @compositionend="handleCompositionEnd"
                @keydown.enter="handleRename"
                @keydown.escape="handleEditEnd"
            />
            <span v-else class="text-xs flex-1">{{ item.name }}</span>
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
    </CollapsibleTrigger>

    <CollapsibleContent>
      <div class="pl-2">
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
import { ref, computed } from 'vue'
import type { DirTree } from '@/stores/article'
import { useArticleStore } from '@/stores/article'
import TreeItem from './TreeItem.vue'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@/components/ui/collapsible'
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

const isEditing = ref(props.item.isEditing ?? false)
const name = ref(props.item.name)
const isComposing = ref(false)
const isDragging = ref(false)
const inputRef = ref<HTMLInputElement>()

// 文件夹展开状态
const isExpanded = computed(() => {
  const path = computePath(props.item)
  return articleStore.collapsibleList.includes(path)
})

// TODO: 实现其他方法类似 FileItem

function computePath(item: DirTree): string {
  const parts: string[] = []
  let current: DirTree | undefined = item

  while (current) {
    parts.unshift(current.name)
    current = current.parent
  }

  return parts.join('/')
}

const handleNewFile = () => {
  // TODO
}

const handleNewFolder = () => {
  // TODO
}

const handleShowFileManager = () => {
  // TODO
}

const handleStartRename = () => {
  isEditing.value = true
}

const handleRename = () => {
  // TODO
}

const handleEditEnd = () => {
  isEditing.value = false
}

const handleDeleteFolder = async () => {
  // TODO
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  // TODO
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
}

const handleInputChange = (e: Event) => {
  // 同 FileItem 的 IME 处理
}

const handleCompositionEnd = (e: CompositionEvent) => {
  // 同 FileItem
}
</script>