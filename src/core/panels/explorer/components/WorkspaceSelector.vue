<template>
  <div class="p-2 border-t border-border bg-sidebar/50">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" class="w-full justify-start px-2 py-1.5 h-auto overflow-hidden group">
          <div class="flex items-center gap-2 w-full">
            <div class="flex-shrink-0 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <FolderIcon class="w-4 h-4" />
            </div>
            <div class="flex-1 truncate text-sm font-medium text-left">
              {{ activeWorkspace?.name || t('workspace.selector.noWorkspace') }}
              <div class="text-[10px] text-muted-foreground truncate leading-tight mt-0.5" v-if="activeWorkspace">
                {{ activeWorkspace.path }}
              </div>
            </div>
            <ChevronUp class="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" class="w-[240px] p-2" side="top" :sideOffset="8">
        <DropdownMenuLabel class="text-xs text-muted-foreground">{{ t('workspace.selector.storedWorkspaces') }}</DropdownMenuLabel>
        
        <div class="max-h-[300px] overflow-y-auto mt-1 mb-2 space-y-1">
          <div 
            v-for="ws in workspaces" 
            :key="ws.id" 
            class="flex items-center justify-between group rounded-sm hover:bg-accent px-2 py-1.5 text-sm cursor-pointer"
            :class="{ 'bg-accent/50': ws.id === activeWorkspace?.id }"
            @click="handleSwitch(ws)"
          >
            <div class="flex flex-col flex-1 overflow-hidden min-w-0 pr-2">
              <div class="flex items-center gap-2 truncate">
                <Check v-if="ws.id === activeWorkspace?.id" class="w-3.5 h-3.5 flex-shrink-0" />
                <span v-else class="w-3.5 h-3.5 flex-shrink-0"></span>
                <span class="truncate font-medium">{{ ws.name }}</span>
              </div>
              <span class="text-[10px] text-muted-foreground truncate pl-5.5 ml-[22px]">{{ ws.path }}</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild @click.stop>
                <Button variant="ghost" size="icon" class="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal class="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-32">
                <DropdownMenuItem @click.stop="handleRenameClick(ws)">
                  <Edit2 class="w-4 h-4 mr-2" /> {{ t('workspace.selector.rename') }}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click.stop="handleRemove(ws)" class="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                  <Trash2 class="w-4 h-4 mr-2" /> {{ t('workspace.selector.removeRecord') }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem class="cursor-pointer" @click="handleCreateWorkspace">
          <div class="flex items-center gap-2 py-1 text-primary w-full">
            <PlusCircle class="w-4 h-4" />
            <span class="font-medium">{{ t('workspace.selector.addLocalWorkspace') }}</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- 重命名对话框 -->
    <Dialog v-model:open="renameDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('workspace.selector.renameTitle') }}</DialogTitle>
          <DialogDescription>
            {{ t('workspace.selector.renameDesc') }}
          </DialogDescription>
        </DialogHeader>
        <div class="flex items-center space-x-2">
          <div class="grid flex-1 gap-2">
            <Label htmlFor="wsName" class="sr-only">名称</Label>
            <Input id="wsName" v-model="renameInput" :placeholder="t('workspace.selector.inputNewName')" @keyup.enter="confirmRename" />
          </div>
        </div>
        <DialogFooter class="sm:justify-start mt-4">
          <Button type="button" @click="confirmRename" :disabled="!renameInput.trim()">
            {{ t('workspace.selector.save') }}
          </Button>
          <Button type="button" variant="secondary" @click="renameDialogOpen = false">
            {{ t('workspace.selector.cancel') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 新建仓库确认对话框 -->
    <Dialog v-model:open="createDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('workspace.selector.addTitle') }}</DialogTitle>
          <DialogDescription>
            {{ t('workspace.selector.addDesc') }}
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-2">
          <div class="space-y-2">
            <Label for="wsPath" class="text-xs text-muted-foreground">{{ t('workspace.selector.storagePath') }}</Label>
            <div class="text-xs bg-muted/50 p-2 rounded break-all border overflow-hidden">
              {{ pendingCreatePath }}
            </div>
          </div>
          <div class="space-y-2">
            <Label for="wsNewName">{{ t('workspace.selector.displayName') }}</Label>
            <Input id="wsNewName" v-model="pendingCreateName" :placeholder="t('workspace.selector.workspaceNamePlaceholder')" @keyup.enter="confirmCreate" />
          </div>
        </div>
        <DialogFooter class="sm:justify-start mt-2">
          <Button type="button" @click="confirmCreate" :disabled="!pendingCreateName.trim()">
            {{ t('workspace.selector.confirmAddAndSwitch') }}
          </Button>
          <Button type="button" variant="secondary" @click="createDialogOpen = false">
            {{ t('workspace.selector.cancel') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 移除确认对话框 -->
    <Dialog v-model:open="removeDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('workspace.selector.removeTitle') }}</DialogTitle>
          <DialogDescription>{{ t('workspace.selector.removeDesc') }}</DialogDescription>
        </DialogHeader>
        <div class="my-2 bg-destructive/10 p-3 rounded-md border border-destructive/20 text-destructive text-sm" v-if="pendingRemoveWs">
          <span class="font-medium px-1">{{ pendingRemoveWs.name }}</span>
          <br/><span class="text-xs opacity-70">{{ pendingRemoveWs.path }}</span>
        </div>
        <DialogFooter class="sm:justify-start mt-1">
          <Button type="button" variant="destructive" @click="confirmRemove">
            {{ t('workspace.selector.confirmRemove') }}
          </Button>
          <Button type="button" variant="outline" @click="removeDialogOpen = false">
            {{ t('workspace.selector.cancel') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FolderIcon, ChevronUp, PlusCircle, Check, MoreHorizontal, Edit2, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useWorkspaceStore, type WorkspaceItem } from '@/stores/workspace'
import { useArticleStore } from '@/stores/article'
import { useToast } from '@/composables/useToast'
import { open } from '@tauri-apps/plugin-dialog'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const workspaceStore = useWorkspaceStore()
const articleStore = useArticleStore()
const { show } = useToast()

const activeWorkspace = computed(() => workspaceStore.activeWorkspace)
const workspaces = computed(() => workspaceStore.workspaces)

const renameDialogOpen = ref(false)
const renameInput = ref('')
const currentEditingWs = ref<WorkspaceItem | null>(null)

// 创建弹窗状态
const createDialogOpen = ref(false)
const pendingCreatePath = ref('')
const pendingCreateName = ref('')

// 移除弹窗状态
const removeDialogOpen = ref(false)
const pendingRemoveWs = ref<WorkspaceItem | null>(null)

const handleCreateWorkspace = async () => {
  try {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      title: t('workspace.toast.selectNewFolder')
    })

    if (!selectedPath || typeof selectedPath !== 'string') return

    // 弹出自定义框填写并确认
    pendingCreatePath.value = selectedPath
    pendingCreateName.value = selectedPath.split(/[/\\]/).pop() || t('workspace.toast.unnamedWorkspace')
    createDialogOpen.value = true
  } catch (err: any) {
    show({ title: t('workspace.toast.pathSelectionFailed'), message: err.message, variant: 'error' })
  }
}

const confirmCreate = async () => {
  if (!pendingCreateName.value.trim()) return

  try {
    const newWs = await workspaceStore.addWorkspace(pendingCreatePath.value, pendingCreateName.value.trim())
    // 默认执行切换
    await handleSwitch(newWs)
    createDialogOpen.value = false
  } catch (err: any) {
    show({ title: t('workspace.toast.addFailed'), message: err.message, variant: 'error' })
  }
}

const handleSwitch = async (ws: WorkspaceItem) => {
  if (ws.id === activeWorkspace.value?.id) return
  
  try {
    await workspaceStore.switchWorkspace(ws.id)
    // 清理并重新加载目录
    articleStore.activeFilePath = ''
    articleStore.currentArticle = ''
    await articleStore.loadFileTree()
    show({ title: t('workspace.toast.switched'), message: ws.name, variant: 'success' })
  } catch (error: any) {
    show({ title: t('workspace.toast.switchFailed'), message: error.message, variant: 'error' })
  }
}

const handleRenameClick = (ws: WorkspaceItem) => {
  currentEditingWs.value = ws
  renameInput.value = ws.name
  renameDialogOpen.value = true
}

const confirmRename = async () => {
  if (!currentEditingWs.value || !renameInput.value.trim()) return
  
  await workspaceStore.renameWorkspace(currentEditingWs.value.id, renameInput.value.trim())
  renameDialogOpen.value = false
  currentEditingWs.value = null
  show({ title: t('workspace.toast.renameSuccessTitle'), message: t('workspace.toast.renameSuccessMsg'), variant: 'success' })
}

const handleRemove = (ws: WorkspaceItem) => {
  pendingRemoveWs.value = ws
  removeDialogOpen.value = true
}

const confirmRemove = async () => {
  if (!pendingRemoveWs.value) return
  
  const ws = pendingRemoveWs.value
  await workspaceStore.removeWorkspace(ws.id)
  show({ title: t('workspace.toast.recordRemoved'), message: ws.name, variant: 'success' })
  
  if (ws.id === activeWorkspace.value?.id) {
     // 如果移除的是当前正在使用的仓库，尝试重刷文件树（或者让他看到空文件夹）
     articleStore.activeFilePath = ''
     articleStore.currentArticle = ''
     articleStore.fileTree = []
     // 让WelcomeGuide可能捕获（需要页面重载或强制检查）
     window.location.reload()
  }
  
  removeDialogOpen.value = false
  pendingRemoveWs.value = null
}
</script>
