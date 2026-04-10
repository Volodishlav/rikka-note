<script setup lang="ts">
import { useWorkspaceLayoutStore } from '@/stores/workspaceLayout';
import { X, ChevronDown } from 'lucide-vue-next';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { computed, ref } from 'vue';
import { logger } from '@/utils/logger';
import { useElementSize } from '@vueuse/core';

const layoutStore = useWorkspaceLayoutStore();
const containerRef = ref<HTMLElement | null>(null);
const tabRefs = ref<HTMLElement[]>([]);
const lastWidths = ref<Record<string, number>>({});

// 使用 VueUse 监听容器宽度
const { width: containerWidth } = useElementSize(containerRef);

// TitleBar 中的标签页始终显示当前激活组的标签
const activeGroup = computed(() => layoutStore.activeGroup);

const handleTabClick = (tabId: string) => {
  logger.editor.debug(`[EditorTabs] Clicked tab: ${tabId}`);
  if (activeGroup.value) {
    activeGroup.value.activeTabId = tabId;
  }
};

const handleCloseTab = (e: Event, tabId: string) => {
  e.stopPropagation();
  if (activeGroup.value) {
    logger.editor.debug(`[EditorTabs] close tab: ${tabId}`);
    layoutStore.closeTab(tabId, activeGroup.value.id);
  }
};


// 计算可见和溢出的标签
const tabVisibility = computed(() => {
  if (!activeGroup.value || !containerRef.value || containerWidth.value <= 0) {
    return { visible: [], overflows: [] as any[] };
  }
  
  const tabs = activeGroup.value.tabs;
  const activeTabId = activeGroup.value.activeTabId;
  const availableWidth = containerWidth.value - 48; // 留出更多空间给 Chevron 和间隙
  
  let currentWidth = 0;
  const visible: typeof tabs = [];
  const overflows: typeof tabs = [];
  
  // 记录所有标签的实际宽度（如果当前可见）
  tabs.forEach((tab, index) => {
    const el = tabRefs.value[index];
    if (el && el.offsetWidth > 0 && tab.id) {
      lastWidths.value[tab.id] = el.offsetWidth;
    }
  });

  // 算法：优先显示前面的标签，但如果激活标签在后面，尝试保留空间
  let activeTabOverflows = false;

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const width = lastWidths.value[tab.id] || 120; // 默认估算宽度
    
    if (currentWidth + width + 4 <= availableWidth) {
      visible.push(tab);
      currentWidth += width + 4;
    } else {
      overflows.push(tab);
      if (tab.id === activeTabId) activeTabOverflows = true;
    }
  }

  // 特殊处理：如果激活的标签在 overflow 中，我们把它挤进 visible
  if (activeTabOverflows && overflows.length > 0 && activeTabId) {
    const activeTab = overflows.find(t => t.id === activeTabId);
    if (activeTab) {
      // 从 visible 末尾移除标签直到能放下 activeTab
      const activeWidth = lastWidths.value[activeTabId] || 120;
      while (visible.length > 0 && currentWidth + activeWidth > availableWidth) {
        const lastVisible = visible.pop()!;
        overflows.unshift(lastVisible);
        const lastVisibleWidth = (lastVisible.id ? lastWidths.value[lastVisible.id] : 120) || 120;
        currentWidth -= lastVisibleWidth + 4;
      }
      visible.push(activeTab);
      // 从 overflows 中移除刚才移动过去的 activeTab
      const idx = overflows.findIndex(t => t.id === activeTabId);
      if (idx > -1) overflows.splice(idx, 1);
    }
  }
  
  return { visible, overflows };
});

const overflowTabs = computed(() => tabVisibility.value.overflows);
const visibleTabs = computed(() => tabVisibility.value.visible);

const isTabVisible = (tabId: string) => {
  return visibleTabs.value.some(t => t.id === tabId);
};

const setTabRef = (el: any, index: number) => {
  if (el) {
    tabRefs.value[index] = el as HTMLElement;
  }
};
</script>

<template>
  <div ref="containerRef" data-tauri-drag-region class="flex-1 h-full flex items-center justify-center min-w-0 overflow-hidden">
    
    <!-- 标签列表 + 更多按钮捆绑容器 -->
    <div 
      data-tauri-drag-region
      class="flex items-end gap-1 h-full no-scrollbar px-4"
      :class="overflowTabs.length > 0 ? 'justify-start w-full' : 'justify-center'"
    >
      <div
        v-for="(tab, index) in activeGroup.tabs"
        :key="tab.id"
        :ref="(el) => setTabRef(el, index)"
        class="tab-item group relative min-w-[80px] max-w-[180px] flex items-center px-3 transition-[background-color,color,height,margin,border-radius,width] duration-200 ease-in-out cursor-pointer select-none flex-shrink-0"
        :class="[
          activeGroup.activeTabId === tab.id 
            ? 'active-tab bg-secondary border-x border-t border-b-0 border-border text-foreground z-10 rounded-t-xl' 
            : 'border-x border-y-0 border-foreground/40 text-muted-foreground hover:bg-secondary/40 rounded-none mb-[6px] h-[18px] pb-0',
          !isTabVisible(tab.id) ? 'stowed-tab' : ''
        ]"
        @click="handleTabClick(tab.id)"
      >
        <ContextMenu>
          <ContextMenuTrigger class="flex-1 flex items-center gap-2 overflow-hidden mr-4">
            <span class="truncate text-[11px] font-medium">{{ tab.title }}</span>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem @select="handleCloseTab($event, tab.id)">
              <X class="mr-2 h-4 w-4" />
              关闭标签页
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <button
          class="absolute right-1 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 rounded p-0.5 transition-all"
          @click="(e) => handleCloseTab(e, tab.id)"
        >
          <X class="h-3 w-3" />
        </button>
      </div>

      <!-- 更多按钮 (紧跟在可见标签后) -->
      <div v-if="overflowTabs.length > 0" class="flex items-center ml-1 h-full">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button class="p-1 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown class="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-48">
            <DropdownMenuItem 
              v-for="tab in overflowTabs" 
              :key="tab.id"
              @select="handleTabClick(tab.id)"
              class="flex items-center justify-between gap-2"
            >
              <span class="truncate text-xs">{{ tab.title }}</span>
              <button 
                class="hover:bg-muted p-0.5 rounded ml-2"
                @click.stop="(e) => handleCloseTab(e, tab.id)"
              >
                <X class="h-3 w-3" />
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stowed-tab {
  display: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.active-tab::before,
.active-tab::after {
  content: "";
  position: absolute;
  bottom: 0;
  width: 12px;
  height: 12px;
  pointer-events: none;
}

.active-tab::before {
  left: -12px;
  background: radial-gradient(circle at 0 0, transparent 12px, hsl(var(--border)) 12px, hsl(var(--border)) 13px, hsl(var(--secondary)) 13px);
}

.active-tab::after {
  right: -12px;
  background: radial-gradient(circle at 100% 0, transparent 12px, hsl(var(--border)) 12px, hsl(var(--border)) 13px, hsl(var(--secondary)) 13px);
}

/* 修复激活态下伪元素的背景色 - 使用 CSS 变量以兼容主题 */
.active-tab {
  background-color: hsl(var(--secondary));
}

/* 为了遮盖底部线条，让激活标签页稍微下沉 1px，并定义高度以覆盖容器 */
.active-tab {
  margin-bottom: -1px;
  height: 30px;
}
</style>
