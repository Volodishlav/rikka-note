<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h3 class="text-lg font-medium">{{ t('settings.ai.title') }}</h3>
      <p class="text-sm text-muted-foreground">{{ t('settings.ai.desc') }}</p>
    </div>

    <!-- Default Models Section -->
    <DefaultModels />

    <div class="flex items-center gap-4">
      <Button @click="createNewConfig">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('settings.ai.addModel') }}
      </Button>
    </div>

    <div v-if="currentConfig" class="border rounded-lg p-4 space-y-6">
      <!-- Select Config / Delete / Copy -->
      <div class="flex items-center gap-2">
        <div class="flex-1">
          <Select v-model="currentConfigKey">
            <SelectTrigger>
              <div class="flex items-center gap-2">
                 <AiCheck :config="currentConfig" :key="currentConfig.key" />
                 <SelectValue :placeholder="t('settings.ai.modelConfigTitle')" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="config in userCustomModels" :key="config.key" :value="config.key">
                {{ config.title }} <span v-if="config.model">({{ config.model }})</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="icon" @click="copyConfig" :title="t('settings.ai.copyConfig')">
          <Copy class="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="icon" @click="deleteConfig" :title="t('settings.ai.deleteCustomModel')">
          <Trash class="h-4 w-4" />
        </Button>
      </div>

      <!-- Fields -->
      <div class="space-y-4">
        <!-- Title -->
        <div class="grid gap-2">
          <label class="text-sm font-medium">{{ t('settings.ai.modelTitle') }}</label>
          <Input v-model="currentConfig.title" @change="saveConfig" />
        </div>

        <!-- Base URL -->
        <div class="grid gap-2">
          <label class="text-sm font-medium">Base URL</label>
          <Input v-model="currentConfig.baseURL" @change="saveConfig" />
        </div>

        <!-- API Key -->
        <div class="grid gap-2">
          <label class="text-sm font-medium">API Key</label>
          <div class="flex gap-2">
            <Input 
              v-model="currentConfig.apiKey" 
              :type="apiKeyVisible ? 'text' : 'password'" 
              @change="saveConfig" 
              class="flex-1" 
            />
            <Button variant="outline" size="icon" @click="apiKeyVisible = !apiKeyVisible">
              <component :is="apiKeyVisible ? Eye : EyeOff" class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <!-- Model Name -->
        <div class="grid gap-2">
          <label class="text-sm font-medium">Model</label>
          <Input 
            v-model="currentConfig.model" 
            @change="saveConfig" 
            :placeholder="t('settings.ai.modelDesc')" 
          />
          <p v-if="currentConfig.baseURL.includes('openrouter')" class="text-xs text-muted-foreground">
             OpenRouter: 请使用完整模型ID (如 'openai/gpt-3.5-turbo')，不能使用自定义名称。
          </p>
        </div>

        <!-- Model Type -->
        <div class="grid gap-2">
          <label class="text-sm font-medium">{{ t('settings.ai.modelType.title') }}</label>
          <div class="flex flex-wrap gap-4">
             <div class="flex items-center space-x-2">
               <input type="radio" id="type-chat" value="chat" v-model="currentConfig.modelType" @change="saveConfig" class="accent-primary" />
               <label for="type-chat">{{ t('settings.ai.modelType.chat') }}</label>
             </div>
             <div class="flex items-center space-x-2">
               <input type="radio" id="type-embedding" value="embedding" v-model="currentConfig.modelType" @change="saveConfig" class="accent-primary" />
               <label for="type-embedding">{{ t('settings.ai.modelType.embedding') }}</label>
             </div>
             <div class="flex items-center space-x-2">
               <input type="radio" id="type-rerank" value="rerank" v-model="currentConfig.modelType" @change="saveConfig" class="accent-primary" />
               <label for="type-rerank">{{ t('settings.ai.modelType.rerank') }}</label>
             </div>
             <div class="flex items-center space-x-2 opacity-50 cursor-not-allowed">
               <input type="radio" id="type-audio" value="audio" v-model="currentConfig.modelType" disabled class="accent-primary" />
               <label for="type-audio">{{ t('settings.ai.modelType.audio') }}</label>
             </div>
          </div>
        </div>

        <!-- Custom Headers -->
        <div class="grid gap-2">
           <label class="text-sm font-medium">{{ t('settings.ai.customHeaders') }}</label>
           <div class="space-y-2">
             <div v-for="(pair, index) in headerPairs" :key="pair.id" class="flex gap-2 items-center">
                <Input 
                  v-model="pair.key" 
                  :placeholder="t('settings.ai.headerKey')" 
                  class="flex-1" 
                  @change="updateHeaders" 
                />
                <Input 
                  v-model="pair.value" 
                  :placeholder="t('settings.ai.headerValue')" 
                  class="flex-1" 
                  @change="updateHeaders" 
                />
                <Button variant="outline" size="icon" @click="removeHeader(index)">
                   <X class="h-4 w-4" />
                </Button>
             </div>
             <Button variant="outline" class="w-full" @click="addHeader">
                <Plus class="h-4 w-4 mr-2" />
                {{ t('settings.ai.addHeader') }}
             </Button>
           </div>
        </div>

        <!-- Temperature -->
        <div class="grid gap-2" v-if="currentConfig.modelType === 'chat' || !currentConfig.modelType">
           <label class="text-sm font-medium">{{ t('settings.ai.temperatureDesc') }} ({{ currentConfig.temperature ?? 0.7 }})</label>
           <input 
             type="range" 
             min="0" 
             max="2" 
             step="0.1" 
             v-model.number="currentConfig.temperature" 
             @change="saveConfig"
             class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
           />
        </div>

        <!-- Top P -->
        <div class="grid gap-2" v-if="currentConfig.modelType === 'chat' || !currentConfig.modelType">
           <label class="text-sm font-medium">{{ t('settings.ai.topPDesc') }} ({{ currentConfig.topP ?? 1.0 }})</label>
           <input 
             type="range" 
             min="0" 
             max="1" 
             step="0.1" 
             v-model.number="currentConfig.topP" 
             @change="saveConfig"
             class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
           />
        </div>

      </div>
    </div>
    <div v-else class="text-center text-muted-foreground py-10">
      {{ t('settings.ai.modelConfigDesc') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { useSettingStore } from '@/stores/setting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash, Copy, Eye, EyeOff, X } from 'lucide-vue-next'
import { AiConfig } from '@/types/ai'
import { v4 as uuidv4 } from 'uuid'
import DefaultModels from './DefaultModels.vue'
import CreateConfig from './CreateConfig.vue'
import AiCheck from './AiCheck.vue'

const { t } = useI18n()
const settingStore = useSettingStore()

const currentConfigKey = ref<string>('')
const apiKeyVisible = ref(false)

// Custom Headers Management
interface HeaderPair {
  id: string
  key: string
  value: string
}
const headerPairs = ref<HeaderPair[]>([])

// Initialize
onMounted(async () => {
  await settingStore.initSettingData()
  if (userCustomModels.value.length > 0) {
    currentConfigKey.value = userCustomModels.value[0].key
  }
})

const userCustomModels = computed(() => {
  return settingStore.aiModelList
})

const currentConfig = computed(() => {
  return settingStore.aiModelList.find(c => c.key === currentConfigKey.value)
})

// Sync headers when config changes
watch(currentConfig, (newConfig) => {
  if (newConfig && newConfig.customHeaders) {
    headerPairs.value = Object.entries(newConfig.customHeaders).map(([key, value]) => ({
      id: uuidv4(),
      key,
      value
    }))
  } else {
    headerPairs.value = []
  }
}, { immediate: true })

const createNewConfig = async () => {
  const newConfig: AiConfig = {
    key: uuidv4(),
    title: t('settings.ai.newModel'),
    baseURL: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    modelType: 'chat',
    temperature: 0.7,
    topP: 1.0,
    customHeaders: {}
  }
  await settingStore.updateAiModel(newConfig)
  currentConfigKey.value = newConfig.key
}

const copyConfig = async () => {
  if (!currentConfig.value) return
  const newConfig: AiConfig = {
    ...currentConfig.value,
    key: uuidv4(),
    title: `${currentConfig.value.title} (Copy)`
  }
  await settingStore.updateAiModel(newConfig)
  currentConfigKey.value = newConfig.key
}

const deleteConfig = async () => {
  if (!currentConfig.value) return
  if (!confirm(t('settings.ai.deleteCustomModelConfirm'))) return
  
  const newList = settingStore.aiModelList.filter(c => c.key !== currentConfigKey.value)
  await settingStore.setAiModelList(newList)
  
  if (newList.length > 0) {
    currentConfigKey.value = newList[0].key
  } else {
    currentConfigKey.value = ''
  }
}

const saveConfig = async () => {
  if (currentConfig.value) {
    await settingStore.updateAiModel(currentConfig.value)
  }
}

// Headers logic
const addHeader = () => {
  headerPairs.value.push({
    id: uuidv4(),
    key: '',
    value: ''
  })
}

const removeHeader = (index: number) => {
  headerPairs.value.splice(index, 1)
  updateHeaders()
}

const updateHeaders = async () => {
  if (!currentConfig.value) return
  
  const headers: Record<string, string> = {}
  headerPairs.value.forEach(pair => {
    if (pair.key.trim()) {
      headers[pair.key.trim()] = pair.value
    }
  })
  
  currentConfig.value.customHeaders = headers
  await saveConfig()
}

</script>
