<script setup lang="ts">
import { useWorkspaceLayoutStore } from '@/stores/workspaceLayout';
import MdEditor from './MdEditor.vue';
import { computed } from 'vue';

import { logger } from '@/utils/logger';

const props = defineProps<{
  groupId: string;
}>();

const layoutStore = useWorkspaceLayoutStore();

const group = computed(() => {
    const g = layoutStore.findGroupById(layoutStore.rootNode, props.groupId);
    return g
});

const activeTab = computed(() => {
    if (!group.value) {
        logger.editor.debug(`[EditorGroupView] group ${props.groupId} not found`);
        return null;
    }
    const tab = (group.value as any).tabs.find((t: any) => t.id === group.value?.activeTabId);
    if (!tab && group.value.activeTabId) {
        logger.editor.warn(`[EditorGroupView] tab ${group.value.activeTabId} not found in group ${props.groupId}`);
    }
    return tab;
});

logger.editor.debug(`[EditorGroupView] Initialized component for group: ${props.groupId}`);

const handleActivate = () => {
  layoutStore.setActiveGroup(props.groupId);
};
</script>

<template>
  <div 
    class="h-full w-full relative flex flex-col overflow-hidden"
    :class="{ 'ring-2 ring-primary/20 ring-inset': layoutStore.activeGroupId === groupId }"
    @mousedown="handleActivate"
  >
    <div v-if="!activeTab" class="flex-1 flex items-center justify-center bg-background/50 animate-in fade-in">
        <div class="text-center space-y-4">
            <img src="@/assets/icon.png" class="w-16 h-16 opacity-10 mx-auto grayscale" alt="Logo" />
            <p class="text-muted-foreground text-sm opacity-50">在此区域打开文档 (Group: {{ groupId }} / Active: {{ group?.activeTabId || 'None' }})</p>
        </div>
    </div>
    <div v-else class="flex-1 w-full h-full relative overflow-hidden">
      <MdEditor 
        :key="activeTab.id"
        :path="activeTab.path" 
        :id="activeTab.id"
      />
    </div>
  </div>
</template>
