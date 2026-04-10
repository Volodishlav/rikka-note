<script setup lang="ts">
import { type EditorGroup } from '@/stores/workspaceLayout';
import EditorGroupView from './EditorGroupView.vue';
import { onMounted } from 'vue';
import { logger } from '@/utils/logger';

const props = defineProps<{
  node: EditorGroup;
}>();

onMounted(() => {
  logger.editor.debug(`[LayoutNode] Mounted node: ${props.node.id}`);
});
</script>

<template>
  <div class="h-full w-full overflow-hidden">
    <EditorGroupView 
      :groupId="node.id" 
    />
  </div>
</template>

<style scoped>
/* 移除之前的 splitpanes 样式 */
</style>
