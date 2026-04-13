<template>
  <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
  >
    <div v-if="layoutStore.isAboutVisible"
         class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden outline-none"
         @keydown.esc="close"
         tabindex="0"
         ref="aboutRef">
      <!-- 动态背景 -->
      <Start class="absolute inset-0 z-0" />
      <!-- 2. 全局径向渐变模糊遮罩 (控制模糊层级在动画之上) -->
      <div
          class="absolute inset-0 z-[1] backdrop-blur-xl pointer-events-none"
          style="
            mask-image: radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 70%);
            -webkit-mask-image: radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 70%);
          "
      ></div>
      <!-- 内容容器 -->
      <div class="relative z-10 flex flex-col items-center -mt-24 transition-all">
        <!-- 应用图标 -->
        <img
            src="../../../assets/icon.png"
            class="w-20 h-20 mb-4 drop-shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700"
            alt="应用图标"
        />
        <!-- 艺术标题 -->
        <ArtTitle class="w-full max-w-lg mb-8" showBackground="graphic"></ArtTitle>

        <!-- 开发者信息 -->
        <div class="flex flex-col items-center gap-2 text-muted-foreground animate-in fade-in duration-1000 delay-300">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-black dark:text-white">库地址：</span>
            <a href="https://github.com/remnant-song/rikka-note"
               target="_blank"
               class="text-sm text-primary hover:underline hover:text-primary/80 transition-colors">
              https://github.com/remnant-song/rikka-note
            </a>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-black dark:text-white">版本号：</span>
            <span class="text-sm text-primary">v0.1.0</span>
          </div>
        </div>
      </div>

      <!-- ESC 提示 -->
      <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-300 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-4"
      >
        <div v-if="showEscTip"
             class="absolute bottom-16 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full bg-foreground/5 backdrop-blur-xl border border-foreground/10 text-sm text-foreground/40 shadow-sm pointer-events-none">
          按 ESC 退出关于页面
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'
import Start from '@/shared/pages/start.vue'
import ArtTitle from '@/shared/components/ArtTitle.vue'
import { useLayoutStore } from '@/stores/layout'

const layoutStore = useLayoutStore()
const showEscTip = ref(false)
const aboutRef = ref<HTMLElement | null>(null)

const close = () => {
  layoutStore.toggleAboutPage()
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && layoutStore.isAboutVisible) {
    close()
  }
}

watch(() => layoutStore.isAboutVisible, (visible) => {
  if (visible) {
    // 延迟显示提示，增加仪式感
    setTimeout(() => {
      showEscTip.value = true
      setTimeout(() => {
        showEscTip.value = false
      }, 2000)
    }, 500)
    
    // 聚焦以接收按键事件
    setTimeout(() => {
      aboutRef.value?.focus()
    }, 100)
    
    window.addEventListener('keydown', handleKeyDown)
  } else {
    window.removeEventListener('keydown', handleKeyDown)
    showEscTip.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
/* 可以在此处添加额外微调 */
</style>
