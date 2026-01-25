<template>
  <div class="flex-1 relative w-full h-full flex flex-col overflow-hidden dark:bg-zinc-950">
    <!-- 编辑器容器 -->
    <div ref="editorContainer" id="article-md-editor" class="flex-1"></div>
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

// ========== 状态初始化 ==========
const editorContainer = ref<HTMLDivElement | null>(null)
const editor = ref<Vditor | null>(null)
const isEditorIniting = ref(false)
const isEditorCreated = ref(false)
const resizeHandler = ref<(() => void) | null>(null)

// 编辑器高度（响应式）
const editorHeight = ref<number>(document.documentElement.clientHeight - 100)

// ========== 安全获取依赖 ==========
let articleStore: ReturnType<typeof useArticleStore> | null = null
try {
  articleStore = useArticleStore()
} catch (error) {
  console.warn('Failed to initialize article store:', error)
  articleStore = null
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
  try {
    const locale =
        (i18nResult?.locale?.value !== undefined ? i18nResult.locale.value : undefined) ||
        i18nResult?.locale ||
        'zh'
    return locale.toString().toLowerCase()
  } catch {
    return 'zh'
  }
})

// ========== 计算属性 ==========
const activeFilePath = computed(() => {
  if (!articleStore) return ''
  // 移除多余的 typeof 检查（Pinia 中 activeFilePath 是固定 string 类型）
  // 增加 trim() 过滤空字符串，避免无效路径
  return articleStore.activeFilePath.trim()
})

const editorCacheId = computed(() => {
  if (activeFilePath.value) {
    return `vditor_${activeFilePath.value.replace(/[\/:\\.]/g, '_')}`
  }
  return `vditor_${uuid().substring(0, 8)}`
})

const currentArticle = computed(() => {
  if (!articleStore) return ''
  // Pinia 中 currentArticle 是 string 类型，无需 typeof 检查
  return articleStore.currentArticle.trim()
})

const loading = computed(() => {
  if (!articleStore) return false
  return Boolean(articleStore.loading)
})

const editMode = ref<'ir' | 'sv' | 'wysiwyg'>('ir')

/**
 * 获取Vditor语言
 */
function getLang(): 'en_US' | 'zh_CN' {
  try {
    const lang = currentLocale.value
    return lang === 'en' ? 'en_US' : 'zh_CN'
  } catch {
    return 'zh_CN'
  }
}

/**
 * 增强版：安全检查编辑器实例和方法
 */
function checkEditorInstance(requiredMethod?: string): boolean {
  if (!editor.value || !isEditorCreated.value || typeof editor.value !== 'object') {
    return false
  }

  // 如果指定了需要检查的方法，额外验证
  if (requiredMethod) {
    return typeof (editor.value as any)[requiredMethod] === 'function'
  }

  return true
}

/**
 * ========== 核心修复：正确设置编辑器高度 ==========
 */
function setEditorHeight(height: number) {
  if (!checkEditorInstance()) return

  try {
    const vditorInstance = editor.value as any

    // 方法1：使用Vditor的resize方法（推荐）
    if (typeof vditorInstance.resize === 'function') {
      vditorInstance.resize(height)
    }
    // 方法2：直接修改容器样式（兜底）
    else if (vditorInstance?.vditor?.element) {
      vditorInstance.vditor.element.style.height = `${height}px`
    }
    // 方法3：修改编辑器容器DOM（终极兜底）
    else if (editorContainer.value) {
      editorContainer.value.style.height = `${height}px`
    }

    // 更新响应式高度
    editorHeight.value = height

  } catch (error) {
    console.error('Error setting editor height:', error)
    // 终极兜底：直接修改DOM样式
    if (editorContainer.value) {
      editorContainer.value.style.height = `${height}px`
    }
  }
}

/**
 * 初始化编辑器
 */
async function initEditor() {
  if (!articleStore || isEditorIniting.value || !editorContainer.value || !activeFilePath.value) {
    return
  }

  isEditorIniting.value = true
  isEditorCreated.value = false

  // 提前校验容器，移出 try 块，避免本地 throw
  const container = editorContainer.value
  if (!container) {
    console.error('Editor container not found')
    isEditorIniting.value = false // 重置状态，避免卡死
    return
  }

  try {
    const store = await Store.load('store.json').catch(() => null)
    const enableLineNumber = store ? await store.get<boolean>('enableLineNumber').catch(() => false) : false
    const enableOutline = articleStore.enableOutline
    const typewriterMode = store ? await store.get<boolean>('typewriterMode').catch(() => false) : false

    // 移除原有的 if (!container) throw ... 语句

    // 拦截资源加载
    // @ts-ignore
    const originalLoadScript = window.loadScript
    // @ts-ignore
    window.loadScript = (url: string, callback: Function) => {
      if (url.includes('i18n/zh_CN.js')) {
        // @ts-ignore
        callback(window.VditorI18n?.zh_CN || window.Vditor?.I18n?.zh_CN)
      } else if (url.includes('i18n/en_US.js')) {
        // @ts-ignore
        callback(window.VditorI18n?.en_US || window.Vditor?.I18n?.en_US)
      } else {
        if (originalLoadScript) originalLoadScript(url, callback)
        else callback()
      }
    }

    // 先设置容器初始高度
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
      // 初始化完成
      after: () => {
        try {
          if (checkEditorInstance('setValue')) {
            (editor.value as any).setValue(currentArticle.value || '', true)
            updateEditorPadding().catch(console.error)
            handleLocalImages().catch(console.error)
          }
        } catch (error) {
          console.error('Failed to initialize editor content:', error)
        }
      },
      // 编辑器内容变化时的自动保存
      input: (value: string) => {
        if (articleStore && activeFilePath.value) {
          // 调用 Store 里的保存方法
          articleStore.saveCurrentArticle(value)

          // 如果有全局事件总线
          // emitter.emit('editor-input')

          // 处理本地图片实时预览转换
          handleLocalImages().catch(console.error)
        }
      },
      mode: editMode.value,
    })

    isEditorCreated.value = true

    // 恢复原始加载函数
    setTimeout(() => {
      // @ts-ignore
      window.loadScript = originalLoadScript
    }, 100)

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

/**
 * 设置编辑器内容
 */
function setContent(content: string) {
  // 优化：检查内容是否为空（更贴合业务），保留编辑器实例校验
  if (!checkEditorInstance('setValue') || !content) return

  try {
    (editor.value as any).setValue(content)
    if (checkEditorInstance('renderPreview')) {
      (editor.value as any).renderPreview(content)
    }
    handleLocalImages().catch(console.error)
  } catch (error) {
    console.error('Error setting editor content:', error)
  }
}

/**
 * 安全获取编辑器内容
 */
function getEditorContent(): string {
  if (!checkEditorInstance('getValue')) return ''

  try {
    return (editor.value as any).getValue() || ''
  } catch (error) {
    console.error('Error getting editor content:', error)
    return ''
  }
}

/**
 * 安全禁用/启用编辑器
 */
function setEditorDisabled(disabled: boolean) {
  if (!checkEditorInstance()) return

  try {
    if (disabled) {
      if (checkEditorInstance('disabled')) {
        (editor.value as any).disabled()
      }
    } else {
      if (checkEditorInstance('enable')) {
        (editor.value as any).enable()
      }
    }
  } catch (error) {
    console.error(`Error ${disabled ? 'disabling' : 'enabling'} editor:`, error)
  }
}

/**
 * 处理本地相对路径图片
 */
async function handleLocalImages() {
  if (!articleStore || !checkEditorInstance() || !activeFilePath.value) return

  try {
    const workspace = await getWorkspacePath().catch(() => null)
    if (!workspace) return

    const vditorInstance = editor.value as any
    const previews = [
      vditorInstance?.vditor?.ir?.element,
      vditorInstance?.vditor?.sv?.element,
      vditorInstance?.vditor?.wysiwyg?.element,
    ].filter(Boolean)

    for (const element of previews) {
      if (!element) continue

      const images = Array.from((element as HTMLElement).querySelectorAll('img'))
      for (const img of images) {
        let src = img.getAttribute('src')
        if (!src) continue

        if (src.startsWith('http') || src.startsWith('asset://')) continue

        try {
          const articlePathParts = activeFilePath.value.split('/').slice(0, -1)
          const articlePath = articlePathParts.join('/')
          let imagePath = src

          if (imagePath.startsWith('./')) {
            imagePath = imagePath.slice(2)
          }
          if (!imagePath.startsWith('/')) {
            imagePath = `/${imagePath}`
          }

          const relPath = await join(articlePath, imagePath)
          const tauriSrc = await convertImageByWorkspace(relPath).catch(() => src)
          img.setAttribute('src', tauriSrc)
        } catch (error) {
          console.error('Failed to convert image:', error)
        }
      }
    }
  } catch (error) {
    console.error('Failed to handle local images:', error)
  }
}

/**
 * 更新编辑器内边距
 */
async function updateEditorPadding() {
  if (!checkEditorInstance()) return

  try {
    const store = await Store.load('store.json').catch(() => null)
    if (!store) return

    const pageView = await store.get<'immersiveView' | 'panoramaView'>('pageView').catch(() => 'immersiveView') || 'immersiveView'

    const vditorInstance = editor.value as any
    const resetDom = vditorInstance?.vditor?.element?.querySelectorAll('.vditor-reset')
    if (resetDom && pageView === 'panoramaView') {
      resetDom.forEach((dom: HTMLElement) => {
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

/**
 * 安全销毁编辑器
 */
function destroyEditor() {
  isEditorCreated.value = false

  if (editor.value && typeof editor.value === 'object') {
    try {
      const vditorInstance = editor.value as any
      if (vditorInstance?.vditor?.element) {
        if (typeof vditorInstance.destroy === 'function') {
          vditorInstance.destroy()
        }
      }
    } catch (error) {
      console.warn('Editor destroy warning (non-critical):', error)
    }
  }

  editor.value = null
  isEditorIniting.value = false
}

// ========== 监听逻辑 ==========
watch(
    () => activeFilePath.value,
    async (newPath, oldPath) => {
      if (newPath === oldPath) return

      destroyEditor()

      if (newPath && articleStore) {
        try {
          // 核心修复：将 try/catch 移到回调内部，而非外层
          await articleStore.readArticle(newPath)
          await nextTick()

          setTimeout(() => {
            initEditor()
          }, 50)
        } catch (error) {
          console.error('Error loading article in watcher:', error)
        }
      }
    },
    // 关键：移除非法的 onError 配置项，保留合法配置
    { immediate: true, flush: 'post' }
)

watch(
    () => currentArticle.value,
    (newContent) => {
      try {
        if (checkEditorInstance() && getEditorContent() !== newContent) {
          setContent(newContent)
        }
      } catch (error) {
        console.error('Error in currentArticle watcher:', error)
      }
    },
    // 关键：移除非法的 onError 配置项，仅保留合法的 flush
    { flush: 'post' }
)

watch(
    () => isDark.value,
    (dark: boolean) => { // 显式标注 dark 为 boolean 类型
      try {
        setTheme(dark)
      } catch (error) {
        console.error('Error in isDark watcher:', error)
      }
    },
    {}
)

watch(
    () => currentLocale.value,
    async () => {
      try {
        if (articleStore && activeFilePath.value) {
          destroyEditor()
          await nextTick()
          // 给 setTimeout 内的 async 函数添加 await（需包裹自执行异步函数）
          setTimeout(async () => {
            await initEditor() // 异步函数调用添加 await
          }, 50)
        }
      } catch (error) {
        console.error('Error in currentLocale watcher:', error)
      }
    },
    {}
)

watch(
    () => loading.value,
    (isLoading) => {
      try {
        setEditorDisabled(isLoading)
      } catch (error) {
        console.error('Error in loading watcher:', error)
      }
    },
    // 关键：移除非法的 onError 配置项，保留空对象
    {}
)

// ========== 生命周期管理 ==========
onMounted(async () => {
  try {
    await nextTick()

    if (articleStore) {
      await articleStore.initEnableOutline() // 初始化大纲配置
    }

    if (articleStore && activeFilePath.value) {
      setTimeout(() => {
        initEditor()
      }, 100)
    }

    // ========== 修复：重构窗口大小调整逻辑 ==========
    resizeHandler.value = () => {
      try {
        // 计算新高度
        const newHeight = document.documentElement.clientHeight - 100
        if (newHeight !== editorHeight.value) {
          // 使用修复后的高度设置方法
          setEditorHeight(newHeight)
        }
      } catch (error) {
        console.error('Error in resize handler:', error)
        // 终极兜底：直接修改容器样式
        if (editorContainer.value) {
          editorContainer.value.style.height = `${document.documentElement.clientHeight - 100}px`
        }
      }
    }

    if (resizeHandler.value) {
      window.addEventListener('resize', resizeHandler.value)
    }
  } catch (error) {
    console.error('Error in onMounted:', error)
  }
})

onScopeDispose(() => {
  try {
    if (resizeHandler.value) {
      window.removeEventListener('resize', resizeHandler.value)
    }
    destroyEditor()
  } catch (error) {
    console.error('Error in onScopeDispose:', error)
  }
})
</script>

<style scoped>
#article-md-editor {
  width: 100%;
  height: 100%;
  min-height: 300px; /* 最小高度保障 */
}
</style>