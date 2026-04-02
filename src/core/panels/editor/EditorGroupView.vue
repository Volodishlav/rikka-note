<script setup lang="ts">
import { useWorkspaceLayoutStore } from '@/stores/workspaceLayout';
import MdEditor from './MdEditor.vue';
import { computed } from 'vue';

import ArtTitle from '@/shared/components/ArtTitle.vue';
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
    :class="{ 
      'ring-2 ring-primary/20 ring-inset': layoutStore.activeGroupId === groupId,
      'bg-background': !!activeTab
    }"
    @mousedown="handleActivate"
  >
    <div v-if="!activeTab" class="flex-1 flex items-center justify-center bg-transparent animate-in fade-in">
        <div class="flex flex-col items-center space-y-2">
            <img src="@/assets/icon.png" class="w-16 h-16 mb-2" alt="Logo" />
            <ArtTitle class="w-full max-w-md scale-90" showBackground="graphic"/>
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
