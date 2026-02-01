// src/stores/setting.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tauriGet, tauriSet } from '@/utils/tauriStore'
import { AiConfig, baseAiConfig } from '@/types/ai'

export const useSettingStore = defineStore('setting', () => {
    // state
    const theme = ref<'light' | 'dark' | 'system'>('system')
    const uiScale = ref<number>(100)
    
    // AI Configs
    const aiModelList = ref<AiConfig[]>([])
    const primaryModel = ref<string | null>(null)
    const embeddingModel = ref<string | null>(null)
    const rerankModel = ref<string | null>(null)
    const imageMethodModel = ref<string | null>(null)
    const markDescModel = ref<string | null>(null)
    const translateModel = ref<string | null>(null)
    const placeholderModel = ref<string | null>(null)
    
    // Backup Configs
    const primaryBackupMethod = ref<'github' | 'gitee' | 'gitlab' | null>(null)

    // actions
    async function initSettingData() {
        try {
            const savedTheme = await tauriGet<string>('theme')
            if (savedTheme) theme.value = savedTheme as any

            const savedUiScale = await tauriGet<number>('uiScale')
            if (savedUiScale) uiScale.value = savedUiScale

            // AI Models
            const savedAiModelList = await tauriGet<AiConfig[]>('aiModelList')
            if (savedAiModelList && savedAiModelList.length > 0) {
                aiModelList.value = savedAiModelList
            } else {
                aiModelList.value = [...baseAiConfig]
                await tauriSet('aiModelList', aiModelList.value)
            }

            const savedPrimaryModel = await tauriGet<string>('primaryModel')
            if (savedPrimaryModel) {
                primaryModel.value = savedPrimaryModel
            }
            
            const savedEmbeddingModel = await tauriGet<string>('embeddingModel')
            if (savedEmbeddingModel) embeddingModel.value = savedEmbeddingModel
            
            const savedRerankModel = await tauriGet<string>('rerankModel')
            if (savedRerankModel) rerankModel.value = savedRerankModel

            const savedImageMethodModel = await tauriGet<string>('imageMethodModel')
            if (savedImageMethodModel) imageMethodModel.value = savedImageMethodModel

            const savedMarkDescModel = await tauriGet<string>('markDescModel')
            if (savedMarkDescModel) markDescModel.value = savedMarkDescModel

            const savedTranslateModel = await tauriGet<string>('translateModel')
            if (savedTranslateModel) translateModel.value = savedTranslateModel

            const savedPlaceholderModel = await tauriGet<string>('placeholderModel')
            if (savedPlaceholderModel) placeholderModel.value = savedPlaceholderModel

            const savedPrimaryBackupMethod = await tauriGet<'github' | 'gitee' | 'gitlab'>('primaryBackupMethod')
            if (savedPrimaryBackupMethod) primaryBackupMethod.value = savedPrimaryBackupMethod

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

    // AI Actions
    async function setAiModelList(list: AiConfig[]) {
        aiModelList.value = list
        await tauriSet('aiModelList', list)
    }
    
    async function updateAiModel(config: AiConfig) {
        const index = aiModelList.value.findIndex(item => item.key === config.key)
        if (index > -1) {
            aiModelList.value[index] = config
        } else {
            aiModelList.value.push(config)
        }
        await tauriSet('aiModelList', aiModelList.value)
    }

    async function setPrimaryModel(key: string | null) {
        primaryModel.value = key
        await tauriSet('primaryModel', key)
    }

    async function setEmbeddingModel(key: string | null) {
        embeddingModel.value = key
        await tauriSet('embeddingModel', key)
    }

    async function setRerankModel(key: string | null) {
        rerankModel.value = key
        await tauriSet('rerankModel', key)
    }
    
    async function setImageMethodModel(key: string | null) {
        imageMethodModel.value = key
        await tauriSet('imageMethodModel', key)
    }

    async function setMarkDescModel(key: string | null) {
        markDescModel.value = key
        await tauriSet('markDescModel', key)
    }

    async function setTranslateModel(key: string | null) {
        translateModel.value = key
        await tauriSet('translateModel', key)
    }

    async function setPlaceholderModel(key: string | null) {
        placeholderModel.value = key
        await tauriSet('placeholderModel', key)
    }

    async function setPrimaryBackupMethod(method: 'github' | 'gitee' | 'gitlab') {
        primaryBackupMethod.value = method
        await tauriSet('primaryBackupMethod', method)
    }

    return {
        // state
        theme,
        uiScale,
        aiModelList,
        primaryModel,
        embeddingModel,
        rerankModel,
        imageMethodModel,
        markDescModel,
        translateModel,
        placeholderModel,
        primaryBackupMethod,
        // actions
        initSettingData,
        setTheme,
        setUiScale,
        setAiModelList,
        updateAiModel,
        setPrimaryModel,
        setEmbeddingModel,
        setRerankModel,
        setImageMethodModel,
        setMarkDescModel,
        setTranslateModel,
        setPlaceholderModel,
        setPrimaryBackupMethod
    }
})
