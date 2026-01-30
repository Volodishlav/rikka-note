<template>
  <div class="border-t bg-background p-4 flex-shrink-0">
    <div class="max-w-4xl mx-auto w-full space-y-3">
      <!-- 占位符提示（AI生成的建议） -->
      <div
          v-if="showPlaceholder && placeholder"
          class="text-sm text-muted-foreground px-3 py-2 rounded bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
          @click="insertPlaceholder"
      >
        <span class="opacity-60">{{ placeholder }}</span>
        <span class="ml-1 opacity-40 text-xs">[Tab]</span>
      </div>

      <!-- 链接文件显示（如果有） -->
      <div v-if="linkedFile" class="flex items-center gap-2 px-3 py-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <FileIcon class="size-4 text-blue-600 dark:text-blue-400" />
        <span class="text-sm text-blue-900 dark:text-blue-100">{{ linkedFile.name }}</span>
        <button
            @click="removeLinkedFile"
            class="ml-auto p-1 hover:bg-blue-200 dark:hover:bg-blue-900 rounded"
        >
          <XIcon class="size-4" />
        </button>
      </div>

      <!-- 输入框容器 -->
      <div class="border rounded-lg bg-card p-3 space-y-3">
        <!-- 工具栏 -->
        <div class="flex items-center gap-2 flex-wrap">
          <select
              v-model="inputMode"
              class="text-xs px-2 py-1 rounded border border-border bg-background"
          >
            <option value="chat">{{ t('record.chat.input.mode.chat') }}</option>
            <option value="translate">{{ t('record.chat.input.mode.translate') }}</option>
            <option value="organize">{{ t('record.chat.input.mode.organize') }}</option>
          </select>

          <button
              @click="togglePlaceholder"
              :class="[
              'text-xs px-2 py-1 rounded border transition-colors',
              showPlaceholder
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            ]"
              :title="t('record.chat.input.togglePlaceholder')"
          >
            ✨
          </button>

          <button
              @click="selectFile"
              class="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
              :title="t('record.chat.input.linkFile')"
          >
            <LinkIcon class="size-3 inline mr-1" />
            {{ t('record.chat.input.link') }}
          </button>

          <button
              @click="clearContext"
              class="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors ml-auto"
              :title="t('record.chat.input.clearContext')"
          >
            <Trash2Icon class="size-3 inline mr-1" />
            {{ t('record.chat.input.clear') }}
          </button>
        </div>

        <!-- 输入框 -->
        <textarea
            ref="textareaRef"
            v-model="inputText"
            :placeholder="t('record.chat.input.placeholder')"
            class="w-full min-h-20 max-h-64 p-0 resize-none border-0 focus:outline-none bg-transparent text-sm"
            @keydown.enter="handleKeyDown"
            @keydown.tab="insertPlaceholder"
            @input="handleInput"
            @keydown.arrow-up="navigateHistory('up')"
            @keydown.arrow-down="navigateHistory('down')"
        />

        <!-- 字数统计 -->
        <div class="text-xs text-muted-foreground text-right">
          {{ inputText.length }} / 4000
        </div>
      </div>

      <!-- 发送按钮 -->
      <div class="flex gap-2 justify-end">
        <button
            @click="sendMessage"
            :disabled="!inputText.trim() || isLoading"
            class="px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          <span v-if="isLoading" class="flex items-center gap-2">
            <Loader2Icon class="size-4 animate-spin" />
            {{ t('common.sending') }}
          </span>
          <span v-else>{{ t('common.send') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {useI18n} from '@/hooks/useI18n'
import {useChatStore} from '@/stores/chat'
import {useTagStore} from '@/stores/tag'
import {useSettingStore} from '@/stores/setting'
import {FileIcon, LinkIcon, Loader2Icon, Trash2Icon, XIcon,} from 'lucide-vue-next'

const { t } = useI18n()
const chatStore = useChatStore()
const tagStore = useTagStore()
const settingStore = useSettingStore()

// 状态
const inputText = ref('')
const textareaRef = ref<HTMLTextAreaElement>()
const inputMode = ref('chat')
const placeholder = ref('')
const showPlaceholder = ref(true)
const linkedFile = ref<any>(null)
const inputHistory = ref<string[]>([])
const historyIndex = ref(-1)

// 本地存储管理
const STORAGE_KEY = 'chat-placeholder-enabled'

// 从本地存储加载初始状态
function loadPlaceholderEnabled() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === null ? true : JSON.parse(stored)
  } catch (error) {
    console.error('Failed to load placeholder enabled state:', error)
    return true
  }
}

// 保存状态到本地存储
function savePlaceholderEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled))
  } catch (error) {
    console.error('Failed to save placeholder enabled state:', error)
  }
}

// 计算属性
const isLoading = computed(() => chatStore.loading)
const currentTagId = computed(() => tagStore.currentTagId)

// 自动调整textarea高度
function handleInput() {
  if (!textareaRef.value) return
  textareaRef.value.style.height = 'auto'
  textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 256) + 'px'
}

// 处理键盘事件
function handleKeyDown(e: KeyboardEvent) {
  if (e.shiftKey && e.key === 'Enter') {
    // Shift+Enter 换行
    return
  }
  if (e.key === 'Enter') {
    // Enter 发送
    e.preventDefault()
    sendMessage()
  }
}

// 发送消息
async function sendMessage() {
  if (!inputText.value.trim()) return
  if (isLoading.value) return

  const content = inputText.value.trim()
  addToHistory(content)

  try {
    // 添加用户消息到聊天记录
    const userChat = await chatStore.insert({
      tagId: currentTagId.value,
      content,
      role: 'user',
      type: 'chat',
      inserted: false,
    })

    // 清空输入框
    inputText.value = ''
    placeholder.value = ''
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
    }

    // TODO: 调用AI接口获取回复（第6.3步）
    // const response = await fetchAiResponse(content)
    // await chatStore.insert({
    //   tagId: currentTagId.value,
    //   content: response,
    //   role: 'assistant',
    //   type: 'chat',
    //   inserted: false,
    // })

  } catch (error) {
    console.error('Failed to send message:', error)
    // TODO: 显示错误toast
  }
}

// 历史记录管理
function addToHistory(input: string) {
  if (!input.trim()) return
  inputHistory.value = [input, ...inputHistory.value.filter(item => item !== input)]
  inputHistory.value = inputHistory.value.slice(0, 50)
}

function navigateHistory(direction: 'up' | 'down') {
  if (inputHistory.value.length === 0) return

  let newIndex = historyIndex.value
  if (direction === 'up') {
    newIndex = Math.min(newIndex + 1, inputHistory.value.length - 1)
  } else {
    newIndex = Math.max(newIndex - 1, -1)
  }

  historyIndex.value = newIndex
  inputText.value = newIndex === -1 ? '' : inputHistory.value[newIndex]
}

// 占位符管理
function togglePlaceholder() {
  const newValue = !showPlaceholder.value
  showPlaceholder.value = newValue
  savePlaceholderEnabled(newValue)
}

// 同步localStorage和状态
onMounted(() => {
  showPlaceholder.value = loadPlaceholderEnabled()
})

function insertPlaceholder() {
  if (placeholder.value) {
    inputText.value += placeholder.value.replace('[Tab]', '')
    placeholder.value = ''
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.focus()
        handleInput()
      }
    })
  }
}

// 文件链接
function selectFile() {
  // TODO: 打开文件选择对话框
  console.log('Select file')
}

function removeLinkedFile() {
  linkedFile.value = null
}

// 清空上下文
async function clearContext() {
  await chatStore.insert({
    tagId: currentTagId.value,
    content: '',
    role: 'user',
    type: 'clear',
    inserted: false,
  })
}

// 自动获取占位符
async function genPlaceholder() {
  if (!showPlaceholder.value) return
  
  try {
    // 调用AI接口获取占位符建议
    const response = await fetchAiPlaceholder(inputText.value, inputMode.value)
    placeholder.value = response + ' [Tab]'
  } catch (error) {
    console.error('Failed to generate placeholder:', error)
  }
}

// 模拟AI占位符生成接口
async function fetchAiPlaceholder(input: string, mode: string): Promise<string> {
  // 这里应该替换为真实的API调用
  // 示例返回不同模式下的占位符建议
  switch (mode) {
    case 'translate':
      return '请输入需要翻译的文本，例如：Hello world'
    case 'organize':
      return '请输入需要整理的内容，例如：今天上午9点开会'
    case 'chat':
    default:
      return '请输入您的问题或想法，例如：如何提高学习效率'
  }
}

// 初始化
watch(
    () => showPlaceholder.value,
    async (newVal) => {
      if (newVal && !placeholder.value) {
        await genPlaceholder()
      }
    }
)

// 监听输入文本变化，实时更新占位符
watch(
    () => inputText.value,
    async () => {
      if (showPlaceholder.value) {
        await genPlaceholder()
      }
    }
)

// 监听输入模式变化，更新占位符
watch(
    () => inputMode.value,
    async () => {
      if (showPlaceholder.value) {
        await genPlaceholder()
      }
    }
)
</script>