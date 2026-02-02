import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useTagStore } from '@/stores/tag'
import { useMarkStore } from '@/stores/mark'
import { useSettingStore } from '@/stores/setting'
import { useAI } from '@/composables/useAI'
import { useI18n } from '@/hooks/useI18n'
import OpenAI from 'openai'

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
            const userChat = await chatStore.insert({
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
            
            // Build Context String
            let contextStr = '';
            
            // === 修复: 构建标准 OpenAI 消息格式 ===
            // 获取当前标签页的聊天记录
            const currentTagChats = chats.filter(c => c.tagId === currentTagId);
            
            // 找到最后一次清空上下文的位置
            let lastClearIndex = -1;
            // 倒序查找
            for (let i = currentTagChats.length - 1; i >= 0; i--) {
                if (currentTagChats[i].type === 'clear') {
                    lastClearIndex = i;
                    break;
                }
            }
            
            // 获取有效历史记录（清除点之后，且不包含本次刚插入的消息）
            const historyChats = currentTagChats.slice(lastClearIndex + 1).filter(c => {
                // 排除刚插入的用户消息和AI占位消息
                if (userChat && c.id === userChat.id) return false;
                if (aiMessage && c.id === aiMessage.id) return false;
                // 只保留 chat 类型
                return c.type === 'chat';
            });
            
            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

            // 将历史记录转换为 OpenAI 消息格式
            if (historyChats.length > 0) {
                 historyChats.forEach(chat => {
                    const role = chat.role === 'system' ? 'assistant' : 'user';
                    // 确保 content 不为空
                    if (chat.content) {
                        messages.push({
                            role: role as 'assistant' | 'user',
                            content: chat.content
                        });
                    }
                 });
            }
            // ===================================
            
            if (scanMarks.length > 0) {
                contextStr += '=== OCR Context ===\n' + scanMarks.map((mark, index) => `${index + 1}. ${mark.content}`).join('\n') + '\n\n';
            }
            if (textMarks.length > 0) {
                contextStr += '=== Text Context ===\n' + textMarks.map((mark, index) => `${index + 1}. ${mark.content}`).join('\n') + '\n\n';
            }
            if (imageMarks.length > 0) {
                 contextStr += '=== Image Context ===\n' + imageMarks.map((mark, index) => `${index + 1}. [Image]`).join('\n') + '\n\n';
            }
            if (linkMarks.length > 0) {
                contextStr += '=== Link Context ===\n' + linkMarks.map((mark, index) => `${index + 1}. ${mark.url}`).join('\n') + '\n\n';
            }
            if (fileMarks.length > 0) {
                 contextStr += '=== File Context ===\n' + fileMarks.map((mark, index) => `${index + 1}. ${mark.content}`).join('\n') + '\n\n';
            }

            // 如果有上下文（图片/文本等），将其作为 System 消息或者 User 消息的前置内容
            // 这里我们选择将其作为当前 User 消息的前置内容，或者单独作为一个 User 消息
            // 为了让 AI 知道这是参考资料，我们将其拼接到当前用户消息中，但使用更自然的语言
            let currentMessageContent = content;
            if (contextStr) {
                currentMessageContent = `Context information is below.\n---------------------\n${contextStr.trim()}\n---------------------\nGiven the context information and not prior knowledge, answer the query.\nQuery: ${content}`;
            }

            // 添加当前用户消息
            messages.push({
                role: 'user',
                content: currentMessageContent
            });

            // 4. 调用 AI 接口 (REAL API)
            // 此时传入的是完整的 messages 数组
            const finalContent = await fetchAiStream(messages, async (accumulatedContent) => {
                await chatStore.saveChat({
                    ...aiMessage,
                    content: accumulatedContent
                }, false)
            }, undefined, true)

            // 5. 完成后保存到数据库
            await chatStore.saveChat({
                ...aiMessage,
                content: finalContent
            }, true)

        } catch (e: any) {
            console.error(e)
            // 错误处理
        } finally {
            isSending.value = false
        }
    }

    return {
        sendMessage,
        isSending
    }
}
