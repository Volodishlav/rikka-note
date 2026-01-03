import { reactive, readonly } from 'vue'
// Tauri通知插件导入，使用正确的插件路径
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

export type ToastVariant = 'info'|'success'|'error'|'warning'

export interface ToastOptions {
  id?: string
  title?: string
  message?: string
  variant?: ToastVariant
  duration?: number // ms, 0 => 永不自动关闭
  withNativeNotification?: boolean // 是否显示Tauri原生通知
}

export interface InternalToast extends Required<Pick<ToastOptions,'id'|'variant'|'duration'>> {
  title?: string
  message?: string
  createdAt: number
  pause: boolean
}

const DEFAULT_DURATION = 4000
let idCounter = 1

const state = reactive({ toasts: [] as InternalToast[] })

function genId() { return `toast_${Date.now().toString(36)}_${idCounter++}` }

// 显示Tauri原生通知
async function showNativeNotification(title: string, message: string) {
  try {
    if (window.__TAURI__) {
      // 检查是否有权限发送通知
      let permissionGranted = await isPermissionGranted();
      
      // 如果没有权限，请求权限
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      
      // 获得权限后发送通知
      if (permissionGranted) {
        await sendNotification({ title, body: message });
      }
    }
  } catch (e) {
    console.warn('Failed to show native notification:', e);
  }
}

function pushToast(opts: ToastOptions) {
  const toast: InternalToast = {
    id: opts.id ?? genId(),
    title: opts.title,
    message: opts.message,
    variant: opts.variant ?? 'info',
    duration: typeof opts.duration === 'number' ? opts.duration : DEFAULT_DURATION,
    createdAt: Date.now(),
    pause: false,
  }
  
  state.toasts.push(toast)
  
  // 显示原生通知（如果需要）
  if (opts.withNativeNotification && (toast.title || toast.message)) {
    showNativeNotification(toast.title || '通知', toast.message || '')
  }
  
  return toast.id
}

function removeToast(id: string) {
  const i = state.toasts.findIndex(t => t.id === id)
  if (i >= 0) state.toasts.splice(i, 1)
}

function clearAll() {
  state.toasts.splice(0, state.toasts.length)
}

export function useToast() {
  return {
    toasts: readonly(state.toasts),
    show: (opts: ToastOptions) => pushToast(opts),
    info: (msg: string, title?: string, opts?: Partial<ToastOptions>) => pushToast({ message: msg, title, variant: 'info', ...opts }),
    success: (msg: string, title?: string, opts?: Partial<ToastOptions>) => pushToast({ message: msg, title, variant: 'success', ...opts }),
    error: (msg: string, title?: string, opts?: Partial<ToastOptions>) => pushToast({ message: msg, title, variant: 'error', ...opts }),
    warning: (msg: string, title?: string, opts?: Partial<ToastOptions>) => pushToast({ message: msg, title, variant: 'warning', ...opts }),
    remove: removeToast,
    clear: clearAll,
  }
}
