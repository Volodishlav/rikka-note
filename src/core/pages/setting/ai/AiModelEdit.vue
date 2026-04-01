<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? t('settings.ai.editDialog.editTitle') : t('settings.ai.editDialog.addTitle') }}</DialogTitle>
        <DialogDescription>
          {{ t('settings.ai.editDialog.description') }}
        </DialogDescription>
      </DialogHeader>
      
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="title" class="text-right">{{ t('settings.ai.editDialog.titleLabel') }}</Label>
          <Input id="title" v-model="form.title" class="col-span-3" :placeholder="t('settings.ai.editDialog.titlePlaceholder')" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="key" class="text-right">{{ t('settings.ai.editDialog.keyLabel') }}</Label>
          <Input id="key" v-model="form.key" class="col-span-3" :disabled="isEdit" :placeholder="t('settings.ai.editDialog.keyPlaceholder')" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="baseURL" class="text-right">{{ t('settings.ai.editDialog.baseURLLabel') }}</Label>
          <Input id="baseURL" v-model="form.baseURL" class="col-span-3" :placeholder="t('settings.ai.editDialog.baseURLPlaceholder')" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="apiKey" class="text-right">{{ t('settings.ai.editDialog.apiKeyLabel') }}</Label>
          <Input id="apiKey" v-model="form.apiKey" type="password" class="col-span-3" :placeholder="t('settings.ai.editDialog.apiKeyPlaceholder')" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="model" class="text-right">{{ t('settings.ai.editDialog.modelNameLabel') }}</Label>
          <Input id="model" v-model="form.model" class="col-span-3" :placeholder="t('settings.ai.editDialog.modelNamePlaceholder')" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="modelType" class="text-right">{{ t('settings.ai.editDialog.typeLabel') }}</Label>
          <Select v-model="form.modelType">
            <SelectTrigger class="col-span-3">
              <SelectValue :placeholder="t('settings.ai.editDialog.typePlaceholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chat">{{ t('settings.ai.types.chat') }}</SelectItem>
              <SelectItem value="embedding">{{ t('settings.ai.types.embedding') }}</SelectItem>
              <SelectItem value="rerank">{{ t('settings.ai.types.rerank') }}</SelectItem>
              <SelectItem value="image">{{ t('settings.ai.types.image') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="temperature" class="text-right">{{ t('settings.ai.editDialog.temperatureLabel') }}</Label>
          <Input id="temperature" v-model.number="form.temperature" type="number" step="0.1" min="0" max="2" class="col-span-3" />
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">{{ t('settings.ai.editDialog.cancel') }}</Button>
        <Button @click="save">{{ t('settings.ai.editDialog.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { AiConfig } from '@/lib/ai.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const { t } = useI18n()

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
  modelType: 'chat',
  temperature: 0.7,
  topP: 1
})

watch(() => props.open, (newVal: boolean) => {
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
        modelType: 'chat',
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
