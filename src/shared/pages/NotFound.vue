<!-- src/shared/pages/NotFound.vue（极简占位，新增返回首页链接，符合优化建议） -->
<template>
  <div class="flex flex-col items-center justify-center h-100vh">
    <h1>404 - 页面未找到</h1>
    <router-link to="/" class="mt-4 text-blue-500">返回首页</router-link>
  </div>
</template>