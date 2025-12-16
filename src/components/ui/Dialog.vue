<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'

/**
 * Dialog组件属性定义
 */
export interface DialogProps {
  /**
   * 是否显示对话框
   * @default false
   */
  modelValue?: boolean
  /**
   * 是否可通过点击背景关闭
   * @default true
   */
  backdropClose?: boolean
  /**
   * 是否可通过ESC键关闭
   * @default true
   */
  escClose?: boolean
  /**
   * 自定义类名
   */
  className?: string
}

// 定义组件属性
const props = withDefaults(defineProps<DialogProps>(), {
  modelValue: false,
  backdropClose: true,
  escClose: true,
  className: ''
})

// 定义事件
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
}>()

// 对话框内部状态
const open = ref(props.modelValue)
const dialogRef = ref<HTMLElement | null>(null)
const focusableElements = ref<HTMLElement[]>([])
const firstFocusableElement = ref<HTMLElement | null>(null)
const lastFocusableElement = ref<HTMLElement | null>(null)

// 监听外部modelValue变化
watch(() => props.modelValue, (newValue) => {
  open.value = newValue
  if (newValue) {
    // 显示时获取焦点元素并设置焦点
    setTimeout(() => {
      collectFocusableElements()
      if (firstFocusableElement.value) {
        firstFocusableElement.value.focus()
      }
    }, 100)
  }
})

// 监听内部状态变化，同步到外部
watch(open, (newValue) => {
  emit('update:modelValue', newValue)
  if (!newValue) {
    emit('close')
  }
})

// 收集可聚焦元素
function collectFocusableElements() {
  if (!dialogRef.value) return
  
  focusableElements.value = Array.from(
    dialogRef.value.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])' +
      ', [contenteditable]:not([contenteditable="false"])' +
      ', details, summary'
    )
  )
  
  firstFocusableElement.value = focusableElements.value[0] || null
  lastFocusableElement.value = focusableElements.value[focusableElements.value.length - 1] || null
}

// 关闭对话框
function closeDialog() {
  open.value = false
}

// 点击背景关闭
function handleBackdropClick(e: MouseEvent) {
  if (props.backdropClose && e.target === e.currentTarget) {
    closeDialog()
  }
}

// ESC键关闭
function handleKeyDown(e: KeyboardEvent) {
  if (props.escClose && e.key === 'Escape') {
    closeDialog()
  }
  
  // 实现焦点循环
  if (e.key === 'Tab') {
    if (!firstFocusableElement.value || !lastFocusableElement.value) return
    
    if (e.shiftKey && document.activeElement === firstFocusableElement.value) {
      e.preventDefault()
      lastFocusableElement.value.focus()
    } else if (!e.shiftKey && document.activeElement === lastFocusableElement.value) {
      e.preventDefault()
      firstFocusableElement.value.focus()
    }
  }
}

// 组件挂载时添加事件监听
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

// 组件卸载前移除事件监听
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      @click="handleBackdropClick"
    >
      <!-- 背景遮罩 -->
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
      
      <!-- 对话框内容 -->
      <div
        ref="dialogRef"
        class="relative w-full max-w-lg rounded-lg bg-background p-6 shadow-lg ring-1 ring-ring ring-offset-2 ring-offset-background"
        :class="className"
      >
        <!-- 对话框头部插槽 -->
        <slot name="header"></slot>
        
        <!-- 对话框主体插槽 -->
        <slot></slot>
        
        <!-- 对话框底部插槽 -->
        <slot name="footer"></slot>
      </div>
    </div>
  </Teleport>
</template>