<template>
  <div class="space-y-3">
    <h4 class="text-sm font-medium text-muted-foreground">{{ title }}</h4>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <div
        v-for="color in colors"
        :key="color.name"
        class="rounded-lg border overflow-hidden bg-card hover:shadow-md transition-shadow"
      >
        <!-- 颜色预览区域 -->
        <div
          class="h-16 w-full"
          :style="{ backgroundColor: `hsl(var(${color.cssVar}))` }"
        />
        <!-- 颜色信息 -->
        <div class="p-2 space-y-1">
          <div class="text-sm font-medium truncate" :title="color.name">
            {{ color.name }}
          </div>
          <div class="text-xs font-mono text-muted-foreground truncate" :title="color.tailwind">
            {{ color.tailwind }}
          </div>
          <div class="text-xs font-mono text-muted-foreground">
            {{ getColorValue(color.cssVar) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

/**
 * 颜色区块展示组件
 * 用于展示单个颜色类别的所有颜色
 */

interface ColorItem {
  name: string
  cssVar: string
  tailwind: string
}

interface Props {
  title: string
  colors: ColorItem[]
}

defineProps<Props>()

/**
 * 获取 CSS 变量的当前值
 * @param cssVar - CSS 变量名
 * @returns CSS 变量的值
 */
const getColorValue = (cssVar: string): string => {
  const styles = getComputedStyle(document.documentElement)
  const value = styles.getPropertyValue(cssVar).trim()
  return value ? `hsl(${value})` : 'N/A'
}
</script>