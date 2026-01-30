<template>
  <div class="flex flex-col h-full w-full bg-background">
    <!-- 头部 -->
    <ChatHeader />

    <!-- 消息列表 -->
    <ChatContent />

    <!-- 输入框 -->
    <ChatInput />

    <!-- 剪贴板监听器（后续实现） -->
    <!-- <ClipboardListener /> -->
  </div>
</template>

<script setup lang="ts">
import ChatHeader from './ChatHeader.vue'
import ChatContent from './ChatContent.vue'
import ChatInput from './ChatInput.vue'
// import ClipboardListener from './ClipboardListener.vue'
</script>