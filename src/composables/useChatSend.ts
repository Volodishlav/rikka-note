import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useTagStore } from '@/stores/tag'
import { fetchAiStream } from '@/lib/ai' // 假设你有这个 AI 调用封装
import { useI18n } from '@/hooks/useI18n' // 使用项目中现有的useI18n钩子

export function useChatSend() {
    const chatStore = useChatStore()
    const tagStore = useTagStore()
    const isSending = ref(false)
    // const { t } = useI18n()

    const sendMessage = async (content: string) => {
        if (!content.trim() || isSending.value) return

        isSending.value = true
        const currentTagId = tagStore.currentTagId // 确保 tagStore 有这个属性

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

            // 3. 调用 AI 接口 (这里简化了逻辑，你需要对接你的 fetchAiStream)
            // 假设 fetchAiStream 接受 prompt 和回调
            await fetchAiStream({
                messages: [{ role: 'user', content }],
                onMessage: (chunk: string) => {
                    aiMessage.content += chunk
                    chatStore.updateChat({ ...aiMessage }) // 实时更新 UI
                },
                onFinish: () => {
                    chatStore.saveChat({ ...aiMessage }, true) // 完成后保存数据库
                },
                onError: (err: any) => {
                    aiMessage.content += `\n[Error: ${err.message}]`
                    chatStore.saveChat({ ...aiMessage }, true)
                }
            })

        } catch (e) {
            console.error(e)
        } finally {
            isSending.value = false
        }
    }

    return {
        sendMessage,
        isSending
    }
}