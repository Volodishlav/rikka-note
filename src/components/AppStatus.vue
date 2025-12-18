<template>
  <div class="flex items-center gap-3 text-sm">
    <div class="flex items-center gap-1" :title="aiConnected ? 'AI 已连接' : 'AI 未连接'">
      <span :class="aiConnected ? 'text-green-500' : 'text-gray-400'">●</span>
      <span>AI</span>
    </div>
    <div class="flex items-center gap-1" :title="vectorReady ? '向量库就绪' : '向量库未就绪'">
      <span :class="vectorReady ? 'text-green-500' : 'text-gray-400'">●</span>
      <span>Vector</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// 临时模拟，后续用 store 或 Tauri 事件替换
const aiConnected = ref(false)
const vectorReady = ref(false)
// 示例：模拟状态变化
setTimeout(()=> aiConnected.value = true, 800)
setTimeout(()=> vectorReady.value = true, 1600)
</script>

<style scoped>
/* 可使用 Tailwind 或全局样式 */
</style>