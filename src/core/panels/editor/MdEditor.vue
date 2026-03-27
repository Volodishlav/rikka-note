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

// 配置编辑器使用本地库
config({
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
import {appDataDir, join} from '@tauri-apps/api/path';
import {exists, mkdir, writeFile} from '@tauri-apps/plugin-fs';
import {useArticleStore} from '@/stores/article';
import {useChatStore} from '@/stores/chat';
// 导入 TAURI 的 convertFileSrc API
import {convertFileSrc} from '@tauri-apps/api/core';
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

// 图片上传函数（核心改造：加入 convertFileSrc 转换）
const onUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
  try {
    // 1. 获取应用数据目录并确保图片文件夹存在
    const appDir = await appDataDir();
    const imagesDir = await join(appDir, 'article', 'images');
    if (!(await exists(imagesDir))) {
      await mkdir(imagesDir, { recursive: true });
    }

    // 2. 并行处理所有图片，收集转换后的安全路径
    const safeImageUrls: string[] = await Promise.all(
        files.map(async (file) => {
          try {
            // 生成唯一文件名，避免重复覆盖
            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `${uuid()}.${fileExt}`;
            // 获取图片的本地持久化完整路径
            const fullPath = await join(imagesDir, fileName);

            // 3. 将图片写入本地磁盘（原有逻辑不变）
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            await writeFile(fullPath, uint8Array);

            // 4. 核心：将本地 fullPath 转换为 TAURI webview 允许的安全路径（新增）
            const safeUrl = convertFileSrc(fullPath);
            // 路径格式归一化（可选，进一步保证兼容性）
            return safeUrl.replace(/\\/g, '/');
          } catch (error) {
            console.error(`保存图片 ${file.name} 失败:`, error);
            return 'error: image save failed';
          }
        })
    );

    // 5. 传入转换后的安全路径，用于编辑器预览和插入 MD 文本
    callback(safeImageUrls);
  } catch (error) {
    console.error('图片上传整体流程失败:', error);
    callback(files.map(() => 'error: upload process failed'));
  }
};
</script>

<style scoped>
</style>