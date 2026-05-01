<script setup lang="ts">
import { Settings, PenTool, RefreshCw, Cpu, Box, MessageSquareCode, Settings2, ChevronRight, Eye, Shield, Mic } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useSettingStore } from '@/stores/setting'
import { computed } from 'vue'

const router = useRouter()
const settingStore = useSettingStore()

const openSettingDetail = (id: string) => {
  router.push(`/mobile/setting/${id}`)
}

const settingsGroups = computed(() => [
  {
    title: '',
    items: [
      { id: 'general', icon: Settings, label: '常规', value: '' },
      { id: 'editor', icon: PenTool, label: '编辑器', value: '' },
      { id: 'sync', icon: RefreshCw, label: '同步', value: '' },
      { id: 'encryption', icon: Shield, label: '加密与安全', value: '' }
    ]
  },
  {
    title: '核心 AI 功能',
    items: [
      { id: 'local', icon: Box, label: '本地模型', value: settingStore.localModelName ? '已配置' : '未就绪' },
      { id: 'ai', icon: Cpu, label: 'AI 模型配置', value: '' },
      { id: 'prompt', icon: MessageSquareCode, label: 'Prompt 管理', value: '' },
      { id: 'rag', icon: Settings2, label: 'RAG 设置', value: '评估面板' },
      { id: 'vision', icon: Eye, label: 'OCR 与视觉', value: '' },
      { id: 'speech', icon: Mic, label: '语音输入', value: '' }
    ]
  }
])
</script>

<template>
  <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
    <!-- 顶栏 Header -->
    <header class="flex items-center justify-center px-4 h-14 sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
      <h1 class="text-[20px] font-black text-slate-800 dark:text-slate-100">设置</h1>
    </header>

    <!-- 设置列表内容 -->
    <div class="flex-1 overflow-y-auto px-4 py-2 space-y-6">
      <div v-for="(group, groupIndex) in settingsGroups" :key="groupIndex" class="space-y-2">
        <!-- 分组标题 (如果有) -->
        <h2 v-if="group.title" class="text-[13px] font-bold text-slate-500 dark:text-slate-400 pl-2">
          {{ group.title }}
        </h2>

        <!-- 设置卡片组 -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-700">
          <button 
            v-for="item in group.items" 
            :key="item.id"
            @click="openSettingDetail(item.id)"
            class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"
          >
            <div class="flex items-center gap-4">
              <component :is="item.icon" :size="20" class="text-slate-500 dark:text-slate-400" />
              <span class="text-[15px] font-medium text-slate-700 dark:text-slate-200">{{ item.label }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="item.value" class="text-[13px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">
                {{ item.value }}
              </span>
              <ChevronRight :size="16" class="text-slate-300 dark:text-slate-600" />
            </div>
          </button>
        </div>
      </div>
      
      <!-- 底部留白 -->
      <div class="h-6"></div>
    </div>
  </div>
</template>
