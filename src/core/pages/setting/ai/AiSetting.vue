<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium">AI Models</h3>
      <Button @click="openAddDialog">
        <Plus class="mr-2 h-4 w-4" /> Add Model
      </Button>
    </div>

    <div class="grid gap-4">
      <div v-for="model in settingStore.aiModelList" :key="model.key" 
           class="flex items-center justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <div class="flex items-center gap-4">
          <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            <img v-if="model.icon" :src="model.icon" :alt="model.title" class="h-full w-full object-cover" />
            <Bot v-else class="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div class="font-medium flex items-center gap-2">
              {{ model.title }}
              <Badge v-if="settingStore.primaryModel === model.key" variant="secondary" class="text-xs">Default</Badge>
            </div>
            <div class="text-sm text-muted-foreground">{{ model.model || 'No model selected' }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="icon" @click="setPrimary(model.key)" title="Set as Default">
            <Star class="h-4 w-4" :class="{'fill-primary text-primary': settingStore.primaryModel === model.key}" />
          </Button>
          <Button variant="ghost" size="icon" @click="editModel(model)">
            <Pencil class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" class="text-destructive hover:text-destructive" @click="deleteModel(model.key)">
            <Trash2 class="h-4 w-4" />
          </Button>
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
import { useSettingStore } from '@/stores/setting'
import { AiConfig } from '@/types/ai'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge' // Assuming Badge exists
import { Plus, Pencil, Trash2, Star, Bot } from 'lucide-vue-next'
import AiModelEdit from './AiModelEdit.vue'

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
  if (confirm('Are you sure you want to delete this model configuration?')) {
    const newList = settingStore.aiModelList.filter(m => m.key !== key)
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
