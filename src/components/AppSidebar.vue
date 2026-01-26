//AppSidebar.vue
<template>
  <Sidebar>
    <!-- Header -->
    <SidebarHeader>
      <div class="p-2">
        <!-- 这里可以放 AppStatus slot -->
        <slot name="status"></slot>
      </div>
    </SidebarHeader>

    <!-- Main menu -->
    <SidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem v-for="item in items" :key="item.url">
            <SidebarMenuButton 
              :is-active="isActive(item)" 
              @click="menuHandler(item)"
              :title="collapsed ? item.title : ''"
            >
              <component :is="item.icon" class="size-5" />
              <span>{{ item.title }}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>

    <!-- Footer -->
    <SidebarFooter>
      <div class="p-2 flex items-center gap-2">
        <ModeToggle />
        <router-link to="/core/setting" class="ml-auto">
          <div class="size-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
        </router-link>
      </div>
    </SidebarFooter>
  </Sidebar>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { tauriGet, tauriSet } from '@/utils/tauriStore'
import { useSidebarStore } from '@/stores/sidebar'

// icons (from lucide-vue-next)
import { Highlighter, SquarePen, Search, ImagePlus } from 'lucide-vue-next'
import ModeToggle from '@/components/ModeToggle.vue'

// shadcn-vue sidebar components
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const router = useRouter()
const route = useRoute()
const sidebar = useSidebarStore()
sidebar.init().catch(err => console.error('侧边栏初始化失败：', err))

// 使用computed保持响应式
const collapsed = computed({
  get: () => sidebar.collapsed,
  set: (value) => { sidebar.toggle() }
})

const items = ref([
  { title: '录入', url: '/core/record', icon: Highlighter },
  { title: '写作', url: '/core/article', icon: SquarePen },
  { title: '搜索', url: '/core/search', icon: Search },
  { title: '测试', url: '/core/test', icon: Search },
  { title: '数据测试', url: '/core/data-test', icon: Search },
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