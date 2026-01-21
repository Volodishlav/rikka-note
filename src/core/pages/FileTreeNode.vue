<template>
  <li class="tree-node" :style="{ paddingLeft: `${depth * 20}px` }">
    <!-- 文件夹/文件图标 + 名称 -->
    <div class="node-header" @click="handleNodeClick">
      <!-- 文件夹折叠/展开按钮 -->
      <button
          v-if="node.isDirectory"
          @click.stop="toggleFolder"
          class="toggle-btn"
      >
        {{ isExpanded ? '−' : '+' }}
      </button>
      <span v-else class="toggle-btn placeholder"></span>

      <!-- 图标 -->
      <span class="node-icon">
        <span v-if="node.isDirectory">📁</span>
        <span v-else-if="node.name.endsWith('.md')">📝</span>
        <span v-else>🖼️</span>
      </span>

      <!-- 节点名称 -->
      <span
          class="node-name"
          :class="{ active: isActiveFile, editing: node.isEditing }"
          @dblclick.stop="handleDblClick"
      >
        {{ node.name || '未命名' }}
      </span>

      <!-- 操作按钮 -->
      <div class="node-actions">
        <button
            v-if="node.isDirectory"
            @click.stop="createFileInFolder"
            class="action-btn"
            title="在文件夹中创建文件"
        >
          +文件
        </button>
        <button
            v-if="node.isDirectory"
            @click.stop="createFolderInFolder"
            class="action-btn"
            title="在文件夹中创建子文件夹"
        >
          +文件夹
        </button>
        <button
            v-if="!node.isDirectory"
            @click.stop="openFile"
            class="action-btn"
            title="打开文件"
        >
          打开
        </button>
      </div>
    </div>

    <!-- 子节点（仅文件夹展开时显示） -->
    <ul v-if="node.isDirectory && isExpanded && node.children" class="child-nodes">
      <FileTreeNode
          v-for="child in node.children"
          :key="child.name + (child.isDirectory ? 'dir' : 'file')"
          :node="child"
          :depth="depth + 1"
          @open-file="$emit('open-file', $event)"
          @create-file-in-folder="$emit('create-file-in-folder', $event)"
          @create-folder-in-folder="$emit('create-folder-in-folder', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useArticleStore } from '@/stores/article'
import { DirTree } from '@/stores/article'
import { computedParentPath } from '@/lib/path'

// Props
const props = defineProps<{
  node: DirTree
  depth: number
}>()

// Emits
const emit = defineEmits<{
  (e: 'open-file', path: string): void
  (e: 'create-file-in-folder', path: string): void
  (e: 'create-folder-in-folder', path: string): void
}>()

// Store
const articleStore = useArticleStore()

// 计算当前节点的完整路径
const nodePath = computed(() => {
  return computedParentPath(props.node)
})

// 判断是否展开
const isExpanded = computed(() => {
  return articleStore.collapsibleList.includes(nodePath.value)
})

// 判断是否是当前激活的文件
const isActiveFile = computed(() => {
  return articleStore.activeFilePath === nodePath.value
})

// 切换文件夹展开/折叠状态
const toggleFolder = async () => {
  await articleStore.setCollapsibleListItem(
      nodePath.value,
      !isExpanded.value
  )
  // 如果是展开，且有远程同步逻辑（已移除），这里原本会加载远程文件
}

// 点击节点（文件夹：切换展开/折叠；文件：打开）
const handleNodeClick = () => {
  if (props.node.isDirectory) {
    toggleFolder()
  } else {
    openFile()
  }
}

// 双击节点（仅用于编辑名称，这里简化处理）
const handleDblClick = () => {
  // 实际项目中这里会进入重命名编辑状态
  console.log('双击重命名:', nodePath.value)
}

// 打开文件
const openFile = () => {
  emit('open-file', nodePath.value)
}

// 在文件夹中创建文件
const createFileInFolder = () => {
  emit('create-file-in-folder', nodePath.value)
}

// 在文件夹中创建子文件夹
const createFolderInFolder = () => {
  emit('create-folder-in-folder', nodePath.value)
}
</script>

<style scoped>
.tree-node {
  margin: 4px 0;
  list-style: none;
}

.node-header {
  display: flex;
  align-items: center;
  padding: 4px 0;
  cursor: pointer;
  border-radius: 2px;
}

.node-header:hover {
  background-color: #f7fafc;
}

/* 折叠/展开按钮 */
.toggle-btn {
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #718096;
}

.toggle-btn.placeholder {
  visibility: hidden;
}

/* 图标 */
.node-icon {
  margin: 0 4px;
  font-size: 16px;
}

/* 节点名称 */
.node-name {
  flex: 1;
  margin: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-name.active {
  font-weight: bold;
  color: #4299e1;
}

.node-name.editing {
  color: #e53e3e;
}

/* 操作按钮 */
.node-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
}

.node-header:hover .node-actions {
  opacity: 1;
}

.action-btn {
  padding: 2px 6px;
  font-size: 10px;
  border: none;
  border-radius: 2px;
  background-color: #e2e8f0;
  cursor: pointer;
}

.action-btn:hover {
  background-color: #cbd5e0;
}

/* 子节点 */
.child-nodes {
  list-style: none;
  padding: 0;
  margin: 0;
  margin-top: 4px;
}
</style>