<script setup lang="ts">
import {ref} from 'vue';
import {invoke} from '@tauri-apps/api/core';
import {writeText} from '@tauri-apps/plugin-clipboard-manager';
import {Check, Copy, Loader2, Scan, ScanText, Upload, X} from 'lucide-vue-next';
import {logger} from '@/utils/logger';
import {useLayoutStore} from '@/stores/layout';

const layoutStore = useLayoutStore();

// 状态定义
const resultText = ref('');
const isProcessing = ref(false);
const isCopied = ref(false);
const errorMsg = ref('');

/**
 * 处理截屏识别 (重构后)
 */
const handleScreenCaptureOcr = async () => {
  isProcessing.value = true;
  errorMsg.value = '';
  try {
    // 1. 调用后端捕获全屏
    const bytes = await invoke<number[]>('capture_main_screen');
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
    const reader = new FileReader();
    reader.onload = () => {
      // 2. 将截图传给选区组件并开启选区模式
      layoutStore.setScreenSelecting(true, reader.result as string);
      isProcessing.value = false;
    };
    reader.readAsDataURL(blob);
  } catch (err: any) {
    errorMsg.value = `截图失败: ${err}`;
    isProcessing.value = false;
  }
};

/**
 * 接收来自选区组件的裁剪图片并识别
 */
const handleSelectedImage = async (bytes: number[]) => {
  isProcessing.value = true;
  errorMsg.value = '';
  try {
    resultText.value = await invoke<string>('ocr_from_bytes', {data: bytes});
  } catch (err: any) {
    errorMsg.value = `识别失败: ${err}`;
  } finally {
    isProcessing.value = false;
  }
};

// 暴露给父组件调用
defineExpose({ handleSelectedImage });

/**
 * 处理文件上传识别
 */
const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  isProcessing.value = true;
  errorMsg.value = '';
  
  try {
    const reader = new FileReader();
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      // 调用后端字节识别命令
      try {
        resultText.value = await invoke<string>('ocr_from_bytes', {data: Array.from(bytes)});
      } catch (err: any) {
        errorMsg.value = `识别错误: ${err}`;
      } finally {
        isProcessing.value = false;
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (err: any) {
    errorMsg.value = `读取文件失败: ${err}`;
    isProcessing.value = false;
  }
};

/**
 * 复制结果到剪贴板
 */
const copyToClipboard = async () => {
  if (!resultText.value) return;
  try {
    await writeText(resultText.value);
    isCopied.value = true;
    setTimeout(() => { isCopied.value = false; }, 2000);
  } catch (err) {
    logger.ocr.error('复制失败', err);
  }
};

/**
 * 清除结果
 */
const clearResult = () => {
  resultText.value = '';
  errorMsg.value = '';
};
</script>

<template>
  <div class="ocr-container p-4 rounded-xl border border-border bg-card shadow-sm max-w-2xl mx-auto space-y-4">
    <!-- 头部标题 -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2 text-brand-purple dark:text-brand-cyan">
        <ScanText :size="20" />
        <span class="font-bold text-lg">本地 OCR 文字识别</span>
      </div>
      <button 
        v-if="resultText"
        @click="clearResult"
        class="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X :size="18" />
      </button>
    </div>

    <!-- 操作区 -->
    <div class="flex gap-3">
      <!-- 截屏识别按钮 -->
      <button 
        @click="handleScreenCaptureOcr"
        :disabled="isProcessing"
        class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-brand-purple text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-md group"
      >
        <Loader2 v-if="isProcessing" class="animate-spin" :size="18" />
        <Scan v-else :size="18" class="group-hover:scale-110 transition-transform" />
        <span>截屏识别</span>
      </button>

      <!-- 图片上传按钮 -->
      <label 
        class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted cursor-pointer transition-all border border-border group"
      >
        <Upload :size="18" class="group-hover:-translate-y-1 transition-transform" />
        <span>处理图片</span>
        <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
      </label>
    </div>

    <!-- 说明文字 -->
    <p class="text-xs text-muted-foreground text-center italic">
      所有操作均在本地完成，无需网络连接，保护您的隐私。
    </p>

    <!-- 结果展示区 -->
    <div v-if="resultText || isProcessing || errorMsg" class="relative group mt-4">
      <div 
        v-if="errorMsg" 
        class="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20"
      >
        {{ errorMsg }}
      </div>
      
      <div v-else class="relative">
        <textarea
          v-model="resultText"
          readonly
          placeholder="识别结果将显示在此处..."
          class="w-full h-48 p-4 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-brand-purple outline-none resize-none transition-all"
        ></textarea>
        
        <!-- 悬浮复制按钮 -->
        <button
          v-if="resultText"
          @click="copyToClipboard"
          class="absolute top-2 right-2 p-2 rounded-md bg-card/80 border border-border shadow-sm hover:bg-secondary transition-all"
          :title="isCopied ? '已复制' : '复制内容'"
        >
          <Check v-if="isCopied" class="text-green-500" :size="16" />
          <Copy v-else :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ocr-container {
  transition: all 0.3s ease;
  
  textarea {
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: hsl(var(--muted));
      border-radius: 10px;
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.ocr-container {
  animation: fadeIn 0.4s ease-out;
}
</style>
