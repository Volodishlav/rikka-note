<script setup lang="ts">
import { useRoute } from 'vue-router'
import { FileText, Sparkles, Settings } from 'lucide-vue-next'

const route = useRoute()
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
    <!-- 主内容区域 - 渲染子路由 -->
    <main class="flex-1 overflow-y-auto pb-[72px]">
      <!-- pb-[72px] 为了给底部导航栏留出空间 -->
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 底部导航栏 Tab Bar -->
    <footer class="fixed bottom-0 left-0 right-0 h-[72px] bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center px-6 pb-2 pt-1 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-50 rounded-t-3xl">
      
      <!-- 笔记列表 -->
      <router-link 
        to="/mobile/notes" 
        class="flex flex-col items-center gap-1 w-16 transition-colors"
        :class="route.path === '/mobile/notes' ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'"
      >
        <FileText :size="24" :stroke-width="route.path === '/mobile/notes' ? 2.5 : 2" />
        <span class="text-[10px] font-medium">笔记</span>
      </router-link>

      <!-- 中间 Rikka AI 悬浮按钮 -->
      <router-link 
        to="/mobile/chat" 
        class="relative -top-6 flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-orange-400 via-rose-400 to-indigo-500 shadow-lg shadow-rose-200 dark:shadow-none text-white transition-transform active:scale-95"
      >
        <Sparkles :size="28" :stroke-width="2" class="animate-pulse-slow" />
        <span class="absolute -bottom-5 text-[11px] font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">Rikka AI</span>
      </router-link>

      <!-- 设置 -->
      <router-link 
        to="/mobile/setting" 
        class="flex flex-col items-center gap-1 w-16 transition-colors"
        :class="route.path === '/mobile/setting' ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'"
      >
        <Settings :size="24" :stroke-width="route.path === '/mobile/setting' ? 2.5 : 2" />
        <span class="text-[10px] font-medium">设置</span>
      </router-link>

    </footer>
  </div>
</template>

<style scoped>
/* 路由切换过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 缓慢脉冲动画（可选） */
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
.animate-pulse-slow {
  animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>