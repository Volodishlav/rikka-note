<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'

/**
 * Toast消息类型
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning'

/**
 * Toast组件属性定义
 */
export interface ToastProps {
  /**
   * Toast类型
   * @default 'info'
   */
  type?: ToastType
  /**
   * 消息内容
   */
  message: string
  /**
   * 是否显示
   * @default true
   */
  visible?: boolean
  /**
   * 自动关闭时间（毫秒）
   * @default 3000
   */
  duration?: number
  /**
   * 是否可关闭
   * @default true
   */
  closable?: boolean
  /**
   * 自定义类名
   */
  className?: string
}

// 定义组件属性
const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  visible: true,
  duration: 3000,
  closable: true,
  className: ''
})

// 定义事件
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'close': []
}>()

// 内部可见性状态
const isVisible = ref(props.visible)

// 监听外部可见性变化
watch(() => props.visible, (newValue) => {
  isVisible.value = newValue
  if (newValue) {
    startAutoClose()
  }
})

// 监听内部可见性变化
watch(isVisible, (newValue) => {
  emit('update:visible', newValue)
  if (!newValue) {
    emit('close')
  }
})

// 计算Toast类型样式
const typeClass = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
    case 'error':
      return 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
    case 'warning':
      return 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
    case 'info':
    default:
      return 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
  }
})

// 计算可见性样式
const visibilityClass = computed(() => {
  return isVisible.value ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
})

// 自动关闭计时器
let timer: number | null = null

// 启动自动关闭
function startAutoClose() {
  if (!props.duration || props.duration <= 0) return
  
  // 清除之前的计时器
  if (timer) {
    clearTimeout(timer)
  }
  
  // 设置新的计时器
  timer = window.setTimeout(() => {
    isVisible.value = false
  }, props.duration)
}

// 关闭Toast
function closeToast() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  isVisible.value = false
}

// 组件挂载时启动自动关闭
onMounted(() => {
  if (props.visible) {
    startAutoClose()
  }
})

// 组件卸载前清除计时器
onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer)
  }
})
</script>

<template>
  <div
    class="fixed right-4 top-4 z-50 w-full max-w-xs p-4 border rounded-lg shadow-lg transition-all duration-300 ease-in-out transform"
    :class="[
      typeClass,
      visibilityClass,
      className
    ]"
    v-if="isVisible"
  >
    <div class="flex items-start">
      <!-- 图标 -->
      <div class="flex-shrink-0 mt-0.5">
        <svg v-if="type === 'success'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
        <svg v-else-if="type === 'error'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
        <svg v-else-if="type === 'warning'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <svg v-else class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
        </svg>
      </div>
      
      <!-- 消息内容 -->
      <div class="ml-3 w-0 flex-1 pt-0.5">
        <p class="text-sm font-medium leading-5">
          {{ message }}
        </p>
      </div>
      
      <!-- 关闭按钮 -->
      <div v-if="closable" class="ml-4 flex-shrink-0 flex">
        <button
          type="button"
          class="inline-flex text-gray-400 focus:outline-none focus:text-gray-500 dark:focus:text-gray-300"
          @click="closeToast"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>