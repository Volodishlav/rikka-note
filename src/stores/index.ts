// src/stores/index.ts
import { setActivePinia, createPinia } from 'pinia'
import { useSettingStore } from './setting'

export async function initStores(piniaInstance?: ReturnType<typeof createPinia>) {
    // if not provided, assume pinia already created and active.
    if (piniaInstance) setActivePinia(piniaInstance)

    const setting = useSettingStore()
    await setting.initSettingData()

    // 如果你有更多需要在启动时初始化的 store，请在此处按需调用：
    // const image = useImageHostingStore()
    // await image.initMainHosting()

    // 返回已初始化的 stores（可选）
    return { setting }
}