import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tauriGet, tauriSet } from '@/utils/tauriStore'
import { logger } from '@/utils/logger'

export interface Prompt {
  id: string
  title: string
  content: string
  isDefault?: boolean
}

export const usePromptStore = defineStore('prompt', () => {
  // state
  const promptList = ref<Prompt[]>([
    {
      id: '0',
      title: '写作助手',
      content: '请你扮演一个笔记软件的智能助手，可以参考记录内容，使用 markdown 语法，回答用户的问题。',
      isDefault: true
    }
  ])
  const currentPrompt = ref<Prompt | null>(null)

  // actions
  async function initPromptData() {
    try {
      const savedPromptList = await tauriGet<Prompt[]>('promptList')
      if (savedPromptList && savedPromptList.length > 0) {
        promptList.value = savedPromptList
      } else {
        // Initialize with default if empty
        await tauriSet('promptList', promptList.value)
      }

      const currentPromptId = await tauriGet<string>('currentPromptId')
      if (currentPromptId) {
        const prompt = promptList.value.find(item => item.id === currentPromptId)
        if (prompt) {
          currentPrompt.value = prompt
        }
      } else {
        // Default to first prompt
        const defaultPrompt = promptList.value[0]
        currentPrompt.value = defaultPrompt
        await tauriSet('currentPromptId', defaultPrompt.id)
      }
    } catch (e) {
      logger.assistant.error('initPromptData error', e)
    }
  }

  async function addPrompt(promptData: Omit<Prompt, 'id'>) {
    const prompt: Prompt = {
      id: Date.now().toString(),
      ...promptData
    }
    promptList.value.push(prompt)
    await tauriSet('promptList', promptList.value)
  }

  async function updatePrompt(updatedPrompt: Prompt) {
    const index = promptList.value.findIndex(p => p.id === updatedPrompt.id)
    if (index > -1) {
      promptList.value[index] = updatedPrompt
      await tauriSet('promptList', promptList.value)
      
      if (currentPrompt.value?.id === updatedPrompt.id) {
        currentPrompt.value = updatedPrompt
      }
    }
  }

  async function deletePrompt(id: string) {
    const promptToDelete = promptList.value.find(p => p.id === id)
    if (promptToDelete?.isDefault) return

    promptList.value = promptList.value.filter(p => p.id !== id)
    await tauriSet('promptList', promptList.value)

    if (currentPrompt.value?.id === id) {
      const defaultPrompt = promptList.value.find(p => p.isDefault) || promptList.value[0]
      if (defaultPrompt) {
        await setCurrentPrompt(defaultPrompt)
      }
    }
  }

  async function setCurrentPrompt(prompt: Prompt | null) {
    currentPrompt.value = prompt
    if (prompt) {
      await tauriSet('currentPromptId', prompt.id)
    }
  }

  return {
    promptList,
    currentPrompt,
    initPromptData,
    addPrompt,
    updatePrompt,
    deletePrompt,
    setCurrentPrompt
  }
})
