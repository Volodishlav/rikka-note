<template>
  <div class="mb-6 relative border rounded-lg overflow-hidden bg-card">
    <div class="p-6">
      <div class="flex items-center gap-2 mb-2">
        <Gem class="h-5 w-5 text-primary" />
        <h3 class="text-lg font-semibold">{{ t('settings.ai.defaultModels.title') }}</h3>
      </div>
      <p class="text-sm text-muted-foreground mb-4">
        {{ t('settings.ai.defaultModels.desc') }}
      </p>

      <div class="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        <div v-for="(model, index) in models" :key="index" class="flex items-start gap-3 p-4 rounded-lg border bg-background hover:bg-accent/50 transition-colors">
          <div :class="`p-2 rounded-md ${model.color} text-white`">
            <component :is="model.icon" class="h-5 w-5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                {{ model.type }}
              </span>
            </div>
            <h4 class="font-medium text-sm mb-1 truncate">
              {{ model.name }}
            </h4>
            <p class="text-xs text-muted-foreground line-clamp-2">
              {{ model.desc }}
            </p>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t flex items-center justify-between">
         <span class="text-xs text-muted-foreground">Powered by SiliconFlow</span>
         <Button variant="ghost" size="sm" @click="openInBrowser">
            {{ t('settings.ai.defaultModels.visit') }}
         </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { Gem, Move3d, Eye, MessageSquare } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { open } from '@tauri-apps/plugin-shell'

const { t } = useI18n()

const models = computed(() => [
  {
    name: t('settings.ai.defaultModels.chatModel.name'),
    type: t('settings.ai.defaultModels.chatModel.type'),
    desc: t('settings.ai.defaultModels.chatModel.desc'),
    icon: MessageSquare,
    color: 'bg-blue-500'
  },
  {
    name: t('settings.ai.defaultModels.embeddingModel.name'),
    type: t('settings.ai.defaultModels.embeddingModel.type'),
    desc: t('settings.ai.defaultModels.embeddingModel.desc'),
    icon: Move3d,
    color: 'bg-green-500'
  },
  {
    name: t('settings.ai.defaultModels.visionModel.name'),
    type: t('settings.ai.defaultModels.visionModel.type'),
    desc: t('settings.ai.defaultModels.visionModel.desc'),
    icon: Eye,
    color: 'bg-purple-500'
  }
])

function openInBrowser() {
  open('https://cloud.siliconflow.cn/i/O2ciJeZw')
}
</script>
