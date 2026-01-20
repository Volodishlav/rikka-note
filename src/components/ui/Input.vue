<script setup lang="ts">
import { computed } from 'vue'

/**
 * Input组件属性定义
 */
export interface InputProps {
  /**
   * 输入框类型
   * @default 'text'
   */
  type?: string
  /**
   * 输入框尺寸
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * 是否禁用
   * @default false
   */
  disabled?: boolean
  /**
   * 是否只读
   * @default false
   */
  readonly?: boolean
  /**
   * 是否有错误
   * @default false
   */
  error?: boolean
  /**
   * 自定义类名
   */
  className?: string
  /**
   * 占位符文本
   */
  placeholder?: string
  /**
   * 输入值（用于v-model）
   */
  modelValue?: string
}

// 定义组件属性
const props = withDefaults(defineProps<InputProps>(), {
  type: 'text',
  size: 'md',
  disabled: false,
  readonly: false,
  error: false,
  className: '',
  placeholder: '',
  modelValue: ''
})

// 定义事件
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// 处理输入事件
function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

// 计算输入框尺寸样式类
const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-8 px-3 text-sm'
    case 'lg':
      return 'h-12 px-5 text-lg'
    case 'md':
    default:
      return 'h-10 px-4'
  }
})

// 计算错误状态样式类
const errorClass = computed(() => {
  if (props.error) {
    return 'border-destructive focus-visible:ring-destructive'
  }
  return ''
})

// 计算禁用/只读状态样式类
const stateClass = computed(() => {
  if (props.disabled) {
    return 'opacity-50 cursor-not-allowed'
  }
  if (props.readonly) {
    return 'cursor-default'
  }
  return ''
})
</script>

<template>
  <input
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :value="modelValue"
    @input="handleInput"
    class="flex h-10 w-full rounded-md border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      sizeClass,
      errorClass,
      stateClass,
      className
    ]"
    v-bind="$attrs"
  />
</template>