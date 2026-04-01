<!-- PasswordDialog.vue - 可复用的密码输入对话框 -->
<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- 遮罩 -->
    <div class="absolute inset-0 bg-black/50" @click="handleCancel" />

    <!-- 对话框 -->
    <div class="relative bg-background border rounded-lg shadow-lg w-[400px] p-6 space-y-4">
      <h3 class="text-lg font-semibold">{{ title }}</h3>
      <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>

      <!-- 密码输入 -->
      <div class="space-y-3">
        <div class="space-y-1.5">
          <label class="text-sm font-medium">{{ passwordLabel }}</label>
          <div class="relative">
            <input
              ref="passwordInputRef"
              v-model="password"
              :placeholder="passwordPlaceholder"
              class="w-full h-9 px-3 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
              @keydown.enter="handleSubmit"
            />
          </div>
        </div>

        <!-- 确认密码（设置模式） -->
        <div v-if="confirmMode" class="space-y-1.5">
          <label class="text-sm font-medium">{{ t('encryption.dialog.confirmPassword') }}</label>
          <input
            v-model="confirmPassword"
            type="password"
            :placeholder="t('encryption.dialog.confirmPasswordPlaceholder')"
            class="w-full h-9 px-3 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
            @keydown.enter="handleSubmit"
          />
          <p v-if="confirmPassword && password !== confirmPassword" class="text-xs text-destructive">
            {{ t('encryption.dialog.passwordMismatch') }}
          </p>
        </div>
      </div>

      <!-- 错误信息 -->
      <p v-if="errorMessage" class="text-sm text-destructive">{{ errorMessage }}</p>

      <!-- 安全提示 -->
      <p v-if="showWarning" class="text-xs text-muted-foreground bg-muted p-2 rounded">
        ⚠️ {{ t('encryption.dialog.warning') }}
      </p>

      <!-- 按钮区 -->
      <div class="flex justify-end gap-2 pt-2">
        <Button variant="outline" @click="handleCancel">{{ t('common.cancel') }}</Button>
        <Button
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

interface Props {
  visible: boolean
  title: string
  description?: string
  passwordLabel?: string
  passwordPlaceholder?: string
  submitLabel?: string
  confirmMode?: boolean  // true: 需要二次确认密码（设置密码场景）
  showWarning?: boolean  // 显示不可恢复警告
}

const props = withDefaults(defineProps<Props>(), {
  passwordLabel: '密码',
  passwordPlaceholder: '请输入密码',
  submitLabel: '确认',
  confirmMode: false,
  showWarning: false
})

const emit = defineEmits<{
  (e: 'submit', password: string): void
  (e: 'cancel'): void
}>()

const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const passwordInputRef = ref<HTMLInputElement>()

const canSubmit = computed(() => {
  if (!password.value) return false
  if (props.confirmMode && password.value !== confirmPassword.value) return false
  return true
})

// 聚焦到密码输入框
watch(() => props.visible, async (val: boolean) => {
  if (val) {
    password.value = ''
    confirmPassword.value = ''
    errorMessage.value = ''
    await nextTick()
    passwordInputRef.value?.focus()
  }
})

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', password.value)
}

function handleCancel() {
  emit('cancel')
}

/** 外部设置错误信息 */
function setError(msg: string) {
  errorMessage.value = msg
}

defineExpose({ setError })
</script>
