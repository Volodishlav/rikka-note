<template>
  <div class="flex h-full bg-background text-foreground">
    <!-- Sidebar -->
    <div class="w-64 border-r p-4 space-y-2 flex-shrink-0">
      <h2 class="text-lg font-semibold mb-4 px-2">{{ t('settings.title') }}</h2>
      <Button
        v-for="item in navItems"
        :key="item.id"
        :variant="activeTab === item.id ? 'secondary' : 'ghost'"
        class="w-full justify-start"
        @click="activeTab = item.id"
      >
        <component :is="item.icon" class="mr-2 h-4 w-4" />
        {{ item.label }}
      </Button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-6">
      <AiSetting v-if="activeTab === 'ai'" />
      <PromptSetting v-if="activeTab === 'prompt'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { Button } from '@/components/ui/button'
import { BotMessageSquare, Drama } from 'lucide-vue-next'
import AiSetting from './ai/AiSetting.vue'
import PromptSetting from './prompt/PromptSetting.vue'

const { t } = useI18n()

const activeTab = ref('ai')

const navItems = computed(() => [
  {
    id: 'ai',
    label: t('settings.ai.title'),
    icon: BotMessageSquare
  },
  {
    id: 'prompt',
    label: t('settings.prompt.title'),
    icon: Drama
  }
])
</script>
