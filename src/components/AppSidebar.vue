<template>
  <aside :class="['flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-width duration-200', collapsed ? 'w-12' : 'w-56']">
    <!-- Header -->
    <div class="p-2">
      <!-- 这里可以放 AppStatus slot -->
      <slot name="status"></slot>
    </div>

    <!-- 新增：折叠/展开切换按钮 -->
    <button
      class="mx-auto mb-2 p-1 rounded-md hover:bg-sidebar-accent"
      @click="toggleCollapsed"
      title="切换侧边栏"
    >
      <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>

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
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
      </router-link>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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

// 使用computed保持响应式
const collapsed = computed({
  get: () => sidebar.collapsed,
  set: (value) => { sidebar.toggle() }
})

// 新增切换折叠状态的方法
const toggleCollapsed = () => {
  // 调用sidebar store的toggle方法
  sidebar.toggle()
}

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

onMounted(async () => {
  // 初始化图床菜单
  await initImageMenu()
})
</script>

<style scoped>
/* 微调 collapsed 的 behaviour */
.transition-width {
  transition-property: width;
}
</style>