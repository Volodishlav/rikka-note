<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <h3 class="text-xl font-semibold tracking-tight">{{ t('settings.ai.apiTitle') }}</h3>
      <Button @click="openAddDialog">
        <Plus class="mr-2 h-4 w-4" /> {{ t('settings.ai.addModel') }}
      </Button>
    </div>

    <!-- Chat Models Section -->
    <div class="space-y-4">
      <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        {{ t('settings.ai.chatRegion') }}
      </h4>
      <div class="grid gap-3">
        <div v-if="settingStore.chatModels.length === 0" class="text-sm text-muted-foreground py-4 px-1 italic">
          {{ t('settings.ai.noModelSelected') }}
        </div>
        <div v-for="config in settingStore.chatModels" :key="config.key" 
             class="flex items-center justify-between p-4 border rounded-xl bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 group">
          <div class="flex items-center gap-4">
            <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
              <img v-if="config.icon" :src="config.icon" :alt="config.title" class="h-full w-full object-cover" />
              <Bot v-else class="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div class="font-medium flex items-center gap-2">
                {{ config.title }}
                <Badge v-if="settingStore.primaryModel === config.key" variant="secondary" class="text-[10px] h-4 px-1.5 uppercase font-bold">{{ t('settings.ai.defaultBadge') }}</Badge>
              </div>
              <div class="text-xs text-muted-foreground font-mono opacity-80">{{ config.model || '---' }}</div>
            </div>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                @click="setPrimary(config.key)"
                :title="t('settings.ai.setAsDefault')"
            >
              <CheckSquareIcon v-if="settingStore.primaryModel === config.key" class="h-4 w-4 text-primary" />
              <Square v-else class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="h-8 w-8" @click="editModel(config)">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" @click="deleteModel(config.key)">
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Embedding Models Section -->
    <div class="space-y-4">
      <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        {{ t('settings.ai.embeddingRegion') }}
      </h4>
      <div class="grid gap-3">
        <div v-if="settingStore.embeddingModels.length === 0" class="text-sm text-muted-foreground py-4 px-1 italic">
          {{ t('settings.ai.noModelSelected') }}
        </div>
        <div v-for="config in settingStore.embeddingModels" :key="config.key" 
             class="flex items-center justify-between p-4 border rounded-xl bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 group">
          <div class="flex items-center gap-4">
            <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
              <img v-if="config.icon" :src="config.icon" :alt="config.title" class="h-full w-full object-cover" />
              <Bot v-else class="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div class="font-medium flex items-center gap-2">
                {{ config.title }}
                <Badge v-if="settingStore.embeddingModel === config.key" variant="secondary" class="text-[10px] h-4 px-1.5 uppercase font-bold">{{ t('settings.ai.defaultBadge') }}</Badge>
              </div>
              <div class="text-xs text-muted-foreground font-mono opacity-80">{{ config.model || '---' }}</div>
            </div>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                @click="settingStore.setEmbeddingModel(config.key)"
                :title="t('settings.ai.setAsDefault')"
            >
              <CheckSquareIcon v-if="settingStore.embeddingModel === config.key" class="h-4 w-4 text-primary" />
              <Square v-else class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="h-8 w-8" @click="editModel(config)">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" @click="deleteModel(config.key)">
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rerank Models Section -->
    <div class="space-y-4">
      <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        {{ t('settings.ai.rerankRegion') }}
      </h4>
      <div class="grid gap-3">
        <div v-if="settingStore.rerankModels.length === 0" class="text-sm text-muted-foreground py-4 px-1 italic">
          {{ t('settings.ai.noModelSelected') }}
        </div>
        <div v-for="config in settingStore.rerankModels" :key="config.key" 
             class="flex items-center justify-between p-4 border rounded-xl bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 group">
          <div class="flex items-center gap-4">
            <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
              <img v-if="config.icon" :src="config.icon" :alt="config.title" class="h-full w-full object-cover" />
              <Bot v-else class="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div class="font-medium flex items-center gap-2">
                {{ config.title }}
                <Badge v-if="settingStore.rerankModel === config.key" variant="secondary" class="text-[10px] h-4 px-1.5 uppercase font-bold">{{ t('settings.ai.defaultBadge') }}</Badge>
              </div>
              <div class="text-xs text-muted-foreground font-mono opacity-80">{{ config.model || '---' }}</div>
            </div>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                @click="settingStore.setRerankModel(config.key)"
                :title="t('settings.ai.setAsDefault')"
            >
              <CheckSquareIcon v-if="settingStore.rerankModel === config.key" class="h-4 w-4 text-primary" />
              <Square v-else class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="h-8 w-8" @click="editModel(config)">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" @click="deleteModel(config.key)">
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <AiModelEdit 
      v-model:open="showEditDialog" 
      :config="currentEditConfig" 
      @save="handleSave" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { useSettingStore } from '@/stores/setting'
import { AiConfig } from '@/lib/ai.types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Square, Bot, CheckSquareIcon } from 'lucide-vue-next'
import AiModelEdit from './AiModelEdit.vue'

const { t } = useI18n()

const settingStore = useSettingStore()
const showEditDialog = ref(false)
const currentEditConfig = ref<AiConfig | undefined>(undefined)

const openAddDialog = () => {
  currentEditConfig.value = undefined
  showEditDialog.value = true
}

const editModel = (config: AiConfig) => {
  currentEditConfig.value = config
  showEditDialog.value = true
}

const handleSave = async (config: AiConfig) => {
  await settingStore.updateAiModel(config)
}

const deleteModel = async (key: string) => {
  if (confirm(t('settings.ai.deleteConfirm'))) {
    const newList = settingStore.aiModelList.filter((m: AiConfig) => m.key !== key)
    await settingStore.setAiModelList(newList)
    if (settingStore.primaryModel === key) {
      settingStore.setPrimaryModel(null)
    }
  }
}

const setPrimary = async (key: string) => {
  await settingStore.setPrimaryModel(key)
}
</script>
