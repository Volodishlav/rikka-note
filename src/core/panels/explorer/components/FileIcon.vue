<template>
  <component :is="iconComponent" class="size-4 flex-shrink-0" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  FileText,
  Image,
  Code,
  FileJson,
  File
} from 'lucide-vue-next'
import type { DirTree } from '@/stores/article'

interface Props {
  item: DirTree
}

const props = defineProps<Props>()

const iconComponent = computed(() => {
  const ext = props.item.name.split('.').pop()?.toLowerCase()

  const iconMap: Record<string, any> = {
    md: FileText,
    mdx: FileText,
    txt: FileText,
    jpg: Image,
    jpeg: Image,
    png: Image,
    gif: Image,
    svg: Image,
    js: Code,
    ts: Code,
    tsx: Code,
    vue: Code,
    jsx: Code,
    json: FileJson,
  }

  return iconMap[ext || ''] || File
})
</script>