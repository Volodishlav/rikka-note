import { defineStore } from 'pinia'

export interface ClipboardItem {
  path: string
  name: string
  isDirectory: boolean
  sha: string | undefined
  isLocale: boolean
}

export const useClipboardStore = defineStore('clipboard', {
  state: () => ({
    clipboardItem: null as ClipboardItem | null,
    clipboardOperation: 'none' as 'copy' | 'cut' | 'none'
  }),
  actions: {
    setClipboardItem(item: ClipboardItem | null, operation: 'copy' | 'cut' | 'none') {
      this.clipboardItem = item
      this.clipboardOperation = operation
    }
  }
})

export default useClipboardStore