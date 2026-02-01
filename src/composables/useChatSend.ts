import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useTagStore } from '@/stores/tag'
import { useMarkStore } from '@/stores/mark'
import { useSettingStore } from '@/stores/setting'
import { useAI } from '@/composables/useAI'
import { useI18n } from '@/hooks/useI18n'

export function useChatSend() {
    const chatStore = useChatStore()
    const tagStore = useTagStore()
    const markStore = useMarkStore()
    const settingStore = useSettingStore()
    const { fetchAiStream } = useAI()
    const isSending = ref(false)

    const sendMessage = async (content: string) => {
        if (!content.trim() || isSending.value) return

        isSending.value = true
        const currentTagId = tagStore.currentTagId

        try {
            // 1. 插入用户消息
            await chatStore.insert({
                tagId: currentTagId,
                role: 'user',
                content: content,
                type: 'chat',
                inserted: false,
            })

            // 2. 插入 AI 思考/回复占位符
            const aiMessage = await chatStore.insert({
                tagId: currentTagId,
                role: 'system',
                content: '', // 初始为空，等待流式填充
                type: 'chat',
                inserted: false,
            })

            if (!aiMessage) return

            // 3. 准备 Prompt 上下文
            // 复用 ChatInput.vue 中的 Prompt 构建逻辑
            await markStore.fetchMarks()
            const marks = markStore.marks
            const chats = chatStore.chats
            
            const scanMarks = chatStore.isLinkMark ? marks.filter(item => item.type === 'scan') : []
            const textMarks = chatStore.isLinkMark ? marks.filter(item => item.type === 'text') : []
            const imageMarks = chatStore.isLinkMark ? marks.filter(item => item.type === 'image') : []
            const linkMarks = chatStore.isLinkMark ? marks.filter(item => item.type === 'link') : []
            const fileMarks = chatStore.isLinkMark ? marks.filter(item => item.type === 'file') : []
            
            const lastClearIndex = chats.findLastIndex(item => item.type === 'clear')
            const chatsAfterClear = chats.slice(lastClearIndex + 1)

            const request_content = `
Use ${settingStore.theme === 'dark' ? 'dark' : 'light'} theme context if needed? No, use language.
Use system language or detected language.
${[...scanMarks, ...textMarks, ...imageMarks, ...fileMarks, ...linkMarks].length ? 'You can refer to the following content notes:' : ''}
${scanMarks.length ? 'The following are screenshots after using OCR to identify text fragments:' : ''}
${scanMarks.map((item, index) => `${index + 1}. ${item.content}`).join(';\n\n')}
${textMarks.length ? 'The following are text copy records:' : ''}
${textMarks.map((item, index) => `${index + 1}. ${item.content}`).join(';\n\n')}
${imageMarks.length ? 'The following are image records:' : ''}
${imageMarks.map((item, index) => `${index + 1}. ${item.content}`).join(';\n\n')}
${linkMarks.length ? 'The following are link records:' : ''}
${linkMarks.map((item, index) => `${index + 1}. ${item.content}`).join(';\n\n')}
${fileMarks.length ? 'The following are file records:' : ''}
${fileMarks.map((item, index) => `${index + 1}. ${item.content}`).join(';\n\n')}
${chatsAfterClear.length ? 'Refer to the following chat records:' : ''}
${
  chatsAfterClear
    .filter((item) => item.tagId === currentTagId && item.type === "chat" && item.id !== aiMessage.id)
    .map((item, index) => `${index + 1}. ${item.content}`)
    .join(';\n\n')
}
${content}
            `.trim()

            // 4. 调用 AI 接口 (REAL API)
            const finalContent = await fetchAiStream(request_content, async (accumulatedContent) => {
            // 在 useAI 中调用 updateChat 时会传入完整内容，但这里我们直接更新 store
            // 我们使用 saveChat 并设置 saveToDb=false 来处理频繁更新
                await chatStore.saveChat({
                    ...aiMessage,
                    content: accumulatedContent
                }, false)
            })

            // 5. 完成后保存到数据库
            await chatStore.saveChat({
                ...aiMessage,
                content: finalContent
            }, true)

        } catch (e: any) {
            console.error(e)
            // 错误处理 - 可以将错误附加到消息中或显示提示框
            const errorMsg = `\n[Error: ${e.message || 'Unknown error'}]`
            // 如果存在 AI 消息，附加错误信息
            const aiMessage = chatStore.chats.find(c => c.tagId === currentTagId && c.role === 'system' && c.content === '')
            if (aiMessage) { // Might need better way to track current AI message if multiple
                 // 实际上我们从 insert 操作中获取了 aiMessage 引用
                 // 但是如果 aiMessage 不是响应式 ref，我们不能直接修改 aiMessage.content，但它来自 store
                 // 我们直接更新 store 即可
            }
        } finally {
            isSending.value = false
        }
    }

    return {
        sendMessage,
        isSending
    }
}
