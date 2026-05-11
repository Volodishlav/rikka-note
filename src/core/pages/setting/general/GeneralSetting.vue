<template>
  <div class="space-y-6">
    <!-- 主题设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{{ t('settings.general.theme.title') }}</h3>
      <p class="text-sm text-muted-foreground">{{ t('settings.general.theme.description') }}</p>
      <div class="flex gap-2">
        <Button
          v-for="themeOption in themeOptions"
          :key="themeOption.value"
          :variant="theme === themeOption.value ? 'secondary' : 'outline'"
          @click="setTheme(themeOption.value)"
          class="flex items-center gap-2"
        >
          <component :is="themeOption.icon" class="h-4 w-4" />
          {{ themeOption.label }}
        </Button>
      </div>
    </div>

    <!-- 语言设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{{ t('settings.general.language.title') }}</h3>
      <p class="text-sm text-muted-foreground">{{ t('settings.general.language.description') }}</p>
      <div class="flex gap-2">
        <Button
          v-for="langOption in languageOptions"
          :key="langOption.value"
          :variant="currentLocale === langOption.value ? 'secondary' : 'outline'"
          @click="changeLocale(langOption.value)"
          class="flex items-center gap-2"
        >
          {{ langOption.label }}
        </Button>
      </div>
    </div>

    <!-- 通知位置设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{{ t('settings.general.toast.title') }}</h3>
      <p class="text-sm text-muted-foreground">{{ t('settings.general.toast.description') }}</p>
      <div class="flex gap-2">
        <Button
          v-for="posOption in toastPositionOptions"
          :key="posOption.value"
          :variant="toastPosition === posOption.value ? 'secondary' : 'outline'"
          @click="setToastPosition(posOption.value as any)"
          class="flex items-center gap-2"
        >

          {{ posOption.label }}
        </Button>
      </div>
    </div>

    <!-- 更新设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{{ t('settings.general.update.title') }}</h3>
      <p class="text-sm text-muted-foreground">{{ t('settings.general.update.description') }}</p>
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-4">
          <Button
            @click="checkForUpdates(true)"
            :disabled="isChecking || isDownloading"
            class="flex items-center gap-2"
          >
            <RefreshCw v-if="isChecking" class="h-4 w-4 animate-spin" />
            <Download v-else-if="pendingUpdate" class="h-4 w-4" />
            <Search v-else class="h-4 w-4" />
            {{ isChecking ? t('settings.general.update.checking') : t('settings.general.update.check') }}
          </Button>
          <span class="text-sm text-muted-foreground">
            {{ t('settings.general.update.currentVersion', { version: currentVersion }) }}
          </span>
        </div>

        <div v-if="pendingUpdate" class="p-4 rounded-lg border bg-card space-y-3">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-medium">{{ t('settings.general.update.found', { version: pendingUpdate.version }) }}</h4>
              <p class="text-xs text-muted-foreground mt-1">{{ pendingUpdate.body }}</p>
            </div>
            <Button size="sm" @click="installUpdate" :disabled="isDownloading">
              <RefreshCw v-if="isDownloading" class="h-3 w-3 animate-spin mr-2" />
              {{ t('settings.general.update.installNow') }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>


</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useTheme, ThemeKey } from '@/composables/useTheme'
import { useSettingStore } from '@/stores/setting'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Monitor, RefreshCw, Download, Search } from 'lucide-vue-next'
import { useUpdater } from '@/composables/useUpdater'




const { t, locale, changeLocale } = useI18n()
const { theme, setTheme } = useTheme()
const settingStore = useSettingStore()
const { toastPosition } = storeToRefs(settingStore)
const { setToastPosition } = settingStore
const { 
  isChecking, 
  isDownloading, 
  pendingUpdate, 
  currentVersion, 
  checkForUpdates, 
  installUpdate 
} = useUpdater()

const currentLocale = computed(() => locale.value)





const themeOptions = computed(() => [
  {
    value: 'light' as ThemeKey,
    label: t('settings.general.theme.light'),
    icon: Sun
  },
  {
    value: 'dark' as ThemeKey,
    label: t('settings.general.theme.dark'),
    icon: Moon
  },
  {
    value: 'system' as ThemeKey,
    label: t('settings.general.theme.system'),
    icon: Monitor
  }
])

const languageOptions = computed(() => [
  {
    value: 'zh',
    label: '中文'
  },
  {
    value: 'en',
    label: 'English'
  },
  {
    value: 'ja',
    label: '日本語'
  },
  {
    value: 'ko',
    label: '한국어'
  },
  {
    value: 'fr',
    label: 'Français'
  },
  {
    value: 'de',
    label: 'Deutsch'
  },
  {
    value: 'es',
    label: 'Español'
  },
  {
    value: 'ru',
    label: 'Русский язык'
  }
])

const toastPositionOptions = computed(() => [
  {
    value: 'top-left',
    label: t('settings.general.toast.topLeft')
  },
  {
    value: 'top-right',
    label: t('settings.general.toast.topRight')
  },
  {
    value: 'bottom-left',
    label: t('settings.general.toast.bottomLeft')
  },
  {
    value: 'bottom-right',
    label: t('settings.general.toast.bottomRight')
  }
])

</script>