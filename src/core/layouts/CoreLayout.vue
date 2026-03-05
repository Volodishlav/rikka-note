<script setup lang="ts">
// CoreLayout - 核心布局组件
import AppSidebar from '@/components/AppSidebar.vue'
import { SidebarProvider } from '@/components/ui/sidebar'
import TitleBar from "@/layouts/TitleBar.vue";

</script>

<template>
  <title-bar></title-bar>
  <div class="flex h-screen overflow-hidden">
    <SidebarProvider>
      <AppSidebar/>
      <!-- 主内容区域 - 渲染子路由 -->
      <main class="flex-1 overflow-y-auto p-4">
        <router-view />
      </main>
    </SidebarProvider>
  </div>
</template>