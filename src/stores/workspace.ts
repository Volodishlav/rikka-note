import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tauriGet, tauriSet } from '@/utils/tauriStore'
import { exists, writeTextFile, mkdir } from '@tauri-apps/plugin-fs'
import { useI18n } from '@/hooks/useI18n'
import { closeDb, initAllDatabases } from '@/db'
import { useArticleStore } from '@/stores/article'

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
          // 进一步验证该物理路径是否依然存活
          let isFolderValid = false
          try {
            isFolderValid = await exists(found.path)
          } catch (e) {
            isFolderValid = false
          }

          if (isFolderValid) {
            activeWorkspace.value = found
            
            // 更新最后访问时间
            found.lastAccessed = Date.now()
            await tauriSet('workspaces', workspaces.value)
          } else {
            console.warn(`[Workspace] 启动时发现激活仓库的文件夹(${found.path})已丢失。状态回退。`)
            // 失效则悬空
            activeWorkspace.value = null
            await tauriSet('activeWorkspaceId', null)
          }
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
      
    // 拦截：验证试图切换的仓库物理文件夹是否仍然存在
    let isFolderValid = false
    try {
      isFolderValid = await exists(found.path)
    } catch (e) {
      isFolderValid = false
    }

    if (!isFolderValid) {
      throw new Error(`无法切换：仓库本地文件夹已失效或被删除 (${found.path})`)
    }

    activeWorkspace.value = found
    found.lastAccessed = Date.now()
    
    await tauriSet('activeWorkspaceId', found.id)
    await tauriSet('workspaces', workspaces.value)
    
    // 同步设置系统旧有的依赖键名 workspacePath
    await tauriSet('workspacePath', found.path)
    
    // 清除旧仓库的选中文件夹状态，避免在新仓库中使用无效路径
    try {
      const articleStore = useArticleStore()
      articleStore.clearSelectedFolder()
      console.log('[Workspace] 已清除旧仓库的选中文件夹状态')
    } catch (e) {
      console.warn('[Workspace] 清除选中文件夹状态失败:', e)
    }
    
    // 断开旧的数据库连接，并重新初始化对应新仓库的各类数据表
    try {
      await closeDb()
      await initAllDatabases()
    } catch (e) {
      console.warn('切换仓库时重置数据库失败', e)
    }
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
