<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/**
 * Tooltip位置选项
 */
export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left'

/**
 * Tooltip组件属性定义
 */
export interface TooltipProps {
  /**
   * 提示内容
   */
  content: string
  /**
   * 提示位置
   * @default 'top'
   */
  position?: TooltipPosition
  /**
   * 延迟显示时间（毫秒）
   * @default 300
   */
  delay?: number
  /**
   * 自定义类名
   */
  className?: string
  /**
   * 自定义提示框类名
   */
  contentClassName?: string
}

// 定义组件属性
const props = withDefaults(defineProps<TooltipProps>(), {
  position: 'top',
  delay: 300,
  className: '',
  contentClassName: ''
})

// 组件状态
const isVisible = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)

// 显示和隐藏计时器
let showTimer: number | null = null
let hideTimer: number | null = null

// 计算位置样式
const positionClass = computed(() => {
  switch (props.position) {
    case 'top':
      return 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    case 'right':
      return 'left-full top-1/2 -translate-y-1/2 ml-2'
    case 'bottom':
      return 'top-full left-1/2 -translate-x-1/2 mt-2'
    case 'left':
      return 'right-full top-1/2 -translate-y-1/2 mr-2'
    default:
      return 'bottom-full left-1/2 -translate-x-1/2 mb-2'
  }
})

// 计算箭头样式
const arrowClass = computed(() => {
  switch (props.position) {
    case 'top':
      return 'bottom-0 left-1/2 -translate-x-1/2 border-b-0 border-t-background'
    case 'right':
      return 'left-0 top-1/2 -translate-y-1/2 border-l-0 border-r-background'
    case 'bottom':
      return 'top-0 left-1/2 -translate-x-1/2 border-t-0 border-b-background'
    case 'left':
      return 'right-0 top-1/2 -translate-y-1/2 border-r-0 border-l-background'
    default:
      return 'bottom-0 left-1/2 -translate-x-1/2 border-b-0 border-t-background'
  }
})

// 显示Tooltip
function showTooltip() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  showTimer = window.setTimeout(() => {
    isVisible.value = true
  }, props.delay)
}

// 隐藏Tooltip
function hideTooltip() {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
  hideTimer = window.setTimeout(() => {
    isVisible.value = false
  }, 100)
}

// 组件挂载时添加事件监听
onMounted(() => {
  // 为触发元素添加事件监听
  if (triggerRef.value) {
    triggerRef.value.addEventListener('mouseenter', showTooltip)
    triggerRef.value.addEventListener('mouseleave', hideTooltip)
    triggerRef.value.addEventListener('focus', showTooltip)
    triggerRef.value.addEventListener('blur', hideTooltip)
  }
})

// 组件卸载前移除事件监听
onBeforeUnmount(() => {
  if (triggerRef.value) {
    triggerRef.value.removeEventListener('mouseenter', showTooltip)
    triggerRef.value.removeEventListener('mouseleave', hideTooltip)
    triggerRef.value.removeEventListener('focus', showTooltip)
    triggerRef.value.removeEventListener('blur', hideTooltip)
  }
  
  // 清除所有计时器
  if (showTimer) clearTimeout(showTimer)
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<template>
  <div class="relative inline-block" ref="triggerRef" :class="className">
    <!-- 触发元素插槽 -->
    <slot></slot>
    
    <!-- Tooltip内容 -->
    <div
      v-if="isVisible"
      ref="tooltipRef"
      class="absolute z-50 px-3 py-1 text-xs font-medium text-white bg-black rounded shadow-lg whitespace-nowrap"
      :class="[
        positionClass,
        contentClassName
      ]"
      role="tooltip"
      aria-hidden="false"
    >
      {{ content }}
      <!-- 箭头 -->
      <div
        class="absolute h-2 w-2 border-solid border-transparent border-2"
        :class="arrowClass"
      ></div>
    </div>
  </div>
</template>