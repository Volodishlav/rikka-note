<template>
  <div class="mb-6">
    <Button @click="open = true">
      <Plus class="mr-2 h-4 w-4" />
      {{ t('settings.ai.addModel') }}
    </Button>

    <Dialog v-model:open="open">
      <DialogContent class="max-w-[650px]">
        <DialogHeader>
          <DialogTitle>{{ t('settings.ai.create') }}</DialogTitle>
          <DialogDescription>
            {{ t('settings.ai.createDesc') }}
          </DialogDescription>
        </DialogHeader>
        
        <div class="space-y-4">
            <!-- Custom -->
            <div 
                class="h-12 flex items-center rounded-md gap-2 justify-between p-2 border hover:bg-accent cursor-pointer"
                @click="addCustomModelHandler(customTemplate)"
            >
                <div class="flex items-center gap-2">
                    <div class="size-6 bg-secondary rounded flex items-center justify-center">
                        <BotIcon class="size-4 text-primary" />
                    </div>
                    <p class="text-sm font-bold">{{ t('settings.ai.custom') }}</p>
                </div>
                <ChevronRightIcon class="size-4" />
            </div>

            <p class="text-xs text-muted-foreground">{{ t('settings.ai.providerTemplates') }}</p>
            
            <div class="overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px]">
                <div 
                    v-for="(item, index) in baseAiConfig" 
                    :key="index"
                    class="h-12 flex items-center rounded-md gap-2 justify-between p-2 border hover:bg-accent cursor-pointer"
                    @click="addCustomModelHandler(item)"
                >
                    <div class="flex items-center gap-2">
                        <div class="size-6 bg-white rounded flex items-center justify-center overflow-hidden border shrink-0">
                            <img v-if="item.icon" :src="item.icon" class="size-4 object-contain" @error="(e) => (e.target as HTMLElement).style.display = 'none'" />
                            <BotIcon v-else class="size-4 text-primary" />
                        </div>
                        <p class="text-sm font-bold">{{ item.title }}</p>
                    </div>
                    <ChevronRightIcon class="size-4" />
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { useSettingStore } from '@/stores/setting'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, ChevronRightIcon, BotIcon } from 'lucide-vue-next'
import { AiConfig, baseAiConfig } from '@/types/ai'
import { v4 as uuidv4 } from 'uuid'

const { t } = useI18n()
const settingStore = useSettingStore()
const open = ref(false)

const customTemplate: AiConfig = {
    key: '',
    title: 'Custom',
    baseURL: '',
    apiKey: '',
    model: '',
    modelType: 'chat'
}

const addCustomModelHandler = async (template: AiConfig) => {
    const newModel: AiConfig = {
        ...template,
        key: uuidv4(),
        title: template.title === 'Custom' ? 'New Model' : template.title,
        modelType: template.modelType || 'chat',
        // Clear API Key for templates to avoid leaking if any (baseAiConfig usually doesn't have keys)
        apiKey: '', 
        // Keep BaseURL and other settings
    }
    
    await settingStore.updateAiModel(newModel)
    
    // Select the new model
    // This requires parent to know, or we can update store's current selection logic if it exists
    // In AiSetting.vue, it watches aiModelList or we need to emit event
    // But settingStore doesn't track "currently editing model in settings page".
    // AiSetting.vue uses a local ref `currentConfigKey`.
    // We can emit an event.
    
    emit('created', newModel.key)
    open.value = false
}

const emit = defineEmits<{
  (e: 'created', key: string): void
}>()
</script>
