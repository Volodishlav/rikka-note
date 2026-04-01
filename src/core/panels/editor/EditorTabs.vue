<script setup lang="ts">
import { useWorkspaceLayoutStore } from '@/stores/workspaceLayout';
import { X, Split, Layout } from 'lucide-vue-next';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator
} from '@/components/ui/context-menu';
import { computed } from 'vue';
import { logger } from '@/utils/logger';

const layoutStore = useWorkspaceLayoutStore();

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
    layoutStore.closeTab(tabId, activeGroup.value.id);
  }
};

const handleSplit = (direction: 'horizontal' | 'vertical') => {
  if (activeGroup.value) {
    layoutStore.split(activeGroup.value.id, direction);
  }
};
</script>

<template>
  <div data-tauri-drag-region class="flex-1 h-full px-4 flex items-center justify-center">
    <div data-tauri-drag-region v-if="!activeGroup || activeGroup.tabs.length === 0" class="text-muted-foreground text-xs opacity-50 italic">
      Rikka Note - 平静、纯粹的写作体验
    </div>
    
    <div data-tauri-drag-region v-else class="flex items-end gap-1 max-w-full overflow-x-auto no-scrollbar h-full">
      <div
        v-for="tab in activeGroup.tabs"
        :key="tab.id"
        class="group relative min-w-[80px] max-w-[180px] flex items-center px-3 transition-[background-color,color,height,margin,border-radius] duration-200 ease-in-out cursor-pointer select-none"
        :class="activeGroup.activeTabId === tab.id 
          ? 'active-tab bg-secondary border-x border-t border-b-0 border-border text-foreground z-10 rounded-t-xl' 
          : 'border-x border-y-0 border-foreground/40 text-muted-foreground hover:bg-secondary/40 rounded-none mb-[6px] h-[18px] pb-0'"
        @click="handleTabClick(tab.id)"
      >
        <ContextMenu>
          <ContextMenuTrigger class="flex-1 flex items-center gap-2 overflow-hidden mr-4">
            <span class="truncate text-[11px] font-medium">{{ tab.title }}</span>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem @select="handleSplit('vertical')">
              <Split class="mr-2 h-4 w-4" />
              向右分屏
            </ContextMenuItem>
            <ContextMenuItem @select="handleSplit('horizontal')">
              <Layout class="mr-2 h-4 w-4" />
              向下分屏
            </ContextMenuItem>
            <ContextMenuSeparator />
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
    </div>
  </div>
</template>

<style scoped>
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
