<template>
  <div class="flex h-full w-full gap-0">
    <!-- 左侧标签/记录栏 -->
    <NoteSidebar />

    <!-- 右侧聊天区域 -->
    <div class="flex-1 flex flex-col min-w-0">
      <ChatLayout />
    </div>
  </div>
</template>

<script setup lang="ts">
import NoteSidebar from './record/NoteSidebar.vue'
import ChatLayout from './record/chat/ChatLayout.vue'
</script>
