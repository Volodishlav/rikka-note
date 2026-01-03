<template>
  <div 
    class="flex items-start gap-3 p-3 rounded shadow-lg bg-white dark:bg-gray-800 border"
    :class="variantClass"
    @mouseenter="onMouseEnter" 
    @mouseleave="onMouseLeave"
    role="status"
  >
    <div class="flex-none">
      <component :is="icon" class="w-5 h-5" />
    </div>
    <div class="flex-1 min-w-0">
      <div v-if="toast.title" class="text-sm font-medium">{{ toast.title }}</div>
      <div v-if="toast.message" class="text-xs text-muted-foreground truncate">{{ toast.message }}</div>
    </div>
    <button 
      class="ml-2 opacity-80 hover:opacity-100 transition-opacity"
      @click="dismiss" 
      aria-label="关闭"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useToast, InternalToast } from '@/composables/useToast'
import { CheckCircle, Info, AlertCircle, AlertTriangle } from 'lucide-vue-next'

const props = defineProps<{ toast: InternalToast }>()
const emit = defineEmits(['dismiss'])

const { remove } = useToast()
const toast = props.toast

const timerRef = ref<number|null>(null)
const remainingRef = ref<number>(toast.duration)
const startRef = ref<number>(Date.now())

function startTimer() {
  if (toast.duration === 0) return
  clearTimer()
  startRef.value = Date.now()
  timerRef.value = window.setTimeout(() => dismiss(), remainingRef.value)
}

function clearTimer() {
  if (timerRef.value) {
    clearTimeout(timerRef.value)
    timerRef.value = null
  }
}

function pause() {
  if (toast.duration === 0) return
  const elapsed = Date.now() - startRef.value
  remainingRef.value = Math.max(0, remainingRef.value - elapsed)
  clearTimer()
}

function resume() {
  if (toast.duration === 0) return
  startRef.value = Date.now()
  timerRef.value = window.setTimeout(() => dismiss(), remainingRef.value)
}

function onMouseEnter() {
  pause()
}

function onMouseLeave() {
  resume()
}

function dismiss() {
  remove(toast.id)
  emit('dismiss', toast.id)
}

onMounted(() => {
  if (toast.duration > 0) startTimer()
})

onBeforeUnmount(() => {
  clearTimer()
})

const variantClass = computed(() => {
  switch (toast.variant) {
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

const icon = computed(() => {
  switch (toast.variant) {
    case 'success':
      return CheckCircle
    case 'error':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'info':
    default:
      return Info
  }
})
</script>
