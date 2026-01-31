<template>
  <SheetContent class="lg:min-w-[800px] w-full mt-[env(safe-area-inset-top)] p-0">
    <SheetHeader class="p-4 border-b">
      <SheetTitle>{{ t(`record.mark.type.${mark.type}`) }}</SheetTitle>
      <span class="mt-4 text-xs text-muted-foreground">
        {{ t('record.mark.createdAt') }}：{{ dayjs(mark.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
      </span>
    </SheetHeader>
    <div class="h-[calc(100vh-88px)] overflow-y-auto md:p-8 p-2">
      <div v-if="mark.url && (mark.type === 'image' || mark.type === 'scan')" class="mb-4">
        <img :src="mark.url" class="w-full max-h-80 object-contain" />
      </div>

      <div v-if="mark.desc && mark.desc !== mark.content">
         <span class="block my-4 text-md font-bold">{{ t('record.mark.desc') }}</span>
         <Textarea 
            :model-value="mark.desc" 
            readonly 
            class="resize-none"
            rows="3"
         />
      </div>

      <span class="block my-4 text-md font-bold">{{ t('record.mark.content') }}</span>
      <Textarea 
          :model-value="mark.content" 
          readonly 
          class="resize-none"
          rows="14"
      />
    </div>
  </SheetContent>
</template>

<script setup lang="ts">
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/hooks/useI18n'
import { Mark } from '@/db/marks'
import dayjs from 'dayjs'

defineProps<{
  mark: Mark
}>()

const { t } = useI18n()
</script>
