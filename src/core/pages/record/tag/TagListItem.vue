<template>
  <SidebarMenuItem>
    <ContextMenu>
      <ContextMenuTrigger as-child>
        <SidebarMenuButton 
           :isActive="isSelected" 
           @click="handleSelect"
           class="w-full justify-between group-data-[collapsible=icon]:justify-center"
        >
           <div class="flex items-center gap-2 overflow-hidden">
             <component :is="tag.name === 'Idea' ? Lightbulb : TagIcon" class="size-4 shrink-0" />
             <span class="truncate">{{ tag.name }}</span>
           </div>
           <span class="ml-auto text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">{{ tag.total || 0 }}</span>
        </SidebarMenuButton>
      </ContextMenuTrigger>
      <ContextMenuContent>
         <ContextMenuItem :disabled="tag.isLocked" @click="handleTogglePin">
            {{ tag.isPin ? t('record.mark.tag.unpin') : t('record.mark.tag.pin') }}
         </ContextMenuItem>
         <ContextMenuItem :disabled="false" @click="handleRename">
            {{ t('record.mark.tag.rename') }}
         </ContextMenuItem>
         <ContextMenuItem :disabled="tag.isLocked" @click="handleDelete" class="text-red-500 focus:text-red-500">
            {{ t('record.mark.tag.delete') }}
         </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    
    <!-- Nested MarkList (Accordion Content) -->
    <div v-if="isSelected" class="pl-4 border-l border-border ml-2 my-1 mr-2">
       <MarkList />
    </div>

    <!-- Rename Dialog (Can be implemented inside or via global state, keeping it simple for now) -->
    <!-- Ideally, use a dialog or inline edit. For now, skipping implementation details of rename/delete logic inside Item to keep it clean, 
         assuming handleRename/handleDelete will trigger parent or store actions -->
  </SidebarMenuItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TagIcon, Lightbulb } from 'lucide-vue-next'
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import MarkList from '../mark/MarkList.vue'
import { useTagStore } from '@/stores/tag'
import { useMarkStore } from '@/stores/mark'
import { useChatStore } from '@/stores/chat'
import { useI18n } from '@/hooks/useI18n'
// import { confirm } from '@tauri-apps/plugin-dialog' // If needed for delete

const props = defineProps<{
  tag: any // Type definition for Tag
}>()

const tagStore = useTagStore()
const markStore = useMarkStore()
const chatStore = useChatStore()
const { t } = useI18n()

const isSelected = computed(() => tagStore.currentTagId === props.tag.id)

async function handleSelect() {
  if (isSelected.value) return // Already selected
  
  tagStore.setCurrentTagId(props.tag.id)
  await markStore.fetchMarks()
  // await chatStore.init(props.tag.id) // Assuming this exists and is needed
}

async function handleTogglePin() {
  // Implement pin toggle
  // await tagStore.updateTag({ ...props.tag, isPin: !props.tag.isPin })
  // await tagStore.fetchTags()
}

async function handleRename() {
  // Trigger rename dialog
}

async function handleDelete() {
  // Trigger delete confirmation
}
</script>