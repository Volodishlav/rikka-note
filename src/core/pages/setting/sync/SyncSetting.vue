<template>
  <div class="space-y-6">
    <!-- 标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-medium">{{ t('settings.sync.title') }}</h3>
        <p v-if="!isGitInited" class="text-xs text-orange-500 font-medium">
          {{ t('settings.sync.notInit') }}
        </p>
      </div>
      
      <Button v-if="!isGitInited" variant="outline" size="sm" :disabled="loading" @click="handleInitRepo" class="border-orange-200 text-orange-600 hover:bg-orange-50">
        <RefreshCw :class="['mr-2 h-4 w-4', loading ? 'animate-spin' : '']" />
        {{ t('settings.sync.initRepo') }}
      </Button>
    </div>

    <!-- 仓库配置 -->
    <div class="space-y-4 rounded-lg border p-4">
      <h4 class="text-sm font-semibold flex items-center gap-2">
        <Github class="h-4 w-4" />
        {{ t('settings.sync.config') }}
      </h4>
      
      <div class="grid gap-4">
        <div class="grid gap-2">
          <label class="text-xs font-medium">{{ t('settings.sync.remoteUrl') }}</label>
          <Input 
            v-model="config.remoteUrl" 
            :placeholder="t('settings.sync.remoteUrlPlaceholder')" 
          />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <label class="text-xs font-medium">{{ t('settings.sync.branch') }}</label>
            <Input 
              v-model="config.branch" 
              :placeholder="t('settings.sync.branchPlaceholder')" 
            />
          </div>
          <div class="grid gap-2">
            <label class="text-xs font-medium">{{ t('settings.sync.token') }}</label>
            <Input 
              v-model="config.token" 
              type="password"
              :placeholder="t('settings.sync.tokenPlaceholder')" 
            />
          </div>
        </div>

        <div class="grid gap-2">
          <label class="text-xs font-medium">{{ t('settings.sync.conflictStrategy') }}</label>
          <Select v-model="config.conflictStrategy">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="ours">
                  {{ t('settings.sync.ours') }}
                </SelectItem>
                <SelectItem value="theirs">
                  {{ t('settings.sync.theirs') }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <!-- 同步内容选择 -->
    <div class="space-y-4 rounded-lg border p-4">
      <h4 class="text-sm font-semibold">{{ t('settings.sync.content') }}</h4>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm">{{ t('settings.sync.syncNotes') }}</label>
          <Switch v-model="syncNotes" disabled /> <!-- 笔记同步是基础，默认开启 -->
        </div>
        <div class="flex items-center justify-between">
          <label class="text-sm">{{ t('settings.sync.syncDatabase') }}</label>
          <Switch v-model="syncDatabase" />
        </div>
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" :disabled="loading" @click="handlePull">
          <Download class="mr-2 h-4 w-4" />
          {{ t('settings.sync.pull') }}
        </Button>
        <Button variant="outline" :disabled="loading" @click="handlePush">
          <Upload class="mr-2 h-4 w-4" />
          {{ t('settings.sync.push') }}
        </Button>
        <Button :disabled="loading" @click="handleSyncAll" class="bg-brand-purple hover:bg-brand-purple/90 text-white">
          <RefreshCw :class="['mr-2 h-4 w-4', loading ? 'animate-spin' : '']" />
          {{ t('settings.sync.syncAll') }}
        </Button>
      </div>

      <!-- 初始化 Git (已移除底部卡片，移至标题旁) -->
    </div>

    <!-- 日志区域 -->
    <div v-if="syncLogs.length > 0" class="rounded-md bg-muted p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{{ t('settings.sync.status') }}</span>
        <Button variant="ghost" size="sm" class="h-6 px-2 text-xs" @click="syncLogs = []">清除</Button>
      </div>
      <div class="space-y-1 font-mono text-xs max-h-40 overflow-auto">
        <div v-for="(log, i) in syncLogs" :key="i" :class="log.type === 'error' ? 'text-destructive' : 'text-foreground'">
          [{{ log.time }}] {{ log.msg }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useWorkspaceStore } from '@/stores/workspace'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Github, RefreshCw, Upload, Download } from 'lucide-vue-next'
import { invoke } from '@tauri-apps/api/core'
import { tauriGet, tauriSet } from '@/utils/tauriStore'
import { toast } from '@/components/ui/toast'
import { exists, writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'

const { t } = useI18n()
const workspaceStore = useWorkspaceStore()

// 状态
const loading = ref(false)
const isGitInited = ref(true)
const syncNotes = ref(true)
const syncDatabase = ref(false)
const syncLogs = ref<{time: string, msg: string, type: 'info' | 'error'}[]>([])

const config = reactive({
  remoteUrl: '',
  branch: 'main',
  token: '',
  conflictStrategy: 'ours'
})

// 添加日志
const addLog = (msg: string, type: 'info' | 'error' = 'info') => {
  const time = new Date().toLocaleTimeString()
  syncLogs.value.unshift({ time, msg, type })
}

// 加载配置
const loadConfig = async () => {
  if (!workspaceStore.activeWorkspace) return
  console.log('[Sync] Loading config for workspace:', workspaceStore.activeWorkspace.id)
  const key = `sync_config_${workspaceStore.activeWorkspace.id}`
  const saved = await tauriGet(key)
  if (saved) {
    console.log('[Sync] Found saved config:', saved)
    Object.assign(config, saved)
  }
  
  const dbSyncKey = `sync_db_enabled_${workspaceStore.activeWorkspace.id}`
  syncDatabase.value = await tauriGet(dbSyncKey) || false
  
  // 检查是否初始化了 Git
  try {
    const gitPath = `${workspaceStore.activeWorkspace.path}/.git`
    isGitInited.value = await exists(gitPath)
    console.log('[Sync] Git-inited check:', isGitInited.value, 'at', gitPath)
  } catch (e) {
    console.warn('[Sync] Git-inited check failed:', e)
    isGitInited.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  if (!workspaceStore.activeWorkspace) return
  const key = `sync_config_${workspaceStore.activeWorkspace.id}`
  await tauriSet(key, { ...config })
}

watch(config, saveConfig, { deep: true })
watch(syncDatabase, async (val) => {
  if (!workspaceStore.activeWorkspace) return
  const key = `sync_db_enabled_${workspaceStore.activeWorkspace.id}`
  await tauriSet(key, val)
  await updateGitIgnore()
})

// 动态更新 .gitignore 以支持/忽略数据库
const updateGitIgnore = async () => {
  if (!workspaceStore.activeWorkspace) return
  const path = `${workspaceStore.activeWorkspace.path}/.gitignore`
  let content = ''
  try {
    if (await exists(path)) {
      content = await readTextFile(path)
    }
  } catch {}

  const dbPattern = '.rikka_note.db*'
  if (syncDatabase.value) {
    // 移除忽略模式（如果存在）
    content = content.split('\n').filter(line => !line.trim().startsWith(dbPattern)).join('\n')
  } else {
    // 添加忽略模式（如果不存在）
    if (!content.includes(dbPattern)) {
      content += `\n${dbPattern}\n`
    }
  }
  await writeTextFile(path, content.trim())
}

const handleInitRepo = async () => {
  if (!workspaceStore.activeWorkspace) return
  loading.value = true
  try {
    await invoke('git_init_repo', { 
      repoPath: workspaceStore.activeWorkspace.path,
      remoteUrl: config.remoteUrl || null
    })
    isGitInited.value = true
    addLog(t('settings.sync.initSuccess'))
    await updateGitIgnore()
  } catch (e: any) {
    addLog(e.toString(), 'error')
  } finally {
    loading.value = false
  }
}

const handlePull = async () => {
  if (!workspaceStore.activeWorkspace) return
  console.log('[Sync] Pulling with config:', JSON.stringify(config))
  loading.value = true
  addLog('开始拉取最新变更...')
  try {
    const res = await invoke('git_pull', { 
      repoPath: workspaceStore.activeWorkspace.path,
      config: { ...config }
    })
    addLog(res as string)
  } catch (e: any) {
    addLog(e.toString(), 'error')
  } finally {
    loading.value = false
  }
}

const handlePush = async () => {
  if (!workspaceStore.activeWorkspace) return
  console.log('[Sync] Pushing with config:', JSON.stringify(config))
  loading.value = true
  addLog('开始推送变更...')
  try {
    const res = await invoke('git_commit_and_push', { 
      repoPath: workspaceStore.activeWorkspace.path,
      config: { ...config },
      message: `Sync at ${new Date().toLocaleString()}`
    })
    addLog(res as string)
  } catch (e: any) {
    addLog(e.toString(), 'error')
  } finally {
    loading.value = false
  }
}

const handleSyncAll = async () => {
  await handlePull()
  await handlePush()
}

onMounted(loadConfig)
</script>
