import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tauriGet, tauriSet } from '@/utils/tauriStore'
import { exists, writeTextFile, mkdir } from '@tauri-apps/plugin-fs'
import { useI18n } from '@/hooks/useI18n'

export interface WorkspaceItem {
  id: string
  name: string
  path: string
  lastAccessed: number
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const { t } = useI18n()
  const activeWorkspace = ref<WorkspaceItem | null>(null)
  const workspaces = ref<WorkspaceItem[]>([])
  
  // 初始化工作区数据
  async function initWorkspaceData() {
    try {
      const savedWorkspaces = await tauriGet<WorkspaceItem[]>('workspaces')
      if (savedWorkspaces && savedWorkspaces.length > 0) {
        workspaces.value = savedWorkspaces
      }
      
      const savedActiveWorkspaceId = await tauriGet<string>('activeWorkspaceId')
      if (savedActiveWorkspaceId) {
        const found = workspaces.value.find(w => w.id === savedActiveWorkspaceId)
        if (found) {
          activeWorkspace.value = found
          
          // 更新最后访问时间
          found.lastAccessed = Date.now()
          await tauriSet('workspaces', workspaces.value)
        }
      }
    } catch (e) {
      console.error('initWorkspaceData error:', e)
    }
  }

  // 检查并初始化一个本地目录作为工作区，即生成 .rikka_note 标识文件
  async function addWorkspace(path: string, name: string): Promise<WorkspaceItem> {
    // 检查目录是否存在且有权限 (依赖于 Tauri allowlist 配置的 fs，通常需确保在对话框内选中的路径被授权)
    // 根据 Tauri v2 规范，这里假设 path 是绝对路径或者通过 dialer 获取的安全路径
    const markerFile = `${path}/.rikka_note`
    
    let isMarkerExists = false
    try {
      isMarkerExists = await exists(markerFile)
    } catch (e) {
      // 路径无法访问等情况直接视作不存在或异常
      console.warn('Check marker failed, maybe not exists', e)
    }
    
    if (!isMarkerExists) {
      try {
        await writeTextFile(markerFile, JSON.stringify({
          created_at: Date.now(),
          name: name
        }, null, 2))
      } catch (e) {
        console.error('Failed to create .rikka_note marker file:', e)
        throw new Error(t('workspace.toast.markerCreateFailed'))
      }
    }
    
    // 如果该路径已经添加过，则直接返回
    const alreadyIdx = workspaces.value.findIndex(w => w.path === path)
    if (alreadyIdx > -1) {
      return workspaces.value[alreadyIdx]
    }
    
    const newWorkspace: WorkspaceItem = {
      id: crypto.randomUUID(),
      name,
      path,
      lastAccessed: Date.now()
    }
    
    workspaces.value.unshift(newWorkspace)
    await tauriSet('workspaces', workspaces.value)
    
    return newWorkspace
  }

  // 获取工作区（新建或切换）
  async function switchWorkspace(workspaceId: string): Promise<void> {
    const found = workspaces.value.find(w => w.id === workspaceId)
    if (!found) throw new Error(t('workspace.toast.workspaceNotFound'))
      
    activeWorkspace.value = found
    found.lastAccessed = Date.now()
    
    await tauriSet('activeWorkspaceId', found.id)
    await tauriSet('workspaces', workspaces.value)
    
    // 同步设置系统旧有的依赖键名 workspacePath
    await tauriSet('workspacePath', found.path)
  }

  // 仅从列表中移除
  async function removeWorkspace(workspaceId: string): Promise<void> {
    workspaces.value = workspaces.value.filter(w => w.id !== workspaceId)
    await tauriSet('workspaces', workspaces.value)
    
    // 若删除的是当前工作区
    if (activeWorkspace.value?.id === workspaceId) {
      activeWorkspace.value = null
      await tauriSet('activeWorkspaceId', null)
      await tauriSet('workspacePath', null)
    }
  }

  // 重命名显示名
  async function renameWorkspace(workspaceId: string, newName: string): Promise<void> {
    const found = workspaces.value.find(w => w.id === workspaceId)
    if (found) {
      found.name = newName
      await tauriSet('workspaces', workspaces.value)
    }
  }
  
  return {
    activeWorkspace,
    workspaces,
    initWorkspaceData,
    addWorkspace,
    switchWorkspace,
    removeWorkspace,
    renameWorkspace
  }
})
