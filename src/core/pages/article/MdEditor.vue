<template>
  <div class="flex-1 relative w-full h-full flex flex-col overflow-hidden dark:bg-zinc-950">
    <MdEditor 
      v-model="text" 
      :theme="isDark ? 'dark' : 'light'"
      :toolbars="toolbars"
      :editor-id="editorId"
      @onUploadImg="onUploadImg"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import { v4 as uuid } from 'uuid';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists, mkdir, writeFile } from '@tauri-apps/plugin-fs';
import { useArticleStore } from '@/stores/article';

// 编辑器内容
const text = ref('# Hello md-editor-v3!\n\n这是一个测试文档。');

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
  (newContent) => {
    if (newContent !== text.value) {
      text.value = newContent;
    }
  },
  { immediate: true }
);

// 防抖定时器
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// 监听编辑器内容变化，自动保存
watch(
  () => text.value,
  (newContent) => {
    if (newContent !== articleStore.currentArticle) {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      saveTimer = setTimeout(() => {
        articleStore.saveCurrentArticle(newContent);
      }, 300);
    }
  }
);

// 图片上传函数
const onUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
  try {
    // 获取应用数据目录
    const appDir = await appDataDir();
    const imagesDir = await join(appDir, 'article', 'images');
    
    // 确保目录存在
    if (!(await exists(imagesDir))) {
      await mkdir(imagesDir, { recursive: true });
    }
    
    // 生成临时URL用于预览
    const tempUrls = files.map(file => URL.createObjectURL(file));
    
    // 异步保存图片到本地
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `${uuid()}.${fileExt}`;
        const fullPath = await join(imagesDir, fileName);

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await writeFile(fullPath, uint8Array);
      } catch (error) {
        console.error('Failed to save image:', error);
      }
    }

    // 调用回调函数，返回临时URL用于预览
    callback(tempUrls);
  } catch (error) {
    console.error('Image upload failed:', error);
    // 失败时返回临时URL
    const tempUrls = files.map(file => URL.createObjectURL(file));
    callback(tempUrls);
  }
};
</script>

<style scoped>
</style>