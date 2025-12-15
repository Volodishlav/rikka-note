<script setup lang="ts">
// CoreLayout - 核心布局组件
</script>

<template>
  <div class="core-layout">
    <!-- 侧边栏 - 只保留指定的导航链接 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>核心功能菜单</h2>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/core/record" class="nav-item">
          记录页面
        </router-link>
        <router-link to="/core/test" class="nav-item">
          测试页面
        </router-link>
      </nav>
    </aside>
    
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

.sidebar {
  width: 250px;
  background-color: #f8fafc;
  border-right: 1px solid #e2e8f0;
  padding: 1rem;
  overflow-y: auto;
  transition: all 0.3s ease;
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