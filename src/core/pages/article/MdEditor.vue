<template>
  <div class="flex-1 relative w-full h-full flex flex-col overflow-hidden dark:bg-zinc-950">
    <!-- 编辑器容器 -->
    <div ref="editorContainer" id="article-md-editor" class="flex-1 w-full h-full min-h-[300px]"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick, onScopeDispose } from 'vue'
// 导入Vditor和样式
import Vditor from 'vditor'
import 'vditor/dist/index.css'

import './MdEditor.scss'
import { v4 as uuid } from 'uuid'
import { Store } from '@tauri-apps/plugin-store'
import { appDataDir, join } from '@tauri-apps/api/path'
import { exists, mkdir, writeFile } from '@tauri-apps/plugin-fs'
import { useArticleStore } from '@/stores/article'
import { useTheme } from '@/composables/useTheme'
import { useI18n } from '@/hooks/useI18n'
import { createToolbarConfig } from './toolbarConfig'
import { convertImageByWorkspace } from '@/lib/utils'
import { getWorkspacePath } from '@/lib/workspace'
import { useToast } from "@/composables/useToast.ts";

// Editor state
const editorContainer = ref<HTMLDivElement | null>(null)
const editor = ref<Vditor | null>(null)
const isEditorIniting = ref(false)
const isEditorCreated = ref(false)
const resizeHandler = ref<(() => void) | null>(null)
const editorHeight = ref<number>(document.documentElement.clientHeight - 100)

// Dependencies (with safe initialization)
let articleStore: ReturnType<typeof useArticleStore> | null = null
try {
  articleStore = useArticleStore()
} catch (error) {
  console.warn('Failed to initialize article store:', error)
}

const themeResult = useTheme()
const isDark = computed(() => {
  return themeResult?.theme?.value === 'dark'
})

const toast = useToast() || {
  success: (msg: string, title?: string) => console.log(`[Success] ${title}: ${msg}`),
  error: (msg: string, title?: string) => console.error(`[Error] ${title}: ${msg}`),
  info: (msg: string, title?: string) => console.info(`[Info] ${title}: ${msg}`),
  warning: (msg: string, title?: string) => console.warn(`[Warning] ${title}: ${msg}`)
}

const i18nResult = useI18n()
const currentLocale = computed(() => {
  const locale =
    (i18nResult?.locale?.value !== undefined ? i18nResult.locale.value : undefined) ||
    i18nResult?.locale ||
    'zh'
  return locale.toString().toLowerCase()
})

// Computed properties
const activeFilePath = computed(() => articleStore?.activeFilePath.trim() || '')

const editorCacheId = computed(() => {
  if (activeFilePath.value) {
    return `vditor_${activeFilePath.value.replace(/[\/:\\.]/g, '_')}`
  }
  return `vditor_${uuid().substring(0, 8)}`
})

const currentArticle = computed(() => articleStore?.currentArticle.trim() || '')
const loading = computed(() => Boolean(articleStore?.loading))

const editMode = ref<'ir' | 'sv' | 'wysiwyg'>('ir')
const previewObservers: Map<HTMLElement, MutationObserver> = new Map()
let toolbarClickHandler: ((e: Event) => void) | null = null
let boundVditorElement: HTMLElement | null = null

// Get Vditor language based on current locale
function getLang(): 'en_US' | 'zh_CN' {
  return currentLocale.value === 'en' ? 'en_US' : 'zh_CN'
}

// Safely check if editor instance exists and has required method
function checkEditorInstance(requiredMethod?: string): boolean {
  if (!editor.value || !isEditorCreated.value) return false
  if (requiredMethod) return typeof (editor.value as any)[requiredMethod] === 'function'
  return true
}

// Set editor height with fallbacks
function setEditorHeight(height: number) {
  if (!checkEditorInstance()) return
  try {
    const vditorInstance = editor.value as any
    vditorInstance?.resize?.(height) ||
      (vditorInstance?.vditor?.element && (vditorInstance.vditor.element.style.height = `${height}px`)) ||
      (editorContainer.value && (editorContainer.value.style.height = `${height}px`))
    editorHeight.value = height
  } catch (error) {
    console.error('Error setting editor height:', error)
  }
}

// Initialize editor instance
async function initEditor() {
  if (!articleStore || isEditorIniting.value || !editorContainer.value || !activeFilePath.value) return

  isEditorIniting.value = true
  isEditorCreated.value = false
  const container = editorContainer.value

  try {
    const store = await Store.load('store.json').catch(() => null)
    const enableLineNumber = await store?.get<boolean>('enableLineNumber').catch(() => false) || false
    const enableOutline = articleStore.enableOutline
    const typewriterMode = await store?.get<boolean>('typewriterMode').catch(() => false) || false

    container.style.height = `${editorHeight.value}px`

    // 创建编辑器实例
    editor.value = new Vditor(container, {
      cache: {
        id: editorCacheId.value,
        enable: true,
      },
      cdn: '',
      lang: getLang(),
      // 使用响应式高度
      height: editorHeight.value,
      icon: 'material',
      tab: '\t',
      theme: isDark.value ? 'dark' : 'classic',
      toolbar: createToolbarConfig(),
      typewriterMode,
      outline: {
        enable: enableOutline,
        position: 'left',
      },
      preview: {
        hljs: {
          lineNumber: enableLineNumber,
        },
      },
      // 文件上传处理
      upload: {
        async handler(files: File[]) {
          try {
            if (!articleStore || !activeFilePath.value || !checkEditorInstance()) return 'uploaded'

            for (const file of files) {
              if (!file.type.startsWith('image/')) continue

              const workspace = await getWorkspacePath().catch(() => null)
              if (!workspace) continue

              const articlePathParts = activeFilePath.value.split('/').slice(0, -1)
              const articlePath = articlePathParts.join('/')
              const fileExt = file.name.split('.').pop() || 'png'
              const fileName = `${uuid()}.${fileExt}`

              let targetDir = ''
              try {
                if (!workspace.isCustom) {
                  const appDir = await appDataDir()
                  targetDir = await join(appDir, 'article', articlePath, 'images')
                } else {
                  targetDir = await join(workspace.path, articlePath, 'images')
                }
              } catch (error) {
                console.error('Failed to build target directory:', error)
                continue
              }

              if (!(await exists(targetDir).catch(() => false))) {
                await mkdir(targetDir, { recursive: true }).catch(() => {})
              }

              try {
                const arrayBuffer = await file.arrayBuffer()
                const uint8Array = new Uint8Array(arrayBuffer)
                const fullPath = await join(targetDir, fileName)
                await writeFile(fullPath, uint8Array)

                if (checkEditorInstance('insertValue')) {
                  (editor.value as any).insertValue(`![${file.name}](./images/${fileName})`)
                }
              } catch (error) {
                console.error('Failed to save file:', error)
              }
            }

            if (toast?.success) {
              toast.success('Images uploaded successfully', 'Success')
            }
          } catch (error) {
            console.error('Upload failed:', error)
            if (toast?.error) {
              toast.error(
                  (error as Error).message || 'Upload failed',
                  'Image upload failed'
              )
            }
          }

          return 'uploaded'
        }
      },
      after: () => {
        if (checkEditorInstance('setValue')) {
          (editor.value as any).setValue(currentArticle.value || '', true)
          updateEditorPadding().catch(console.error)
          handleLocalImages().catch(console.error)
        }

        // Bind edit-mode change handler
        const vEl = (editor.value as any)?.vditor?.element
        if (vEl) {
          boundVditorElement = vEl
          toolbarClickHandler = (ev: Event) => {
            const modeEl = (ev.target as HTMLElement)?.closest('[data-mode]')
            if (!modeEl) return
            const mode = modeEl.getAttribute('data-mode')
            if (!mode) return
            editMode.value = mode as any
            setTimeout(() => {
              if (checkEditorInstance('renderPreview')) {
                (editor.value as any).renderPreview((editor.value as any).getValue())
              }
              const svPanel = (editor.value as any)?.vditor?.sv?.element
              handleLocalImages(svPanel).catch(console.error)
            }, 160)
          }
          vEl.addEventListener('click', toolbarClickHandler)

          // Register MutationObservers for preview panels
          const vditorInstance = editor.value as any
          const panels = [vditorInstance?.vditor?.ir?.element, vditorInstance?.vditor?.sv?.element, vditorInstance?.vditor?.wysiwyg?.element]
          panels.forEach((p: HTMLElement | undefined) => {
            if (!p || previewObservers.has(p)) return
            const obs = new MutationObserver((mutations) => {
              for (const m of mutations) {
                if ((m.type === 'childList' && m.addedNodes.length > 0) || 
                    (m.type === 'attributes' && (m.target as HTMLElement).tagName === 'IMG')) {
                  handleLocalImages(p).catch(console.error)
                  break
                }
              }
            })
            obs.observe(p, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] })
            previewObservers.set(p, obs)
          })
        }
      },
      input: (value: string) => {
        if (articleStore && activeFilePath.value) {
          articleStore.saveCurrentArticle(value)
          handleLocalImages().catch(console.error)
        }
      },
      mode: editMode.value,
    })

    isEditorCreated.value = true

  } catch (error) {
    console.error('Init editor failed:', error)
    if (toast?.error) {
      toast.error(
          (error as Error).message || 'Initialization failed',
          'Editor initialization failed'
      )
    }
    isEditorCreated.value = false
  } finally {
    isEditorIniting.value = false
  }
}

// Set editor content and handle images after rendering
function setContent(content: string) {
  if (!checkEditorInstance('setValue') || !content) return
  try {
    (editor.value as any).setValue(content)
    if (checkEditorInstance('renderPreview')) {
      (editor.value as any).renderPreview(content)
    }
    setTimeout(() => handleLocalImages().catch(console.error), 80)
  } catch (error) {
    console.error('Error setting editor content:', error)
  }
}

// Get editor content safely
function getEditorContent(): string {
  if (!checkEditorInstance('getValue')) return ''
  try {
    return (editor.value as any).getValue() || ''
  } catch (error) {
    console.error('Error getting editor content:', error)
    return ''
  }
}

// Enable or disable editor
function setEditorDisabled(disabled: boolean) {
  if (!checkEditorInstance()) return
  try {
    const method = disabled ? 'disabled' : 'enable'
    if (checkEditorInstance(method)) {
      (editor.value as any)[method]()
    }
  } catch (error) {
    console.error(`Error ${disabled ? 'disabling' : 'enabling'} editor:`, error)
  }
}

// Convert local images to tauri asset paths for preview
async function handleLocalImages(singleElement?: HTMLElement) {
  if (!articleStore || !checkEditorInstance() || !activeFilePath.value) return

  try {
    const workspace = await getWorkspacePath().catch(() => null)
    if (!workspace) return

    const vditorInstance = editor.value as any
    const allPanels = [
      vditorInstance?.vditor?.ir?.element,
      vditorInstance?.vditor?.sv?.element,
      vditorInstance?.vditor?.wysiwyg?.element,
    ].filter(Boolean) as HTMLElement[]

    const targets = singleElement ? [singleElement] : allPanels
    const articlePathParts = activeFilePath.value.split('/').slice(0, -1)
    const articlePath = articlePathParts.join('/')

    for (const element of targets) {
      if (!element) continue
      const images = Array.from(element.querySelectorAll('img'))
      
      for (const img of images) {
        const src = img.getAttribute('src')
        if (!src || src.startsWith('http') || src.startsWith('asset://')) continue

        try {
          let imagePath = src.startsWith('./') ? src.slice(2) : src
          if (!imagePath.startsWith('/')) imagePath = `/${imagePath}`
          
          const relPath = await join(articlePath, imagePath)
          const tauriSrc = await convertImageByWorkspace(relPath).catch(() => src)
          
          if (tauriSrc && tauriSrc !== src) {
            img.setAttribute('src', tauriSrc)
            img.setAttribute('data-md-src', src)
          }
        } catch (error) {
          console.error('Failed to convert image:', error)
        }
      }
    }
  } catch (error) {
    console.error('Failed to handle local images:', error)
  }
}

// Update editor padding based on page view setting
async function updateEditorPadding() {
  if (!checkEditorInstance()) return
  try {
    const store = await Store.load('store.json').catch(() => null)
    const pageView = await store?.get<'immersiveView' | 'panoramaView'>('pageView').catch(() => 'immersiveView') || 'immersiveView'
    
    if (pageView === 'panoramaView') {
      const resetDom = (editor.value as any)?.vditor?.element?.querySelectorAll('.vditor-reset')
      resetDom?.forEach((dom: HTMLElement) => {
        dom.style.setProperty('padding', '10px', 'important')
      })
    }
  } catch (error) {
    console.error('Failed to update editor padding:', error)
  }
}

/**
 * 设置编辑器主题
 */
function setTheme(dark: boolean) {
  if (!checkEditorInstance('setTheme')) return

  try {
    // 1. 显式标注所有变量类型，调整声明顺序（避免“使用前未声明”）
    const theme: string = dark ? 'dark' : 'classic';
    const contentTheme: string = dark ? 'dark' : 'light';
    const codeTheme: string = dark ? 'github-dark' : 'github-light';

    // 2. 优化类型断言 + 分步调用（避免“无调用签名”错误）
    const vditorInstance = editor.value as Vditor & { setTheme: (theme: string, contentTheme: string, codeTheme: string) => void };
    if (typeof vditorInstance.setTheme === 'function') {
      vditorInstance.setTheme(theme, contentTheme, codeTheme);
    }
  } catch (error) {
    console.error('Failed to set editor theme:', error);
  }
}

// Cleanup and destroy editor
function destroyEditor() {
  isEditorCreated.value = false
  
  try {
    (editor.value as any)?.destroy?.()
  } catch (error) {
    console.warn('Editor destroy error:', error)
  }
  
  editor.value = null
  isEditorIniting.value = false

  // Disconnect all MutationObservers
  previewObservers.forEach(obs => obs.disconnect())
  previewObservers.clear()

  // Remove delegated toolbar click handler
  if (boundVditorElement && toolbarClickHandler) {
    boundVditorElement.removeEventListener('click', toolbarClickHandler)
  }
  boundVditorElement = null
  toolbarClickHandler = null
}

// Watchers
watch(
  () => activeFilePath.value,
  async (newPath) => {
    destroyEditor()
    if (!newPath || !articleStore) return
    try {
      await articleStore.readArticle(newPath)
      await nextTick()
      setTimeout(() => initEditor(), 50)
    } catch (error) {
      console.error('Error loading article:', error)
    }
  },
  { immediate: true, flush: 'post' }
)

watch(
  () => currentArticle.value,
  (newContent) => {
    if (checkEditorInstance() && getEditorContent() !== newContent) {
      setContent(newContent)
    }
  },
  { flush: 'post' }
)

watch(() => isDark.value, (dark) => setTheme(dark))

watch(
  () => currentLocale.value,
  async () => {
    if (!articleStore || !activeFilePath.value) return
    destroyEditor()
    await nextTick()
    setTimeout(() => initEditor(), 50)
  }
)

watch(() => loading.value, (isLoading) => setEditorDisabled(isLoading))

// Lifecycle hooks
onMounted(async () => {
  await nextTick()
  if (articleStore) {
    await articleStore.initEnableOutline()
  }
  if (articleStore && activeFilePath.value) {
    await initEditor()
  }

  resizeHandler.value = () => {
    const newHeight = document.documentElement.clientHeight - 100
    if (newHeight !== editorHeight.value) {
      setEditorHeight(newHeight)
    }
  }
  window.addEventListener('resize', resizeHandler.value)
})

onScopeDispose(() => {
  if (resizeHandler.value) {
    window.removeEventListener('resize', resizeHandler.value)
  }
  destroyEditor()
})
</script>

