<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button size="icon" variant="ghost" class="h-8 w-8">
        <Globe class="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-[240px]">
      <DropdownMenuLabel>{{ t('record.chat.language.selectLabel') }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem 
          v-for="lang in languageOptions" 
          :key="lang"
          @select="languageSelectChangeHandler(lang)"
        >
          {{ lang }}
          <Check v-if="chatLanguage === lang" class="ml-auto h-4 w-4" />
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Store } from '@tauri-apps/plugin-store'
import { Globe, Check } from 'lucide-vue-next'
import { logger } from '@/utils/logger'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu'

const { t } = useI18n()

const languageOptions = [
  'English',
  '中文',
  '日本語',
  '한국어',
  'Français',
  'Deutsch',
  'Español',
  'Русский',
]

const chatLanguage = ref<string>('中文')

// 初始化聊天语言
async function initChatLanguage() {
  try {
    const store = await Store.load('store.json')
    const savedLanguage = await store.get<string>('chatLanguage')
    if (savedLanguage) {
      chatLanguage.value = savedLanguage
    } else {
      const appLocale = await store.get<string>('locale') || '中文'
      chatLanguage.value = appLocale
      await store.set('chatLanguage', appLocale)
      await store.save()
    }
  } catch (error) {
    logger.assistant.error('Failed to initialize chat language:', error)
    chatLanguage.value = 'English' // Default fallback
  }
}

// 保存语言选择到本地存储
async function languageSelectChangeHandler(langId: string) {
  chatLanguage.value = langId
  try {
    const store = await Store.load('store.json')
    await store.set('chatLanguage', langId)
    await store.save()
    logger.assistant.debug('Language saved:', langId)
  } catch (error) {
    logger.assistant.error('Failed to save chat language:', error)
  }
}

// 组件挂载时初始化语言
onMounted(() => {
  initChatLanguage()
})
</script>