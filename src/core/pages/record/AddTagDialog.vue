<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>{{ t('record.tag.addNewTag') }}</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">{{ t('record.tag.tagName') }}</label>
          <input
              ref="inputRef"
              v-model="tagName"
              type="text"
              :placeholder="t('record.tag.enterTagName')"
              class="w-full px-3 py-2 rounded border border-input bg-background"
              @keydown.enter="handleSubmit"
          />
        </div>

        <div v-if="errorMessage" class="text-sm text-destructive">
          {{ errorMessage }}
        </div>

        <div class="flex gap-2 justify-end">
          <Button
              variant="outline"
              @click="$emit('update:open', false)"
              :disabled="isSubmitting"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
              :disabled="!tagName.trim() || isSubmitting"
              :loading="isSubmitting"
              @click="handleSubmit"
          >
            {{ t('common.confirm') }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Button from '@/components/ui/button/Button.vue'

const { t } = useI18n()

interface Props {
  open?: boolean
}

withDefaults(defineProps<Props>(), {
  open: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  add: [name: string]
}>()

const tagName = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const inputRef = ref<HTMLInputElement>()

// 监听打开状态，清除输入
watch(
    () => emit,
    () => {
      tagName.value = ''
      errorMessage.value = ''
    }
)

function handleSubmit() {
  if (!tagName.value.trim()) {
    errorMessage.value = t('record.tag.nameCantBeEmpty')
    return
  }

  isSubmitting.value = true
  try {
    emit('add', tagName.value.trim())
    tagName.value = ''
    errorMessage.value = ''
  } finally {
    isSubmitting.value = false
  }
}
</script>