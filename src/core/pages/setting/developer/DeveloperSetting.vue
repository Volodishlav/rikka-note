<template>
  <div class="space-y-6">
    <!-- 内容区域 -->

    <!-- Color Scheme Tab -->
    <div v-if="activeTab === 'color'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <!-- 配色方案调试区域 -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium">{{ t('settings.developer.colorScheme.title') }}</h3>
        <p class="text-sm text-muted-foreground">
          {{ t('settings.developer.colorScheme.description') }}
        </p>

        <!-- 主题切换提示 -->
        <div class="p-3 rounded-md bg-muted text-sm flex justify-between items-center">
          <div>
            <span class="text-muted-foreground">{{ t('settings.developer.colorScheme.currentTheme') }}</span>
            <span class="font-medium ml-2">{{ isDark ? t('settings.developer.colorScheme.darkMode') : t('settings.developer.colorScheme.lightMode') }}</span>
          </div>
        </div>

        <!-- 核心颜色 -->
        <ColorSection :title="t('settings.developer.colorSections.core')" :colors="coreColors" />

        <!-- 品牌颜色 -->
        <ColorSection :title="t('settings.developer.colorSections.brand')" :colors="brandColors" />

        <!-- 品牌阴影颜色 -->
        <ColorSection :title="t('settings.developer.colorSections.brandShadow')" :colors="brandShadowColors" />

        <!-- 交互状态颜色 -->
        <ColorSection :title="t('settings.developer.colorSections.interactive')" :colors="interactiveColors" />

        <!-- 图表颜色 -->
        <ColorSection :title="t('settings.developer.colorSections.chart')" :colors="chartColors" />

        <!-- 侧边栏颜色 -->
        <ColorSection :title="t('settings.developer.colorSections.sidebar')" :colors="sidebarColors" />
      </div>

      <!-- CSS 变量原始值 -->
      <div class="space-y-4 pt-4 border-t">
        <h3 class="text-lg font-medium">{{ t('settings.developer.cssVariables.title') }}</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
          <div
            v-for="variable in allVariables"
            :key="variable.name"
            class="p-2 rounded border bg-card"
          >
            <div class="font-mono text-muted-foreground">{{ variable.name }}</div>
            <div class="font-mono truncate" :title="variable.value">{{ variable.value }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Debug System Tab -->
    <div v-if="activeTab === 'debug'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div class="space-y-4">
        <h3 class="text-lg font-medium">{{ t('settings.developer.debug.title') }}</h3>
        <p class="text-sm text-muted-foreground">
          {{ t('settings.developer.debug.description') }}
        </p>
      </div>

      <!-- Log Level -->
      <div class="space-y-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('settings.developer.debug.level') }}</label>
          <span class="text-xs text-muted-foreground">{{ t('settings.developer.debug.levelDesc') }}</span>
        </div>
        <Select :model-value="settingStore.devLogLevel" @update:model-value="handleLogLevelUpdate">
          <SelectTrigger class="w-[240px]">
            <SelectValue :placeholder="t('settings.developer.debug.level')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="(label, key) in levelOptions" :key="key" :value="key">
              {{ label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <!-- Modules Selection -->
      <div class="space-y-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('settings.developer.debug.modules') }}</label>
          <span class="text-xs text-muted-foreground">{{ t('settings.developer.debug.moduleDesc') }}</span>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="(label, key) in moduleOptions"
            :key="key"
            class="flex flex-col gap-2 p-3 rounded-lg border bg-card/50 hover:bg-accent/5 transition-colors cursor-pointer"
            @click="toggleModule(key as string)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div 
                  class="w-2.5 h-2.5 rounded-full shadow-sm" 
                  :style="{ backgroundColor: getModuleColor(key as string) }"
                />
                <span class="font-medium text-sm">{{ label }}</span>
              </div>
              <div 
                class="w-8 h-4 rounded-full relative transition-colors duration-200"
                :class="isModuleEnabled(key as string) ? 'bg-primary' : 'bg-muted'"
              >
                <div 
                  class="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200"
                  :style="{ transform: isModuleEnabled(key as string) ? 'translateX(18px)' : 'translateX(2px)' }"
                />
              </div>
            </div>
            
            <!-- File Mapping -->
            <div class="flex flex-wrap gap-1.5 mt-1">
              <span 
                v-for="file in moduleFileMap[key as string] || []" 
                :key="file"
                class="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-mono"
              >
                {{ file }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RAG Evaluation Tab -->
    <div v-if="activeTab === 'evaluation'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <RagEvaluation />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useSettingStore } from '@/stores/setting'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ColorSection from './ColorSection.vue'
import RagEvaluation from './RagEvaluation.vue'
import { LOG_MODULES } from '@/utils/logger.config'

const { t } = useI18n()
const settingStore = useSettingStore()

// 辅助函数：处理日志等级切换时的类型检查
const handleLogLevelUpdate = (val: string | number | boolean | null | undefined | any) => {
  if (val !== null && val !== undefined && typeof val !== 'boolean') {
    settingStore.setDevLogLevel(val as any)
  }
}

const props = defineProps<{
  activeTab?: 'color' | 'debug' | 'evaluation'
}>()

// Tab Logic
const activeTab = computed(() => props.activeTab || 'color')

// Log Level Options
const levelOptions = computed(() => ({
  debug: t('settings.developer.levelLabels.debug'),
  info: t('settings.developer.levelLabels.info'),
  warn: t('settings.developer.levelLabels.warn'),
  error: t('settings.developer.levelLabels.error'),
  none: t('settings.developer.levelLabels.none')
}))

// Module Options & Configs derived from central config
const moduleOptions = computed(() => {
  const options: Record<string, string> = {}
  LOG_MODULES.forEach(mod => {
    options[mod.id] = t(`settings.developer.moduleLabels.${mod.id}`)
  })
  return options
})

const moduleFileMap = computed(() => {
  return LOG_MODULES.reduce((acc, mod) => {
    acc[mod.id] = mod.files
    return acc
  }, {} as Record<string, string[]>)
})

const moduleColors = computed(() => {
  return LOG_MODULES.reduce((acc, mod) => {
    acc[mod.id] = mod.color
    return acc
  }, {} as Record<string, string>)
})

const getModuleColor = (module: string) => {
  return moduleColors.value[module] || '#6366f1'
}

const isModuleEnabled = (module: string) => {
  return settingStore.devLogModules.includes(module)
}

const toggleModule = (module: string) => {
  const current = [...settingStore.devLogModules]
  const index = current.indexOf(module)
  if (index > -1) {
    current.splice(index, 1)
  } else {
    current.push(module)
  }
  settingStore.setDevLogModules(current)
}

// --- Color Scheme Debug Logic (Original) ---
const isDark = ref(false)
const updateThemeStatus = () => {
  isDark.value = document.documentElement.classList.contains('dark')
}

let observer: MutationObserver | null = null

onMounted(() => {
  updateThemeStatus()
  observer = new MutationObserver(updateThemeStatus)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

const coreColors = computed(() => [
  { name: 'background', cssVar: '--background', tailwind: 'bg-background' },
  { name: 'foreground', cssVar: '--foreground', tailwind: 'text-foreground' },
  { name: 'card', cssVar: '--card', tailwind: 'bg-card' },
  { name: 'card-foreground', cssVar: '--card-foreground', tailwind: 'text-card-foreground' },
  { name: 'popover', cssVar: '--popover', tailwind: 'bg-popover' },
  { name: 'popover-foreground', cssVar: '--popover-foreground', tailwind: 'text-popover-foreground' },
  { name: 'border', cssVar: '--border', tailwind: 'border-border' },
  { name: 'input', cssVar: '--input', tailwind: 'bg-input' },
  { name: 'ring', cssVar: '--ring', tailwind: 'ring-ring' },
])

const brandColors = computed(() => [
  { name: `brand-purple (${t('settings.developer.colorNames.brandPurple')})`, cssVar: '--brand-purple', tailwind: 'bg-brand-purple' },
  { name: `brand-cyan (${t('settings.developer.colorNames.brandCyan')})`, cssVar: '--brand-cyan', tailwind: 'bg-brand-cyan' },
  { name: `brand-pink (${t('settings.developer.colorNames.brandPink')})`, cssVar: '--brand-pink', tailwind: 'bg-brand-pink' },
  { name: `brand-orange (${t('settings.developer.colorNames.brandOrange')})`, cssVar: '--brand-orange', tailwind: 'bg-brand-orange' },
])

const brandShadowColors = computed(() => [
  { name: `brand-purple-shadow (${t('settings.developer.colorNames.purpleShadow')})`, cssVar: '--brand-purple-shadow', tailwind: 'bg-brand-purple-shadow' },
  { name: `brand-cyan-shadow (${t('settings.developer.colorNames.cyanShadow')})`, cssVar: '--brand-cyan-shadow', tailwind: 'bg-brand-cyan-shadow' },
  { name: `brand-pink-shadow (${t('settings.developer.colorNames.pinkShadow')})`, cssVar: '--brand-pink-shadow', tailwind: 'bg-brand-pink-shadow' },
  { name: `brand-orange-shadow (${t('settings.developer.colorNames.orangeShadow')})`, cssVar: '--brand-orange-shadow', tailwind: 'bg-brand-orange-shadow' },
])

const interactiveColors = computed(() => [
  { name: 'primary', cssVar: '--primary', tailwind: 'bg-primary' },
  { name: 'primary-foreground', cssVar: '--primary-foreground', tailwind: 'text-primary-foreground' },
  { name: 'secondary', cssVar: '--secondary', tailwind: 'bg-secondary' },
  { name: 'secondary-foreground', cssVar: '--secondary-foreground', tailwind: 'text-secondary-foreground' },
  { name: 'third', cssVar: '--third', tailwind: 'bg-third' },
  { name: 'third-foreground', cssVar: '--third-foreground', tailwind: 'text-third-foreground' },
  { name: 'muted', cssVar: '--muted', tailwind: 'bg-muted' },
  { name: 'muted-foreground', cssVar: '--muted-foreground', tailwind: 'text-muted-foreground' },
  { name: 'accent', cssVar: '--accent', tailwind: 'bg-accent' },
  { name: 'accent-foreground', cssVar: '--accent-foreground', tailwind: 'text-accent-foreground' },
  { name: 'destructive', cssVar: '--destructive', tailwind: 'bg-destructive' },
  { name: 'destructive-foreground', cssVar: '--destructive-foreground', tailwind: 'text-destructive-foreground' },
])

const chartColors = computed(() => [
  { name: 'chart-1', cssVar: '--chart-1', tailwind: 'bg-chart-1' },
  { name: 'chart-2', cssVar: '--chart-2', tailwind: 'bg-chart-2' },
  { name: 'chart-3', cssVar: '--chart-3', tailwind: 'bg-chart-3' },
  { name: 'chart-4', cssVar: '--chart-4', tailwind: 'bg-chart-4' },
  { name: 'chart-5', cssVar: '--chart-5', tailwind: 'bg-chart-5' },
])

const sidebarColors = computed(() => [
  { name: 'sidebar-background', cssVar: '--sidebar-background', tailwind: 'bg-sidebar' },
  { name: 'sidebar-foreground', cssVar: '--sidebar-foreground', tailwind: 'text-sidebar-foreground' },
  { name: 'sidebar-primary', cssVar: '--sidebar-primary', tailwind: 'bg-sidebar-primary' },
  { name: 'sidebar-primary-foreground', cssVar: '--sidebar-primary-foreground', tailwind: 'text-sidebar-primary-foreground' },
  { name: 'sidebar-accent', cssVar: '--sidebar-accent', tailwind: 'bg-sidebar-accent' },
  { name: 'sidebar-accent-foreground', cssVar: '--sidebar-accent-foreground', tailwind: 'text-sidebar-accent-foreground' },
  { name: 'sidebar-border', cssVar: '--sidebar-border', tailwind: 'border-sidebar-border' },
  { name: 'sidebar-ring', cssVar: '--sidebar-ring', tailwind: 'ring-sidebar-ring' },
])

const allVariables = computed(() => {
  const variables: { name: string; value: string }[] = []
  const styles = getComputedStyle(document.documentElement)
  const varNames = [
    '--background', '--foreground', '--card', '--card-foreground',
    '--popover', '--popover-foreground', '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground', '--third', '--third-foreground',
    '--muted', '--muted-foreground', '--accent', '--accent-foreground',
    '--destructive', '--destructive-foreground', '--border', '--input', '--ring',
    '--brand-purple', '--brand-cyan', '--brand-pink', '--brand-orange',
    '--brand-pink-shadow', '--brand-purple-shadow', '--brand-orange-shadow', '--brand-cyan-shadow',
    '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    '--sidebar-background', '--sidebar-foreground', '--sidebar-primary',
    '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-ring', '--radius'
  ]
  varNames.forEach(name => {
    const value = styles.getPropertyValue(name).trim()
    if (value) variables.push({ name, value })
  })
  return variables
})
</script>