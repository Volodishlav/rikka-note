<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="space-y-0.5">
        <h3 class="text-xl font-semibold tracking-tight">{{ t('settings.local.title') }}</h3>
        <p class="text-sm text-muted-foreground">
          {{ t('settings.rag.localModelDesc') }}
        </p>
      </div>
      <div class="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-full border">
        <input 
          type="checkbox" 
          id="local-model-switch" 
          class="w-4 h-4 text-primary rounded border-input focus:ring-primary cursor-pointer"
          :checked="settingStore.useLocalEmbedding" 
          @change="(e) => handleSwitchChange((e.target as HTMLInputElement).checked)" 
        />
        <label for="local-model-switch" class="text-sm font-medium leading-none cursor-pointer">
          {{ t('settings.rag.localModelEnabled') }}
        </label>
      </div>
    </div>

    <div v-if="settingStore.useLocalEmbedding" class="space-y-6 pt-6 border-t animate-in fade-in slide-in-from-top-2 duration-300">
      <div class="grid gap-6 md:grid-cols-2">
        <!-- 模型选择 -->
        <div class="space-y-4 p-4 border rounded-xl bg-card">
          <div class="flex items-center gap-2 font-medium">
            <Bot class="w-4 h-4 text-primary" />
            {{ t('settings.rag.presetModel') }}
          </div>
          <Select v-model="selectedModel" @update:model-value="onModelSelect">
            <SelectTrigger>
              <SelectValue placeholder="选择预设模型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="m in presetModels" :key="m.filename" :value="m.filename">
                {{ m.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          
          <div class="space-y-2">
            <Label class="text-xs uppercase text-muted-foreground">{{ t('settings.rag.modelFile') }}</Label>
            <Input v-model="modelFilename" placeholder="model.gguf" :disabled="isDownloading" />
          </div>
        </div>

        <!-- 配置项 -->
        <div class="space-y-4 p-4 border rounded-xl bg-card">
           <div class="flex items-center gap-2 font-medium">
            <Settings2 class="w-4 h-4 text-primary" />
            配置参数
          </div>
          <div class="space-y-2">
            <Label class="text-xs uppercase text-muted-foreground">{{ t('settings.rag.customUrl') }}</Label>
            <Input v-model="customUrl" placeholder="https://..." :disabled="isDownloading" />
          </div>
          <div class="space-y-2">
            <Label class="text-xs uppercase text-muted-foreground">{{ t('settings.rag.localPort') }}</Label>
            <Input type="number" v-model="localPort" @change="updatePort" :disabled="isServerRunning" />
          </div>
        </div>
      </div>

      <!-- 进度条 -->
      <div v-if="isDownloading" class="space-y-2 p-4 border rounded-xl bg-muted/30">
        <div class="flex justify-between text-sm">
          <span class="flex items-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-primary" />
            {{ t('settings.rag.downloading') }}
          </span>
          <span v-if="downloadTotal > 0" class="font-mono text-xs">
            {{ (downloadedBytes / 1024 / 1024).toFixed(2) }} MB / {{ (downloadTotal / 1024 / 1024).toFixed(2) }} MB
          </span>
        </div>
        <div class="w-full h-2 bg-muted rounded-full overflow-hidden border">
          <div class="h-full bg-primary transition-all duration-300" :style="{ width: `${downloadProgress}%` }"></div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-3 p-4 border rounded-xl bg-card">
        <Button variant="outline" @click="checkLocalFile(true)" :disabled="isDownloading || !modelFilename">
          <RefreshCw class="w-4 h-4 mr-2" /> {{ t('settings.rag.checkFile') }}
        </Button>
        <Button @click="downloadModel" :disabled="isDownloading || isFileExists || !customUrl || !modelFilename">
          <Download class="w-4 h-4 mr-2" /> 
          {{ isFileExists ? t('settings.rag.fileExist') : t('settings.rag.oneClickDownload') }}
        </Button>
        
        <div class="flex-1"></div>
        
        <Button v-if="!isServerRunning" variant="default" @click="startServer" :disabled="!isFileExists || isStarting" class="bg-green-600 hover:bg-green-700 text-white">
          <Play class="w-4 h-4 mr-2 fill-current" /> {{ isStarting ? t('settings.rag.starting') : t('settings.rag.startServer') }}
        </Button>
        <Button v-else variant="destructive" @click="stopServer">
          <Square class="w-4 h-4 mr-2 fill-current" /> {{ t('settings.rag.stopServer') }}
        </Button>
      </div>
      
      <div v-if="isServerRunning" class="p-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        {{ t('settings.rag.connected') }}: http://127.0.0.1:{{ localPort }}/v1/embeddings
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useSettingStore } from '@/stores/setting'
import { useI18n } from '@/hooks/useI18n'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast/use-toast'
import { Download, Play, Square, RefreshCw, Bot, Settings2, Loader2 } from 'lucide-vue-next'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { logger } from '@/utils/logger'

const { t } = useI18n()
const settingStore = useSettingStore()

const localPort = ref(8080)
const selectedModel = ref('qwen3-embedding-0.6b-q8_0.gguf')
const customUrl = ref('https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/main/qwen3-embedding-0.6b-q8_0.gguf')
const modelFilename = ref('qwen3-embedding-0.6b-q8_0.gguf')

const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadedBytes = ref(0)
const downloadTotal = ref(0)
const isFileExists = ref(false)
const isServerRunning = ref(false)
const isStarting = ref(false)

let unlistenProgress: any = null

const presetModels = [
  {
    name: 'Qwen3-Embedding-0.6B (首选推荐)',
    filename: 'qwen3-embedding-0.6b-q8_0.gguf',
    url: 'https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/main/Qwen3-Embedding-0.6B-Q8_0.gguf'
  },
  {
    name: 'bce-embedding-base_v1 (备选)',
    filename: 'bce-embedding-base_v1-q8_0.gguf',
    url: 'https://huggingface.co/netease-youdao/bce-embedding-base_v1-GGUF/resolve/main/bce-embedding-base_v1-q8_0.gguf'
  }
]

onMounted(async () => {
  localPort.value = settingStore.localEmbeddingPort || 8080
  
  if (settingStore.localEmbeddingModelStr) {
    modelFilename.value = settingStore.localEmbeddingModelStr
    selectedModel.value = modelFilename.value
    const preset = presetModels.find(m => m.filename === modelFilename.value)
    if (preset) {
       customUrl.value = preset.url
    }
  }

  await checkLocalFile()

  unlistenProgress = await listen('model-download-progress', (event: any) => {
    const payload = event.payload as { filename: string, downloaded: number, total: number }
    if (payload.filename === modelFilename.value) {
       downloadedBytes.value = payload.downloaded
       downloadTotal.value = payload.total || 1
       downloadProgress.value = (downloadedBytes.value / downloadTotal.value) * 100
       
       if (payload.downloaded >= payload.total) {
         isDownloading.value = false
         isFileExists.value = true
         downloadProgress.value = 100
         toast({ title: t('settings.rag.downloadComplete'), description: `${modelFilename.value} ${t('settings.rag.downloadSuccess')}` })
       }
    }
  })
})

onUnmounted(() => {
  if (unlistenProgress) {
    unlistenProgress()
  }
})

const handleSwitchChange = async (val: boolean) => {
  await settingStore.setUseLocalEmbedding(val)
  if (val) {
     toast({ description: t('settings.rag.localPriorityEnabled') })
     await checkLocalFile()
  } else {
     toast({ description: t('settings.rag.cloudFallback') })
  }
}

const updatePort = async () => {
  const p = Number(localPort.value)
  if (p > 0 && p < 65536) {
    await settingStore.setLocalEmbeddingPort(p)
  }
}

const onModelSelect = (val: string) => {
  const item = presetModels.find(m => m.filename === val)
  if (item) {
    customUrl.value = item.url
    modelFilename.value = item.filename
  }
}

watch(modelFilename, async (newVal: string) => {
  if (newVal) {
    await settingStore.setLocalEmbeddingModelStr(newVal)
    await checkLocalFile()
  }
})

const checkLocalFile = async (showToast: boolean = false) => {
  if (!modelFilename.value) return
  try {
    const exists = await invoke<boolean>('check_model_exists', { filename: modelFilename.value })
    isFileExists.value = exists
    if (showToast) {
      if (exists) {
        toast({ description: t('settings.rag.fileExist') })
      } else {
        toast({ variant: 'destructive', description: t('settings.rag.fileNotExist') })
      }
    }
  } catch(e) {
    if (showToast) {
      toast({ variant: 'destructive', description: `${e}` })
    }
  }
}

const downloadModel = async () => {
  if (!customUrl.value || !modelFilename.value) return
  isDownloading.value = true
  downloadProgress.value = 0
  downloadedBytes.value = 0
  
  try {
    logger.ai.info('Starting model download:', { url: customUrl.value, filename: modelFilename.value })
    await invoke<string>('download_local_model', { url: customUrl.value, filename: modelFilename.value })
    isFileExists.value = true
    logger.ai.info('Model download started/scheduled successfuly')
  } catch (e: any) {
    logger.ai.error('Model download failed:', e)
    toast({ variant: 'destructive', description: `下载失败: ${e}` })
    isDownloading.value = false
  }
}

const startServer = async () => {
  isStarting.value = true
  try {
    logger.ai.info('Starting llama server:', { model: modelFilename.value, port: localPort.value })
    await invoke<string>('start_llama_server', {
       modelFilename: modelFilename.value,
       port: Number(localPort.value)
    })
    isServerRunning.value = true
    logger.ai.info('Llama server started successfully')
    toast({ description: t('settings.rag.serverStarted') })
  } catch(e: any) {
    logger.ai.error('Failed to start llama server:', e)
    toast({ variant: 'destructive', description: `启动失败: ${e}` })
  } finally {
    isStarting.value = false
  }
}

const stopServer = async () => {
  try {
    await invoke<string>('stop_llama_server')
    isServerRunning.value = false
    toast({ description: t('settings.rag.serverStopped') })
  } catch(e) {
    logger.ai.error('Stop err', e)
  }
}
</script>
