<template>
  <SidebarGroupLabel class="w-full justify-between items-center text-sidebar-foreground h-12 text-sm font-medium border-b px-4">
    <span>{{ t('record.mark.title') }}</span>
  </SidebarGroupLabel>
</template>

<script setup lang="ts">
import { SidebarGroupLabel } from '@/components/ui/sidebar'
import { useI18n } from '@/hooks/useI18n'

const { t } = useI18n()
</script>
