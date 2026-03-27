import { useSettingStore } from '@/stores/setting'
import { unref } from 'vue'

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none'

const levelOrder: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none']

const moduleColors: Record<string, string> = {
  assistant: '#8b5cf6', // purple
  explorer: '#06b6d4',  // cyan
  editor: '#ec4899',    // pink
  db: '#f97316',        // orange
  ai: '#10b981',        // green
  general: '#64748b',   // slate
  auth: '#ef4444',      // red
  default: '#6366f1'    // indigo
}

function getTimestamp() {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) + '.' + now.getMilliseconds().toString().padStart(3, '0')
}

class Logger {
  private getStore() {
    try {
      return useSettingStore()
    } catch {
      return null
    }
  }

  private shouldLog(level: LogLevel, module: string): boolean {
    if (level === 'none') return false
    const store = this.getStore()
    if (!store) return false

    const currentLevel = unref(store.devLogLevel) as LogLevel
    const currentModules = unref(store.devLogModules) as string[]

    const currentLevelIndex = levelOrder.indexOf(currentLevel)
    const targetLevelIndex = levelOrder.indexOf(level)

    if (targetLevelIndex < currentLevelIndex) return false

    if (module !== 'default' && currentModules && !currentModules.includes(module)) {
      return false
    }

    return true
  }

  /**
   * 返回一个绑定到 console 的函数，以保留调用点的行号
   */
  getBoundMethod(level: LogLevel, module: string) {
    if (!this.shouldLog(level, module)) return () => {}

    const timestamp = getTimestamp()
    const color = moduleColors[module] || moduleColors.default
    const levelLabel = level.toUpperCase()

    const labelStyle = `color: white; background: ${color}; padding: 2px 4px; border-radius: 3px; font-weight: bold;`
    const timeStyle = `color: #888; font-size: 0.85em;`
    const levelStyle = `font-weight: bold; ${level === 'error' ? 'color: #ef4444;' : level === 'warn' ? 'color: #f59e0b;' : ''}`

    const method = level === 'debug' ? 'log' : (level as 'info' | 'warn' | 'error')
    
    return console[method].bind(
      console,
      `%c[${timestamp}] %c${levelLabel}%c %c${module}%c`,
      timeStyle,
      levelStyle,
      '',
      labelStyle,
      ''
    )
  }

  // 为旧代码保留的兼容性方法 (注意：这些方法仍然会显示 logger.ts)
  debug(module: string, ...args: any[]) { this.getBoundMethod('debug', module)(...args) }
  info(module: string, ...args: any[]) { this.getBoundMethod('info', module)(...args) }
  warn(module: string, ...args: any[]) { this.getBoundMethod('warn', module)(...args) }
  error(module: string, ...args: any[]) { this.getBoundMethod('error', module)(...args) }
}

const baseLogger = new Logger()

/**
 * 最终导出的 logger 是一个 Proxy，
 * 支持 logger.assistant.debug(...) 这种调用方式，
 * 这种方式可以完美在控制台保留原始代码行号。
 */
export const logger = new Proxy(baseLogger, {
  get(target, prop: string) {
    // 如果访问的是已有的方法 (如 debug, info 等兼容性方法)，直接返回
    if (prop in target) {
      return (target as any)[prop]
    }

    // 否则将其视为模块名，返回一个 ModuleLogger 对象
    return {
      get debug() { return target.getBoundMethod('debug', prop) },
      get info() { return target.getBoundMethod('info', prop) },
      get warn() { return target.getBoundMethod('warn', prop) },
      get error() { return target.getBoundMethod('error', prop) }
    }
  }
}) as any
