<script setup lang="ts">
import { computed } from 'vue'

/**
 * Button组件属性定义
 */
export interface ButtonProps {
  /**
   * 按钮变体
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'
  /**
   * 按钮尺寸
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * 是否禁用
   * @default false
   */
  disabled?: boolean
  /**
   * 自定义类名
   */
  className?: string
  /**
   * 是否加载中
   * @default false
   */
  loading?: boolean
}

// 定义组件属性
const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  className: '',
  loading: false
})

// 计算按钮变体样式类
const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-primary text-primary-foreground hover:opacity-95'
    case 'secondary':
      return 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
    case 'destructive':
      return 'bg-destructive text-destructive-foreground hover:opacity-95'
    case 'ghost':
      return 'hover:bg-secondary hover:text-secondary-foreground'
    default:
      return 'bg-primary text-primary-foreground hover:opacity-95'
  }
})

// 计算按钮尺寸样式类
const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-3 py-1 text-sm'
    case 'lg':
      return 'px-6 py-3 text-lg'
    case 'md':
    default:
      return 'px-4 py-2'
  }
})

// 计算禁用状态样式类
const disabledClass = computed(() => {
  if (props.disabled) {
    return 'opacity-50 cursor-not-allowed'
  }
  return ''
})
</script>

<template>
  <button
    class="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    :class="[
      variantClass,
      sizeClass,
      disabledClass,
      className
    ]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <!-- 加载状态指示器 -->
    <span v-if="loading" class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
    <!-- 按钮内容插槽 -->
    <slot></slot>
  </button>
</template>