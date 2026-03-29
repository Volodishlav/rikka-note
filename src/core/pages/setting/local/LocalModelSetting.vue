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
          @change="onSwitchChange" 
        />
        <label for="local-model-switch" class="text-sm font-medium leading-none cursor-pointer">
          {{ t('settings.rag.localModelEnabled') }}
        </label>
      </div>
    </div>

    <!-- 顶层提示，告诉用户当前的状态含义 -->
    <div v-if="settingStore.useLocalEmbedding && isEngineExists && !isServerRunning" class="p-3 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-sm flex items-center gap-2 animate-in fade-in">
      <div class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
      {{ t('settings.rag.engineNotStartedWarning') }}
    </div>

    <div v-if="settingStore.useLocalEmbedding" class="space-y-6 pt-6 border-t animate-in fade-in slide-in-from-top-2 duration-300">
      
      <div class="grid gap-6 md:grid-cols-2">
        <!-- 引擎选择 -->
        <div class="space-y-4 p-4 border rounded-xl bg-card">
          <div class="flex items-center gap-2 font-medium">
            <Cpu class="w-4 h-4 text-primary" />
            {{ t('settings.rag.engineTitle') }}
          </div>
          <div class="space-y-2">
            <Label class="text-xs uppercase text-muted-foreground">{{ t('settings.rag.engineVersion') }}</Label>
            <Select :model-value="selectedEngineName" @update:model-value="selectedEngineName = $event as string">
              <SelectTrigger>
                <SelectValue :placeholder="t('settings.rag.selectEngineVersion')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="e in engineOptions" :key="e.name" :value="e.name">
                  {{ e.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <div v-if="detectedGpu" class="text-xs text-muted-foreground mt-1 text-green-600/80">
              <CheckCircle2 class="w-3 h-3 inline-block mr-1 mb-[2px]" /> 
              {{ t('settings.rag.gpuDetectedRecommend', { gpu: detectedGpu }) }}
            </div>
          </div>
          
          <div class="pt-2">
            <Button @click="downloadEngine" :disabled="isEngineDownloading || isEngineExists" variant="secondary" class="w-full">
              <Download class="w-4 h-4 mr-2" /> 
              {{ isEngineExists ? t('settings.rag.engineReady') : t('settings.rag.downloadAndConfigEngine') }}
            </Button>
            <div class="flex justify-end mt-2">
               <Button variant="ghost" size="sm" @click="checkLocalLlama(true)" :disabled="isEngineDownloading" class="h-6 text-xs text-muted-foreground w-full flex">
                 <RefreshCw class="w-3 h-3 mr-1" /> {{ t('settings.rag.testEnvironment') }}
               </Button>
            </div>
          </div>
        </div>

        <!-- 模型选择 -->
        <div class="space-y-4 p-4 border rounded-xl bg-card relative">
          <div class="flex items-center gap-2 font-medium">
            <Bot class="w-4 h-4 text-primary" />
            {{ t('settings.rag.dataModel') }}
          </div>
          <div class="space-y-2">
            <Label class="text-xs uppercase text-muted-foreground">{{ t('settings.rag.presetModel') }}</Label>
            <Select :model-value="selectedModel" @update:model-value="onModelSelect">
              <SelectTrigger>
                <SelectValue placeholder="选择预设模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in presetModels" :key="m.filename" :value="m.filename">
                  {{ m.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="pt-2">
             <Button @click="downloadModel" :disabled="isDownloading || isFileExists || !customUrl || !modelFilename" variant="secondary" class="w-full">
              <Download class="w-4 h-4 mr-2" /> 
              {{ isFileExists ? t('settings.rag.fileExist') : t('settings.rag.downloadAndConfigModel') }}
            </Button>
            <div class="flex justify-end mt-2">
               <Button variant="ghost" size="sm" @click="checkLocalFile(true)" :disabled="isDownloading || !modelFilename" class="h-6 text-xs text-muted-foreground w-full flex">
                 <RefreshCw class="w-3 h-3 mr-1" /> {{ t('settings.rag.testModelFile') }}
               </Button>
            </div>
          </div>
        </div>

      </div>

      <!-- 专家配置项 -->
      <div class="space-y-4 p-4 border rounded-xl bg-card">
        <div class="flex items-center gap-2 font-medium">
          <Settings2 class="w-4 h-4 text-primary" />
          {{ t('settings.rag.advancedParams') }}
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label class="text-xs uppercase text-muted-foreground">{{ t('settings.rag.customUrl') }}</Label>
            <Input v-model="customUrl" placeholder="https://..." :disabled="isDownloading" />
          </div>
          <div class="space-y-2">
            <Label class="text-xs uppercase text-muted-foreground">{{ t('settings.rag.modelFile') }}</Label>
            <Input v-model="modelFilename" placeholder="model.gguf" :disabled="isDownloading" />
          </div>
          <div class="space-y-2">
            <Label class="text-xs uppercase text-muted-foreground">{{ t('settings.rag.localPort') }}</Label>
            <Input type="number" v-model="localPort" @change="updatePort" :disabled="isServerRunning" />
          </div>
        </div>
      </div>

      <!-- 引擎进度条 -->
      <div v-if="isEngineDownloading" class="space-y-2 p-4 border rounded-xl bg-muted/30">
        <div class="flex justify-between text-sm">
          <span class="flex items-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-primary" />
            下载引擎中: {{ currentDownloadingEngineFile }}
          </span>
          <span v-if="engineDownloadTotal > 0" class="font-mono text-xs">
            {{ (engineDownloadedBytes / 1024 / 1024).toFixed(2) }} MB / {{ (engineDownloadTotal / 1024 / 1024).toFixed(2) }} MB
          </span>
        </div>
        <div class="w-full h-2 bg-muted rounded-full overflow-hidden border">
          <div class="h-full bg-primary transition-all duration-300" :style="{ width: `${engineDownloadProgress}%` }"></div>
        </div>
      </div>

      <!-- 模型进度条 -->
      <div v-if="isDownloading" class="space-y-2 p-4 border rounded-xl bg-muted/30">
        <div class="flex justify-between text-sm">
          <span class="flex items-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-primary" />
            {{ t('settings.rag.downloading') }} (预估体积较大，请耐心等待)
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
      <div class="flex items-center justify-end gap-3 p-4 border rounded-xl bg-card">
        <Button v-if="!isServerRunning" variant="default" @click="startServer" :disabled="!isFileExists || !isEngineExists || isStarting" class="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto">
          <Play class="w-4 h-4 mr-2 fill-current" /> {{ isStarting ? t('settings.rag.starting') : t('settings.rag.startServer') }}
        </Button>
        <Button v-else variant="destructive" @click="stopServer" class="w-full md:w-auto">
          <Square class="w-4 h-4 mr-2 fill-current" /> {{ t('settings.rag.stopServer') }}
        </Button>
      </div>
      
      <div v-if="!isEngineExists && !isServerRunning" class="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
        {{ t('settings.rag.engineNotDetectedWarning') }}
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
import { Download, Play, Square, RefreshCw, Bot, Settings2, Loader2, Cpu } from 'lucide-vue-next'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { logger } from '@/utils/logger'

const { t } = useI18n()
const settingStore = useSettingStore()

const localPort = ref(8080)
const selectedModel = ref('qwen3-embedding-0.6b-q8_0.gguf')
const customUrl = ref('https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/main/qwen3-embedding-0.6b-q8_0.gguf')
const modelFilename = ref('qwen3-embedding-0.6b-q8_0.gguf')

// Engine state
const selectedEngineName = ref('Windows x64 (CUDA 12.4) [Default]')
const isEngineDownloading = ref(false)
const engineDownloadProgress = ref(0)
const engineDownloadedBytes = ref(0)
const engineDownloadTotal = ref(0)
const currentDownloadingEngineFile = ref('')
const isEngineExists = ref(false)

// Model state
const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadedBytes = ref(0)
const downloadTotal = ref(0)
const isFileExists = ref(false)
const isServerRunning = ref(false)
const isStarting = ref(false)
const detectedGpu = ref('')

interface ModelDownloadPayload {
  filename: string
  downloaded: number
  total: number
}

let unlistenProgress: (() => void) | null = null
let unlistenEngineProgress: (() => void) | null = null
let statusInterval: any = null

const engineOptions = [
  {
    name: 'Windows x64 (CPU - Default)',
    urls: ['https://github.com/ggml-org/llama.cpp/releases/download/b8575/llama-b8575-bin-win-cpu-x64.zip']
  },
  {
    name: 'Windows x64 (CUDA 12.4) [Default]',
    urls: [
      'https://github.com/ggml-org/llama.cpp/releases/download/b8575/llama-b8575-bin-win-cuda-12.4-x64.zip',
      'https://github.com/ggml-org/llama.cpp/releases/download/b8575/cudart-llama-bin-win-cuda-12.4-x64.zip'
    ]
  },
  {
    name: 'Windows x64 (CUDA 13.1)',
    urls: [
      'https://github.com/ggml-org/llama.cpp/releases/download/b8575/llama-b8575-bin-win-cuda-13.1-x64.zip',
      'https://github.com/ggml-org/llama.cpp/releases/download/b8575/cudart-llama-bin-win-cuda-13.1-x64.zip'
    ]
  },
  {
    name: 'Windows x64 (Vulkan)',
    urls: ['https://github.com/ggml-org/llama.cpp/releases/download/b8575/llama-b8575-bin-win-vulkan-x64.zip']
  },
  {
    name: 'Windows x64 (SYCL)',
    urls: ['https://github.com/ggml-org/llama.cpp/releases/download/b8575/llama-b8575-bin-win-sycl-x64.zip']
  },
  {
    name: 'Windows x64 (HIP Radeon)',
    urls: ['https://github.com/ggml-org/llama.cpp/releases/download/b8575/llama-b8575-bin-win-hip-radeon-x64.zip']
  },
  {
    name: 'Windows ARM64',
    urls: ['https://github.com/ggml-org/llama.cpp/releases/download/b8575/llama-b8575-bin-win-cpu-arm64.zip']
  }
]

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

  await probeGpuAndRecommend()
  await checkLocalFile()
  await checkLocalLlama()
  await checkServerStatus()

  // 轮询服务状态，解决跨页面生命周期UI不同步问题
  statusInterval = setInterval(checkServerStatus, 3000)

  unlistenProgress = await listen<ModelDownloadPayload>('model-download-progress', (event) => {
    const payload = event.payload
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

  unlistenEngineProgress = await listen<ModelDownloadPayload>('engine-download-progress', (event) => {
    const payload = event.payload
    currentDownloadingEngineFile.value = payload.filename
    engineDownloadedBytes.value = payload.downloaded
    engineDownloadTotal.value = payload.total || 1
    engineDownloadProgress.value = (engineDownloadedBytes.value / engineDownloadTotal.value) * 100
  })
})

onUnmounted(() => {
  if (unlistenProgress) {
    unlistenProgress()
  }
  if (unlistenEngineProgress) {
    unlistenEngineProgress()
  }
  if (statusInterval) {
    clearInterval(statusInterval)
  }
})

const handleSwitchChange = async (val: boolean) => {
  await settingStore.setUseLocalEmbedding(val)
  if (val) {
     toast({ description: t('settings.rag.localPriorityEnabled') })
     await checkLocalFile()
     await checkLocalLlama()
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

const onSwitchChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  handleSwitchChange(target.checked)
}

const onModelSelect = (val: any) => {
  if (val === null || val === undefined || typeof val === 'boolean') return
  const filename = val.toString()
  const item = presetModels.find(m => m.filename === filename)
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

const probeGpuAndRecommend = async () => {
  try {
    const gpus = await invoke<string[]>('get_system_gpu_info')
    if (gpus && gpus.length > 0) {
      let primary = gpus.find(g => g.toUpperCase().includes('NVIDIA'))
      if (!primary) primary = gpus.find(g => g.toUpperCase().includes('AMD') || g.toUpperCase().includes('RADEON'))
      if (!primary) primary = gpus[0]

      detectedGpu.value = primary

      const upper = primary.toUpperCase()
      if (upper.includes('NVIDIA')) {
        selectedEngineName.value = 'Windows x64 (CUDA 12.4) [Default]'
      } else if (upper.includes('AMD') || upper.includes('RADEON')) {
        selectedEngineName.value = 'Windows x64 (Vulkan)'
      } else {
        selectedEngineName.value = 'Windows x64 (CPU - Default)'
      }
    }
  } catch (e) {
    logger.ai.error('Failed to probe GPU info', e)
  }
}

const checkServerStatus = async () => {
  try {
    const isRunning = await invoke<boolean>('check_llama_server_status')
    isServerRunning.value = isRunning
  } catch(e) {
    isServerRunning.value = false
  }
}

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

const checkLocalLlama = async (showToast: boolean = false) => {
  try {
    const exists = await invoke<boolean>('check_llama_engine_exists')
    isEngineExists.value = exists
    if (showToast) {
      if (exists) {
        toast({ description: t('settings.rag.engineReadyToast') })
      } else {
        toast({ variant: 'destructive', description: t('settings.rag.engineNotFoundToast') })
      }
    }
  } catch(e) {
    if (showToast) {
      toast({ variant: 'destructive', description: `${e}` })
    }
  }
}

const downloadEngine = async () => {
  const targetEngine = engineOptions.find(e => e.name === selectedEngineName.value)
  if (!targetEngine) return

  isEngineDownloading.value = true
  engineDownloadProgress.value = 0
  engineDownloadedBytes.value = 0
  currentDownloadingEngineFile.value = '即将开始...'
  
  try {
    logger.ai.info('Starting engine download:', { urls: targetEngine.urls })
    toast({ title: t('settings.rag.engineDownloadStartToast'), description: t('settings.rag.engineDownloadStartDesc') })
    await invoke<string>('download_and_extract_llama_cpp', { urls: targetEngine.urls })
    isEngineExists.value = true
    logger.ai.info('Engine download & extraction successful')
    toast({ title: t('settings.rag.engineDownloadSuccessToast'), description: t('settings.rag.engineDownloadSuccessDesc') })
  } catch (e: any) {
    logger.ai.error('Engine download failed:', e)
    toast({ variant: 'destructive', title: t('settings.rag.configFailed'), description: `${e}` })
  } finally {
    isEngineDownloading.value = false
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
  } finally {
    isDownloading.value = false
  }
}

let unlistenReady: (() => void) | null = null
let unlistenError: (() => void) | null = null

const startServer = async () => {
  isStarting.value = true
  try {
    logger.ai.info('Starting llama server:', { model: modelFilename.value, port: localPort.value })
    
    unlistenReady = await listen('llama-server-ready', () => {
      isServerRunning.value = true
      isStarting.value = false
      logger.ai.info('Llama server ready signal received')
      toast({ description: t('settings.rag.serverStarted') })
      if (unlistenReady) { unlistenReady(); unlistenReady = null }
      if (unlistenError) { unlistenError(); unlistenError = null }
    })
    
    unlistenError = await listen('llama-server-error', (event: any) => {
       isStarting.value = false
       toast({ variant: 'destructive', description: `引擎装载异常: ${event.payload}` })
       logger.ai.error('Llama server load error:', event.payload)
       if (unlistenReady) { unlistenReady(); unlistenReady = null }
       if (unlistenError) { unlistenError(); unlistenError = null }
    })

    await invoke<string>('start_llama_server', {
       modelFilename: modelFilename.value,
       port: Number(localPort.value)
    })
    // NOTE: UI state is updated only through the event listeners or checkServerStatus polling now
  } catch(e: any) {
    logger.ai.error('Failed to start llama server:', e)
    toast({ variant: 'destructive', description: `启动失败: ${e}` })
    isStarting.value = false
    if (unlistenReady) { unlistenReady(); unlistenReady = null }
    if (unlistenError) { unlistenError(); unlistenError = null }
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
