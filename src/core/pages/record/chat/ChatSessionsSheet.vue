<template>
  <Sheet :open="isOpen" @update:open="emit('update:open', $event)">
    <SheetContent side="right" class="w-[300px] sm:w-[400px] flex flex-col p-0" aria-describedby="chat-sessions-desc">
      <SheetHeader class="px-4 py-4 border-b">
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="icon" @click="createNewSession" :title="t('record.chat.sessions.new')">
            <Plus class="w-4 h-4" />
          </Button>
          <SheetTitle class="text-lg font-semibold">{{ t('record.chat.sessions.title') }}</SheetTitle>
          <SheetDescription id="chat-sessions-desc" class="sr-only">
            {{ t('record.chat.sessions.title') }}
          </SheetDescription>
        </div>
      </SheetHeader>
      
      <div class="flex-1 overflow-y-auto p-2 space-y-2">
        <template v-if="chatStore.sessions.length > 0">
          <div 
            v-for="session in chatStore.sessions" 
            :key="session.id"
            class="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors group"
            :class="{ 'bg-muted border-primary/50': chatStore.currentSessionId === session.id }"
            @click="selectSession(session.id)"
          >
            <div class="flex items-center gap-3 flex-1 overflow-hidden">
              <MessageSquare class="w-4 h-4 shrink-0 text-muted-foreground" />
              <input 
                v-if="editingId === session.id"
                type="text"
                v-model="editTitleValue"
                class="flex-1 bg-transparent border-none outline-none text-sm font-medium focus:ring-0 p-0"
                @blur="saveEditTitle(session.id)"
                @keyup.enter="saveEditTitle(session.id)"
                ref="editInput"
              />
              <span v-else class="truncate text-sm font-medium">{{ session.title }}</span>
            </div>
            
            <div class="flex items-center opacity-0 group-hover:opacity-100 shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                class="h-6 w-6 text-muted-foreground hover:text-foreground mr-1"
                @click.stop="startEditTitle(session)"
                :title="t('record.chat.sessions.editTitle')"
              >
                <Pencil class="w-3 h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                class="h-6 w-6 text-muted-foreground hover:text-destructive"
                @click.stop="deleteSession(session.id)"
                :title="t('record.chat.sessions.deleteTitle')"
              >
                <Trash2 class="w-3 h-3" />
              </Button>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-sm">
            {{ t('record.chat.sessions.empty') }}
          </div>
        </template>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat'
import { Plus, MessageSquare, Trash2, Pencil } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ask } from '@tauri-apps/plugin-dialog'
import { useI18n } from '@/hooks/useI18n'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const chatStore = useChatStore()
const { t } = useI18n()

// Rename state
const editingId = ref<number | null>(null)
const editTitleValue = ref('')
const editInput = ref<HTMLInputElement[] | null>(null)

const startEditTitle = async (session: { id: number, title: string }) => {
  editingId.value = session.id
  editTitleValue.value = session.title
  await nextTick()
  if (editInput.value && editInput.value.length > 0) {
    editInput.value[0].focus()
  }
}

const saveEditTitle = async (id: number) => {
  if (editingId.value === id) {
    const newTitle = editTitleValue.value.trim()
    if (newTitle) {
      await chatStore.editSessionTitle(id, newTitle)
    }
    editingId.value = null
  }
}

const createNewSession = async () => {
  // Check if current session is empty to avoid creating duplicate empty sessions
  if (chatStore.currentSessionId && chatStore.chats.length === 0) {
    emit('update:open', false)
    return
  }

  // Clear currently shown chats immediately by creating a new empty session placeholder
  const newId = await chatStore.createSession() // Let it rely on the default logic for title
  if (newId) {
    emit('update:open', false)
  }
}

const selectSession = async (id: number) => {
  if (chatStore.currentSessionId !== id) {
    await chatStore.switchSession(id)
  }
  emit('update:open', false)
}

const deleteSession = async (id: number) => {
  const confirmed = await ask(t('record.chat.sessions.deleteConfirm'), {
    title: t('record.chat.sessions.deleteTitle'),
    kind: 'warning'
  })
  
  if (confirmed) {
    await chatStore.removeSession(id)
  }
}
</script>
