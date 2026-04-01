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
  <div class="flex-1 h-full px-4 overflow-hidden flex items-center justify-center">
    <div v-if="!activeGroup || activeGroup.tabs.length === 0" class="text-muted-foreground text-xs opacity-50 italic">
      Rikka Note - 平静、纯粹的写作体验
    </div>
    
    <div v-else class="flex items-center gap-1 max-w-full overflow-x-auto no-scrollbar h-full">
      <div
        v-for="tab in activeGroup.tabs"
        :key="tab.id"
        class="group relative h-[28px] min-w-[80px] max-w-[180px] flex items-center px-3 rounded-md transition-all cursor-pointer border select-none"
        :class="activeGroup.activeTabId === tab.id ? 'bg-secondary/80 border-border text-foreground shadow-sm' : 'border-transparent text-muted-foreground hover:bg-secondary/40'"
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
</style>
