<template>
  <div class="flex flex-col justify-center items-center flex-1 w-full gap-6">
    <!-- 大机器人图标 -->
    <div class="relative">
      <BotIcon class="size-32 opacity-10" />
    </div>

    <!-- 功能介绍 -->
    <div class="flex flex-col gap-3">
      <div
          v-for="(item, idx) in features"
          :key="idx"
          class="border rounded-lg flex items-center gap-3 px-6 py-3 text-sm text-muted-foreground
                 bg-card hover:bg-accent transition-colors"
      >
        <component :is="item.icon" class="size-5 flex-shrink-0" />
        <p class="text-sm">{{ item.text }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/hooks/useI18n'
import {
  BotIcon,
  LinkIcon,
  ClipboardIcon,
  NotebookPenIcon,
} from 'lucide-vue-next'

const { t } = useI18n()

const features = [
  {
    icon: BotIcon,
    text: t('record.chat.empty.chat'),
  },
  {
    icon: LinkIcon,
    text: t('record.chat.empty.linked'),
  },
  {
    icon: ClipboardIcon,
    text: t('record.chat.empty.clipboard'),
  },
  {
    icon: NotebookPenIcon,
    text: t('record.chat.empty.organize'),
  },
]
</script>