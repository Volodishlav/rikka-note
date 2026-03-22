<template>
  <div class="border-b last:border-0 hover:bg-accent/50 transition-colors">
    <ContextMenu>
      <ContextMenuTrigger>
        <!-- Content based on type -->
        <div v-if="mark.type === 'text'" class="p-2 flex-1">
          <div class="flex w-full items-center gap-2 text-muted-foreground text-xs mb-1">
            <span class="flex items-center gap-1 bg-lime-900 text-white px-1 rounded">
              {{ t(`record.mark.type.${mark.type}`) }}
            </span>
            <span class="ml-auto text-xs">{{ dayjs(mark.createdAt).fromNow() }}</span>
          </div>
          <Sheet>
            <SheetTrigger as-child>
              <span class="line-clamp-2 leading-4 mt-2 text-xs break-words cursor-pointer hover:underline">
                {{ mark.content || '' }}
              </span>
            </SheetTrigger>
            <MarkDetail :mark="mark" />
          </Sheet>
        </div>

        <div v-else-if="mark.type === 'link'" class="p-2 flex-1">
          <div class="flex w-full items-center gap-2 text-muted-foreground text-xs mb-1">
            <span class="flex items-center gap-1 bg-blue-900 text-white px-1 rounded">
              {{ t(`record.mark.type.${mark.type}`) }}
            </span>
            <span class="ml-auto text-xs">{{ dayjs(mark.createdAt).fromNow() }}</span>
          </div>
          <Sheet>
            <SheetTrigger as-child>
              <span class="line-clamp-2 leading-4 mt-2 text-xs break-words cursor-pointer hover:underline">
                {{ mark.desc || mark.url }}
              </span>
            </SheetTrigger>
            <MarkDetail :mark="mark" />
          </Sheet>
          <div class="mt-1">
            <a 
              :href="mark.url" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-xs text-blue-500 hover:underline truncate block"
            >
              {{ mark.url }}
            </a>
          </div>
        </div>

        <div v-else-if="mark.type === 'image' || mark.type === 'scan'" class="flex p-2">
           <div class="pr-2 flex-1 overflow-hidden text-xs">
            <div class="flex w-full items-center gap-2 text-muted-foreground mb-1">
              <span class="flex items-center gap-1 px-1 rounded text-white" :class="mark.type === 'image' ? 'bg-fuchsia-900' : 'bg-cyan-900'">
                {{ t(`record.mark.type.${mark.type}`) }}
              </span>
              <span class="ml-auto text-xs">{{ dayjs(mark.createdAt).fromNow() }}</span>
            </div>
            <Sheet>
              <SheetTrigger as-child>
                <span class="line-clamp-2 leading-4 mt-2 text-xs break-words cursor-pointer hover:underline">
                  {{ mark.desc || t('record.mark.noDesc') }}
                </span>
              </SheetTrigger>
              <MarkDetail :mark="mark" />
            </Sheet>
          </div>
           <div class="bg-zinc-900 flex items-center justify-center w-16 h-16 rounded overflow-hidden">
             <!-- Placeholder for image -->
             <img v-if="mark.url" :src="mark.url" class="object-cover w-full h-full" alt="mark" />
           </div>
        </div>
        
        <div v-else class="p-2">
           <!-- Fallback -->
            <div class="flex w-full items-center gap-2 text-muted-foreground text-xs mb-1">
            <span class="flex items-center gap-1 bg-gray-600 text-white px-1 rounded">
              {{ mark.type }}
            </span>
            <span class="ml-auto text-xs">{{ dayjs(mark.createdAt).fromNow() }}</span>
          </div>
           <Sheet>
            <SheetTrigger as-child>
              <span class="line-clamp-2 leading-4 mt-2 text-xs break-words cursor-pointer hover:underline">
                {{ mark.content || '' }}
              </span>
            </SheetTrigger>
            <MarkDetail :mark="mark" />
          </Sheet>
        </div>

      </ContextMenuTrigger>
      
      <ContextMenuContent>
         <ContextMenuItem @select="handleDelete">
            <TrashIcon class="size-4 mr-2" />
            {{ t('record.mark.delete') }}
         </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useI18n } from '@/hooks/useI18n'
import { Mark } from '@/db/marks'
import { useMarkStore } from '@/stores/mark'
import { useTagStore } from '@/stores/tag'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import { TrashIcon } from 'lucide-vue-next'
import MarkDetail from './MarkDetail.vue' // Need to create this

dayjs.extend(relativeTime)

const props = defineProps<{
  mark: Mark
}>()

const { t } = useI18n()
const markStore = useMarkStore()
const tagStore = useTagStore()

const handleDelete = async () => {
  await markStore.remove(props.mark.id)
  await markStore.fetchMarks()
  await tagStore.fetchTags()
}
</script>
