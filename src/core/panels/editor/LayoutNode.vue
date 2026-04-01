<script setup lang="ts">
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { type LayoutNode as ILayoutNode } from '@/stores/workspaceLayout';
import EditorGroupView from './EditorGroupView.vue';
import { onMounted } from 'vue';
import { logger } from '@/utils/logger';

const props = defineProps<{
  node: ILayoutNode;
}>();

onMounted(() => {
  logger.editor.debug(`[LayoutNode] Mounted node: ${props.node.id} (${props.node.type})`);
});
</script>

<template>
  <div class="h-full w-full overflow-hidden">
    <!-- 如果是编辑器组，直接渲染 -->
    <EditorGroupView 
      v-if="node.type === 'group'" 
      :groupId="node.id" 
    />

    <!-- 如果是分屏节点，递归渲染子节点 -->
    <splitpanes 
      v-else 
      :horizontal="node.direction === 'vertical'" 
      class="default-theme h-full w-full"
    >
      <!-- splitpanes 对于 horizontal 的定义是：如果为 true，则是上下分割。
           在我们的模型中，direction: 'vertical' 意味着切割线是垂直的（左右），
           但 splitpanes 的 horizontal: true 对应的是上下（水平切割线）。
           纠正：
           splitpanes: horizontal=true -> Top/Bottom
           splitpanes: horizontal=false -> Left/Right
           我们的 LayoutDirection: 'horizontal' -> Top/Bottom (水平线分离上下)
           我们的 LayoutDirection: 'vertical' -> Left/Right (垂直线分离左右)
      -->
      <Pane 
        v-for="child in node.children" 
        :key="child.id"
        min-size="10"
      >
        <LayoutNode :node="child" />
      </Pane>
    </splitpanes>
  </div>
</template>

<style>
/* 可以在这里微调 splitpanes 的样式以符合 Obsidian 风格 */
.splitpanes.default-theme .splitpanes__splitter {
  background-color: transparent;
  border-left: 1px solid hsl(var(--border));
  width: 4px;
}
.splitpanes.default-theme .splitpanes__splitter:hover {
  background-color: hsl(var(--primary) / 0.1);
}
.splitpanes--horizontal > .splitpanes__splitter {
  height: 4px;
  border-top: 1px solid theme('colors.border');
  border-left: none;
}
</style>
