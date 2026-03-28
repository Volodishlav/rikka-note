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

export const baseAiConfig: AiConfig[] = [
  {
    key: 'siliconflow',
    title: 'SiliconFlow',
    baseURL: 'https://api.siliconflow.cn/v1',
    icon: 'https://s2.loli.net/2025/09/09/D8Al2raSvewN5xn.jpg',
    apiKeyUrl: 'https://cloud.siliconflow.cn/i/O2ciJeZw',
    modelType: 'chat'
  },
  {
    key: 'chatgpt',
    title: 'ChatGPT',
    baseURL: 'https://api.openai.com/v1',
    icon: 'https://s2.loli.net/2025/06/25/cVMf586WTBYAju4.png',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    modelType: 'chat'
  },
  {
    key: 'gemini',
    title: 'Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    icon: 'https://s2.loli.net/2025/06/25/JU2jVxLFsW4lB6S.png',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    modelType: 'chat'
  },
  {
    key: 'grok',
    title: 'Grok',
    baseURL: 'https://api.x.ai/v1',
    icon: 'https://s2.loli.net/2025/06/25/JBZMluaobKq43QE.png',
    apiKeyUrl: 'https://console.x.ai/',
    modelType: 'chat'
  },
  {
    key: 'ollama',
    title: 'Ollama',
    baseURL: 'http://localhost:11434/v1',
    icon: 'https://s2.loli.net/2025/06/25/legkEpHACDBQ5Xz.png',
    modelType: 'chat'
  },
  {
    key: 'lmstudio',
    title: 'LM Studio',
    baseURL: 'http://localhost:1234/v1',
    icon: 'https://s2.loli.net/2025/06/25/IifFV4HTQ9dpGZE.png',
    modelType: 'chat'
  },
  {
    key: 'deepseek',
    title: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    icon: 'https://s2.loli.net/2025/06/25/n39WmsCDbVLQzjr.png',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    modelType: 'chat'
  },
  {
    key: 'openrouter',
    title: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    icon: 'https://s2.loli.net/2025/06/25/CTjSDHLl4XdvxM5.png',
    apiKeyUrl: 'https://openrouter.ai-keys',
    modelType: 'chat'
  },
]

export interface OpenAIResult {
  id: string;
  choices: OpenAIChoice[];
  created: number;
  model: string;
  object: string;
  usage: Usage;
  system_fingerprint: string;
}

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIChoice {
  index: number;
  message: Message;
  logprobs: null;
  finish_reason: string;
}

interface Message {
  role: string;
  content: string;
}

export interface AiModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface GeminiResult {
  candidates: GeminiCandidate[];
  promptFeedback: PromptFeedback;
}

interface GeminiCandidate {
  content: {
    parts: {
      text: string;
    }[];
    role: string;
  };
  finishReason: string;
  index: number;
  safetyRatings: SafetyRating[];
}

interface SafetyRating {
  category: string;
  probability: string;
}

interface PromptFeedback {
  safetyRatings: SafetyRating[];
}