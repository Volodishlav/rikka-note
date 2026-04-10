<template>
  <div class="space-y-6">
    <!-- 编辑器背景设置 (从常规迁移而来) -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">{{ t('settings.editor.title') }}</h3>
      <div class="flex items-center justify-between border rounded-lg p-4 bg-muted/50">
        <div class="space-y-0.5">
          <label class="text-sm font-medium">{{ t('settings.editor.emptyBackground') }}</label>
          <p class="text-[13px] text-muted-foreground">{{ t('settings.editor.emptyBackgroundDesc') }}</p>
        </div>
        <Switch v-model="editorBgModel" />
      </div>
    </div>

    <!-- 工具栏配置 -->
    <div class="space-y-4">
      <div class="space-y-1">
        <h3 class="text-lg font-medium">{{ t('settings.editor.toolbar.title') }}</h3>
        <p class="text-sm text-muted-foreground">{{ t('settings.editor.toolbar.description') }}</p>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20">
        <div 
          v-for="item in allToolbarItems" 
          :key="item" 
          class="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
        >
          <Checkbox 
            :id="`toolbar-${item}`" 
            :model-value="editorToolbar.includes(item)"
            @update:model-value="(val) => toggleToolbarItem(item, !!val)"
          />
          <Label 
            :for="`toolbar-${item}`" 
            class="text-sm font-medium cursor-pointer flex-1"
          >
            {{ t(`settings.editor.toolbar.items.${item}`) }}
          </Label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useSettingStore } from '@/stores/setting'
import { storeToRefs } from 'pinia'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const { t } = useI18n()
const settingStore = useSettingStore()
const { showEditorBackground, editorToolbar } = storeToRefs(settingStore)
const { setShowEditorBackground, setEditorToolbar } = settingStore

// 背景设置的双向绑定
const editorBgModel = computed({
  get: () => showEditorBackground.value,
  set: (val) => setShowEditorBackground(val)
})

// 所有可用的工具栏项
const allToolbarItems = [
  'bold', 'italic', 'underline', 'strikethrough', 'title', 'sub', 'sup', 'quote',
  'unorderedList', 'orderedList', 'task', 'codeRow', 'code', 'link', 'image',
  'table', 'mermaid', 'katex', 'revoke', 'next', 'save', 'prettier',
  'pageFullscreen', 'fullscreen', 'preview', 'previewOnly', 'htmlPreview', 'catalog'
]

// 切换工具栏项的显示状态
const toggleToolbarItem = (item: string, checked: boolean) => {
  let newList = [...editorToolbar.value]
  if (checked) {
    if (!newList.includes(item)) {
      newList.push(item)
      // 按照标准顺序排序，确保 UI 一致性
      newList.sort((a, b) => allToolbarItems.indexOf(a) - allToolbarItems.indexOf(b))
    }
  } else {
    newList = newList.filter((i) => i !== item)
  }
  setEditorToolbar(newList)
}
</script>
