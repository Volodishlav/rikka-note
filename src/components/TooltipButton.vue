<template>
  <Tooltip :content="tooltipText" :side="side" :delay="delay" :disabled="disabled">
    <button
        class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="disabled"
        @click="handleClick"
        aria-label="button"
    >
      <slot>
        <!-- 若传入 icon prop 可在默认 slot 里显示 -->
        <component v-if="icon" :is="icon" class="w-4 h-4" />
      </slot>
    </button>
  </Tooltip>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits } from 'vue'
import Tooltip from '@/components/ui/Tooltip.vue'

const props = defineProps({
  icon: { type: [Object, Function], default: null },
  tooltipText: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  side: { type: String as () => 'top'|'bottom'|'left'|'right', default: 'top' },
  delay: { type: Number, default: 80 },
})

const emit = defineEmits(['click'])

function handleClick(e: Event) {
  if (props.disabled) return
  emit('click', e)
}
</script>

<style scoped>
/* 可放置你的默认按钮样式或仅使用 Tailwind 类 */
</style>