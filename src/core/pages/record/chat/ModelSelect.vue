<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="sm" class="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
        <BotIcon class="size-3" />
        <span class="max-w-[100px] truncate">{{ currentModelTitle || t('record.chat.model.select') }}</span>
        <ChevronDownIcon class="size-3 opacity-50" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-[200px]">
      <DropdownMenuLabel>{{ t('record.chat.model.title') }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem 
        v-for="model in aiModelList" 
        :key="model.key" 
        @select="selectModel(model.key)"
        :class="{ 'bg-accent': currentModelKey === model.key }"
      >
        <div class="flex flex-col">
          <span>{{ model.title }}</span>
          <span class="text-xs text-muted-foreground" v-if="model.model">{{ model.model }}</span>
        </div>
      </DropdownMenuItem>
      <DropdownMenuSeparator v-if="aiModelList.length === 0" />
      <div v-if="aiModelList.length === 0" class="p-2 text-xs text-muted-foreground text-center">
        {{ t('record.chat.model.noModels') }}
        <router-link to="/core/setting" class="text-primary hover:underline block mt-1">
          {{ t('record.chat.model.goSetting') }}
        </router-link>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { BotIcon, ChevronDownIcon } from 'lucide-vue-next'
import { useI18n } from '@/hooks/useI18n'
import { useSettingStore } from '@/stores/setting'

const { t } = useI18n()
const settingStore = useSettingStore()

const aiModelList = computed(() => settingStore.aiModelList)
const currentModelKey = computed(() => settingStore.primaryModel)

const currentModelTitle = computed(() => {
  const model = aiModelList.value.find(m => m.key === currentModelKey.value)
  return model ? model.title : ''
})

const selectModel = async (key: string) => {
  await settingStore.setPrimaryModel(key)
}
</script>
