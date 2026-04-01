import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuid } from 'uuid'
import { basename } from '@tauri-apps/api/path'
import { logger } from '@/utils/logger'

export type LayoutDirection = 'horizontal' | 'vertical'

export interface Tab {
  id: string
  path: string
  title: string
}

export interface EditorGroup {
  type: 'group'
  id: string
  tabs: Tab[]
  activeTabId: string | null
}

export interface SplitNode {
  type: 'split'
  id: string
  direction: LayoutDirection
  children: LayoutNode[]
}

export type LayoutNode = EditorGroup | SplitNode

export const useWorkspaceLayoutStore = defineStore('workspaceLayout', () => {
  // 根节点，初始为一个空的编辑器组
  const rootNode = ref<LayoutNode>({
    type: 'group',
    id: uuid(),
    tabs: [],
    activeTabId: null
  })

  // 当前激活的编辑器组 ID
  const activeGroupId = ref<string>(rootNode.value.id)

  // 递归查找特定的编辑器组
  function findGroupById(node: LayoutNode, id: string): EditorGroup | null {
    if (node.type === 'group') {
      return node.id === id ? (node as EditorGroup) : null
    }
    for (const child of node.children) {
      const found = findGroupById(child, id)
      if (found) return found
    }
    return null
  }

  // 获取当前激活的组
  const activeGroup = computed(() => {
    return findGroupById(rootNode.value, activeGroupId.value)
  })

  // 设置激活组
  function setActiveGroup(groupId: string) {
    logger.editor.debug(`[WorkspaceLayout] Setting active group: ${groupId}`)
    activeGroupId.value = groupId
  }

  // 打开文件
  async function openFile(path: string, options?: { newTab?: boolean, targetGroupId?: string }) {
    const newTab = options?.newTab ?? false
    const groupId = options?.targetGroupId || activeGroupId.value
    logger.editor.debug(`[WorkspaceLayout] openFile: ${path} (newTab: ${newTab}) in group: ${groupId}`)
    
    let group = findGroupById(rootNode.value, groupId)
    
    // 如果找不到指定的组，或者根节点不是组且没找到，默认用第一个找到的组
    if (!group) {
        logger.editor.warn(`[WorkspaceLayout] Group ${groupId} not found, searching for first available group`)
        const firstGroup = (function findFirstGroup(node: LayoutNode): EditorGroup | null {
            if (node.type === 'group') return node;
            for (const child of node.children) {
                const g = findFirstGroup(child);
                if (g) return g;
            }
            return null;
        })(rootNode.value);
        
        if (firstGroup) {
            group = firstGroup;
            activeGroupId.value = group.id;
            logger.editor.debug(`[WorkspaceLayout] Found fallback group: ${group.id}`)
        } else {
            logger.editor.error(`[WorkspaceLayout] No editor group available in tree!`)
            return; 
        }
    }

    // 检查文件是否已经在该组的标签页中
    const existingTab = group.tabs.find(t => t.path === path)
    if (existingTab) {
      logger.editor.debug(`[WorkspaceLayout] File already open in tab: ${existingTab.id}, switching to it`)
      group.activeTabId = existingTab.id
      activeGroupId.value = group.id
      return
    }

    // 如果不需要打开新标签页，且当前有活跃标签，则替换当前标签
    if (!newTab && group.activeTabId) {
      const activeIndex = group.tabs.findIndex(t => t.id === group.activeTabId)
      if (activeIndex !== -1) {
        const title = await basename(path)
        const oldId = group.tabs[activeIndex].id
        const replacementTab: Tab = {
          id: uuid(), // 更换 ID 以强制编辑器组件完全重挂载（解决 MD 编辑器状态残留问题）
          path,
          title
        }
        group.tabs[activeIndex] = replacementTab
        group.activeTabId = replacementTab.id
        logger.editor.debug(`[WorkspaceLayout] Replaced tab ${oldId} with new file: ${path}`)
        return
      }
    }

    // 创建新标签 (push 模式)
    const title = await basename(path)
    const newTabObj: Tab = {
      id: uuid(),
      path,
      title
    }

    group.tabs.push(newTabObj)
    group.activeTabId = newTabObj.id
    activeGroupId.value = group.id
    logger.editor.debug(`[WorkspaceLayout] Opened new tab ${newTabObj.id} for path ${path}`)
  }

  // 关闭标签页
  function closeTab(tabId: string, groupId: string) {
    logger.editor.debug(`[WorkspaceLayout] closeTab: ${tabId} from group ${groupId}`)
    const group = findGroupById(rootNode.value, groupId)
    if (!group) return

    const index = group.tabs.findIndex(t => t.id === tabId)
    if (index === -1) return

    group.tabs.splice(index, 1)

    // 更新激活标签
    if (group.activeTabId === tabId) {
      if (group.tabs.length > 0) {
        group.activeTabId = group.tabs[Math.max(0, index - 1)].id
      } else {
        group.activeTabId = null
      }
    }
  }

  // 进行分屏
  async function split(groupId: string, direction: LayoutDirection) {
    logger.editor.debug(`[WorkspaceLayout] split: group ${groupId} direction ${direction}`)
    
    function replaceNode(current: LayoutNode, targetId: string, newNode: LayoutNode): boolean {
      if (current.id === targetId) return true
      
      if (current.type === 'split') {
        const index = current.children.findIndex(c => c.id === targetId)
        if (index !== -1) {
          current.children[index] = newNode
          return true
        }
        for (const child of current.children) {
          if (replaceNode(child, targetId, newNode)) return true
        }
      }
      return false
    }

    const group = findGroupById(rootNode.value, groupId)
    if (!group) return

    const newGroupId = uuid()
    const newGroup: EditorGroup = {
      type: 'group',
      id: newGroupId,
      tabs: [...group.tabs],
      activeTabId: group.activeTabId
    }

    const splitNode: SplitNode = {
      type: 'split',
      id: uuid(),
      direction,
      children: [{ ...group }, newGroup]
    }

    if (rootNode.value.id === groupId) {
      rootNode.value = splitNode
    } else {
      replaceNode(rootNode.value, groupId, splitNode)
    }

    activeGroupId.value = newGroupId
  }

  return {
    rootNode,
    activeGroupId,
    activeGroup,
    setActiveGroup,
    openFile,
    closeTab,
    split,
    findGroupById
  }
})
