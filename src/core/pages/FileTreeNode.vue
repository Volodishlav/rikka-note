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

      <!-- 节点名称 / 编辑输入框 -->
      <template v-if="node.isEditing">
        <input
            ref="editInput"
            v-model="editName"
            class="node-edit-input"
            @blur="handleEditConfirm"
            @keyup.enter="handleEditConfirm"
            @keyup.esc="handleEditCancel"
        />
      </template>
      <template v-else>
        <span
            class="node-name"
            :class="{ active: isActiveFile, editing: node.isEditing }"
            @dblclick.stop="handleDblClick"
        >
          {{ node.name || '未命名' }}
        </span>
      </template>

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
          :key="child.name + (child.isDirectory ? 'dir' : 'file') + (child.isEditing ? 'edit' : '')"
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
import { computed, ref, nextTick, watch } from 'vue'
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

// 编辑相关状态
const editInput = ref<HTMLInputElement>(null)
const editName = ref('')
const isEditing = computed(() => props.node.isEditing)

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

// 监听编辑状态变化，自动聚焦输入框
watch(isEditing, (newVal) => {
  if (newVal) {
    // 初始化编辑名称（空名称则置空，否则用现有名称）
    editName.value = props.node.name || ''
    // 延迟聚焦，确保DOM已更新
    nextTick(() => {
      editInput.value?.focus()
      editInput.value?.select() // 全选现有内容，方便直接输入
    })
  }
}, { immediate: true })

// 切换文件夹展开/折叠状态
const toggleFolder = async () => {
  await articleStore.setCollapsibleListItem(
      nodePath.value,
      !isExpanded.value
  )
}

// 点击节点（文件夹：切换展开/折叠；文件：打开）
const handleNodeClick = () => {
  if (props.node.isDirectory) {
    toggleFolder()
  } else {
    openFile()
  }
}

// 双击节点进入编辑状态
const handleDblClick = () => {
  // 只有文件夹支持编辑（文件重命名可按需添加）
  if (props.node.isDirectory) {
    props.node.isEditing = true
  }
}

const handleEditConfirm = async () => {
  const newName = editName.value.trim()
  if (!newName) {
    // 空名称直接取消编辑
    handleEditCancel()
    return
  }

  try {
    // 等待创建完成
    await articleStore.confirmCreateFolder(props.node, newName)
    // 手动刷新文件树（确保最新状态）
    await articleStore.loadFileTree()
  } catch (error) {
    console.error('确认创建文件夹失败:', error)
    // 创建失败时恢复编辑状态
    nextTick(() => {
      props.node.isEditing = true
      editInput.value?.focus()
    })
  }
}

// 取消编辑 - 优化版本
const handleEditCancel = () => {
  articleStore.cancelFolderEdit(props.node)
  // 重置编辑名称
  editName.value = ''
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

/* 编辑输入框 */
.node-edit-input {
  flex: 1;
  margin: 0 8px;
  padding: 2px 4px;
  border: 1px solid #4299e1;
  border-radius: 2px;
  font-size: 14px;
  outline: none;
  min-width: 100px;
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