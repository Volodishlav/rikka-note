<template>
  <div class="p-4 pt-0">
    <footer class="relative flex flex-col border rounded-xl p-2 gap-2 w-full bg-background focus-within:ring-1 focus-within:ring-ring transition-all shadow-sm">
      
      <!-- Top Area: Input -->
      <div class="relative w-full flex items-start min-h-[40px]">
        <Textarea
          v-model="text"
          :placeholder="t('record.chat.input.placeholder.default')"
          class="flex-1 p-2 border-none text-sm shadow-none focus-visible:ring-0 resize-none overflow-y-auto min-h-[40px] max-h-[200px] bg-transparent"
          @keydown="handleKeyDown"
        />
      </div>

      <!-- Bottom Area: Controls -->
      <div class="flex justify-between items-center pt-2 border-t">
        <div class="flex gap-1 items-center flex-wrap">
          <ModelSelect />
          <PromptSelect />
          <div class="w-px h-4 bg-border mx-1"></div>
          <InputModeSelect v-model="inputMode" />
          <div class="w-px h-4 bg-border mx-1"></div>
          <RagSwitch v-model="ragEnabled" />
          
          <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground ml-1">
             <PaperclipIcon class="size-4" />
          </Button>
        </div>

        <div class="flex gap-2 items-center">
          <span class="text-xs text-muted-foreground hidden md:inline-block">
             {{ text.length }}/2000
          </span>
          <Button 
             size="sm" 
             class="h-8 px-3 rounded-lg transition-all"
             :disabled="!text.trim() || isSending"
             @click="handleSend"
          >
            <SendIcon class="size-4 mr-1" />
            <span>{{ t('record.chat.send') }}</span>
          </Button>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SendIcon, PaperclipIcon } from 'lucide-vue-next'
import { useChatSend } from '@/composables/useChatSend'
import { useI18n } from '@/hooks/useI18n'
import ModelSelect from './ModelSelect.vue'
import PromptSelect from './PromptSelect.vue'
import InputModeSelect from './InputModeSelect.vue'
import RagSwitch from './RagSwitch.vue'

const { t } = useI18n()
const text = ref('')
const inputMode = ref('chat')
const ragEnabled = ref(false)
const { sendMessage, isSending } = useChatSend()

const handleSend = () => {
  if (!text.value.trim() || isSending.value) return
  sendMessage(text.value)
  text.value = ''
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>
