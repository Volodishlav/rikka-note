<template>
  <div v-if="thinking" class="mb-3 p-3 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
    <button
        @click="isExpanded = !isExpanded"
        class="flex items-center gap-2 w-full text-sm text-amber-900 dark:text-amber-100 hover:opacity-70"
    >
      <component
          :is="isExpanded ? ChevronDownIcon : ChevronRightIcon"
          class="size-4"
      />
      <span class="font-medium">{{ t('record.chat.message.thinking') }}</span>
    </button>
    <div v-if="isExpanded" class="mt-2 text-xs text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
      {{ cleanThinking }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-vue-next'

interface Props {
  thinking?: string
}

const props = defineProps<Props>()

const { t } = useI18n()
const isExpanded = ref(false)

const cleanThinking = computed(() => {
  // 移除thinking标签，只展示内容
  return props.thinking?.replace(/<thinking>|<\/thinking>/g, '').trim() || ''
})
</script>