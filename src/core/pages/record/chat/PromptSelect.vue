<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="sm" class="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
        <SparklesIcon class="size-3" />
        <span class="max-w-[100px] truncate">{{ currentPrompt?.title || t('record.chat.prompt.default') }}</span>
        <ChevronDownIcon class="size-3 opacity-50" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-[200px]">
      <DropdownMenuLabel>{{ t('record.chat.prompt.title') }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem @select="handleSelect(null)">{{ t('record.chat.prompt.default') }}</DropdownMenuItem>
      <DropdownMenuItem v-for="p in prompts" :key="p.id" @select="handleSelect(p)">
        {{ p.title }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { SparklesIcon, ChevronDownIcon } from 'lucide-vue-next'
import { useI18n } from '@/hooks/useI18n'
import { usePromptStore, type Prompt } from '@/stores/prompt'

const { t } = useI18n()
const promptStore = usePromptStore()

onMounted(() => {
  promptStore.initPromptData()
})

const currentPrompt = computed(() => promptStore.currentPrompt)
const prompts = computed(() => promptStore.promptList)

const handleSelect = (prompt: Prompt | null) => {
  promptStore.setCurrentPrompt(prompt)
}
</script>
