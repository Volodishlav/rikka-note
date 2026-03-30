<template>
  <div class="flex-1 relative w-full h-full flex flex-col overflow-hidden dark:bg-zinc-950">
    <MdEditor
        v-model="text"
        :theme="isDark ? 'dark' : 'light'"
        :toolbars="toolbars"
        :editor-id="editorId"
        @onUploadImg="onUploadImg"
        @onGetControl="onGetControl"
        @click="updateSelection"
        @keyup="updateSelection"
        class="flex-1"
    />
  </div>
</template>
<script setup lang="ts">
import {onMounted, onUnmounted, ref, watch} from 'vue';
import {MdEditor, config} from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import {v4 as uuid} from 'uuid';
import {useI18n} from '@/hooks/useI18n';

// ============================================
// 配置 md-editor-v3 使用本地库，避免 CDN 加载被 Tracking Prevention 阻止
// ============================================
import screenfull from 'screenfull';
import mermaid from 'mermaid';
import katex from 'katex';
import * as echarts from 'echarts';
import Cropper from 'cropperjs';
import * as prettier from 'prettier';
import prettierPluginMarkdown from 'prettier/plugins/markdown';
import hljs from 'highlight.js';

import {getWorkspacePath} from '@/lib/workspace';

// 缓存工作区路径，用于同步渲染器预览图片
let cachedWorkspacePath = '';
const updateWorkspaceCache = async () => {
  const ws = await getWorkspacePath();
  cachedWorkspacePath = ws.path;
};

// 配置编辑器使用本地库
config({
  markdownItConfig(md) {
    const defaultRender = md.renderer.rules.image || function (tokens: any, idx: number, options: any, _env: any, self: any) {
      return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.image = (tokens: any, idx: number, options: any, env: any, self: any) => {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('src');
      const src = token.attrs[srcIndex][1];

      // 如果路径以 images/ 开头 且已有工作区缓存，则尝试转换为 Tauri 安全路径
      if (src.startsWith('images/') && cachedWorkspacePath) {
        // 拼接成绝对路径
        const absolutePath = `${cachedWorkspacePath}/${src}`;
        // 转换为 asset:// 安全路径
        token.attrs[srcIndex][1] = convertFileSrc(absolutePath);
      }

      return defaultRender(tokens, idx, options, env, self);
    };
  },
  editorExtensions: {
    // 全屏功能
    screenfull: {
      instance: screenfull,
    },
    // Mermaid 图表
    mermaid: {
      instance: mermaid,
    },
    // KaTeX 数学公式
    katex: {
      instance: katex,
    },
    // ECharts 图表
    echarts: {
      instance: echarts,
    },
    // 图片裁剪
    cropper: {
      instance: Cropper,
    },
    // 代码格式化
    prettier: {
      prettierInstance: prettier,
      parserMarkdownInstance: prettierPluginMarkdown,
    },
    // 代码高亮
    highlight: {
      instance: hljs,
    },
  },
});
import {join} from '@tauri-apps/api/path';
import {exists, mkdir, writeFile} from '@tauri-apps/plugin-fs';
import {useArticleStore} from '@/stores/article';
import {useChatStore} from '@/stores/chat';
// 导入 TAURI 的 convertFileSrc API
import {convertFileSrc} from '@tauri-apps/api/core';
import { logger } from '@/utils/logger';
import {useSettingStore} from '@/stores/setting';
import {fetchAiDescByImage} from '@/lib/ai';
import {toast} from '@/components/ui/toast/use-toast';
const {t} = useI18n();
// 编辑器内容
const text = ref('# Hello md-editor-v3!\n\n这是一个测试文档。');

// 聊天存储
const chatStore = useChatStore();

// 编辑器ID
const editorId = `md-editor-${uuid().substring(0, 8)}`;

// 主题状态
const isDark = ref(document.documentElement.classList.contains('dark'));

// 文章存储
const articleStore = useArticleStore();
const settingStore = useSettingStore();
const isAnalyzing = ref(false);

// 工具栏配置
const toolbars = [
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'title',
  'sub',
  'sup',
  'quote',
  'unorderedList',
  'orderedList',
  'task',
  'codeRow',
  'code',
  'link',
  'image',
  'table',
  'mermaid',
  'katex',
  'revoke',
  'next',
  'save',
  'prettier',
  'pageFullscreen',
  'fullscreen',
  'preview',
  'previewOnly',
  'htmlPreview',
  'catalog'
] as any;

// 监听主题变化
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === 'class') {
      isDark.value = document.documentElement.classList.contains('dark');
    }
  });
});

// 初始化
onMounted(() => {
  // 监听主题变化
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  // 更新工作区路径缓存
  updateWorkspaceCache();

  // 读取活动文件
  if (articleStore.activeFilePath) {
    articleStore.readArticle(articleStore.activeFilePath);
  }
});

// 监听活动文件路径变化
watch(
    () => articleStore.activeFilePath,
    async (newPath) => {
      if (newPath) {
        await articleStore.readArticle(newPath);
      }
    },
    { immediate: true }
);

// 监听文章内容变化
watch(
    () => articleStore.currentArticle,
    (newContent: string) => {
      if (newContent !== text.value) {
        text.value = newContent;
      }
    },
    { immediate: true }
);

// 保存编辑器实例引用
const editorRef = ref<any>(null);
const onGetControl = (ctrl: any) => {
  editorRef.value = ctrl;
};

// 捕捉当前选择并同步至 Chat Store
const updateSelection = () => {
    // 只有当有活动文件时才获取选中区域并同步上下文
    const selection = editorRef.value?.getSelection() || window.getSelection()?.toString() || '';
    if (articleStore.activeFilePath) {
        chatStore.setEditContext(selection, text.value, articleStore.activeFilePath);
    }
};

// 监听 AI 编辑模式开启，自动触发一次上下文同步
watch(() => chatStore.isEditMode, (enabled: boolean) => {
    if (enabled) {
        updateSelection();
    }
});

// 防抖定时器
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// 监听编辑器内容变化，自动保存
watch(
    () => text.value,
    (newContent) => {
      if (newContent !== articleStore.currentArticle) {
        // 清除上一个未触发的定时器
        if (saveTimer) {
          clearTimeout(saveTimer);
        }
        // 设定新的防抖定时器
        saveTimer = setTimeout(() => {
          articleStore.saveCurrentArticle(newContent);
        }, 300);
      }
    }
);

// 3. 新增：组件卸载时清理定时器，避免内存泄漏
onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer);
  // 同时停止主题变化监听，避免另一个潜在内存泄漏（补充优化）
  observer.disconnect();
});

// 图片上传函数（核心改造：保存至工作区 images 目录）
const onUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
  try {
    // 1. 获取工作区路径并确保 images 文件夹存在
    const workspace = await getWorkspacePath();
    if (!workspace.path) {
        toast({
            title: t('common.error'),
            description: '未检测到活跃仓库，请先选择或创建一个仓库。',
            variant: 'destructive',
        });
        return;
    }

    const imagesDir = await join(workspace.path, 'images');
    if (!(await exists(imagesDir))) {
      await mkdir(imagesDir, { recursive: true });
    }

    // 2. 并行处理所有图片
    const relativeImageUrls: string[] = await Promise.all(
        files.map(async (file) => {
          try {
            // 生成唯一文件名，避免重复覆盖
            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `${uuid()}.${fileExt}`;
            // 拼接物理完整路径用于写入
            const fullPath = await join(imagesDir, fileName);

            // 3. 将图片写入本地磁盘
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            await writeFile(fullPath, uint8Array);

            // 4. 返回相对路径，保持 MD 文档的可移植性
            return `images/${fileName}`;
          } catch (error) {
            logger.editor.error(`保存图片 ${file.name} 失败:`, error);
            return 'error: image save failed';
          }
        })
    );

    // 5. 传入转换后的相对路径，用于编辑器插入 MD 文本
    callback(relativeImageUrls);

    // 6. 如果开启了自动分析，对上传的图片执行 VLM 分析
    if (settingStore.autoImageAnalyze) {
      for (const relUrl of relativeImageUrls) {
        const index = relativeImageUrls.indexOf(relUrl);
          // VLM 分析仍需使用安全预览路径或 base64
          // 这里我们获取绝对路径供后面使用
          const fullPath = await join(imagesDir, relUrl.replace('images/', ''));
          const safeUrl = convertFileSrc(fullPath);
          
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            if (base64) {
              await triggerVlmAnalysis(base64, safeUrl);
            }
          };
          reader.readAsDataURL(files[index]);
      }
    }
  } catch (error) {
    logger.editor.error('图片上传整体流程失败:', error);
    callback(files.map(() => 'error: upload process failed'));
  }
};

/**
 * 触发 VLM 分析
 * @param base64 图片 base64
 * @param url 图片在文章中的路径标识 (用于定位替换)
 */
const triggerVlmAnalysis = async (base64: string, url: string) => {
    isAnalyzing.value = true;
    logger.vision.info('Triggering VLM analysis for URL:', url);

    toast({
        title: t('settings.vision.status.analyzing'),
        description: t('settings.vision.status.analyzingDesc'),
    });

    try {
        const desc = await fetchAiDescByImage(base64);
        if (desc) {
            // 在文本中寻找对应的图片标记并追加描述
            // 模式 1: 寻找空 alt 标签 ![undefined](url) 或 ![](url) 或 ![any](url)
            // 我们更温和地追加一行引用
            const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const imgRegex = new RegExp(`!\\[(.*?)\\]\\(${escapedUrl}\\)`, 'g');
            
            if (imgRegex.test(text.value)) {
                // 如果找到了，我们在图片下方插入引用
                text.value = text.value.replace(imgRegex, (match) => {
                    return `${match}\n\n> 💡 **${t('settings.vision.editor.prefix')}**: ${desc.trim()}`;
                });
                logger.vision.info('VLM analysis success, description added to editor.');

                toast({
                    title: t('settings.vision.status.success'),
                    description: t('settings.vision.status.successDesc'),
                });
            }
        }
    } catch (err) {
        logger.vision.error('VLM identification failed:', err);
    } finally {
        isAnalyzing.value = false;
    }
};
</script>

<style scoped>
</style>