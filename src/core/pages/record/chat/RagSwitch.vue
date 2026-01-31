<template>
  <Button
    variant="ghost"
    size="sm"
    class="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
    :class="{ 'text-primary bg-primary/10 hover:bg-primary/20': modelValue }"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <DatabaseIcon class="size-3" />
    <span>RAG</span>
  </Button>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DatabaseIcon } from 'lucide-vue-next'

defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>
