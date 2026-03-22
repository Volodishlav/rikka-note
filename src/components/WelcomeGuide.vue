<template>
  <div v-if="isVisible" class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm text-foreground animate-in fade-in duration-300">
    <div class="relative max-w-md w-full p-8 shadow-2xl rounded-2xl bg-card border border-border text-center space-y-6">
      <Button variant="ghost" size="icon" class="absolute top-2 right-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted" @click="isVisible = false">
        <X class="w-4 h-4" />
      </Button>
      <div class="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mt-2">
        <FolderPlus class="w-8 h-8 text-primary" />
      </div>
      
      <h1 class="text-2xl font-bold tracking-tight">{{ t('workspace.guide.title') }}</h1>
      <p class="text-muted-foreground text-sm leading-relaxed">
        {{ t('workspace.guide.desc') }}
      </p>
      
      <div class="pt-4 flex flex-col gap-3">
        <Button size="lg" class="w-full font-semibold" @click="handleSelectFolder" :disabled="loading">
          <Loader2 v-if="loading" class="w-4 h-4 mr-2 animate-spin" />
          <FolderOpen v-else class="w-4 h-4 mr-2" />
          {{ loading ? t('workspace.guide.initializing') : t('workspace.guide.selectFolder') }}
        </Button>
      </div>

      <p v-if="errorMsg" class="text-sm text-destructive mt-4 transition-all">{{ errorMsg }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FolderPlus, FolderOpen, Loader2, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { open } from '@tauri-apps/plugin-dialog'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToast } from '@/composables/useToast'
import { useArticleStore } from '@/stores/article'
import { useI18n } from '@/hooks/useI18n'

const { t } = useI18n()
const isVisible = ref(false)
const loading = ref(false)
const errorMsg = ref('')

const workspaceStore = useWorkspaceStore()
const articleStore = useArticleStore()
const { show } = useToast()

const checkVisibility = async () => {
  await workspaceStore.initWorkspaceData()
  // 如果没有任何仓库，或者没有激活的主仓库，强制显示引导
  if (workspaceStore.workspaces.length === 0 || !workspaceStore.activeWorkspace) {
    isVisible.value = true
  } else {
    isVisible.value = false
    // 仓库可用，重刷文件树
    await articleStore.loadFileTree()
  }
}

// 供外部或自身暴露初始化入口
defineExpose({
  checkVisibility
})

const handleSelectFolder = async () => {
  try {
    errorMsg.value = ''
    
    // 打开目录选择对话框
    const selectedPath = await open({
      directory: true,
      multiple: false,
      title: t('workspace.toast.selectFolder')
    })

    if (!selectedPath || typeof selectedPath !== 'string') {
      return // 用户取消选择
    }

    loading.value = true

    // 截取最后一段作为默认名称
    const defaultName = selectedPath.split(/[/\\]/).pop() || t('workspace.toast.unnamedWorkspace')

    // 调用 store 处理
    const newWorkspace = await workspaceStore.addWorkspace(selectedPath, defaultName)
    await workspaceStore.switchWorkspace(newWorkspace.id)
    
    // 隐藏窗口
    isVisible.value = false
    show({ title: t('workspace.toast.initSuccessTitle'), message: t('workspace.toast.initSuccessMsg'), variant: 'success' })
    
    // 通知文章 store 或其余组件刷新
    await articleStore.loadFileTree()

  } catch (err: any) {
    console.error(err)
    errorMsg.value = err.message || t('workspace.toast.initFailedMsg')
    show({ title: t('workspace.toast.initFailedTitle'), message: errorMsg.value, variant: 'error' })
  } finally {
    loading.value = false
  }
}
</script>
