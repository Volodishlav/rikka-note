/**
 * AI 调用封装
 * 暂时为空实现，用于解决导入错误
 */

interface FetchAiStreamOptions {
  messages: Array<{ role: string; content: string }>;
  onMessage: (chunk: string) => void;
  onFinish: () => void;
  onError: (err: any) => void;
}

/**
 * 流式获取AI响应
 * @param options 流式调用选项
 */
export async function fetchAiStream(options: FetchAiStreamOptions) {
  const { onMessage, onFinish, onError } = options;
  
  try {
    // 模拟AI响应，分段返回
    const chunks = [
      'AI 正在生成回复...',
      '\n\n这是一个模拟的AI回复。',
      '\n\n实际使用时，这里会调用真实的AI API。',
      '\n\n您可以根据需要修改此实现，对接您的AI服务。'
    ];
    
    // 模拟网络延迟
    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 500));
      onMessage(chunk);
    }
    
    onFinish();
  } catch (error) {
    onError(error);
  }
}

/**
 * 获取AI占位符建议
 * @param input 用户输入
 * @param mode 输入模式
 * @returns 占位符建议
 */
export async function fetchAiPlaceholder(input: string, mode: string): Promise<string> {
  // 空实现，返回模拟建议
  switch (mode) {
    case 'translate':
      return '请输入需要翻译的文本，例如：Hello world';
    case 'organize':
      return '请输入需要整理的内容，例如：今天上午9点开会';
    case 'chat':
    default:
      return '请输入您的问题或想法，例如：如何提高学习效率';
  }
}

/**
 * 获取AI响应（非流式）
 * @param prompt 用户输入的提示
 * @returns AI响应文本
 */
export async function fetchAiResponse(prompt: string): Promise<string> {
  // 空实现，返回模拟响应
  return '这是一个模拟的AI回复。实际使用时，这里会调用真实的AI API。';
}

/**
 * 检查AI连接状态
 * @returns 连接状态
 */
export async function checkAiConnection(): Promise<boolean> {
  // 空实现，返回模拟状态
  return true;
}