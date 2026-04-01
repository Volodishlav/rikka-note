<!-- EncryptionSetting.vue - 设置页加密保护选项卡 -->
<template>
  <div class="space-y-6">
    <!-- 加密状态 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{{ t('settings.encryption.title') }}</h3>
      <p class="text-sm text-muted-foreground">{{ t('settings.encryption.description') }}</p>

      <!-- 当前状态 -->
      <div class="flex items-center gap-2 p-3 rounded-md bg-muted">
        <Lock v-if="encryptionStore.isPasswordSet" class="size-4 text-brand-purple" />
        <LockOpen v-else class="size-4 text-muted-foreground" />
        <span class="text-sm">
          {{ encryptionStore.isPasswordSet
            ? t('settings.encryption.passwordSet')
            : t('settings.encryption.passwordNotSet')
          }}
        </span>
        <span v-if="encryptionStore.isUnlocked" class="ml-auto text-xs text-brand-purple">
          🔓 {{ t('settings.encryption.unlocked') }}
        </span>
        <span v-else-if="encryptionStore.isPasswordSet" class="ml-auto text-xs text-muted-foreground">
          🔒 {{ t('settings.encryption.locked') }}
        </span>
      </div>
    </div>

    <!-- 设置 / 修改密码 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{{ t('settings.encryption.passwordManagement') }}</h3>

      <!-- 首次设置密码 -->
      <Button v-if="!encryptionStore.isPasswordSet" @click="showSetPasswordDialog = true">
        {{ t('settings.encryption.setPassword') }}
      </Button>

      <!-- 已设置密码时的操作 -->
      <div v-else class="flex gap-2">
        <Button variant="outline" @click="showChangePasswordDialog = true">
          {{ t('settings.encryption.changePassword') }}
        </Button>
        <Button
          v-if="encryptionStore.isUnlocked"
          variant="outline"
          @click="handleLock"
        >
          <Lock class="size-4 mr-1" />
          {{ t('settings.encryption.lockNow') }}
        </Button>
      </div>
    </div>

    <!-- 加密文件统计 -->
    <div v-if="encryptionStore.encryptedFiles.size > 0" class="space-y-2">
      <h3 class="text-lg font-medium">{{ t('settings.encryption.stats') }}</h3>
      <p class="text-sm text-muted-foreground">
        {{ t('settings.encryption.encryptedCount', { count: encryptionStore.encryptedFiles.size }) }}
      </p>
    </div>

    <!-- 安全提示 -->
    <div class="p-3 rounded-md border border-yellow-500/30 bg-yellow-500/5">
      <p class="text-sm text-yellow-600 dark:text-yellow-400">
        ⚠️ {{ t('settings.encryption.securityWarning') }}
      </p>
    </div>

    <!-- 设置密码对话框 -->
    <PasswordDialog
      :visible="showSetPasswordDialog"
      :title="t('settings.encryption.setPassword')"
      :description="t('settings.encryption.setPasswordDesc')"
      :password-label="t('encryption.dialog.password')"
      :password-placeholder="t('encryption.dialog.passwordPlaceholder')"
      :submit-label="t('settings.encryption.setPassword')"
      :confirm-mode="true"
      :show-warning="true"
      @submit="handleSetPassword"
      @cancel="showSetPasswordDialog = false"
    />

    <!-- 修改密码对话框 -->
    <div v-if="showChangePasswordDialog" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showChangePasswordDialog = false" />
      <div class="relative bg-background border rounded-lg shadow-lg w-[400px] p-6 space-y-4">
        <h3 class="text-lg font-semibold">{{ t('settings.encryption.changePassword') }}</h3>

        <div class="space-y-3">
          <div class="space-y-1.5">
            <label class="text-sm font-medium">{{ t('settings.encryption.oldPassword') }}</label>
            <input
              v-model="oldPassword"
              type="password"
              :placeholder="t('settings.encryption.oldPasswordPlaceholder')"
              class="w-full h-9 px-3 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">{{ t('settings.encryption.newPassword') }}</label>
            <input
              v-model="newPassword"
              type="password"
              :placeholder="t('settings.encryption.newPasswordPlaceholder')"
              class="w-full h-9 px-3 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">{{ t('encryption.dialog.confirmPassword') }}</label>
            <input
              v-model="newPasswordConfirm"
              type="password"
              :placeholder="t('encryption.dialog.confirmPasswordPlaceholder')"
              class="w-full h-9 px-3 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
            <p v-if="newPasswordConfirm && newPassword !== newPasswordConfirm" class="text-xs text-destructive">
              {{ t('encryption.dialog.passwordMismatch') }}
            </p>
          </div>
        </div>

        <p v-if="changeError" class="text-sm text-destructive">{{ changeError }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="showChangePasswordDialog = false">{{ t('common.cancel') }}</Button>
          <Button
            :disabled="!oldPassword || !newPassword || newPassword !== newPasswordConfirm || changing"
            @click="handleChangePassword"
          >
            {{ changing ? t('settings.encryption.changing') : t('common.confirm') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Lock, LockOpen } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import { useEncryptionStore } from '@/stores/encryption'
import { useToast } from '@/composables/useToast'
import PasswordDialog from '@/core/pages/setting/encryption/PasswordDialog.vue'
import { logger } from '@/utils/logger'

const { t } = useI18n()
const encryptionStore = useEncryptionStore()
const { show } = useToast()

const showSetPasswordDialog = ref(false)
const showChangePasswordDialog = ref(false)

// 修改密码状态
const oldPassword = ref('')
const newPassword = ref('')
const newPasswordConfirm = ref('')
const changeError = ref('')
const changing = ref(false)

// 首次设置密码（调用后端 setup_encryption）
async function handleSetPassword(password: string) {
  try {
    await encryptionStore.setupEncryption(password)
    showSetPasswordDialog.value = false
    show({ title: t('settings.encryption.setPasswordSuccess'), variant: 'success' })
  } catch (e) {
    logger.auth.error('设置密码失败:', e)
    show({ title: t('settings.encryption.setPasswordFailed'), variant: 'error' })
  }
}

// 修改密码（O(1) 操作，只重新加密 DEK）
async function handleChangePassword() {
  if (newPassword.value !== newPasswordConfirm.value) return
  changeError.value = ''
  changing.value = true

  try {
    await encryptionStore.changePassword(oldPassword.value, newPassword.value)
    showChangePasswordDialog.value = false
    show({ title: t('settings.encryption.changePasswordSuccess'), variant: 'success' })
    // 清空
    oldPassword.value = ''
    newPassword.value = ''
    newPasswordConfirm.value = ''
  } catch (e) {
    changeError.value = t('settings.encryption.changePasswordFailed')
    logger.auth.error('修改密码失败:', e)
  } finally {
    changing.value = false
  }
}

// 锁定（清除后端内存中的 DEK）
async function handleLock() {
  await encryptionStore.lock()
  show({ title: t('settings.encryption.lockedSuccess'), variant: 'success' })
}
</script>
