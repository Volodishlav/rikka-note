<script setup lang="ts">
import { useWorkspaceLayoutStore } from '@/stores/workspaceLayout';
import MdEditor from './MdEditor.vue';
import { computed, watch } from 'vue';

import ArtTitle from '@/shared/components/ArtTitle.vue';
import { logger } from '@/utils/logger';
import { useSettingStore } from '@/stores/setting';

const props = defineProps<{
  groupId: string;
}>();

const layoutStore = useWorkspaceLayoutStore();
const settingStore = useSettingStore();

const showEditorBackground = computed(() => {
    const val = settingStore.showEditorBackground;
    logger.editor.debug(`[EditorGroupView] Evaluated showEditorBackground computed: ${val}`);
    return val;
});

watch(() => settingStore.showEditorBackground, (newVal) => {
    logger.editor.debug(`[EditorGroupView] WATCHER: settingStore.showEditorBackground changed to: ${newVal}`);
});

const group = computed(() => layoutStore.rootNode);

const activeTab = computed(() => {
    return group.value.tabs.find(t => t.id === group.value.activeTabId) || null;
});

logger.editor.debug(`[EditorGroupView] Initialized component`);
</script>

<template>
  <div 
    class="h-full w-full relative flex flex-col overflow-hidden"
    :class="{ 
      'bg-background': !!activeTab || !showEditorBackground
    }"
  >
    <div v-if="!activeTab" class="flex-1 flex items-center justify-center animate-in fade-in" :class="showEditorBackground ? 'bg-transparent' : 'bg-muted/40'">
        <div class="flex flex-col items-center space-y-2">
            <img src="@/assets/icon.png" class="w-16 h-16 mb-2" alt="Logo" />
            <ArtTitle class="w-full max-w-md scale-90" :showBackground="showEditorBackground ? 'graphic' : null"/>
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
