<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="sm" class="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
        <BotIcon class="size-3" />
        <span class="max-w-[100px] truncate">{{ model || t('record.chat.model.select') }}</span>
        <ChevronDownIcon class="size-3 opacity-50" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-[200px]">
      <DropdownMenuLabel>{{ t('record.chat.model.title') }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem v-for="m in models" :key="m" @select="model = m">
        {{ m }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { BotIcon, ChevronDownIcon } from 'lucide-vue-next'
import { useI18n } from '@/hooks/useI18n'

const { t } = useI18n()
const model = ref('GPT-4o')
const models = ['GPT-4o', 'Claude 3.5 Sonnet', 'Gemini Pro']
</script>
