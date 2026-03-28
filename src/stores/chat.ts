import {defineStore} from 'pinia'
import {ref} from 'vue'
import {
    type Chat,
    clearChatsBySessionId,
    deleteChat as deleteChatDb,
    getChats,
    initChatsDb,
    insertChat,
    updateChat as updateChatDb
} from '@/db/chats'
import {
    type ChatSession,
    initChatSessionsDb,
    insertChatSession,
    getChatSessions,
    updateChatSession,
    deleteChatSession,
    updateChatSessionTime
} from '@/db/chat_sessions'

export const useChatStore = defineStore('chat', () => {
    // 基础状态
    const chats = ref<Chat[]>([])
    const sessions = ref<ChatSession[]>([])
    const currentSessionId = ref<number | null>(null)
    
    // UI状态
    const loading = ref(false)
    const isPlaceholderEnabled = ref(true)
    const syncState = ref(false)
    const lastSyncTime = ref('')

    // AI 编辑模式状态
    const isEditMode = ref(false)
    const editSelection = ref('')
    const editFullContent = ref('')
    const editFilePath = ref('')

    // 初始化整个聊天环境
    const init = async () => {
        loading.value = true
        try {
            await initChatsDb()
            await initChatSessionsDb()
            
            await fetchSessions()
            
            // 如果有会话，默认加载第一个（最近的）
            if (sessions.value.length > 0) {
                await switchSession(sessions.value[0].id)
            } else {
                currentSessionId.value = null
                chats.value = []
            }
        } finally {
            loading.value = false
        }
    }

    // 获取会话列表
    const fetchSessions = async () => {
        sessions.value = await getChatSessions()
    }

    // 新建会话
    const createSession = async (title: string = 'New Chat') => {
        const res = await insertChatSession({
            title
        })
        if (res.lastInsertId) {
            await fetchSessions()
            await switchSession(res.lastInsertId)
            return res.lastInsertId
        }
        return null
    }

    // 删除会话
    const removeSession = async (id: number) => {
        await deleteChatSession(id)
        await clearChatsBySessionId(id) // 同步清理此会话下的所有聊天
        await fetchSessions()
        
        // 如果删除的是当前会话，自动切换到上一个或置空
        if (currentSessionId.value === id) {
            if (sessions.value.length > 0) {
                await switchSession(sessions.value[0].id)
            } else {
                currentSessionId.value = null
                chats.value = []
            }
        }
    }

    // 切换会话
    const switchSession = async (id: number) => {
        currentSessionId.value = id
        chats.value = await getChats(id)
    }

    // 更新会话标题
    const editSessionTitle = async (id: number, title: string) => {
        const session = sessions.value.find((s: ChatSession) => s.id === id)
        if (session) {
            await updateChatSession({
                id,
                title,
                updatedAt: Date.now()
            })
            await fetchSessions()
        }
    }

    // ---------------------------------------------
    // Chats 操作
    // ---------------------------------------------

    // 插入聊天
    const insert = async (chat: Omit<Chat, 'id' | 'createdAt' | 'sessionId'>) => {
        let sessionId = currentSessionId.value
        
        // 如果当前没有会话，自动创建一个新会话
        if (!sessionId) {
            let title = 'New Chat'
            if (chat.role === 'user' && chat.content) {
                // 取开头作为标题
                title = chat.content.slice(0, 15) + (chat.content.length > 15 ? '...' : '')
            }
            const newId = await createSession(title)
            if (newId) {
                sessionId = newId
            } else { return null }
        } else {
            // Check if this is the first real user message in an existing empty/default session
            const session = sessions.value.find((s: ChatSession) => s.id === sessionId)
            if (session && chats.value.length === 0 && chat.role === 'user' && chat.content) {
                const newTitle = chat.content.slice(0, 15) + (chat.content.length > 15 ? '...' : '')
                await editSessionTitle(sessionId!, newTitle)
            } else {
                // 如果有会话插入消息，更新一下会话时间，以便排序置顶
                await updateChatSessionTime(sessionId!)
                await fetchSessions() // 刷新列表以反应顺序变化
            }
        }

        const res = await insertChat({
            ...chat,
            sessionId: sessionId
        })
        
        if (res.lastInsertId) {
            const newChat: Chat = {
                id: res.lastInsertId,
                sessionId: sessionId,
                createdAt: Date.now(),
                ...chat
            }
            chats.value.push(newChat)
            return newChat
        }
        return null
    }

    // 更新聊天
    const updateChat = (chat: Chat) => {
        const index = chats.value.findIndex((item: Chat) => item.id === chat.id)
        if (index !== -1) {
            chats.value[index] = Object.assign({}, chats.value[index], chat)
        }
    }

    // 保存聊天（持久化）
    const saveChat = async (chat: Chat, isSave = false) => {
        updateChat(chat)
        if (isSave) {
            await updateChatDb(chat)
        }
    }

    // 删除聊天
    const deleteChat = async (id: number) => {
        chats.value = chats.value.filter((item: Chat) => item.id !== id)
        await deleteChatDb(id)
    }
    
    // 清空当前会话
    const clearCurrentSession = async () => {
        if (!currentSessionId.value) return
        chats.value = []
        await clearChatsBySessionId(currentSessionId.value)
    }


    // 更新编辑上下文
    const setEditContext = (selection: string, fullContent: string, filePath: string) => {
        editSelection.value = selection
        editFullContent.value = fullContent
        editFilePath.value = filePath
    }

    // 切换编辑模式
    const toggleEditMode = (val?: boolean) => {
        isEditMode.value = val !== undefined ? val : !isEditMode.value
    }

    return {
        chats,
        sessions,
        currentSessionId,
        loading,
        isPlaceholderEnabled,
        syncState,
        lastSyncTime,
        init,
        fetchSessions,
        createSession,
        removeSession,
        switchSession,
        editSessionTitle,
        insert,
        updateChat,
        saveChat,
        deleteChat,
        clearCurrentSession,
        isEditMode,
        editSelection,
        editFullContent,
        editFilePath,
        setEditContext,
        toggleEditMode
    }
})