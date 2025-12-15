// src/utils/tauriStore.ts
import { Store } from '@tauri-apps/plugin-store'

export async function loadTauriStore(filename = 'store.json') {
    return await Store.load(filename)
}

/**
 * 读取 key 值（返回 undefined 表示没保存过）
 */
export async function tauriGet<T = any>(key: string, filename = 'store.json'): Promise<T | undefined> {
    const store = await loadTauriStore(filename)
    return await store.get<T>(key)
}

/**
 * 设置 key 值并同步保存
 */
export async function tauriSet<T = any>(key: string, value: T, filename = 'store.json'): Promise<void> {
    const store = await loadTauriStore(filename)
    await store.set(key, value)
    await store.save()
}