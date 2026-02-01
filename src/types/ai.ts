export type ModelType = 'chat' | 'image' | 'video' | 'audio' | 'embedding' | 'rerank';

export interface AiConfig {
  key: string
  title: string
  temperature?: number
  topP?: number
  apiKey?: string
  model?: string
  baseURL?: string
  modelType?: ModelType
  icon?: string
  apiKeyUrl?: string
  customHeaders?: Record<string, string>
  voice?: string
  speed?: number
}

export interface Model {
  id: string
  object: string
  created: number
  owned_by: string
}

export const baseAiConfig: AiConfig[] = [
  {
    key: 'siliconflow',
    title: 'SiliconFlow',
    baseURL: 'https://api.siliconflow.cn/v1',
    icon: 'https://s2.loli.net/2025/09/09/D8Al2raSvewN5xn.jpg',
    apiKeyUrl: 'https://cloud.siliconflow.cn/i/O2ciJeZw'
  },
  {
    key: 'chatgpt',
    title: 'ChatGPT',
    baseURL: 'https://api.openai.com/v1',
    icon: 'https://s2.loli.net/2025/06/25/cVMf586WTBYAju4.png',
    apiKeyUrl: 'https://platform.openai.com/api-keys'
  },
  {
    key: 'gemini',
    title: 'Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    icon: 'https://s2.loli.net/2025/06/25/JU2jVxLFsW4lB6S.png',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey'
  },
  {
    key: 'grok',
    title: 'Grok',
    baseURL: 'https://api.x.ai/v1',
    icon: 'https://s2.loli.net/2025/06/25/JBZMluaobKq43QE.png',
    apiKeyUrl: 'https://console.x.ai/'
  },
  {
    key: 'ollama',
    title: 'Ollama',
    baseURL: 'http://localhost:11434/v1',
    icon: 'https://s2.loli.net/2025/06/25/legkEpHACDBQ5Xz.png',
  },
  {
    key: 'lmstudio',
    title: 'LM Studio',
    baseURL: 'http://localhost:1234/v1',
    icon: 'https://s2.loli.net/2025/06/25/IifFV4HTQ9dpGZE.png',
  },
  {
    key: 'deepseek',
    title: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    icon: 'https://s2.loli.net/2025/06/25/n39WmsCDbVLQzjr.png',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys'
  },
  {
    key: 'openrouter',
    title: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    icon: 'https://s2.loli.net/2025/06/25/CTjSDHLl4XdvxM5.png',
    apiKeyUrl: 'https://openrouter.ai/api-keys'
  },
]
