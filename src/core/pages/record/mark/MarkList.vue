<template>
  <div class="w-full">
    <div v-if="loading" class="p-4 text-center text-sm text-muted-foreground">
      Loading...
    </div>
    <div v-else-if="marks.length === 0" class="flex flex-col items-center justify-center py-10 text-muted-foreground">
       <span class="text-sm">{{ t('record.mark.noMarks') }}</span>
    </div>
    <div v-else>
      <MarkItem 
        v-for="mark in marks" 
        :key="mark.id" 
        :mark="mark" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMarkStore } from '@/stores/mark'
import MarkItem from './MarkItem.vue'
import { useI18n } from '@/hooks/useI18n'

const markStore = useMarkStore()
const { t } = useI18n()

const marks = computed(() => markStore.marks)
const loading = computed(() => markStore.loading)
</script>
