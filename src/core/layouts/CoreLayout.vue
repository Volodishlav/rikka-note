<script setup lang="ts">
// CoreLayout - 核心布局组件
import AppSidebar from '@/components/AppSidebar.vue'
</script>

<template>
  <div class="core-layout">
    <AppSidebar/>
    <!-- 主内容区域 - 渲染子路由 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.core-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.dark .sidebar {
  background-color: #1e293b;
  border-right-color: #334155;
}

.sidebar-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.dark .sidebar-header {
  border-bottom-color: #334155;
}

.sidebar-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.dark .sidebar-header h2 {
  color: #f1f5f9;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: block;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: #475569;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.dark .nav-item {
  color: #cbd5e1;
}

.nav-item:hover {
  background-color: #e2e8f0;
  color: #1e293b;
}

.dark .nav-item:hover {
  background-color: #334155;
  color: #f1f5f9;
}

.nav-item.router-link-active {
  background-color: #3b82f6;
  color: white;
}

.dark .nav-item.router-link-active {
  background-color: #3b82f6;
  color: white;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}
</style>