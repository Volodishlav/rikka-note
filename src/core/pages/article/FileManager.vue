//FileManager.vue
<template>
  <div
      class="flex flex-col p-0 h-full"
      :class="isDragging && 'outline-2 outline-black outline-dotted -outline-offset-4'"
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
import { BaseDirectory, writeTextFile, writeFile } from '@tauri-apps/plugin-fs'
import { useArticleStore } from '@/stores/article'
import { useToast } from '@/composables/useToast'
import TreeItem from './TreeItem.vue'

const isDragging = ref(false)
const articleStore = useArticleStore()
const { showToast } = useToast()

const fileTree = computed(() => articleStore.fileTree)

// 处理拖拽上传
const handleDrop = async (e: DragEvent) => {
  e.preventDefault()

  // 处理路径拖拽（重新排列）
  const pathData = e.dataTransfer?.getData('text')
  if (pathData) {
    // TODO: 实现拖拽重新排列逻辑
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

        await writeTextFile(
            `article/${sanitizedFileName}`,
            text,
            { baseDir: BaseDirectory.AppData }
        )

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

        await writeFile(
            `article/${sanitizedImageFileName}`,
            uint8Array,
            { baseDir: BaseDirectory.AppData }
        )

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