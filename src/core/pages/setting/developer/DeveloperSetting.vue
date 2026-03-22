<template>
  <div class="space-y-6">
    <!-- 配色方案调试区域 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">配色方案调试</h3>
      <p class="text-sm text-muted-foreground">
        展示项目中所有 Tailwind CSS 配置的颜色变量，方便开发调试
      </p>

      <!-- 主题切换提示 -->
      <div class="p-3 rounded-md bg-muted text-sm">
        <span class="text-muted-foreground">当前主题：</span>
        <span class="font-medium">{{ isDark ? '深色模式' : '浅色模式' }}</span>
      </div>

      <!-- 核心颜色 -->
      <ColorSection title="核心颜色" :colors="coreColors" />

      <!-- 品牌颜色 -->
      <ColorSection title="品牌颜色 (六花专属)" :colors="brandColors" />

      <!-- 品牌阴影颜色 -->
      <ColorSection title="品牌阴影颜色 (六花主题)" :colors="brandShadowColors" />

      <!-- 交互状态颜色 -->
      <ColorSection title="交互状态颜色" :colors="interactiveColors" />

      <!-- 图表颜色 -->
      <ColorSection title="图表颜色" :colors="chartColors" />

      <!-- 侧边栏颜色 -->
      <ColorSection title="侧边栏颜色" :colors="sidebarColors" />
    </div>

    <!-- CSS 变量原始值 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">CSS 变量原始值</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
        <div
          v-for="variable in allVariables"
          :key="variable.name"
          class="p-2 rounded border bg-card"
        >
          <div class="font-mono text-muted-foreground">{{ variable.name }}</div>
          <div class="font-mono">{{ variable.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ColorSection from './ColorSection.vue'

/**
 * 开发者设置组件
 * 用于调试和展示项目中所有 Tailwind CSS 配置的颜色变量
 */

// 检测当前是否为深色模式
const isDark = ref(false)

// 监听主题变化
const updateThemeStatus = () => {
  isDark.value = document.documentElement.classList.contains('dark')
}

onMounted(() => {
  updateThemeStatus()
  // 使用 MutationObserver 监听 class 变化
  const observer = new MutationObserver(updateThemeStatus)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
  
  // 组件卸载时断开观察
  onUnmounted(() => observer.disconnect())
})

// 核心颜色定义
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

// 品牌颜色定义
const brandColors = computed(() => [
  { name: 'brand-purple (六花紫)', cssVar: '--brand-purple', tailwind: 'bg-brand-purple' },
  { name: 'brand-cyan (六花青)', cssVar: '--brand-cyan', tailwind: 'bg-brand-cyan' },
  { name: 'brand-pink (六花粉)', cssVar: '--brand-pink', tailwind: 'bg-brand-pink' },
  { name: 'brand-orange (六花橙)', cssVar: '--brand-orange', tailwind: 'bg-brand-orange' },
])

// 品牌阴影颜色定义
const brandShadowColors = computed(() => [
  { name: 'brand-purple-shadow (紫色阴影)', cssVar: '--brand-purple-shadow', tailwind: 'bg-brand-purple-shadow' },
  { name: 'brand-cyan-shadow (青色阴影)', cssVar: '--brand-cyan-shadow', tailwind: 'bg-brand-cyan-shadow' },
  { name: 'brand-pink-shadow (粉丝阴影)', cssVar: '--brand-pink-shadow', tailwind: 'bg-brand-pink-shadow' },
  { name: 'brand-orange-shadow (橙色阴影)', cssVar: '--brand-orange-shadow', tailwind: 'bg-brand-orange-shadow' },
])

// 交互状态颜色定义
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

// 图表颜色定义
const chartColors = computed(() => [
  { name: 'chart-1', cssVar: '--chart-1', tailwind: 'bg-chart-1' },
  { name: 'chart-2', cssVar: '--chart-2', tailwind: 'bg-chart-2' },
  { name: 'chart-3', cssVar: '--chart-3', tailwind: 'bg-chart-3' },
  { name: 'chart-4', cssVar: '--chart-4', tailwind: 'bg-chart-4' },
  { name: 'chart-5', cssVar: '--chart-5', tailwind: 'bg-chart-5' },
])

// 侧边栏颜色定义
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

// 所有 CSS 变量列表
const allVariables = computed(() => {
  const variables: { name: string; value: string }[] = []
  const styles = getComputedStyle(document.documentElement)
  
  // 遍历所有定义的 CSS 变量
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
    if (value) {
      variables.push({ name, value })
    }
  })
  
  return variables
})
</script>