<template>
  <div class="space-y-6">
    <!-- Model Settings -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{{ t('settings.rag.modelTitle') }}</h3>
      
      <!-- Embedding Model -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <ChartScatter class="h-4 w-4" />
            <Label>{{ t('settings.rag.embeddingLabel') }}</Label>
          </div>
          <Select :model-value="settingStore.embeddingModel || ''" @update:model-value="settingStore.setEmbeddingModel">
            <SelectTrigger class="w-[200px]">
              <SelectValue :placeholder="t('settings.ai.noModelSelected')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="model in settingStore.aiModelList" :key="model.key" :value="model.key">
                {{ model.title }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" @click="testEmbedding" :disabled="isTesting">
            <Loader2 v-if="isTesting" class="h-4 w-4 animate-spin" />
            <span v-else>Test</span>
          </Button>
        </div>
        <div class="text-sm text-muted-foreground">{{ t('settings.rag.embeddingDesc') }}</div>
      </div>

      <!-- Rerank Model -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <ListOrdered class="h-4 w-4" />
            <Label>{{ t('settings.rag.rerankLabel') }}</Label>
          </div>
          <Select :model-value="settingStore.rerankModel || ''" @update:model-value="settingStore.setRerankModel">
            <SelectTrigger class="w-[200px]">
              <SelectValue :placeholder="t('settings.ai.noModelSelected')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="model in settingStore.aiModelList" :key="model.key" :value="model.key">
                {{ model.title }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="text-sm text-muted-foreground">{{ t('settings.rag.rerankDesc') }}</div>
      </div>
    </div>

    <Separator />

    <!-- Parameters -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{{ t('settings.rag.paramsTitle') }}</h3>
      
      <!-- Chunk Size -->
      <div class="space-y-2">
        <div class="flex justify-between">
          <Label>{{ t('settings.rag.chunkSize') }}</Label>
          <span class="text-sm text-muted-foreground">{{ chunkSize }}</span>
        </div>
        <Slider
          v-model="chunkSizeVal"
          :min="100"
          :max="5000"
          :step="100"
          @update:model-value="updateChunkSize"
        />
        <div class="text-sm text-muted-foreground">{{ t('settings.rag.chunkSizeDesc') }}</div>
      </div>

      <!-- Chunk Overlap -->
      <div class="space-y-2">
        <div class="flex justify-between">
          <Label>{{ t('settings.rag.chunkOverlap') }}</Label>
          <span class="text-sm text-muted-foreground">{{ chunkOverlap }}</span>
        </div>
        <Slider
          v-model="chunkOverlapVal"
          :min="0"
          :max="500"
          :step="50"
          @update:model-value="updateChunkOverlap"
        />
        <div class="text-sm text-muted-foreground">{{ t('settings.rag.chunkOverlapDesc') }}</div>
      </div>
      
      <!-- Result Count -->
       <div class="space-y-2">
        <div class="flex justify-between">
          <Label>{{ t('settings.rag.resultCount') }}</Label>
          <span class="text-sm text-muted-foreground">{{ resultCount }}</span>
        </div>
        <Slider
          v-model="resultCountVal"
          :min="1"
          :max="20"
          :step="1"
          @update:model-value="updateResultCount"
        />
        <div class="text-sm text-muted-foreground">{{ t('settings.rag.resultCountDesc') }}</div>
      </div>
      
       <!-- Similarity Threshold -->
       <div class="space-y-2">
        <div class="flex justify-between">
          <Label>{{ t('settings.rag.similarityThreshold') }}</Label>
          <span class="text-sm text-muted-foreground">{{ similarityThreshold }}</span>
        </div>
        <Slider
          v-model="similarityThresholdVal"
          :min="0"
          :max="1"
          :step="0.01"
          @update:model-value="updateSimilarityThreshold"
        />
        <div class="text-sm text-muted-foreground">{{ t('settings.rag.similarityThresholdDesc') }}</div>
      </div>
    </div>

    <Separator />

    <!-- Actions -->
    <div class="flex gap-2">
      <Button variant="outline" @click="resetDefaults">
        <RefreshCw class="mr-2 h-4 w-4" /> {{ t('settings.rag.resetDefaults') }}
      </Button>
      <Button variant="destructive" @click="clearVector">
        <Trash2 class="mr-2 h-4 w-4" /> {{ t('settings.rag.clearVector') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSettingStore } from '@/stores/setting'
import { useVectorStore } from '@/stores/vector'
import { useI18n } from '@/hooks/useI18n'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartScatter, ListOrdered, RefreshCw, Trash2, Loader2 } from 'lucide-vue-next'
import { Store } from '@tauri-apps/plugin-store'
import { clearVectorDb, initVectorDb } from '@/db/vector'
import { toast } from '@/components/ui/toast/use-toast'
import { ask } from '@tauri-apps/plugin-dialog'
import { checkEmbeddingModelAvailable } from '@/lib/rag'
const { t } = useI18n()
const settingStore = useSettingStore()
const vectorStore = useVectorStore()

const chunkSize = ref(1000)
const chunkOverlap = ref(200)
const resultCount = ref(5)
const similarityThreshold = ref(0.7)
const isTesting = ref(false)

const chunkSizeVal = ref([1000])
const chunkOverlapVal = ref([200])
const resultCountVal = ref([5])
const similarityThresholdVal = ref([0.7])

// Sync slider values
watch(chunkSizeVal, (val) => chunkSize.value = val[0])
watch(chunkOverlapVal, (val) => chunkOverlap.value = val[0])
watch(resultCountVal, (val) => resultCount.value = val[0])
watch(similarityThresholdVal, (val) => similarityThreshold.value = val[0])

const initParams = async () => {
  const store = await Store.load('store.json')
  chunkSize.value = await store.get<number>('ragChunkSize') || 1000
  chunkOverlap.value = await store.get<number>('ragChunkOverlap') || 200
  resultCount.value = await store.get<number>('ragResultCount') || 5
  similarityThreshold.value = await store.get<number>('ragSimilarityThreshold') || 0.7
  
  chunkSizeVal.value = [chunkSize.value]
  chunkOverlapVal.value = [chunkOverlap.value]
  resultCountVal.value = [resultCount.value]
  similarityThresholdVal.value = [similarityThreshold.value]
}

const updateParam = async (key: string, val: number) => {
  const store = await Store.load('store.json')
  await store.set(key, val)
  await store.save()
}

const updateChunkSize = (val: number[]) => updateParam('ragChunkSize', val[0])
const updateChunkOverlap = (val: number[]) => updateParam('ragChunkOverlap', val[0])
const updateResultCount = (val: number[]) => updateParam('ragResultCount', val[0])
const updateSimilarityThreshold = (val: number[]) => updateParam('ragSimilarityThreshold', val[0])

const resetDefaults = async () => {
  chunkSize.value = 1000
  chunkOverlap.value = 200
  resultCount.value = 5
  similarityThreshold.value = 0.7
  
  chunkSizeVal.value = [1000]
  chunkOverlapVal.value = [200]
  resultCountVal.value = [5]
  similarityThresholdVal.value = [0.7]
  
  const store = await Store.load('store.json')
  await store.set('ragChunkSize', 1000)
  await store.set('ragChunkOverlap', 200)
  await store.set('ragResultCount', 5)
  await store.set('ragSimilarityThreshold', 0.7)
  await store.save()
  
  toast({ description: t('settings.rag.resetSuccess') })
}

const clearVector = async () => {
  const confirmed = await ask(t('settings.rag.deleteConfirm'), {
    title: t('settings.rag.deleteTitle'),
    kind: 'warning'
  })
  
  if (confirmed) {
    await clearVectorDb()
    await initVectorDb()
    // Reset vector store count if needed
    vectorStore.documentCount = 0
    toast({ description: t('settings.rag.deleteSuccess') })
  }
}

const testEmbedding = async () => {
  isTesting.value = true
  // @ts-ignore
  const result = await checkEmbeddingModelAvailable()
  isTesting.value = false
  
  if (result === true) {
    toast({ description: 'Embedding model test passed!', variant: 'success' })
  } else {
    toast({ 
      description: typeof result === 'string' ? result : 'Embedding model test failed.', 
      variant: 'destructive' 
    })
  }
}

onMounted(() => {
  initParams()
})
</script>
