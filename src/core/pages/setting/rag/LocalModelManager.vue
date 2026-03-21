<template>
  <div class="space-y-4 rounded-md border p-4 bg-muted/20">
    <div class="flex items-center justify-between">
      <div class="space-y-0.5">
        <h3 class="text-base font-medium">{{ t('settings.rag.localModelTitle') || '本地Embedding模型 (半本地化)' }}</h3>
        <p class="text-sm text-muted-foreground">
          使用本地 llama.cpp 运行 embedding 模型，节省 API 费用并提高隐私性。
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <input 
          type="checkbox" 
          id="local-model-switch" 
          class="w-4 h-4 text-primary rounded border-input focus:ring-primary"
          :checked="settingStore.useLocalEmbedding" 
          @change="(e) => handleSwitchChange((e.target as HTMLInputElement).checked)" 
        />
        <label for="local-model-switch" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          启用
        </label>
      </div>
    </div>

    <div v-if="settingStore.useLocalEmbedding" class="space-y-4 pt-4 border-t">
      <!-- 选择预设模型 -->
      <div class="space-y-2">
        <Label>预设推荐模型 (GGUF)</Label>
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
      </div>

      <!-- 或者自定义 URL -->
      <div class="space-y-2">
        <Label>模型下载链接 (例如 HuggingFace 直链)</Label>
        <Input v-model="customUrl" placeholder="https://..." :disabled="isDownloading" />
      </div>

      <div class="space-y-2">
        <Label>保存的文件名</Label>
        <Input v-model="modelFilename" placeholder="model.gguf" :disabled="isDownloading" />
      </div>
      
      <div class="space-y-2">
        <Label>运行端口</Label>
        <Input type="number" v-model="localPort" @change="updatePort" :disabled="isServerRunning" />
      </div>

      <!-- 进度条 -->
      <div v-if="isDownloading" class="space-y-1">
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>下载中...</span>
          <span v-if="downloadTotal > 0">{{ (downloadedBytes / 1024 / 1024).toFixed(2) }} MB / {{ (downloadTotal / 1024 / 1024).toFixed(2) }} MB</span>
        </div>
        <progress class="w-full h-2 rounded overflow-hidden" :value="downloadedBytes" :max="downloadTotal || 100" />
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-2 pt-2">
        <Button size="sm" variant="outline" @click="checkLocalFile" :disabled="isDownloading || !modelFilename">
          <RefreshCw class="w-4 h-4 mr-2" /> 检测文件
        </Button>
        <Button size="sm" @click="downloadModel" :disabled="isDownloading || isFileExists || !customUrl || !modelFilename">
          <Download class="w-4 h-4 mr-2" /> 
          {{ isFileExists ? '此文件已存在' : '一键下载' }}
        </Button>
        
        <div class="flex-1"></div>
        
        <Button v-if="!isServerRunning" size="sm" variant="default" @click="startServer" :disabled="!isFileExists || isStarting">
          <Play class="w-4 h-4 mr-2 text-green-500" /> {{ isStarting ? '启动中...' : '启动服务' }}
        </Button>
        <Button v-else size="sm" variant="destructive" @click="stopServer">
          <Square class="w-4 h-4 mr-2" /> 停止服务
        </Button>
      </div>
      
      <div v-if="isServerRunning" class="text-xs text-green-600 font-medium">
        已连接: http://127.0.0.1:{{ localPort }}/v1/embeddings
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
import { Download, Play, Square, RefreshCw } from 'lucide-vue-next'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

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
    url: 'https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/main/qwen3-embedding-0.6b-q8_0.gguf'
  },
  {
    name: 'bce-embedding-base_v1 (备选)',
    filename: 'bce-embedding-base_v1-q8_0.gguf',
    url: 'https://huggingface.co/netease-youdao/bce-embedding-base_v1-GGUF/resolve/main/bce-embedding-base_v1-q8_0.gguf' // 假设链接
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
    const payload = event.payload
    if (payload.filename === modelFilename.value) {
       downloadedBytes.value = payload.downloaded
       downloadTotal.value = payload.total || 1
       downloadProgress.value = (downloadedBytes.value / downloadTotal.value) * 100
       
       if (payload.downloaded >= payload.total) {
         isDownloading.value = false
         isFileExists.value = true
         downloadProgress.value = 100
         toast({ title: '下载完成', description: `${modelFilename.value} 已成功下载。` })
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
     console.log('=== [DEBUG] 启用了本地模型开关 ===')
     toast({ description: '已开启本地模型优先' })
     await checkLocalFile()
  } else {
     toast({ description: '已切换回云端模型' })
  }
}

const updatePort = async () => {
  const p = Number(localPort.value)
  if (p > 0 && p < 65536) {
    await settingStore.setLocalEmbeddingPort(p)
  }
}

const onModelSelect = (val: any) => {
  const item = presetModels.find(m => m.filename === val)
  if (item) {
    customUrl.value = item.url
    modelFilename.value = item.filename
  }
}

watch(modelFilename, async (newVal) => {
  if (newVal) {
    await settingStore.setLocalEmbeddingModelStr(newVal)
    await checkLocalFile()
  }
})

const checkLocalFile = async () => {
  if (!modelFilename.value) return
  try {
    const exists = await invoke<boolean>('check_model_exists', { filename: modelFilename.value })
    isFileExists.value = exists
    console.log(`=== [DEBUG] Check file ${modelFilename.value}: exists=${exists}`)
  } catch(e) {
    console.error('Check file err', e)
  }
}

const downloadModel = async () => {
  if (!customUrl.value || !modelFilename.value) return
  isDownloading.value = true
  downloadProgress.value = 0
  downloadedBytes.value = 0
  console.log(`=== [DEBUG] Start downloading ${customUrl.value} -> ${modelFilename.value}`)
  
  try {
    const res = await invoke<string>('download_local_model', { url: customUrl.value, filename: modelFilename.value })
    console.log(`=== [DEBUG] Download ok -> ${res}`)
    isFileExists.value = true
  } catch (e: any) {
    console.error('Download err', e)
    toast({ variant: 'destructive', description: `下载失败: ${e}` })
    isDownloading.value = false
  }
}

const startServer = async () => {
  isStarting.value = true
  console.log(`=== [DEBUG] Start llama-server port=${localPort.value} model=${modelFilename.value} ===`)
  try {
    const res = await invoke<string>('start_llama_server', {
       modelFilename: modelFilename.value,
       port: Number(localPort.value)
    })
    console.log(`=== [DEBUG] Server started: ${res} ===`)
    isServerRunning.value = true
    toast({ description: '服务已成功启动', variant: 'success' })
  } catch(e: any) {
    console.error('Start server failed', e)
    toast({ variant: 'destructive', description: `启动失败: ${e}` })
  } finally {
    isStarting.value = false
  }
}

const stopServer = async () => {
  console.log(`=== [DEBUG] Stop llama-server ===`)
  try {
    await invoke<string>('stop_llama_server')
    isServerRunning.value = false
    toast({ description: '服务已停止' })
  } catch(e) {
    console.error('Stop err', e)
  }
}
</script>
