<template>
  <div class="flex h-full w-full gap-0">
    <!-- 左侧标签栏 -->
    <div class="w-full md:w-80 border-r bg-background flex flex-col">
      <TagSidebar />
    </div>

    <!-- 右侧聊天区域（后续实现） -->
    <div class="flex-1 flex flex-col bg-background md:border-l">
      <ChatWindow />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/hooks/useI18n'
import TagSidebar from './record/TagSidebar.vue'
import ChatWindow from "@/core/pages/record/ChatWindow.vue";
const { t } = useI18n()
</script>