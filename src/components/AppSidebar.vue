<template>
  <aside :class="['flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-width duration-200', collapsed ? 'w-12' : 'w-56']">
    <!-- Header -->
    <div class="p-2">
      <!-- 这里可以放 AppStatus slot -->
      <slot name="status"></slot>
    </div>

    <!-- Main menu -->
    <nav class="flex-1 px-1 py-2">
      <ul class="space-y-1">
        <li v-for="item in items" :key="item.url">
          <button
              :class="['w-full flex items-center justify-center md:justify-start gap-3 p-2 rounded-md', isActive(item) ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent']"
              @click="menuHandler(item)"
              :title="collapsed ? item.title : ''"
          >
            <component :is="item.icon" class="size-5" />
            <span v-if="!collapsed" class="truncate">{{ item.title }}</span>
          </button>
        </li>
      </ul>
    </nav>

    <!-- Footer -->
    <div class="p-2 flex items-center gap-2">
      <ModeToggle />
      <router-link to="/core/setting" class="ml-auto">
        <div class="size-8 flex items-center justify-center rounded-md">
          <!-- 用你选择的设置图标 -->
          <svg class="size-4" viewBox="...">...</svg>
        </div>
      </router-link>
    </div>
  </aside>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { tauriGet, tauriSet } from '@/utils/tauriStore'
import { useSidebarStore } from '@/stores/sidebar'

// icons (from lucide-vue-next)
import { Highlighter, SquarePen, Search, ImagePlus } from 'lucide-vue-next'
import ModeToggle from '@/components/ModeToggle.vue'

const router = useRouter()
const route = useRoute()
const sidebar = useSidebarStore()
sidebar.init().catch(err => console.error('侧边栏初始化失败：', err))
const collapsed = sidebar.collapsed

const items = ref([
  { title: '录入', url: '/core/record', icon: Highlighter },
  { title: '写作', url: '/core/article', icon: SquarePen },
  { title: '搜索', url: '/core/search', icon: Search },
  { title: '测试', url: '/core/test', icon: Search },
])

function isActive(item: { url: string }) {
  return route.path === item.url
}

async function menuHandler(item: { url: string }) {
  // 若在 /core/article 且点写作则切换文件侧边栏的行为需要你自己实现（optional）
  await router.push(item.url)
  tauriSet('currentPage', item.url)
}

async function initImageMenu() {
  const username = await tauriGet('githubImageUsername')
  const token = await tauriGet('githubImageAccessToken')
  if (username && token && !items.value.find(i => i.url === '/core/image')) {
    items.value.push({ title: '图床', url: '/core/image', icon: ImagePlus })
  }
}

onMounted(() => {
  initImageMenu()
})
</script>

<style scoped>
/* 你可以微调 collapsed 的 behaviour 或 hover 展开动画 */
</style>