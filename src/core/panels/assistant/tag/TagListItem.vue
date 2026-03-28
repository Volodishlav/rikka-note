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

    <Dialog v-model:open="isRenameDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('record.mark.tag.rename') }}</DialogTitle>
          <DialogDescription>
            {{ t('record.mark.tag.enterTagName') }}
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <Input v-model="renameInput" @keydown.enter="confirmRename" :placeholder="t('record.mark.tag.tagName')" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isRenameDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button type="submit" @click="confirmRename">{{ t('common.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </SidebarMenuItem>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { TagIcon, Lightbulb } from 'lucide-vue-next'
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ask } from '@tauri-apps/plugin-dialog'
import MarkList from '../mark/MarkList.vue'
import { useTagStore } from '@/stores/tag'
import { useMarkStore } from '@/stores/mark'
import { useChatStore } from '@/stores/chat'
import { useI18n } from '@/hooks/useI18n'
import { logger } from '@/utils/logger'

const props = defineProps<{
  tag: any // Type definition for Tag
}>()

const tagStore = useTagStore()
const markStore = useMarkStore()
const chatStore = useChatStore()
const { t } = useI18n()

const isSelected = computed(() => tagStore.currentTagId === props.tag.id)
const isRenameDialogOpen = ref(false)
const renameInput = ref('')

async function handleSelect() {
  if (isSelected.value) return // Already selected
  
  tagStore.setCurrentTagId(props.tag.id)
  await markStore.fetchMarks()
  // await chatStore.init(props.tag.id) // Assuming this exists and is needed
}

async function handleTogglePin() {
  await tagStore.updateTagItem({ ...props.tag, isPin: !props.tag.isPin })
}

async function handleRename() {
  renameInput.value = props.tag.name
  isRenameDialogOpen.value = true
}

async function confirmRename() {
  if (!renameInput.value.trim()) return
  
  try {
    await tagStore.updateTagItem({ ...props.tag, name: renameInput.value.trim() })
    isRenameDialogOpen.value = false
  } catch (error) {
    logger.explorer.error('Failed to rename tag:', error)
  }
}

async function handleDelete() {
  try {
    const confirmed = await ask(`确定要删除标签 "${props.tag.name}" 吗？`, {
      title: t('record.mark.tag.delete'),
      kind: 'warning'
    })

    if (confirmed) {
      await tagStore.deleteTag(props.tag.id)
    }
  } catch (error) {
    logger.explorer.error('Failed to delete tag:', error)
  }
}
</script>
