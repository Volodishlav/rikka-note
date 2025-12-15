// src/stores/setting.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tauriGet, tauriSet } from '@/utils/tauriStore'

export const useSettingStore = defineStore('setting', () => {
    // state
    const theme = ref<'light' | 'dark' | 'system'>('system')
    const uiScale = ref<number>(100)
    const baseURL = ref<string | null>(null)
    const apiKey = ref<string | null>(null)
    const primaryModel = ref<string | null>(null)

    // actions
    async function initSettingData() {
        try {
            const savedTheme = await tauriGet<string>('theme')
            if (savedTheme) theme.value = savedTheme as any

            const savedUiScale = await tauriGet<number>('uiScale')
            if (savedUiScale) uiScale.value = savedUiScale

            const savedBaseURL = await tauriGet<string>('baseURL')
            if (savedBaseURL) baseURL.value = savedBaseURL

            const savedApiKey = await tauriGet<string>('apiKey')
            if (savedApiKey) apiKey.value = savedApiKey

            const savedPrimaryModel = await tauriGet<string>('primaryModel')
            if (savedPrimaryModel) primaryModel.value = savedPrimaryModel
        } catch (e) {
            console.error('initSettingData error', e)
        }
    }

    async function setTheme(t: 'light' | 'dark' | 'system') {
        theme.value = t
        await tauriSet('theme', t)
    }

    async function setUiScale(s: number) {
        uiScale.value = s
        await tauriSet('uiScale', s)
    }

    async function setBaseURL(url: string | null) {
        baseURL.value = url
        await tauriSet('baseURL', url)
    }

    async function setApiKey(key: string | null) {
        apiKey.value = key
        await tauriSet('apiKey', key)
    }

    async function setPrimaryModel(key: string | null) {
        primaryModel.value = key
        await tauriSet('primaryModel', key)
    }

    return {
        // state
        theme,
        uiScale,
        baseURL,
        apiKey,
        primaryModel,
        // actions
        initSettingData,
        setTheme,
        setUiScale,
        setBaseURL,
        setApiKey,
        setPrimaryModel,
    }
})