<template>
  <SidebarContent>
    <div class="p-2 sticky top-0 bg-sidebar z-10 space-y-2">
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
              ref="searchInputRef"
              v-model="searchQuery"
              :placeholder="isAddingNewTag ? t('record.mark.tag.enterNewTagPlaceholder') : t('record.mark.tag.searchPlaceholder')"
              class="pl-8 h-9 bg-sidebar-accent/50 border-sidebar-border focus:bg-sidebar-accent"
              @keydown.enter="quickAddTag"
          />
        </div>

        <Button
            variant="outline"
            class="h-9 w-9 p-0 flex-shrink-0 border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent"
            :class="{ 'bg-primary/20 border-primary/50': isAddingNewTag }"
            :title="t('record.mark.tag.quickAdd')"
            @click="handleAddButtonClick"
        >
          <Plus class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <SidebarGroup v-if="pinnedTags.length > 0">
       <SidebarGroupLabel>{{ t('record.mark.tag.pinned') }}</SidebarGroupLabel>
       <SidebarMenu>
          <TagListItem v-for="tag in pinnedTags" :key="tag.id" :tag="tag" />
       </SidebarMenu>
    </SidebarGroup>

    <SidebarGroup>
       <SidebarGroupLabel>{{ t('record.mark.tag.others') }}</SidebarGroupLabel>
       <SidebarMenu>
          <TagListItem v-for="tag in normalTags" :key="tag.id" :tag="tag" />
       </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { Search, Plus } from 'lucide-vue-next'
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu } from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTagStore } from '@/stores/tag'
import { useMarkStore } from '@/stores/mark'
import { useI18n } from '@/hooks/useI18n'
import { insertTag } from '@/db/tags'
import TagListItem from './TagListItem.vue'
import { useToast } from '@/components/ui/toast/use-toast'

const tagStore = useTagStore()
const markStore = useMarkStore()
const { t } = useI18n()
const { toast } = useToast()

const searchQuery = ref('')
const searchInputRef = ref<any>(null)
// 是否处于添加新标签模式，控制搜索框 placeholder 的显示
const isAddingNewTag = ref(false)

// Initialize data
onMounted(async () => {
  await tagStore.fetchTags()
  // Ensure we have a current tag selected, if not select the first one or logic from store
  if (!tagStore.currentTagId && tagStore.tags.length > 0) {
     tagStore.setCurrentTagId(tagStore.tags[0].id)
     markStore.fetchMarks()
  }
})

const filteredTags = computed(() => {
  if (!searchQuery.value) return tagStore.tags
  return tagStore.tags.filter(tag => tag.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

const pinnedTags = computed(() => filteredTags.value.filter(tag => tag.isPin))
const normalTags = computed(() => filteredTags.value.filter(tag => !tag.isPin))

/**
 * 处理添加按钮点击事件
 * 点击后切换到添加新标签模式，改变搜索框 placeholder
 */
function handleAddButtonClick() {
  // 切换到添加新标签模式
  isAddingNewTag.value = true
  // 聚焦到搜索框
  nextTick(() => {
    if (searchInputRef.value?.$el) {
      searchInputRef.value.$el.focus()
    }
  })
  // 如果搜索框已有内容，直接执行添加
  if (searchQuery.value.trim()) {
    quickAddTag()
  }
}

/**
 * 快速添加标签
 * 根据当前模式决定是否添加标签
 */
async function quickAddTag() {
  if (!searchQuery.value.trim()) {
     toast({
       title: t('record.mark.tag.nameCantBeEmpty'),
       variant: 'destructive',
     })
     if (searchInputRef.value?.$el) {
        searchInputRef.value.$el.focus()
     }
     return
  }
  
  try {
     const res = await insertTag({ name: searchQuery.value.trim() })
     if (res && res.lastInsertId) {
        await tagStore.fetchTags()
        tagStore.setCurrentTagId(res.lastInsertId as number)
        markStore.fetchMarks()
        searchQuery.value = ''
        // 添加成功后，重置为搜索模式
        isAddingNewTag.value = false
        toast({
          title: t('record.mark.tag.addNew'),
          description: t('common.save') + ' ' + t('common.confirm'), // Or "Added successfully"
        })
     }
  } catch (e) {
     console.error(e)
  }
}
</script>