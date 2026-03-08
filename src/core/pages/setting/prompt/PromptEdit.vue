<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Edit Prompt' : 'Add Prompt' }}</DialogTitle>
        <DialogDescription>
          Configure your prompt settings here.
        </DialogDescription>
      </DialogHeader>
      
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="title" class="text-right">Title</Label>
          <Input id="title" v-model="form.title" class="col-span-3" placeholder="e.g. Translation Assistant" />
        </div>
        <div class="grid grid-cols-4 items-start gap-4">
          <Label for="content" class="text-right mt-2">Content</Label>
          <Textarea id="content" v-model="form.content" class="col-span-3 min-h-[100px]" placeholder="You are a helpful assistant..." />
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button @click="save">Save</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Prompt } from '@/stores/prompt'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const props = defineProps<{
  open: boolean
  prompt?: Prompt
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', prompt: Partial<Prompt>): void
}>()

const isEdit = ref(false)
const form = ref<Partial<Prompt>>({
  title: '',
  content: ''
})

watch(() => props.open, (newVal) => {
  if (newVal) {
    if (props.prompt) {
      isEdit.value = true
      form.value = { ...props.prompt }
    } else {
      isEdit.value = false
      form.value = {
        title: '',
        content: ''
      }
    }
  }
})

const save = () => {
  emit('save', { ...form.value })
  emit('update:open', false)
}
</script>
