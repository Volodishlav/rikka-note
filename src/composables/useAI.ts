import OpenAI from 'openai';
import { useSettingStore } from '@/stores/setting';
import { AiConfig } from '@/types/ai';
import { useToast } from '@/composables/useToast';
import { fetch } from '@tauri-apps/plugin-http';

export function useAI() {
    const store = useSettingStore();
    const toast = useToast();

    /**
     * Get AI Settings based on model type
     */
    function getAISettings(modelTypeKey: 'primaryModel' | 'embeddingModel' | 'rerankModel' | 'imageMethodModel' | 'markDescModel' | 'translateModel' | 'placeholderModel' = 'primaryModel'): AiConfig | undefined {
        const modelKey = store[modelTypeKey];
        if (!modelKey) {
            // Fallback to primary model if specific model is not set
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
        
        // Handle OpenAI 400 error specifically to show detailed message
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
            // fetch: fetch, // Remove explicit fetch to use native window.fetch which avoids http.fetch_cancel_body error
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

    async function fetchAi(text: string): Promise<string> {
        try {
            const aiConfig = getAISettings('primaryModel');
            if (!aiConfig || !await validateAIService(aiConfig.baseURL)) return '';

            const openai = await createOpenAIClient(aiConfig);
            if (!openai) return '';

            // TODO: Add prompt handling (system prompt)

            const completion = await openai.chat.completions.create({
                model: aiConfig.model || '',
                messages: [{ role: 'user', content: text }],
                temperature: aiConfig.temperature || 1,
                top_p: aiConfig.topP || 1,
            });

            return completion.choices[0].message.content || '';
        } catch (error) {
            return handleAIError(error) || '';
        }
    }

    async function fetchAiStream(text: string, onUpdate: (content: string) => void, abortSignal?: AbortSignal): Promise<string> {
        try {
            const aiConfig = getAISettings('primaryModel');
            if (!aiConfig || !await validateAIService(aiConfig.baseURL)) return '';

            const openai = await createOpenAIClient(aiConfig);
            if (!openai) return '';

            // TODO: Add prompt handling

            const stream = await openai.chat.completions.create({
                model: aiConfig.model || '',
                messages: [{ role: 'user', content: text }],
                temperature: aiConfig.temperature,
                top_p: aiConfig.topP,
                stream: true,
            }, {
                signal: abortSignal
            });

            let thinking = '';
            let fullContent = '';

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

            // Using fetch directly as OpenAI SDK embedding support might vary or we want specific control
            // But OpenAI SDK supports embeddings. Let's try to use SDK if possible, or fallback to fetch like note-gen did.
            // note-gen used fetch. Let's stick to fetch for embeddings to be safe with custom endpoints.

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
