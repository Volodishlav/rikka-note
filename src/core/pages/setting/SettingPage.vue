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
      <GeneralSetting v-if="activeTab === 'general'" />
      <LocalModelSetting v-if="activeTab === 'local'" />
      <AiSetting v-if="activeTab === 'ai'" />
      <PromptSetting v-if="activeTab === 'prompt'" />
      <RagSetting v-if="activeTab === 'rag'" />
      <EncryptionSetting v-if="activeTab === 'encryption'" />
      <DeveloperSetting v-if="activeTab === 'developer'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { Button } from '@/components/ui/button'
import { BotMessageSquare, Drama, Settings, BookText, Code2, Shield, Laptop } from 'lucide-vue-next'
import GeneralSetting from './general/GeneralSetting.vue'
import LocalModelSetting from './local/LocalModelSetting.vue'
import AiSetting from './ai/AiSetting.vue'
import PromptSetting from './prompt/PromptSetting.vue'
import RagSetting from './rag/RagSetting.vue'
import EncryptionSetting from './encryption/EncryptionSetting.vue'
import DeveloperSetting from './developer/DeveloperSetting.vue'

const { t } = useI18n()

const activeTab = ref('general')

const navItems = computed(() => [
  {
    id: 'general',
    label: t('settings.general.title'),
    icon: Settings
  },
  {
    id: 'local',
    label: t('settings.local.title'),
    icon: Laptop
  },
  {
    id: 'ai',
    label: t('settings.ai.title'),
    icon: BotMessageSquare
  },
  {
    id: 'prompt',
    label: t('settings.prompt.title'),
    icon: Drama
  },
  {
    id: 'rag',
    label: t('settings.rag.title'),
    icon: BookText
  },
  {
    id: 'encryption',
    label: t('settings.encryption.title'),
    icon: Shield
  },
  {
    id: 'developer',
    label: t('settings.developer.title'),
    icon: Code2
  }
])
</script>
