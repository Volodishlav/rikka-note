<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h3 class="text-lg font-medium">{{ t('settings.prompt.title') }}</h3>
      <p class="text-sm text-muted-foreground">{{ t('settings.prompt.desc') }}</p>
    </div>

    <div class="flex flex-col gap-4">
      <div class="flex justify-between items-center">
        <Dialog v-model:open="dialogOpen">
          <DialogTrigger as-child>
            <Button variant="outline" size="sm" @click="handleOpenAddDialog">
              <Plus class="h-4 w-4 mr-2" />
              {{ t('settings.prompt.addPrompt') }}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{{ t('settings.prompt.addPrompt') }}</DialogTitle>
              <DialogDescription>{{ t('settings.prompt.addPromptDesc') }}</DialogDescription>
            </DialogHeader>
            <div class="grid gap-4 py-4">
              <div class="grid gap-2">
                <label for="title" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{{ t('settings.prompt.promptTitle') }}</label>
                <Input
                  id="title"
                  v-model="newTitle"
                  :placeholder="t('settings.prompt.promptTitlePlaceholder')"
                />
              </div>
              <div class="grid gap-2">
                <label for="content" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{{ t('settings.prompt.promptContent') }}</label>
                <div class="space-y-2">
                  <Textarea
                    id="content"
                    v-model="newContent"
                    :placeholder="t('settings.prompt.promptContentPlaceholder')"
                    rows="5"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="handleOptimizePrompt"
                    :disabled="isOptimizing || !newContent.trim()"
                    class="w-full"
                  >
                    <Sparkles class="h-4 w-4 mr-2" />
                    {{ isOptimizing ? t('settings.prompt.optimizing') : t('settings.prompt.optimizePrompt') }}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" @click="dialogOpen = false">{{ t('common.cancel') }}</Button>
              <Button @click="handleAddPrompt">{{ t('common.confirm') }}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div class="grid gap-4">
        <div
          v-for="prompt in promptStore.promptList"
          :key="prompt.id"
          class="rounded-lg border bg-card text-card-foreground shadow-sm"
        >
          <div class="p-4">
            <div v-if="editingId === prompt.id" class="flex flex-col gap-4">
              <Input
                v-model="newTitle"
                :placeholder="t('settings.prompt.promptTitlePlaceholder')"
              />
              <div class="space-y-2">
                <Textarea
                  v-model="newContent"
                  :placeholder="t('settings.prompt.promptContentPlaceholder')"
                  rows="5"
                />
              </div>
              <div class="flex justify-between items-center gap-2">
                <Button
                  v-if="!prompt.isDefault"
                  variant="destructive"
                  size="sm"
                  @click="handleDeletePrompt(prompt.id)"
                >
                  <Trash2 class="h-4 w-4 mr-2" />
                  {{ t('common.delete') }}
                </Button>
                <div class="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="handleOptimizePrompt"
                    :disabled="isOptimizing || !newContent.trim()"
                  >
                    <Sparkles class="h-4 w-4 mr-2" />
                    {{ isOptimizing ? t('settings.prompt.optimizing') : t('settings.prompt.optimizePrompt') }}
                  </Button>
                  <Button variant="outline" size="sm" @click="handleCancelEdit">
                    <X class="h-4 w-4 mr-2" />
                    {{ t('common.cancel') }}
                  </Button>
                  <Button size="sm" @click="handleSaveEdit(prompt.id)">
                    <Check class="h-4 w-4 mr-2" />
                    {{ t('common.save') }}
                  </Button>
                </div>
              </div>
            </div>
            <div v-else class="flex justify-between items-center">
              <div>
                <h4 class="font-medium flex items-center gap-2">
                  {{ prompt.title }}
                  <span v-if="prompt.isDefault" class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>
                </h4>
                <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ prompt.content }}</p>
              </div>
              <div class="flex gap-2">
                <Button variant="ghost" size="icon" @click="handleStartEdit(prompt)">
                  <Pencil class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { usePromptStore, type Prompt } from '@/stores/prompt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, Check, X, Sparkles } from 'lucide-vue-next'
import { useAI } from '@/composables/useAI'
import { useToast } from '@/composables/useToast'

const { t, locale } = useI18n()
const toast = useToast()
const promptStore = usePromptStore()
const { fetchAi } = useAI()

const editingId = ref<string | null>(null)
const newTitle = ref('')
const newContent = ref('')
const dialogOpen = ref(false)
const isOptimizing = ref(false)

onMounted(() => {
  promptStore.initPromptData()
})

const handleOpenAddDialog = () => {
  newTitle.value = ''
  newContent.value = ''
  dialogOpen.value = true
}

const handleAddPrompt = async () => {
  if (!newTitle.value.trim()) return
  await promptStore.addPrompt({
    title: newTitle.value,
    content: newContent.value
  })
  newTitle.value = ''
  newContent.value = ''
  dialogOpen.value = false
  toast.success(t('common.saveSuccess'))
}

const handleStartEdit = (prompt: Prompt) => {
  editingId.value = prompt.id
  newTitle.value = prompt.title
  newContent.value = prompt.content
}

const handleCancelEdit = () => {
  editingId.value = null
  newTitle.value = ''
  newContent.value = ''
}

const handleSaveEdit = async (id: string) => {
  const prompt = promptStore.promptList.find(p => p.id === id)
  if (!prompt) return

  if (!newTitle.value.trim()) return
  await promptStore.updatePrompt({
    ...prompt,
    title: newTitle.value,
    content: newContent.value
  })
  editingId.value = null
  toast.success(t('common.saveSuccess'))
}

const handleDeletePrompt = async (id: string) => {
  if (confirm(t('common.confirmDelete'))) {
    await promptStore.deletePrompt(id)
    toast.success(t('common.deleteSuccess'))
  }
}

const handleOptimizePrompt = async () => {
  if (!newContent.value.trim()) {
    toast.error(t('settings.prompt.noContentToOptimize'))
    return
  }

  isOptimizing.value = true
  try {
    const optimizationPrompt = `
      Please optimize the following prompt, use ${locale.value} language, making it clearer, more specific, and more effective. 
      Maintain the original meaning while improving expression, adding necessary context, optimizing structure and logic. 
      Please directly return the optimized prompt content, without adding any additional explanation:

${newContent.value}`
    
    const optimizedContent = await fetchAi(optimizationPrompt)
    if (optimizedContent) {
      newContent.value = optimizedContent.trim()
      toast.success(t('settings.prompt.optimizeSuccess'))
    }
  } catch (error) {
    console.error(error)
    toast.error(t('common.error'))
  } finally {
    isOptimizing.value = false
  }
}
</script>
