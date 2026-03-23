//FileManager.vue
<template>
  <div
      class="flex flex-col p-0 h-full"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @click="handleClickOutside"
  >
    <div class="flex flex-col gap-0">
      <TreeItem
          v-for="item in fileTree"
          :key="item.name"
          :item="item"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs'
import { useArticleStore } from '@/stores/article'
import { useToast } from '@/composables/useToast'
import { getFilePathOptions } from '@/lib/workspace'
import TreeItem from './TreeItem.vue'

const isDragging = ref(false)
const articleStore = useArticleStore()
const { show } = useToast()

const fileTree = computed(() => articleStore.fileTree)

// 处理拖拽上传
const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()

  // 处理内部路径拖拽（移动到根目录）
  const rikkaPath = e.dataTransfer?.getData('application/rikka-path')
  if (rikkaPath) {
    try {
      // 移动到根目录，targetDirRelativePath 传空字符串
      const result = await articleStore.moveItem(rikkaPath, '')
      if (result && !result.isNoOp) {
        show({ title: 'Moved to root', variant: 'success' })
      }
    } catch (err) {
      show({ title: (err as Error).message || 'Move failed', variant: 'error' })
    }
    isDragging.value = false
    return
  }

  // 处理文件拖拽上传
  const files = e.dataTransfer?.files
  if (files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // 处理 Markdown 文件
      if (file.name.endsWith('.md')) {
        const text = await file.text()
        const sanitizedFileName = file.name.replace(/\s+/g, '_')
        const targetOpts = await getFilePathOptions(sanitizedFileName)

        if (targetOpts.baseDir) {
          await writeTextFile(targetOpts.path, text, { baseDir: targetOpts.baseDir })
        } else {
          await writeTextFile(targetOpts.path, text)
        }

        articleStore.addFile({
          name: sanitizedFileName,
          isFile: true,
          isDirectory: false,
          isEditing: false,
          isLocale: true,
          isSymlink: false
        } as any)
      }

      // 处理图片文件
      if (file.name.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)) {
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        const sanitizedImageFileName = file.name.replace(/\s+/g, '_')
        const targetOpts = await getFilePathOptions(sanitizedImageFileName)

        if (targetOpts.baseDir) {
          await writeFile(targetOpts.path, uint8Array, { baseDir: targetOpts.baseDir })
        } else {
          await writeFile(targetOpts.path, uint8Array)
        }

        articleStore.addFile({
          name: sanitizedImageFileName,
          isFile: true,
          isDirectory: false,
          isEditing: false,
          isLocale: true,
          isSymlink: false
        } as any)
      }
    }

    await articleStore.loadFileTree()
  }

  isDragging.value = false
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
}

// 处理点击空白处的事件，清除选中的文件夹
const handleClickOutside = () => {
  articleStore.clearSelectedFolder()
}

// 初始化加载文件树
onMounted(async () => {
  if (fileTree.value.length === 0) {
    await articleStore.loadFileTree()
  }
})
</script>