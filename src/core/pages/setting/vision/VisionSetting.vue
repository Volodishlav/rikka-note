<template>
  <div class="space-y-6">
    <div class="space-y-0.5">
      <h3 class="text-lg font-medium">{{ t('settings.vision.title') }}</h3>
      <p class="text-sm text-muted-foreground">
        {{ t('settings.vision.description') }}
      </p>
    </div>

    <Separator />

    <!-- 自动分析开关 -->
    <div 
      class="flex items-center justify-between p-4 border rounded-xl bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 cursor-pointer group"
      @click="settingStore.setAutoImageAnalyze(!settingStore.autoImageAnalyze)"
    >
      <div class="space-y-0.5">
        <div class="font-medium flex items-center gap-2">
          {{ t('settings.vision.autoAnalyze') }}
        </div>
        <div class="text-xs text-muted-foreground opacity-80">
          {{ t('settings.vision.autoAnalyzeDesc') }}
        </div>
      </div>
      <div 
        class="w-10 h-5 rounded-full relative transition-colors duration-200 shrink-0"
        :class="settingStore.autoImageAnalyze ? 'bg-primary' : 'bg-muted'"
      >
        <div 
          class="absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200"
          :style="{ transform: settingStore.autoImageAnalyze ? 'translateX(24px)' : 'translateX(4px)' }"
        />
      </div>
    </div>

    <!-- 模型选择 -->
    <div class="space-y-4">
      <div class="flex flex-col gap-1">
        <Label class="text-sm font-medium">{{ t('settings.vision.modelLabel') }}</Label>
        <span class="text-xs text-muted-foreground">{{ t('settings.vision.modelDesc') }}</span>
      </div>
      
      <div class="grid gap-3">
        <div v-if="settingStore.imageModels.length === 0" class="text-sm text-muted-foreground py-4 px-1 italic">
          {{ t('settings.ai.noModelSelected') }}
        </div>
        <div v-for="config in settingStore.imageModels" :key="config.key" 
             class="flex items-center justify-between p-4 border rounded-xl bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 group">
          <div class="flex items-center gap-4">
            <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
              <img v-if="config.icon" :src="config.icon" :alt="config.title" class="h-full w-full object-cover" />
              <Bot v-else class="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div class="font-medium flex items-center gap-2">
                {{ config.title }}
                <Badge v-if="settingStore.imageMethodModel === config.key" variant="secondary" class="text-[10px] h-4 px-1.5 uppercase font-bold">{{ t('settings.ai.defaultBadge') }}</Badge>
              </div>
              <div class="text-xs text-muted-foreground font-mono opacity-80">{{ config.model || '---' }}</div>
            </div>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                @click="settingStore.setImageMethodModel(config.key)"
                :title="t('settings.ai.setAsDefault')"
            >
              <CheckSquareIcon v-if="settingStore.imageMethodModel === config.key" class="h-4 w-4 text-primary" />
              <Square v-else class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { useSettingStore } from '@/stores/setting'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot, CheckSquareIcon, Square } from 'lucide-vue-next'

const { t } = useI18n()
const settingStore = useSettingStore()
</script>
