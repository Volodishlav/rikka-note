<template>
  <div class="flex items-center bg-muted/50 rounded-lg p-0.5 border">
    <Button
      v-for="mode in modes"
      :key="mode.value"
      variant="ghost"
      size="sm"
      class="h-6 px-2 text-xs gap-1 rounded-md transition-all"
      :class="modelValue === mode.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
      @click="$emit('update:modelValue', mode.value)"
    >
      <component :is="mode.icon" class="size-3" />
      <span>{{ mode.label }}</span>
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { MessageSquareIcon, BotIcon } from 'lucide-vue-next'

defineProps<{
  modelValue: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const modes = [
  { value: 'chat', label: 'Chat', icon: MessageSquareIcon },
  { value: 'agent', label: 'Agent', icon: BotIcon },
]
</script>
