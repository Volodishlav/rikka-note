import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuid } from 'uuid'
import { basename } from '@tauri-apps/api/path'
import { logger } from '@/utils/logger'

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

export type LayoutNode = EditorGroup

export const useWorkspaceLayoutStore = defineStore('workspaceLayout', () => {
  // 根节点，固定为一个编辑器组
  const rootNode = ref<EditorGroup>({
    type: 'group',
    id: uuid(),
    tabs: [],
    activeTabId: null
  })

  // 获取当前激活的组 (现在只有一个组，所以直接返回 rootNode)
  const activeGroup = computed(() => rootNode.value)

  // 为了兼容旧代码，保留 activeGroupId 但它现在始终指向 rootNode.id
  const activeGroupId = computed(() => rootNode.value.id)

  // 获取当前激活的文章路径
  const activeFilePath = computed(() => {
    const group = rootNode.value
    if (!group.activeTabId) return null
    const tab = group.tabs.find(t => t.id === group.activeTabId)
    return tab ? tab.path : null
  })

  // 设置激活组
  function setActiveGroup(_groupId: string) {
    // 只有一个组，无需操作
  }

  // 打开文件
  async function openFile(path: string, options?: { newTab?: boolean }) {
    const newTab = options?.newTab ?? false
    logger.editor.debug(`[WorkspaceLayout] openFile: ${path} (newTab: ${newTab})`)
    
    const group = rootNode.value

    // 检查文件是否已经在该组的标签页中
    const existingTab = group.tabs.find(t => t.path === path)
    if (existingTab) {
      logger.editor.debug(`[WorkspaceLayout] File already open in tab: ${existingTab.id}, switching to it`)
      group.activeTabId = existingTab.id
      return
    }

    // 如果不需要打开新标签页，且当前有活跃标签，则替换当前标签
    if (!newTab && group.activeTabId) {
      const activeIndex = group.tabs.findIndex(t => t.id === group.activeTabId)
      if (activeIndex !== -1) {
        const title = await basename(path)
        const oldId = group.tabs[activeIndex].id
        const replacementTab: Tab = {
          id: uuid(),
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
    logger.editor.debug(`[WorkspaceLayout] Opened new tab ${newTabObj.id} for path ${path}`)
  }

  // 关闭标签页
  function closeTab(tabId: string, _groupId: string) {
    const group = rootNode.value
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

  // 为了兼容旧代码提供 findGroupById
  function findGroupById(_node: any, _id: string): EditorGroup {
    return rootNode.value
  }

  return {
    rootNode,
    activeGroupId,
    activeGroup,
    activeFilePath,
    setActiveGroup,
    openFile,
    closeTab,
    findGroupById
  }
})
