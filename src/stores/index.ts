// src/stores/index.ts
import { setActivePinia, createPinia } from 'pinia'
import { useSidebarStore } from './sidebar'

export async function initStores(piniaInstance?: ReturnType<typeof createPinia>) {
    // if not provided, assume pinia already created and active.
    if (piniaInstance) setActivePinia(piniaInstance)

    const sidebarStore = useSidebarStore()
    // 初始化sidebar状态
    await sidebarStore.init()

    // 返回已初始化的 stores（可选）
    return { sidebarStore }
}