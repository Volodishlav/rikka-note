<template>
  <button @click="toggle" class="px-3 py-1 rounded bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
    <span v-if="theme === 'dark'">🌙 Dark</span>
    <span v-else-if="theme === 'light'">☀️ Light</span>
    <span v-else>🖥️ System</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { theme, setTheme } = useTheme()
const current = computed(() => theme.value)

function toggle() {
  // cycle system->dark->light->system
  if (current.value === 'system') setTheme('dark')
  else if (current.value === 'dark') setTheme('light')
  else setTheme('system')
}
</script>