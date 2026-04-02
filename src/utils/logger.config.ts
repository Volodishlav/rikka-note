export interface LogModuleConfig {
  id: string;
  color: string;
  defaultEnabled: boolean;
  files: string[];
}

export const LOG_MODULES: LogModuleConfig[] = [
  {
    id: 'assistant',
    color: '#8b5cf6', // purple
    defaultEnabled: true,
    files: ['ChatPanel.vue', 'ChatHeader.vue', 'ChatInput.vue', 'MessageItem.vue', 'ChatLanguage.vue', 'db/chats.ts', 'stores/chat.ts', 'stores/prompt.ts', 'lib/ai.ts(chat)']
  },
  {
    id: 'explorer',
    color: '#06b6d4', // cyan
    defaultEnabled: true,
    files: ['workspace.ts', 'ExplorerPanel.vue', 'stores/article.ts', 'stores/workspace.ts']
  },
  {
    id: 'editor',
    color: '#ec4899', // pink
    defaultEnabled: true,
    files: ['MdEditor.vue', 'EditorTabs.vue','EditorToolbar.vue' ]
  },
  {
    id: 'ai',
    color: '#10b981', // green
    defaultEnabled: true,
    files: ['ai.ts(config)', 'LocalModelSetting.vue']
  },
  {
    id: 'rag',
    color: '#f97316', // orange
    defaultEnabled: true,
    files: ['rag.ts', 'db/vector.ts', 'stores/vector.ts', 'RagSetting.vue']
  },
  {
    id: 'search',
    color: '#d97706', // amber
    defaultEnabled: true,
    files: ['fuzzy-search.ts', 'SearchPanel.vue']
  },
  {
    id: 'vision',
    color: '#3b82f6', // blue
    defaultEnabled: true,
    files: ['MdEditor.vue', 'ai.ts(vision)', 'VisionSetting.vue', 'ocr.ts', 'OcrCapture.vue', 'OcrPanel.vue','CoreLayout.vue']
  },
  {
    id: 'auth',
    color: '#ef4444', // red
    defaultEnabled: true,
    files: ['encryption.ts', 'UnlockDialog.vue']
  },
  {
    id: 'general',
    color: '#64748b', // slate
    defaultEnabled: true,
    files: ['RootLayout.vue', 'App.vue', 'main.ts', 'db/index.ts', 'utils/tauriStore.ts', 'stores/setting.ts', 'stores/layout.ts']
  },
  {
    id: 'default',
    color: '#6366f1', // indigo
    defaultEnabled: true,
    files: ['Global Fallback']
  }
];
