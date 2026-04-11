<template>
  <SidebarProvider>
    <div class="flex h-full w-full bg-background text-foreground overflow-hidden">
      <!-- Sidebar -->
      <Sidebar collapsible="none" class="w-64 border-r shrink-0">
        <SidebarHeader class="p-4 pt-6 pb-2">
          <h2 class="text-lg font-semibold px-2">{{ t('settings.title') }}</h2>
        </SidebarHeader>
        <SidebarContent class="p-2">
          <SidebarGroup>
            <SidebarMenu>
              <template v-for="item in navItems" :key="item.id">
                <!-- 有子项的菜单（开发者） -->
                <Collapsible 
                  v-if="item.subItems" 
                  v-model:open="isDeveloperOpen" 
                  as-child 
                  class="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger as-child>
                      <SidebarMenuButton 
                        :active="activeTab.startsWith(item.id)"
                        @click="handleParentClick(item)"
                        class="w-full justify-start"
                      >
                        <component :is="item.icon" class="mr-2 h-4 w-4" />
                        <span>{{ item.label }}</span>
                        <ChevronRight class="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem v-for="sub in item.subItems" :key="sub.id">
                          <SidebarMenuSubButton 
                            :active="activeTab === sub.id"
                            @click="activeTab = sub.id"
                          >
                            <span>{{ sub.label }}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                <!-- 普通菜单 -->
                <SidebarMenuItem v-else>
                  <SidebarMenuButton
                    :active="activeTab === item.id"
                    @click="activeTab = item.id"
                    class="w-full justify-start"
                  >
                    <component :is="item.icon" class="mr-2 h-4 w-4" />
                    <span>{{ item.label }}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </template>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <!-- Content -->
      <main class="flex-1 overflow-auto p-6">
        <GeneralSetting v-if="activeTab === 'general'" />
        <LocalModelSetting v-if="activeTab === 'local'" />
        <AiSetting v-if="activeTab === 'ai'" />
        <PromptSetting v-if="activeTab === 'prompt'" />
        <RagSetting v-if="activeTab === 'rag'" />
        <EncryptionSetting v-if="activeTab === 'encryption'" />
        <DeveloperSetting 
          v-if="activeTab.startsWith('developer')" 
          :active-tab="activeTab === 'developer:color' ? 'color' : activeTab === 'developer:evaluation' ? 'evaluation' : 'debug'" 
        />
        <VisionSetting v-if="activeTab === 'vision'" />
        <EditorSetting v-if="activeTab === 'editor'" />
      </main>
    </div>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { 
  BotMessageSquare, Drama, Settings, BookText, Code2, 
  Shield, Laptop, ChevronRight, Eye, PencilLine
} from 'lucide-vue-next'
import { 
  Sidebar, SidebarContent, SidebarHeader, SidebarProvider,
  SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton
} from '@/components/ui/sidebar'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible'

import GeneralSetting from './general/GeneralSetting.vue'
import LocalModelSetting from './local/LocalModelSetting.vue'
import AiSetting from './ai/AiSetting.vue'
import PromptSetting from './prompt/PromptSetting.vue'
import RagSetting from './rag/RagSetting.vue'
import EncryptionSetting from './encryption/EncryptionSetting.vue'
import DeveloperSetting from './developer/DeveloperSetting.vue'
import VisionSetting from './vision/VisionSetting.vue'
import EditorSetting from './editor/EditorSetting.vue'

const { t } = useI18n()

// 状态管理
const activeTab = ref('general')
const isDeveloperOpen = ref(false) // 默认收起

/**
 * 处理父级项点击
 * 如果是开发者项，跳转到调试系统调试子项并展开
 */
const handleParentClick = (item: any) => {
  if (item.id === 'developer') {
    activeTab.value = 'developer:debug' // 跳转到调试系统子项
  } else {
    activeTab.value = item.id
  }
}

const navItems = computed(() => [
  {
    id: 'general',
    label: t('settings.general.title'),
    icon: Settings
  },
  {
    id: 'editor',
    label: t('settings.editor.title'),
    icon: PencilLine
  },
  {
    id: 'local',
    label: t('settings.local.title'),
    icon: Laptop
  },
  {
    id: 'ai',
    label: t('settings.ai.title'),
    icon: BotMessageSquare
  },
  {
    id: 'prompt',
    label: t('settings.prompt.title'),
    icon: Drama
  },
  {
    id: 'rag',
    label: t('settings.rag.title'),
    icon: BookText
  },
  {
    id: 'vision',
    label: t('settings.vision.title'),
    icon: Eye
  },
  {
    id: 'encryption',
    label: t('settings.encryption.title'),
    icon: Shield
  },
  {
    id: 'developer',
    label: t('settings.developer.title'),
    icon: Code2,
    subItems: [
      { id: 'developer:color', label: t('settings.developer.tabs.color') },
      { id: 'developer:debug', label: t('settings.developer.tabs.debug') },
      { id: 'developer:evaluation', label: t('settings.developer.tabs.evaluation') },
    ]
  }
])
</script>

