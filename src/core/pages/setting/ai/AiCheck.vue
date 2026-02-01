<template>
  <div class="inline-flex items-center">
    <Loader2Icon v-if="state === 'checking'" class="size-4 animate-spin text-muted-foreground" />
    <CircleCheckIcon v-else-if="state === 'ok'" class="size-4 text-green-500" />
    <CircleXIcon v-else-if="state === 'error'" class="size-4 text-destructive" />
    <span v-else class="size-4"></span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useSettingStore } from '@/stores/setting'
import { useI18n } from '@/hooks/useI18n'
import { useToast } from '@/components/ui/toast/use-toast'
import { fetch } from '@tauri-apps/plugin-http'
import { Loader2Icon, CircleCheckIcon, CircleXIcon } from 'lucide-vue-next'
import { debounce } from 'lodash-es'
import OpenAI from 'openai'
import { AiConfig } from '@/types/ai'

const props = defineProps<{
  config?: AiConfig
}>()

const { t } = useI18n()
const { toast } = useToast()
const settingStore = useSettingStore()
const state = ref<'ok' | 'error' | 'checking' | 'init'>('init')
let abortController: AbortController | null = null

const checkAiStatus = async (model: AiConfig, signal?: AbortSignal) => {
  try {
    if (!model.baseURL) return false

    // Simple Chat Completion Test using OpenAI SDK (without streaming for check)
    // We use native fetch here implicitly by not passing fetch adapter, matching useAI change
    // But wait, if we use OpenAI SDK, we need to instantiate it.
    
    const openai = new OpenAI({
        apiKey: model.apiKey || '',
        baseURL: model.baseURL,
        dangerouslyAllowBrowser: true,
        // No fetch adapter to avoid fetch_cancel_body error
    })

    await openai.chat.completions.create({
        model: model.model || 'gpt-3.5-turbo', // Fallback if empty, but usually should be set
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
        stream: false, // Non-streaming for check
    }, { signal })

    return true
  } catch (error: any) {
    console.error('AI Check Error:', error)
    // Handle specific errors
    if (error.name === 'AbortError') return false
    
    // Log detailed error
    let msg = error.message
    if (error.error && error.error.message) {
        msg = error.error.message
    }
    toast({
      description: `Connection Failed: ${msg}`,
      variant: 'destructive'
    })
    return false
  }
}

const check = async () => {
  if (abortController) {
    abortController.abort()
  }
  
  // If config is not provided, try to find current selected model from store
  const model = props.config || settingStore.aiModelList.find(item => item.key === settingStore.primaryModel)
  
  if (!model || !model.baseURL) {
    state.value = 'init'
    return
  }

  state.value = 'checking'
  abortController = new AbortController()

  try {
    const result = await checkAiStatus(model, abortController.signal)
    if (result) {
      state.value = 'ok'
      toast({
        description: t('settings.ai.connectionSuccess') || 'Connection Successful',
        // variant: 'success' // shadcn toast might not have success variant by default, use default or custom class
      })
    } else {
      state.value = 'error'
    }
  } catch (e) {
    state.value = 'error'
  }
}

const debouncedCheck = debounce(check, 1000)

watch(() => props.config, () => {
    state.value = 'init'
    debouncedCheck()
}, { deep: true })

// Also watch store if no prop provided (though in our case we will use it in AiSetting with explicit config likely)
// But AiSetting edits a local copy `currentConfig`. 
// Let's assume this component is used inside AiSetting and passed the current editing config.

onUnmounted(() => {
  if (abortController) abortController.abort()
  debouncedCheck.cancel()
})

// Expose check to parent if needed, or auto-check on mount?
// Auto-check on mount if config exists
if (props.config?.baseURL) {
    debouncedCheck()
}

</script>
