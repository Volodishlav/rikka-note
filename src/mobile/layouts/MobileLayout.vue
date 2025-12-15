<script setup lang="ts">
// MobileLayout - 移动端布局组件
</script>

<template>
  <div class="mobile-layout">
    <!-- 移动端头部 -->
    <header class="mobile-header">
      <h1>移动端应用</h1>
    </header>
    
    <!-- 主内容区域 - 渲染子路由 -->
    <main class="mobile-content">
      <router-view />
    </main>
    
    <!-- 移动端底部导航 - 只保留指定的导航链接 -->
    <footer class="mobile-footer">
      <router-link to="/mobile/chat" class="nav-item">
        聊天
      </router-link>
    </footer>
  </div>
</template>

<style scoped>
.mobile-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.mobile-header {
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 1rem;
  text-align: center;
}

.dark .mobile-header {
  background-color: #1e293b;
  border-bottom-color: #334155;
}

.mobile-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.dark .mobile-header h1 {
  color: #f1f5f9;
}

.mobile-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.mobile-footer {
  display: flex;
  justify-content: space-around;
  align-items: center;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  padding: 0.75rem 0;
}

.dark .mobile-footer {
  background-color: #1e293b;
  border-top-color: #334155;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: #475569;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem;
  border-radius: 0.5rem;
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
</style>