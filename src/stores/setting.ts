import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tauriGet, tauriSet } from '@/utils/tauriStore'
import { AiConfig, baseAiConfig } from '@/lib/ai.types'
import { LOG_MODULES } from '@/utils/logger.config'
import { logger } from '@/utils/logger'

export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'


export const useSettingStore = defineStore('setting', () => {
    // state
    const theme = ref<'light' | 'dark' | 'system'>('system')
    const locale = ref<string>('zh')
    const uiScale = ref<number>(100)
    const toastPosition = ref<ToastPosition>('bottom-right')
    const showEditorBackground = ref<boolean>(true)
    const editorToolbar = ref<string[]>([
        'bold', 'italic', 'underline', 'strikethrough', 'title', 'sub', 'sup', 'quote',
        'unorderedList', 'orderedList', 'task', 'codeRow', 'code', 'link', 'image',
        'table', 'mermaid', 'katex', 'revoke', 'next', 'save', 'prettier',
        'pageFullscreen', 'fullscreen', 'preview', 'previewOnly', 'htmlPreview', 'catalog'
    ])


    // 系统偏好状态
    const preferDarkQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
    const systemIsDark = ref<boolean>(preferDarkQuery ? preferDarkQuery.matches : false)

    // 计算属性：最终生效的主题类型 ('dark' | 'light')
    const effectiveTheme = computed<'dark' | 'light'>(() => {
        if (theme.value === 'system') {
            return systemIsDark.value ? 'dark' : 'light'
        }
        return theme.value === 'dark' ? 'dark' : 'light'
    })
    
    // AI Configs
    const aiModelList = ref<AiConfig[]>([])
    const primaryModel = ref<string | null>(null)
    const embeddingModel = ref<string | null>(null)
    const rerankModel = ref<string | null>(null)
    const imageMethodModel = ref<string | null>(null)
    const translateModel = ref<string | null>(null)
    const placeholderModel = ref<string | null>(null)
    const autoImageAnalyze = ref<boolean>(false)

    // Derived State (Filtered Models)
    const chatModels = computed(() => {
        const models = aiModelList.value.filter((m: AiConfig) => m.modelType === 'chat' || !m.modelType)
        if (localChatRunning.value) {
            models.unshift({
                key: 'local-llama-server',
                title: `本地模型 (${localChatModelStr.value})`,
                baseURL: `http://127.0.0.1:${localChatPort.value}/v1`,
                model: localChatModelStr.value,
                modelType: 'chat',
                icon: 'https://s2.loli.net/2025/06/25/JU2jVxLFsW4lB6S.png' // Use a generic local bot icon
            })
        }
        return models
    })

    const embeddingModels = computed(() => {
        const models = aiModelList.value.filter((m: AiConfig) => m.modelType === 'embedding')
        if (localEmbeddingRunning.value) {
            models.unshift({
                key: 'local-embedding-server',
                title: `本地向量模型 (${localEmbeddingModelStr.value})`,
                baseURL: `http://127.0.0.1:${localEmbeddingPort.value}/v1`,
                model: localEmbeddingModelStr.value,
                modelType: 'embedding'
            })
        }
        return models
    })

    const rerankModels = computed(() => aiModelList.value.filter((m: AiConfig) => m.modelType === 'rerank'))
    const imageModels = computed(() => aiModelList.value.filter((m: AiConfig) => m.modelType === 'image'))
    
    // Backup Configs
    const primaryBackupMethod = ref<'github' | 'gitee' | 'gitlab' | null>(null)

    // Local Embedding Configs
    const useLocalEmbedding = ref<boolean>(false)
    const localEmbeddingModelStr = ref<string>('qwen3-embedding-0.6b-q8_0.gguf')
    const localEmbeddingPort = ref<number>(8080)

    // Local Chat (LLM/SLM) Configs
    const useLocalChat = ref<boolean>(false)
    const localChatModelStr = ref<string>('gemma-4-e2b-it-q4_k_m.gguf')
    const localChatPort = ref<number>(8081)
    const localChatContextSize = ref<number>(4096)
    
    // Local Chat Advanced (LLM)
    const localChatGpuLayers = ref<number>(-1) // -1 means all to GPU if possible
    const localChatThreads = ref<number>(4)
    const localChatBatchSize = ref<number>(512)
    const localChatFlashAttn = ref<boolean>(true)
    const localChatTemp = ref<number>(0.7)
    const localChatTopP = ref<number>(1.0)
    const localChatMaxTokens = ref<number>(2048)
    const localChatFreqPen = ref<number>(0.0)
    const localChatPresPen = ref<number>(0.0)
    const localChatStop = ref<string>('')
    const localChatSystemPrompt = ref<string>('')

    // Local Embedding Advanced
    const localEmbeddingThreads = ref<number>(4)
    const localEmbeddingBatchSize = ref<number>(32)
    const localEmbeddingGpuLayers = ref<number>(0) // Embedding usually fine on CPU, but allow GPU
    const localEmbeddingMaxSeq = ref<number>(512)
    const localEmbeddingNorm = ref<boolean>(true)
    const localEmbeddingPooling = ref<string>('mean')
    
    // Runtime status (not persisted)
    const localChatRunning = ref<boolean>(false)
    const localEmbeddingRunning = ref<boolean>(false)
    
    // Developer & Log Configs
    const devLogLevel = ref<'debug' | 'info' | 'warn' | 'error' | 'none'>('debug')
    const devLogModules = ref<string[]>(
        LOG_MODULES.filter(m => m.defaultEnabled).map(m => m.id)
    )


    // actions
    async function initSettingData() {
        try {
            const savedTheme = await tauriGet<string>('theme')
            if (savedTheme) theme.value = savedTheme as any

            const savedLocale = await tauriGet<string>('locale')
            if (savedLocale) {
                locale.value = savedLocale
                // 初始化时也同步一次
                try {
                    const { setLocale: syncI18n } = await import('@/locales')
                    syncI18n(savedLocale)
                } catch {}
            }

            const savedUiScale = await tauriGet<number>('uiScale')
            if (savedUiScale) uiScale.value = savedUiScale

            const savedToastPosition = await tauriGet<ToastPosition>('toastPosition')
            if (savedToastPosition) toastPosition.value = savedToastPosition

            const savedShowEditorBackground = await tauriGet<boolean>('showEditorBackground')
            if (savedShowEditorBackground !== undefined && savedShowEditorBackground !== null) showEditorBackground.value = savedShowEditorBackground

            const savedEditorToolbar = await tauriGet<string[]>('editorToolbar')
            if (savedEditorToolbar !== undefined && savedEditorToolbar !== null) {
                editorToolbar.value = savedEditorToolbar
            }

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

            const savedTranslateModel = await tauriGet<string>('translateModel')
            if (savedTranslateModel) translateModel.value = savedTranslateModel

            const savedPlaceholderModel = await tauriGet<string>('placeholderModel')
            if (savedPlaceholderModel) placeholderModel.value = savedPlaceholderModel

            const savedPrimaryBackupMethod = await tauriGet<'github' | 'gitee' | 'gitlab'>('primaryBackupMethod')
            if (savedPrimaryBackupMethod) primaryBackupMethod.value = savedPrimaryBackupMethod

            const savedUseLocalEmbedding = await tauriGet<boolean>('useLocalEmbedding')
            if (savedUseLocalEmbedding !== undefined && savedUseLocalEmbedding !== null) useLocalEmbedding.value = savedUseLocalEmbedding
            
            const savedLocalEmbeddingModelStr = await tauriGet<string>('localEmbeddingModelStr')
            if (savedLocalEmbeddingModelStr) localEmbeddingModelStr.value = savedLocalEmbeddingModelStr
            
            const savedLocalEmbeddingPort = await tauriGet<number>('localEmbeddingPort')
            if (savedLocalEmbeddingPort) localEmbeddingPort.value = savedLocalEmbeddingPort

            const savedUseLocalChat = await tauriGet<boolean>('useLocalChat')
            if (savedUseLocalChat !== undefined && savedUseLocalChat !== null) useLocalChat.value = savedUseLocalChat

            const savedLocalChatModelStr = await tauriGet<string>('localChatModelStr')
            if (savedLocalChatModelStr) localChatModelStr.value = savedLocalChatModelStr

            const savedLocalChatPort = await tauriGet<number>('localChatPort')
            if (savedLocalChatPort) localChatPort.value = savedLocalChatPort

            const savedLocalChatContextSize = await tauriGet<number>('localChatContextSize')
            if (savedLocalChatContextSize) localChatContextSize.value = savedLocalChatContextSize

            // Load Local Advanced Settings
            const savedLocalChatGpuLayers = await tauriGet<number>('localChatGpuLayers')
            if (savedLocalChatGpuLayers !== null) localChatGpuLayers.value = savedLocalChatGpuLayers
            const savedLocalChatThreads = await tauriGet<number>('localChatThreads')
            if (savedLocalChatThreads) localChatThreads.value = savedLocalChatThreads
            const savedLocalChatBatchSize = await tauriGet<number>('localChatBatchSize')
            if (savedLocalChatBatchSize) localChatBatchSize.value = savedLocalChatBatchSize
            const savedLocalChatFlashAttn = await tauriGet<boolean>('localChatFlashAttn')
            if (savedLocalChatFlashAttn !== null) localChatFlashAttn.value = savedLocalChatFlashAttn
            const savedLocalChatTemp = await tauriGet<number>('localChatTemp')
            if (savedLocalChatTemp !== null) localChatTemp.value = savedLocalChatTemp
            const savedLocalChatTopP = await tauriGet<number>('localChatTopP')
            if (savedLocalChatTopP !== null) localChatTopP.value = savedLocalChatTopP
            const savedLocalChatMaxTokens = await tauriGet<number>('localChatMaxTokens')
            if (savedLocalChatMaxTokens) localChatMaxTokens.value = savedLocalChatMaxTokens
            const savedLocalChatFreqPen = await tauriGet<number>('localChatFreqPen')
            if (savedLocalChatFreqPen !== null) localChatFreqPen.value = savedLocalChatFreqPen
            const savedLocalChatPresPen = await tauriGet<number>('localChatPresPen')
            if (savedLocalChatPresPen !== null) localChatPresPen.value = savedLocalChatPresPen
            const savedLocalChatStop = await tauriGet<string>('localChatStop')
            if (savedLocalChatStop) localChatStop.value = savedLocalChatStop
            const savedLocalChatSystemPrompt = await tauriGet<string>('localChatSystemPrompt')
            if (savedLocalChatSystemPrompt) localChatSystemPrompt.value = savedLocalChatSystemPrompt

            const savedLocalEmbeddingThreads = await tauriGet<number>('localEmbeddingThreads')
            if (savedLocalEmbeddingThreads) localEmbeddingThreads.value = savedLocalEmbeddingThreads
            const savedLocalEmbeddingBatchSize = await tauriGet<number>('localEmbeddingBatchSize')
            if (savedLocalEmbeddingBatchSize) localEmbeddingBatchSize.value = savedLocalEmbeddingBatchSize
            const savedLocalEmbeddingGpuLayers = await tauriGet<number>('localEmbeddingGpuLayers')
            if (savedLocalEmbeddingGpuLayers !== null) localEmbeddingGpuLayers.value = savedLocalEmbeddingGpuLayers
            const savedLocalEmbeddingMaxSeq = await tauriGet<number>('localEmbeddingMaxSeq')
            if (savedLocalEmbeddingMaxSeq) localEmbeddingMaxSeq.value = savedLocalEmbeddingMaxSeq
            const savedLocalEmbeddingNorm = await tauriGet<boolean>('localEmbeddingNorm')
            if (savedLocalEmbeddingNorm !== null) localEmbeddingNorm.value = savedLocalEmbeddingNorm
            const savedLocalEmbeddingPooling = await tauriGet<string>('localEmbeddingPooling')
            if (savedLocalEmbeddingPooling) localEmbeddingPooling.value = savedLocalEmbeddingPooling

            const savedAutoImageAnalyze = await tauriGet<boolean>('autoImageAnalyze')
            if (savedAutoImageAnalyze !== undefined && savedAutoImageAnalyze !== null) autoImageAnalyze.value = savedAutoImageAnalyze

            const savedDevLogLevel = await tauriGet<string>('devLogLevel')
            if (savedDevLogLevel) devLogLevel.value = savedDevLogLevel as any

            const savedDevLogModules = await tauriGet<string[]>('devLogModules')
            if (savedDevLogModules) devLogModules.value = savedDevLogModules

            // 初始化系统主题监听
            if (preferDarkQuery) {
                preferDarkQuery.addEventListener('change', (e) => {
                    systemIsDark.value = e.matches
                })
            }

        } catch (e) {
            logger.general.error('initSettingData error', e)
        }
    }

    async function setTheme(t: 'light' | 'dark' | 'system') {
        theme.value = t
        await tauriSet('theme', t)
    }

    async function setLocale(l: string) {
        locale.value = l
        await tauriSet('locale', l)
        
        // 同步更新 i18n 运行时和 dayjs (如果已初始化)
        try {
            const { setLocale: syncI18n } = await import('@/locales')
            syncI18n(l)
        } catch (e) {
            logger.general.warn('Failed to sync i18n in store:', e)
        }
    }

    async function setUiScale(s: number) {
        uiScale.value = s
        await tauriSet('uiScale', s)
    }

    async function setToastPosition(p: ToastPosition) {
        toastPosition.value = p
        await tauriSet('toastPosition', p)
    }

    async function setShowEditorBackground(val: boolean) {
        logger.general.debug(`[settingStore] setShowEditorBackground called with: ${val}`)
        showEditorBackground.value = val
        await tauriSet('showEditorBackground', val)
    }

    async function setEditorToolbar(val: string[]) {
        editorToolbar.value = val
        await tauriSet('editorToolbar', val)
    }

    // AI Actions
    async function setAiModelList(list: AiConfig[]) {
        aiModelList.value = list
        await tauriSet('aiModelList', list)
    }
    
    async function updateAiModel(config: AiConfig) {
        // Ensure default modelType if missing
        if (!config.modelType) {
            config.modelType = 'chat'
        }
        const index = aiModelList.value.findIndex((item: AiConfig) => item.key === config.key)
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


    async function setTranslateModel(key: string | null) {
        translateModel.value = key
        await tauriSet('translateModel', key)
    }

    async function setPlaceholderModel(key: string | null) {
        placeholderModel.value = key
        await tauriSet('placeholderModel', key)
    }

    async function setAutoImageAnalyze(val: boolean) {
        autoImageAnalyze.value = val
        await tauriSet('autoImageAnalyze', val)
    }

    async function setPrimaryBackupMethod(method: 'github' | 'gitee' | 'gitlab') {
        primaryBackupMethod.value = method
        await tauriSet('primaryBackupMethod', method)
    }

    async function setUseLocalEmbedding(val: boolean) {
        useLocalEmbedding.value = val
        await tauriSet('useLocalEmbedding', val)
    }
    
    async function setLocalEmbeddingModelStr(val: string) {
        localEmbeddingModelStr.value = val
        await tauriSet('localEmbeddingModelStr', val)
    }
    
    async function setUseLocalEmbedding(val: boolean) {
        useLocalEmbedding.value = val
        await tauriSet('useLocalEmbedding', val)
    }

    async function setLocalEmbeddingModelStr(val: string) {
        localEmbeddingModelStr.value = val
        await tauriSet('localEmbeddingModelStr', val)
    }

    async function setLocalEmbeddingPort(val: number) {
        localEmbeddingPort.value = val
        await tauriSet('localEmbeddingPort', val)
    }

    async function setUseLocalChat(val: boolean) {
        useLocalChat.value = val
        await tauriSet('useLocalChat', val)
    }

    async function setLocalChatModelStr(val: string) {
        localChatModelStr.value = val
        await tauriSet('localChatModelStr', val)
    }

    async function setLocalChatPort(val: number) {
        localChatPort.value = val
        await tauriSet('localChatPort', val)
    }

    async function setLocalChatContextSize(val: number) {
        localChatContextSize.value = val
        await tauriSet('localChatContextSize', val)
    }

    // LLM Advanced Setters
    async function setLocalChatGpuLayers(val: number) {
        localChatGpuLayers.value = val
        await tauriSet('localChatGpuLayers', val)
    }
    async function setLocalChatThreads(val: number) {
        localChatThreads.value = val
        await tauriSet('localChatThreads', val)
    }
    async function setLocalChatBatchSize(val: number) {
        localChatBatchSize.value = val
        await tauriSet('localChatBatchSize', val)
    }
    async function setLocalChatFlashAttn(val: boolean) {
        localChatFlashAttn.value = val
        await tauriSet('localChatFlashAttn', val)
    }
    async function setLocalChatTemp(val: number) {
        localChatTemp.value = val
        await tauriSet('localChatTemp', val)
    }
    async function setLocalChatTopP(val: number) {
        localChatTopP.value = val
        await tauriSet('localChatTopP', val)
    }
    async function setLocalChatMaxTokens(val: number) {
        localChatMaxTokens.value = val
        await tauriSet('localChatMaxTokens', val)
    }
    async function setLocalChatFreqPen(val: number) {
        localChatFreqPen.value = val
        await tauriSet('localChatFreqPen', val)
    }
    async function setLocalChatPresPen(val: number) {
        localChatPresPen.value = val
        await tauriSet('localChatPresPen', val)
    }
    async function setLocalChatStop(val: string) {
        localChatStop.value = val
        await tauriSet('localChatStop', val)
    }
    async function setLocalChatSystemPrompt(val: string) {
        localChatSystemPrompt.value = val
        await tauriSet('localChatSystemPrompt', val)
    }

    // Embedding Advanced Setters
    async function setLocalEmbeddingThreads(val: number) {
        localEmbeddingThreads.value = val
        await tauriSet('localEmbeddingThreads', val)
    }
    async function setLocalEmbeddingBatchSize(val: number) {
        localEmbeddingBatchSize.value = val
        await tauriSet('localEmbeddingBatchSize', val)
    }
    async function setLocalEmbeddingGpuLayers(val: number) {
        localEmbeddingGpuLayers.value = val
        await tauriSet('localEmbeddingGpuLayers', val)
    }
    async function setLocalEmbeddingMaxSeq(val: number) {
        localEmbeddingMaxSeq.value = val
        await tauriSet('localEmbeddingMaxSeq', val)
    }
    async function setLocalEmbeddingNorm(val: boolean) {
        localEmbeddingNorm.value = val
        await tauriSet('localEmbeddingNorm', val)
    }
    async function setLocalEmbeddingPooling(val: string) {
        localEmbeddingPooling.value = val
        await tauriSet('localEmbeddingPooling', val)
    }

    function setLocalChatRunning(val: boolean) {
        localChatRunning.value = val
    }

    function setLocalEmbeddingRunning(val: boolean) {
        localEmbeddingRunning.value = val
    }

    async function setDevLogLevel(val: 'debug' | 'info' | 'warn' | 'error' | 'none') {
        devLogLevel.value = val
        await tauriSet('devLogLevel', val)
    }

    async function setDevLogModules(val: string[]) {
        devLogModules.value = val
        await tauriSet('devLogModules', val)
    }

    return {
        // state
        theme,
        systemIsDark,
        effectiveTheme,
        locale,
        uiScale,
        toastPosition,
        showEditorBackground,
        editorToolbar,
        aiModelList,

        primaryModel,
        embeddingModel,
        rerankModel,
        imageMethodModel,
        translateModel,
        placeholderModel,
        chatModels,
        embeddingModels,
        rerankModels,
        imageModels,
        primaryBackupMethod,
        // actions
        initSettingData,
        setTheme,
        setLocale,
        setUiScale,
        setToastPosition,
        setShowEditorBackground,
        setEditorToolbar,
        setAiModelList,

        updateAiModel,
        setPrimaryModel,
        setEmbeddingModel,
        setRerankModel,
        setImageMethodModel,
        setTranslateModel,
        setPlaceholderModel,
        setPrimaryBackupMethod,
        useLocalEmbedding,
        localEmbeddingModelStr,
        localEmbeddingPort,
        setUseLocalEmbedding,
        setLocalEmbeddingModelStr,
        setLocalEmbeddingPort,
        useLocalChat,
        localChatModelStr,
        localChatPort,
        localChatContextSize,
        localChatRunning,
        localEmbeddingRunning,
        localChatGpuLayers,
        localChatThreads,
        localChatBatchSize,
        localChatFlashAttn,
        localChatTemp,
        localChatTopP,
        localChatMaxTokens,
        localChatFreqPen,
        localChatPresPen,
        localChatStop,
        localChatSystemPrompt,
        localEmbeddingThreads,
        localEmbeddingBatchSize,
        localEmbeddingGpuLayers,
        localEmbeddingMaxSeq,
        localEmbeddingNorm,
        localEmbeddingPooling,
        setUseLocalChat,
        setLocalChatModelStr,
        setLocalChatPort,
        setLocalChatContextSize,
        setLocalChatRunning,
        setLocalEmbeddingRunning,
        setLocalChatGpuLayers,
        setLocalChatThreads,
        setLocalChatBatchSize,
        setLocalChatFlashAttn,
        setLocalChatTemp,
        setLocalChatTopP,
        setLocalChatMaxTokens,
        setLocalChatFreqPen,
        setLocalChatPresPen,
        setLocalChatStop,
        setLocalChatSystemPrompt,
        setLocalEmbeddingThreads,
        setLocalEmbeddingBatchSize,
        setLocalEmbeddingGpuLayers,
        setLocalEmbeddingMaxSeq,
        setLocalEmbeddingNorm,
        setLocalEmbeddingPooling,
        devLogLevel,
        devLogModules,
        setDevLogLevel,
        setDevLogModules,
        autoImageAnalyze,
        setAutoImageAnalyze
    }
})
