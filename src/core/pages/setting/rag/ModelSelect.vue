<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <component :is="icon" class="h-4 w-4" v-if="icon" />
        <Label>{{ label }}</Label>
      </div>
      <Select :model-value="modelValue || ''" @update:model-value="updateModel">
        <SelectTrigger class="w-[200px]">
          <SelectValue :placeholder="placeholder || 'Select Model'" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="model in settingStore.aiModelList" :key="model.key" :value="model.key">
            {{ model.title }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="text-sm text-muted-foreground" v-if="description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from '@/stores/setting'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { Component } from 'vue'

const settingStore = useSettingStore()

defineProps<{
  label: string
  description?: string
  placeholder?: string
  modelValue: string | null
  icon?: Component
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const updateModel = (val: string) => {
  emit('update:modelValue', val)
}
</script>
