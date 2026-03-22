// src/utils/tauriStore.ts
import { Store } from '@tauri-apps/plugin-store'

/**
 * 增强版：自动适配Tauri/浏览器，支持泛型，可自定义存储文件
 */
type StorageOptions = {
    filename?: string; // 自定义Tauri Store的文件名
};

/**
 * 读取存储值（自动适配Tauri Store / localStorage）
 * @param key 存储的键名
 * @param options 可选配置（自定义文件名）
 * @returns 存储的值（泛型类型）
 */
export async function tauriGet<T = any>(
    key: string,
    options: StorageOptions = { filename: 'store.json' }
): Promise<T | undefined> {
    try {
        // Tauri环境：使用@tauri-apps/plugin-store
        const store = await Store.load(options.filename!)
        return await store.get<T>(key) // 保留泛型，类型安全
    } catch (e) {
        console.warn('tauriGet plugin-store error, falling back to localStorage:', e)
        // 浏览器环境：使用localStorage
        const raw = localStorage.getItem(key)
        if (raw === null) return undefined // 没找到返回undefined
        try {
            return JSON.parse(raw) as T // 反序列化并指定类型
        } catch {
            return raw as T // 解析失败直接返回原始值（比如非JSON字符串）
        }
    }
}

/**
 * 保存存储值（自动适配Tauri Store / localStorage）
 * @param key 存储的键名
 * @param value 存储的值
 * @param options 可选配置（自定义文件名）
 */
export async function tauriSet<T = any>(
    key: string,
    value: T,
    options: StorageOptions = { filename: 'store.json' }
): Promise<void> {
    try {
        // Tauri环境：使用@tauri-apps/plugin-store
        const store = await Store.load(options.filename!)
        await store.set(key, value)
        await store.save()
    } catch (e) {
        console.warn('tauriSet plugin-store error, falling back to localStorage:', e)
        // 浏览器环境：使用localStorage（序列化后存储）
        localStorage.setItem(key, JSON.stringify(value))
    }
}