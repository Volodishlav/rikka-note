// useToast.ts
// 基于reka-ui实现的toast组合式函数，兼容原有API并保留Tauri原生通知功能

import { toast } from '@/components/ui/toast'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

// 定义toast变体类型
export type ToastVariant = 'info' | 'success' | 'error' | 'warning'

// 定义toast选项接口
export interface ToastOptions {
  id?: string
  title?: string
  message?: string
  variant?: ToastVariant
  duration?: number // ms, 0 => 永不自动关闭
  withNativeNotification?: boolean // 是否显示Tauri原生通知
}

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

// 映射变体到reka-ui的variant
const variantMap: Record<ToastVariant, 'default' | 'destructive' | 'success' | 'warning'> = {
  info: 'default',
  success: 'success',
  error: 'destructive',
  warning: 'warning'
};

/**
 * useToast组合式函数
 * 基于reka-ui实现，兼容原有API
 */
export function useToast() {
  /**
   * 显示toast
   * @param opts toast选项
   * @returns toast ID
   */
  const show = (opts: ToastOptions) => {
    // 显示原生通知（如果需要）
    if (opts.withNativeNotification && (opts.title || opts.message)) {
      showNativeNotification(opts.title || '通知', opts.message || '');
    }

    // 使用reka-ui创建toast
    const toastInstance = toast({
      title: opts.title,
      description: opts.message,
      variant: variantMap[opts.variant || 'info'],
      duration: opts.duration ?? 4000,
    });

    return toastInstance.id;
  };

  /**
   * 显示信息toast
   * @param msg 消息内容
   * @param title 标题
   * @param opts 其他选项
   * @returns toast ID
   */
  const info = (msg: string, title?: string, opts?: Partial<ToastOptions>) => {
    return show({ message: msg, title, variant: 'info', ...opts });
  };

  /**
   * 显示成功toast
   * @param msg 消息内容
   * @param title 标题
   * @param opts 其他选项
   * @returns toast ID
   */
  const success = (msg: string, title?: string, opts?: Partial<ToastOptions>) => {
    return show({ message: msg, title, variant: 'success', ...opts });
  };

  /**
   * 显示错误toast
   * @param msg 消息内容
   * @param title 标题
   * @param opts 其他选项
   * @returns toast ID
   */
  const error = (msg: string, title?: string, opts?: Partial<ToastOptions>) => {
    return show({ message: msg, title, variant: 'error', ...opts });
  };

  /**
   * 显示警告toast
   * @param msg 消息内容
   * @param title 标题
   * @param opts 其他选项
   * @returns toast ID
   */
  const warning = (msg: string, title?: string, opts?: Partial<ToastOptions>) => {
    return show({ message: msg, title, variant: 'warning', ...opts });
  };

  return {
    show,
    info,
    success,
    error,
    warning
  };
}
