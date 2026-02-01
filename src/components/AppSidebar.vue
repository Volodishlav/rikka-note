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
              <component :is="item.icon" class="size-4" />
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
          <div class="size-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent" title="Settings">
            <Settings class="size-4" />
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
import { Highlighter, SquarePen, Search, ImagePlus, Settings } from 'lucide-vue-next'
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