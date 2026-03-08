<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium">Prompts</h3>
      <Button @click="openAddDialog">
        <Plus class="mr-2 h-4 w-4" /> Add Prompt
      </Button>
    </div>

    <div class="grid gap-4">
      <div v-for="prompt in promptStore.promptList" :key="prompt.id" 
           class="flex items-center justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <div class="flex-1 min-w-0 mr-4">
          <div class="font-medium flex items-center gap-2">
            {{ prompt.title }}
            <span v-if="promptStore.currentPrompt?.id === prompt.id" class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Active</span>
            <span v-if="prompt.isDefault" class="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">System Default</span>
          </div>
          <div class="text-sm text-muted-foreground truncate mt-1">{{ prompt.content }}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" @click="setAsCurrent(prompt)" title="Set as Active" :disabled="promptStore.currentPrompt?.id === prompt.id">
            <CheckCircle2 class="h-4 w-4" :class="{'text-primary': promptStore.currentPrompt?.id === prompt.id}" />
          </Button>
          <Button variant="ghost" size="icon" @click="editPrompt(prompt)">
            <Pencil class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" class="text-destructive hover:text-destructive" @click="deletePrompt(prompt.id)" :disabled="prompt.isDefault">
            <Trash2 class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <PromptEdit 
      v-model:open="showEditDialog" 
      :prompt="currentEditPrompt" 
      @save="handleSave" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePromptStore, Prompt } from '@/stores/prompt'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-vue-next'
import PromptEdit from './PromptEdit.vue'

const promptStore = usePromptStore()
const showEditDialog = ref(false)
const currentEditPrompt = ref<Prompt | undefined>(undefined)

onMounted(() => {
  promptStore.initPromptData()
})

const openAddDialog = () => {
  currentEditPrompt.value = undefined
  showEditDialog.value = true
}

const editPrompt = (prompt: Prompt) => {
  currentEditPrompt.value = prompt
  showEditDialog.value = true
}

const handleSave = async (promptData: Partial<Prompt>) => {
  if (currentEditPrompt.value) {
    // Update
    await promptStore.updatePrompt({
      ...currentEditPrompt.value,
      ...promptData
    } as Prompt)
  } else {
    // Add
    await promptStore.addPrompt(promptData as Omit<Prompt, 'id'>)
  }
}

const deletePrompt = async (id: string) => {
  if (confirm('Are you sure you want to delete this prompt?')) {
    await promptStore.deletePrompt(id)
  }
}

const setAsCurrent = async (prompt: Prompt) => {
  await promptStore.setCurrentPrompt(prompt)
}
</script>
