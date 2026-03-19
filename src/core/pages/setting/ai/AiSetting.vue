<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium">{{ t('settings.ai.listTitle') }}</h3>
      <Button @click="openAddDialog">
        <Plus class="mr-2 h-4 w-4" /> {{ t('settings.ai.addModel') }}
      </Button>
    </div>

    <div class="grid gap-4">
      <div v-for="config in settingStore.aiModelList" :key="config.key" 
           class="flex items-center justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <div class="flex items-center gap-4">
          <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            <img v-if="config.icon" :src="config.icon" :alt="config.title" class="h-full w-full object-cover" />
            <Bot v-else class="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div class="font-medium flex items-center gap-2">
              {{ config.title }}
              <Badge v-if="settingStore.primaryModel === config.key" variant="secondary" class="text-xs">{{ t('settings.ai.defaultBadge') }}</Badge>
            </div>
            <div class="text-sm text-muted-foreground">{{ config.model || t('settings.ai.noModelSelected') }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button
              variant="ghost"
              size="icon"
              @click="setPrimary(config.key)"
              :title="t('settings.ai.setAsDefault')"
          >
            <!-- 已选中：显示带勾选的方块 -->
            <CheckSquareIcon
                v-if="settingStore.primaryModel === config.key"
                class="h-4 w-4 text-primary"
            />
            <!-- 未选中：显示空白方块 -->
            <Square
                v-else
                class="h-4 w-4"
            />
          </Button>
          <Button variant="ghost" size="icon" @click="editModel(config)">
            <Pencil class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" class="text-destructive hover:text-destructive" @click="deleteModel(config.key)">
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
import { useI18n } from '@/hooks/useI18n'
import { useSettingStore } from '@/stores/setting'
import { AiConfig } from '@/types/ai'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Square, Bot ,CheckSquareIcon} from 'lucide-vue-next'
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
