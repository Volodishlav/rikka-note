<template>
  <div class="fixed z-50 right-4 top-4 flex flex-col gap-3 max-w-xs w-full" aria-live="polite">
    <transition-group name="toast-list" tag="div">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        class="relative"
      >
        <ToastItem 
          :toast="toast" 
          @dismiss="remove"
        />
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import ToastItem from './ToastItem.vue'

const { toasts, remove } = useToast()
</script>

<style scoped>
.toast-list-enter-active, .toast-list-leave-active {
  transition: all .16s cubic-bezier(.2,.8,.2,1)
}
.toast-list-enter-from {
  transform: translateY(-6px); opacity: 0
}
.toast-list-enter-to {
  transform: translateY(0); opacity: 1
}
.toast-list-leave-from {
  transform: translateY(0); opacity: 1
}
.toast-list-leave-to {
  transform: translateY(-6px); opacity: 0
}
</style>
