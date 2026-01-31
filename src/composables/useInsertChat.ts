import { useMarkStore } from '@/stores/mark'
import { useChatStore } from '@/stores/chat'
import { type Chat } from '@/db/chats'
import { useTagStore } from '@/stores/tag'

export function useInsertChat() {
    const markStore = useMarkStore()
    const chatStore = useChatStore()
    const tagStore = useTagStore()

    const insertChatToMark = async (chat: Chat) => {
        // 避免重复插入
        if (chat.inserted) return

        // 1. 插入到 Mark Store
        // 如果消息包含图片，作为图片 Mark 插入；否则作为文本 Mark
        if (chat.image) {
            await markStore.insert({
                tagId: tagStore.currentTagId,
                type: 'image',
                content: chat.content || '', // 可能有附带文字
                url: chat.image,
                desc: '',
            })
        } else if (chat.content) {
            await markStore.insert({
                tagId: tagStore.currentTagId,
                type: 'text',
                content: chat.content,
                url: '',
                desc: '',
            })
        }

        // 2. 更新 Chat Store 的 inserted 状态
        await chatStore.updateInsert(chat.id)
    }

    const insertChatsToMark = async (chats: Chat[]) => {
        for (const chat of chats) {
            await insertChatToMark(chat)
        }
    }

    return {
        insertChatToMark,
        insertChatsToMark
    }
}