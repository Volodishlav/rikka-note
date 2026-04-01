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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useTheme, ThemeKey } from '@/composables/useTheme'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Monitor } from 'lucide-vue-next'

const { t, locale, changeLocale } = useI18n()
const { theme, setTheme } = useTheme()

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
  }
])
</script>