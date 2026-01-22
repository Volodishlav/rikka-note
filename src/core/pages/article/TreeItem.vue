<template>
  <!-- 文件项 -->
  <FileItem v-if="item.isFile" :item="item" />

  <!-- 文件夹项 -->
  <FolderItem v-else :item="item" />
</template>

<script setup lang="ts">
import type { DirTree } from '@/stores/article'
import FileItem from './FileItem.vue'
import FolderItem from './FolderItem.vue'

interface Props {
  item: DirTree
}

defineProps<Props>()
</script>