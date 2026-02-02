import OpenAI from 'openai';
import { useSettingStore } from '@/stores/setting';
import { usePromptStore } from '@/stores/prompt';
import { AiConfig } from '@/types/ai';
import { useToast } from '@/composables/useToast';
import { useChatStore } from '@/stores/chat';
import { fetch } from '@tauri-apps/plugin-http';

export function useAI() {
    const store = useSettingStore();
    const promptStore = usePromptStore();
    const chatStore = useChatStore();
    const toast = useToast();

    /**
     * 根据模型类型获取 AI 设置
     */
    function getAISettings(modelTypeKey: 'primaryModel' | 'embeddingModel' | 'rerankModel' | 'imageMethodModel' | 'markDescModel' | 'translateModel' | 'placeholderModel' = 'primaryModel'): AiConfig | undefined {
        const modelKey = store[modelTypeKey];
        if (!modelKey) {
            // 如果未设置特定模型，则回退到主要模型
            const primary = store.primaryModel;
            return store.aiModelList.find((item: AiConfig) => item.key === primary);
        }
        
        return store.aiModelList.find((item: AiConfig) => item.key === modelKey);
    }

    async function validateAIService(baseURL: string | undefined): Promise<string | null> {
        if (!baseURL) {
            toast.error('请先设置 AI 地址 (Please set AI Base URL first)');
            return null;
        }
        return baseURL;
    }

    function handleAIError(error: any, showToast = true): string | null {
        const errorMessage = error instanceof Error ? error.message : 'Unknown Error';
        
        // 专门处理 OpenAI 400 错误以显示详细信息
        if (errorMessage.includes('400') || (error.status === 400)) {
             try {
                 if (error.error && error.error.message) {
                     const detailedMsg = `Request Failed: ${error.error.message}`;
                     if (showToast) toast.error(detailedMsg);
                     return detailedMsg;
                 }
             } catch (e) {
                 // ignore
             }
        }

        if (errorMessage === 'Request was aborted.') {
            return null;
        }
        if (showToast) {
            toast.error(errorMessage || 'AI Error');
        }
        return `Request Failed: ${errorMessage}`;
    }

    async function createOpenAIClient(aiConfig?: AiConfig) {
        if (!aiConfig) return null;
        
        const baseURL = aiConfig.baseURL;
        const apiKey = aiConfig.apiKey;

        return new OpenAI({
            apiKey: apiKey || '',
            baseURL: baseURL,
            dangerouslyAllowBrowser: true,
            // 移除显式的 fetch 以使用原生 window.fetch，这样可以避免 http.fetch_cancel_body 错误
            defaultHeaders: {
                "x-stainless-arch": null,
                "x-stainless-lang": null,
                "x-stainless-os": null,
                "x-stainless-package-version": null,
                "x-stainless-retry-count": null,
                "x-stainless-runtime": null,
                "x-stainless-runtime-version": null,
                "x-stainless-timeout": null,
                ...(aiConfig.customHeaders || {})
            }
        });
    }

    // 准备消息列表，注入 System Prompt
    async function prepareMessages(contentOrMessages: string | OpenAI.Chat.ChatCompletionMessageParam[], includeHistory: boolean = false): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
        
        // 1. 获取当前选中的 Prompt
        // 确保 Prompt 数据已加载
        if (!promptStore.currentPrompt) {
            await promptStore.initPromptData();
        }
        const currentPrompt = promptStore.currentPrompt;

        // 2. 如果有 System Prompt，添加为第一条消息
        if (currentPrompt && currentPrompt.content) {
            messages.push({
                role: 'system',
                content: currentPrompt.content
            });
        }

        // 3. 添加用户消息或合并历史消息
        if (Array.isArray(contentOrMessages)) {
            // 如果传入的是数组，直接追加
            messages.push(...contentOrMessages);
        } else {
             // 如果传入的是字符串，构造单条 User 消息
            messages.push({
                role: 'user',
                content: contentOrMessages
            });
        }

        return messages;
    }

    async function fetchAi(text: string): Promise<string> {
        try {
            const aiConfig = getAISettings('primaryModel');
            if (!aiConfig || !await validateAIService(aiConfig.baseURL)) return '';

            const openai = await createOpenAIClient(aiConfig);
            if (!openai) return '';

            const messages = await prepareMessages(text);

            const completion = await openai.chat.completions.create({
                model: aiConfig.model || '',
                messages: messages,
                temperature: aiConfig.temperature || 1,
                top_p: aiConfig.topP || 1,
            });

            return completion.choices[0].message.content || '';
        } catch (error) {
            return handleAIError(error) || '';
        }
    }

    async function fetchAiStream(input: string | OpenAI.Chat.ChatCompletionMessageParam[], onUpdate: (content: string) => void, abortSignal?: AbortSignal, includeHistory: boolean = false): Promise<string> {
        try {
            const aiConfig = getAISettings('primaryModel');
            if (!aiConfig || !await validateAIService(aiConfig.baseURL)) return '';

            const openai = await createOpenAIClient(aiConfig);
            if (!openai) return '';

            const messages = await prepareMessages(input, includeHistory);

            // 调试日志：输出完整发送给AI的消息数组
            console.log('=== 完整发送给AI的消息数组 (Full Request Messages) ===');
            console.log(JSON.stringify(messages, null, 2));
            console.log('======================================================');

            const stream = await openai.chat.completions.create({
                model: aiConfig.model || '',
                messages: messages,
                temperature: aiConfig.temperature,
                top_p: aiConfig.topP,
                stream: true,
            }, {
                signal: abortSignal
            });

            let thinking = '';
            let fullContent = '';
            let isFirstResponse = true; // 标记是否是第一次响应

            for await (const chunk of stream) {
                if (abortSignal?.aborted) break;

                const thinkingContent = (chunk.choices[0]?.delta as any)?.reasoning_content || '';
                const content = chunk.choices[0]?.delta?.content || '';
                
                if (thinkingContent) {
                    thinking += thinkingContent;
                    fullContent = `<thinking>\n${thinking}\n</thinking>`; 
                }
                
                if (content) {
                    fullContent += content;
                }
                
                onUpdate(fullContent);
            }

            return fullContent;
        } catch (error) {
            return handleAIError(error) || '';
        }
    }

    async function fetchEmbedding(text: string): Promise<number[] | null> {
        try {
            if (!text.length) return null;

            const aiConfig = getAISettings('embeddingModel');
            if (!aiConfig) throw new Error('Embedding model not configured');
            if (!aiConfig.baseURL || !aiConfig.model) throw new Error('Embedding model configuration incomplete');

           // 直接使用 fetch，因为 OpenAI SDK 的嵌入支持可能有所不同，或者我们希望有更具体的控制
           // 但 OpenAI SDK 支持嵌入功能。如果可能，我们尝试使用 SDK，或者像 note-gen 那样回退到使用 fetch
           // note-gen 使用了 fetch。为了安全处理自定义端点，我们坚持使用 fetch 来获取嵌入

            const response = await fetch(aiConfig.baseURL + '/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiConfig.apiKey}`,
                },
                body: JSON.stringify({
                    model: aiConfig.model,
                    input: text,
                    encoding_format: 'float'
                })
            });

            if (!response.ok) {
                throw new Error(`Embedding request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (!data || !data.data || !data.data[0] || !data.data[0].embedding) {
                throw new Error('Invalid embedding response format');
            }

            return data.data[0].embedding;
        } catch (error) {
            handleAIError(error);
            return null;
        }
    }

    return {
        getAISettings,
        createOpenAIClient,
        fetchAi,
        fetchAiStream,
        fetchEmbedding,
        handleAIError
    };
}
