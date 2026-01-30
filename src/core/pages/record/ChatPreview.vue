<template>
  <div
      v-if="content"
      class="prose prose-sm dark:prose-invert max-w-none
           prose-p:my-1 prose-p:leading-6
           prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted
           prose-pre:bg-muted prose-pre:border prose-pre:border-border
           prose-a:text-primary prose-a:break-words
           prose-img:rounded prose-img:border prose-img:border-border prose-img:my-2
           prose-li:my-0"
      v-html="renderedContent"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface Props {
  content: string
}

const props = defineProps<Props>()

const renderedContent = computed(() => {
  if (!props.content) return ''
  try {
    const html = marked.parse(props.content)
    // 防止XSS攻击
    return DOMPurify.sanitize(html)
  } catch (error) {
    console.error('Failed to parse markdown:', error)
    return `<p>${props.content}</p>`
  }
})
</script>