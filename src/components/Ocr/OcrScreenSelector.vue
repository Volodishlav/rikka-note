<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useLayoutStore } from '@/stores/layout';
import { Check, X, MousePointer2 } from 'lucide-vue-next';

const layoutStore = useLayoutStore();
const emit = defineEmits(['selected']);

// 选区坐标
const startX = ref(0);
const startY = ref(0);
const currentX = ref(0);
const currentY = ref(0);
const isSelecting = ref(false);
const hasSelection = ref(false);

// 窗口尺寸
const winWidth = ref(window.innerWidth);
const winHeight = ref(window.innerHeight);

const updateWinSize = () => {
  winWidth.value = window.innerWidth;
  winHeight.value = window.innerHeight;
};

// 矩形属性
const rect = computed(() => {
  const x = Math.min(startX.value, currentX.value);
  const y = Math.min(startY.value, currentY.value);
  const width = Math.abs(currentX.value - startX.value);
  const height = Math.abs(currentY.value - startY.value);
  return { x, y, width, height };
});

/**
 * 开始选择
 */
const onMouseDown = (e: MouseEvent) => {
  isSelecting.value = true;
  hasSelection.value = false;
  startX.value = e.clientX;
  startY.value = e.clientY;
  currentX.value = e.clientX;
  currentY.value = e.clientY;
};

/**
 * 正在选择
 */
const onMouseMove = (e: MouseEvent) => {
  if (!isSelecting.value) return;
  currentX.value = e.clientX;
  currentY.value = e.clientY;
};

/**
 * 结束选择
 */
const onMouseUp = () => {
  if (!isSelecting.value) return;
  isSelecting.value = false;
  // 只有选区足够大才认为有效
  if (rect.value.width > 5 && rect.value.height > 5) {
    hasSelection.value = true;
  }
};

/**
 * 确认选区：执行裁剪并返回数据
 */
const confirmSelection = () => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 获取设备像素比，确保裁剪精度
    // 注意：screenImageData 是原始分辨率截图，而窗口可能是缩放后的
    // 我们假设 clientX/Y 是匹配窗口布局的。截图也是跨平台的。
    // 在 Tauri 中截图通常是物理像素。我们需要计算比例。
    const scaleX = img.naturalWidth / window.innerWidth;
    const scaleY = img.naturalHeight / window.innerHeight;

    canvas.width = rect.value.width * scaleX;
    canvas.height = rect.value.height * scaleY;

    ctx.drawImage(
      img,
      rect.value.x * scaleX,
      rect.value.y * scaleY,
      rect.value.width * scaleX,
      rect.value.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // 转换为字节数组发送给后端
    canvas.toBlob((blob) => {
      if (blob) {
        blob.arrayBuffer().then((buffer) => {
          const bytes = new Uint8Array(buffer);
          emit('selected', Array.from(bytes));
          close();
        });
      }
    }, 'image/png');
  };
  img.src = layoutStore.screenImageData;
};

/**
 * 取消并关闭
 */
const close = () => {
  layoutStore.setScreenSelecting(false);
};

// 键盘支持
const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape') close();
  if (e.key === 'Enter' && hasSelection.value && !isSelecting.value) confirmSelection();
};

onMounted(() => {
  window.addEventListener('keydown', handleEsc);
  window.addEventListener('resize', updateWinSize);
});
onUnmounted(() => {
  window.removeEventListener('keydown', handleEsc);
  window.removeEventListener('resize', updateWinSize);
});
</script>

<template>
  <div 
    class="fixed inset-0 z-[9999] cursor-crosshair overflow-hidden select-none"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
  >
    <!-- 截图背景层 -->
    <img 
      :src="layoutStore.screenImageData" 
      class="absolute inset-0 w-full h-full object-fill pointer-events-none"
    />

    <!-- 变暗遮罩层 (SVG 实现打孔效果) -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none">
      <defs>
        <mask id="selectionMask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect 
            v-if="isSelecting || hasSelection"
            :x="rect.x" 
            :y="rect.y" 
            :width="rect.width" 
            :height="rect.height" 
            fill="black" 
          />
        </mask>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#selectionMask)" />
    </svg>

    <!-- 选择框边框 -->
    <div 
      v-if="isSelecting || hasSelection"
      class="absolute border-2 border-brand-cyan shadow-[0_0_0_1px_rgba(255,255,255,0.5)] pointer-events-none"
      :style="{
        left: rect.x + 'px',
        top: rect.y + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px'
      }"
    >
      <!-- 四角装饰点 -->
      <div class="absolute -top-1 -left-1 w-2 h-2 bg-brand-cyan rounded-full"></div>
      <div class="absolute -top-1 -right-1 w-2 h-2 bg-brand-cyan rounded-full"></div>
      <div class="absolute -bottom-1 -left-1 w-2 h-2 bg-brand-cyan rounded-full"></div>
      <div class="absolute -bottom-1 -right-1 w-2 h-2 bg-brand-cyan rounded-full"></div>
    </div>

    <!-- 操作按钮组 (在选区下方或内部) -->
    <div 
      v-if="hasSelection && !isSelecting"
      @mousedown.stop
      class="absolute flex gap-2 p-1 bg-card rounded-lg shadow-xl border border-border pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200"
      :style="{
        left: Math.max(10, Math.min(winWidth - 120, rect.x + rect.width - 100)) + 'px',
        top: (rect.y + rect.height + 10 > winHeight - 50) ? (rect.y - 45) + 'px' : (rect.y + rect.height + 10) + 'px'
      }"
    >
      <button 
        @click.stop="confirmSelection"
        class="p-2 rounded-md bg-brand-purple text-white hover:opacity-90 transition-all flex items-center gap-1 text-sm font-medium"
      >
        <Check :size="16" />
        <span>识别</span>
      </button>
      <button 
        @click.stop="close"
        class="p-2 rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-all"
      >
        <X :size="16" />
      </button>
    </div>

    <!-- 顶部提示条 -->
    <div 
      v-if="!hasSelection && !isSelecting"
      class="absolute top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-white text-sm flex items-center gap-2 pointer-events-none"
    >
      <MousePointer2 :size="16" class="text-brand-cyan" />
      <span>拖拽鼠标框选识别区域，ESC 退出</span>
    </div>
  </div>
</template>

<style scoped>
.cursor-crosshair {
  cursor: crosshair;
}
</style>
