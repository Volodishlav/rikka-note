<template>
  <div class="flex h-screen w-full bg-background">
    <!-- 左侧文件树 (25%) -->
    <div class="w-1/4 border-r overflow-hidden">
      <FileSidebar />
    </div>

    <!-- 右侧编辑器 (75%) -->
    <div class="flex-1">
      <!-- MdEditor 组件待实现 -->
      <div class="h-full p-4">
        <p class="text-sm text-muted-foreground">Markdown Editor (To be implemented)</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FileSidebar from './article/FileSidebar.vue'

// 后续会添加 MdEditor 导入
// import MdEditor from './article/MdEditor.vue'
</script>