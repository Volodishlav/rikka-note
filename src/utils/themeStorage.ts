// src/utils/themeStorage.ts
export type ThemeKey = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'theme'

async function hasTauriStore(): Promise<boolean> {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__
}

export async function readTheme(): Promise<ThemeKey | null> {
  try {
    if (await hasTauriStore()) {
      const { tauriGet } = await import('./tauriStore')
      const result = await tauriGet<string>(STORAGE_KEY)
      return result as ThemeKey | null
    } else {
      return (localStorage.getItem(STORAGE_KEY) as ThemeKey | null)
    }
  } catch {
    return localStorage.getItem(STORAGE_KEY) as ThemeKey | null
  }
}

export async function writeTheme(theme: ThemeKey | null): Promise<void> {
  try {
    if (await hasTauriStore()) {
      const { tauriSet } = await import('./tauriStore')
      await tauriSet(STORAGE_KEY, theme)
    } else {
      if (theme === null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, theme)
    }
  } catch {
    if (theme === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, theme)
  }
}