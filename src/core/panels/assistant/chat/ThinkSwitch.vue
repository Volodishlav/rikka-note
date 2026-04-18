<template>
  <div v-if="supportsThinking" class="hidden md:block">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :class="{ 'text-primary': useThink }"
            @click="handleClick"
          >
            <Brain v-if="useThink" class="h-4 w-4" />
            <BrainCircuit v-else class="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ useThink ? t('record.chat.think.enabled') : t('record.chat.think.disabled') }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Brain, BrainCircuit } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useChatStore } from '@/stores/chat'
import { useSettingStore } from '@/stores/setting'
import { storeToRefs } from 'pinia'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'

const chatStore = useChatStore()
const settingStore = useSettingStore()
const { useThink, chats } = storeToRefs(chatStore)
const { t } = useI18n()
const { info } = useToast()

// 判断当前模型是否支持深度思考
const supportsThinking = computed(() => {
  const currentModelKey = settingStore.primaryModel
  if (!currentModelKey) return false
  const model = settingStore.chatModels.find(m => m.key === currentModelKey)
  return !!model?.supportsThinking
})

const handleClick = async () => {
  const newValue = !useThink.value
  
  // 如果当前会话已经有消息，且正在开启思考模式，提示用户开新会话
  if (chats.value.length > 0) {
    info(t('record.chat.think.switchTip') || '建议开启新会话以获得更纯净的思考效果')
  }
  
  chatStore.setUseThink(newValue)
}
</script>
