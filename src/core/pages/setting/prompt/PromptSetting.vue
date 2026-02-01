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
              <div class="flex justify-end gap-2">
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
            <div v-else class="flex flex-col gap-2">
              <div class="flex justify-between items-center">
                <h3 class="font-medium">{{ prompt.title }}</h3>
                <div class="flex gap-2">
                  <Button variant="ghost" size="sm" @click="handleStartEdit(prompt)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="handleDeletePrompt(prompt.id)"
                    :disabled="prompt.isDefault"
                  >
                    <Trash class="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p class="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                {{ prompt.content || t('settings.prompt.noContent') }}
              </p>
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
import { Plus, Trash, Pencil, Check, X, Sparkles } from 'lucide-vue-next'
import { useAI } from '@/composables/useAI'
import { useToast } from '@/components/ui/toast/use-toast'

const { t } = useI18n()
const { toast } = useToast()
const promptStore = usePromptStore()
const { fetchAiStream } = useAI() // useAI provides fetchAiStream, need to check if it provides fetchAi or I implement it using stream

const editingId = ref<string | null>(null)
const newTitle = ref('')
const newContent = ref('')
const dialogOpen = ref(false)
const isOptimizing = ref(false)

onMounted(() => {
  promptStore.initPromptData()
})

const handleAddPrompt = async () => {
  if (!newTitle.value.trim()) return
  await promptStore.addPrompt({
    title: newTitle.value,
    content: newContent.value
  })
  newTitle.value = ''
  newContent.value = ''
  dialogOpen.value = false
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
}

const handleDeletePrompt = async (id: string) => {
  await promptStore.deletePrompt(id)
}

const handleOpenAddDialog = () => {
  newTitle.value = ''
  newContent.value = ''
  dialogOpen.value = true
}

const handleOptimizePrompt = async () => {
  if (!newContent.value.trim()) {
    toast({
      description: t('settings.prompt.noContentToOptimize'),
      variant: 'destructive'
    })
    return
  }

  isOptimizing.value = true
  try {
    const optimizationPrompt = `
      Please optimize the following prompt, use Chinese language, making it clearer, more specific, and more effective. 
      Maintain the original meaning while improving expression, adding necessary context, optimizing structure and logic. 
      Please directly return the optimized prompt content, without adding any additional explanation:

      ${newContent.value}`

    // Simple implementation using fetchAiStream but accumulating result
    let optimizedContent = ''
    await fetchAiStream(optimizationPrompt, async (chunk) => {
      optimizedContent += chunk
    })

    if (optimizedContent) {
      newContent.value = optimizedContent
      toast({
        description: t('settings.prompt.optimizeSuccess')
      })
    } else {
      toast({
        description: t('settings.prompt.optimizeFailed'),
        variant: 'destructive'
      })
    }
  } catch (e) {
    toast({
      description: t('settings.prompt.optimizeFailed'),
      variant: 'destructive'
    })
  } finally {
    isOptimizing.value = false
  }
}
</script>
