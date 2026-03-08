<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Edit Model' : 'Add Model' }}</DialogTitle>
        <DialogDescription>
          Configure your AI model settings here.
        </DialogDescription>
      </DialogHeader>
      
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="title" class="text-right">Title</Label>
          <Input id="title" v-model="form.title" class="col-span-3" placeholder="e.g. My OpenAI" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="key" class="text-right">Key (ID)</Label>
          <Input id="key" v-model="form.key" class="col-span-3" :disabled="isEdit" placeholder="unique_key" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="baseURL" class="text-right">Base URL</Label>
          <Input id="baseURL" v-model="form.baseURL" class="col-span-3" placeholder="https://api.openai.com/v1" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="apiKey" class="text-right">API Key</Label>
          <Input id="apiKey" v-model="form.apiKey" type="password" class="col-span-3" placeholder="sk-..." />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="model" class="text-right">Model Name</Label>
          <Input id="model" v-model="form.model" class="col-span-3" placeholder="gpt-4o" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="temperature" class="text-right">Temperature</Label>
          <Input id="temperature" v-model.number="form.temperature" type="number" step="0.1" min="0" max="2" class="col-span-3" />
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
import { AiConfig } from '@/types/ai'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label' // Assuming Label exists or I use standard label

const props = defineProps<{
  open: boolean
  config?: AiConfig
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', config: AiConfig): void
}>()

const isEdit = ref(false)
const form = ref<AiConfig>({
  key: '',
  title: '',
  baseURL: '',
  apiKey: '',
  model: '',
  temperature: 0.7,
  topP: 1
})

watch(() => props.open, (newVal) => {
  if (newVal) {
    if (props.config) {
      isEdit.value = true
      form.value = { ...props.config }
    } else {
      isEdit.value = false
      form.value = {
        key: '',
        title: '',
        baseURL: '',
        apiKey: '',
        model: '',
        temperature: 0.7,
        topP: 1
      }
    }
  }
})

const save = () => {
  emit('save', { ...form.value })
  emit('update:open', false)
}
</script>
