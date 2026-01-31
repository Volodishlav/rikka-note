import {defineStore} from 'pinia'
import {ref} from 'vue'
import {
    type Chat,
    clearChatsByTagId,
    deleteChat as deleteChatDb,
    getChats,
    initChatsDb,
    insertChat,
    updateChat as updateChatDb,
    updateChatsInsertedById
} from '@/db/chats'

export const useChatStore = defineStore('chat', () => {
    const chats = ref<Chat[]>([])
    const loading = ref(false)
    const isLinkMark = ref(true)
    const isPlaceholderEnabled = ref(true)
    const syncState = ref(false)
    const lastSyncTime = ref('')

    // 初始化聊天记录
    const init = async (tagId: number) => {
        loading.value = true
        try {
            await initChatsDb()
            chats.value = await getChats(tagId)
        } finally {
            loading.value = false
        }
    }

    // 插入聊天
    const insert = async (chat: Omit<Chat, 'id' | 'createdAt'>) => {
        const res = await insertChat(chat)
        if (res.lastInsertId) {
            const newChat: Chat = {
                id: res.lastInsertId,
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
        const index = chats.value.findIndex(item => item.id === chat.id)
        if (index !== -1) {
            chats.value[index] = chat
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
        chats.value = chats.value.filter(item => item.id !== id)
        await deleteChatDb(id)
    }

    // 清空当前 Tag 的聊天
    const clearChats = async (tagId: number) => {
        chats.value = []
        await clearChatsByTagId(tagId)
    }
    // 更新 Inserted 状态
    const updateInsert = async (id: number) => {
        await updateChatsInsertedById(id)
        const index = chats.value.findIndex(item => item.id === id)
        if (index !== -1) {
            chats.value[index].inserted = true
        }
    }
    return {
        chats,
        loading,
        isLinkMark,
        isPlaceholderEnabled,
        syncState,
        lastSyncTime,
        init,
        insert,
        updateChat,
        saveChat,
        deleteChat,
        clearChats,
        updateInsert
    }
})