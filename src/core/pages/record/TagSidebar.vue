<template>
  <div class="flex flex-col h-full w-full">
    <!-- 顶部：标签选择器/下拉菜单 -->
    <div class="border-b px-3 py-3 flex-shrink-0">
      <button
          @click="isDialogOpen = true"
          class="w-full h-9 border cursor-pointer rounded flex justify-between items-center px-3
                 bg-background hover:bg-accent transition-colors
                 dark:bg-background dark:hover:bg-accent"
          :title="t('record.tag.switchTip')"
      >
        <div class="flex gap-2 items-center min-w-0">
          <component
              :is="currentTag?.name === 'Idea' ? LightbulbIcon : TagIcon"
              class="size-4 flex-shrink-0"
          />
          <span class="text-xs truncate">
            {{ currentTag?.name || '-' }} ({{ currentTag?.total || 0 }})
          </span>
        </div>
        <ArrowUpDownIcon class="size-3 flex-shrink-0" />
      </button>
    </div>

    <!-- 中间：标签列表 -->
    <div class="flex-1 overflow-y-auto px-2 py-2">
      <div v-if="tags.length === 0" class="flex items-center justify-center h-full text-muted-foreground text-sm">
        {{ t('record.tag.noTags') }}
      </div>

      <!-- 置顶标签组 -->
      <div v-if="pinnedTags.length > 0" class="mb-3">
        <div class="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {{ t('record.tag.pinned') }}
        </div>
        <TagItem
            v-for="tag in pinnedTags"
            :key="tag.id"
            :tag="tag"
            :is-selected="tag.id === tagStore.currentTagId"
            @select="handleSelectTag"
            @pin-toggle="handlePinToggle"
            @rename="handleRename"
            @delete="handleDeleteTag"
        />
      </div>

      <!-- 普通标签组 -->
      <div v-if="normalTags.length > 0">
        <div class="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {{ t('record.tag.others') }}
        </div>
        <TagItem
            v-for="tag in normalTags"
            :key="tag.id"
            :tag="tag"
            :is-selected="tag.id === tagStore.currentTagId"
            @select="handleSelectTag"
            @pin-toggle="handlePinToggle"
            @rename="handleRename"
            @delete="handleDeleteTag"
        />
      </div>
    </div>

    <!-- 底部：新增标签按钮 -->
    <div class="border-t px-3 py-3 flex-shrink-0">
      <Button
          @click="isAddDialogOpen = true"
          variant="outline"
          size="sm"
          class="w-full"
      >
        <PlusIcon class="size-4 mr-2" />
        {{ t('record.tag.addNew') }}
      </Button>
    </div>

    <!-- 标签选择对话框 -->
    <TagSelectDialog
        v-model:open="isDialogOpen"
        :tags="tags"
        :current-tag="currentTag"
        @select="handleSelectTag"
        @quick-add="handleQuickAddTag"
    />

    <!-- 标签新增对话框 -->
    <AddTagDialog
        v-model:open="isAddDialogOpen"
        @add="handleAddTag"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { useTagStore } from '@/stores/tag'
import { useChatStore } from '@/stores/chat'
import { initTagsDb, insertTag, updateTag, delTag, Tag } from '@/db/tags'
import { initChatsDb } from '@/db/chats'
import Button from '@/components/ui/button/Button.vue'
import TagItem from './TagItem.vue'
import TagSelectDialog from './TagSelectDialog.vue'
import AddTagDialog from './AddTagDialog.vue'
import {
  ArrowUpDownIcon,
  TagIcon,
  LightbulbIcon,
  PlusIcon,
} from 'lucide-vue-next'

const { t } = useI18n()
const tagStore = useTagStore()
const chatStore = useChatStore()

// 状态
const isDialogOpen = ref(false)
const isAddDialogOpen = ref(false)
const isLoading = ref(false)

// 计算属性
const tags = computed(() => tagStore.tags)
const currentTag = computed(() => tagStore.currentTag)
const pinnedTags = computed(() => tags.value.filter(tag => tag.isPin))
const normalTags = computed(() => tags.value.filter(tag => !tag.isPin))

// 初始化
onMounted(async () => {
  try {
    isLoading.value = true
    // 初始化数据库
    await initTagsDb()
    await initChatsDb()
    // 加载标签
    await tagStore.fetchTags()
    // 恢复上次选中的标签
    await tagStore.initTags()
  } catch (error) {
    console.error('Failed to initialize TagSidebar:', error)
  } finally {
    isLoading.value = false
  }
})

// 选择标签
async function handleSelectTag(tag: Tag) {
  try {
    await tagStore.setCurrentTagId(tag.id)
    tagStore.getCurrentTag()
    isDialogOpen.value = false
    // 加载该标签的聊天记录
    await chatStore.init(tag.id)
  } catch (error) {
    console.error('Failed to select tag:', error)
  }
}

// 新增标签（快速）
async function handleQuickAddTag(name: string) {
  if (!name.trim()) return
  try {
    const res = await insertTag({ name: name.trim() })
    const newTagId = res.lastInsertId as number
    // 刷新标签列表
    await tagStore.fetchTags()
    // 自动选中新标签
    await tagStore.setCurrentTagId(newTagId)
    tagStore.getCurrentTag()
    // 加载聊天记录
    await chatStore.init(newTagId)
    isDialogOpen.value = false
  } catch (error) {
    console.error('Failed to add tag:', error)
  }
}

// 新增标签（从按钮）
async function handleAddTag(name: string) {
  if (!name.trim()) return
  try {
    const res = await insertTag({ name: name.trim() })
    const newTagId = res.lastInsertId as number
    // 刷新标签列表
    await tagStore.fetchTags()
    // 自动选中新标签
    await tagStore.setCurrentTagId(newTagId)
    tagStore.getCurrentTag()
    // 加载聊天记录
    await chatStore.init(newTagId)
    isAddDialogOpen.value = false
  } catch (error) {
    console.error('Failed to add tag:', error)
  }
}

// 重命名标签
async function handleRename(tag: Tag, newName: string) {
  if (!newName.trim()) return
  try {
    const updatedTag = { ...tag, name: newName.trim() }
    await updateTag(updatedTag)
    await tagStore.fetchTags()
    tagStore.getCurrentTag()
  } catch (error) {
    console.error('Failed to rename tag:', error)
  }
}

// 置顶/取消置顶标签
async function handlePinToggle(tag: Tag) {
  console.log('TagSidebar.vue - handlePinToggle 触发:', {
    tagId: tag.id,
    tagName: tag.name,
    currentIsPin: tag.isPin,
    newIsPin: !tag.isPin,
    isLocked: tag.isLocked
  })
  
  // 避免操作锁定的标签
  if (tag.isLocked) {
    console.log('TagSidebar.vue - 标签已锁定，跳过操作:', tag.name)
    return
  }
  
  try {
    const updatedTag = { ...tag, isPin: !tag.isPin }
    console.log('TagSidebar.vue - 准备更新标签:', updatedTag)
    
    await updateTag(updatedTag)
    console.log('TagSidebar.vue - 标签更新成功')
    
    await tagStore.fetchTags()
    console.log('TagSidebar.vue - 标签列表刷新成功')
    
    tagStore.getCurrentTag()
    console.log('TagSidebar.vue - 当前标签更新成功')
  } catch (error) {
    console.error('TagSidebar.vue - Failed to toggle pin:', error)
  }
}

// 删除标签
async function handleDeleteTag(tag: Tag) {
  // 避免删除锁定的标签
  if (tag.isLocked) return
  try {
    await delTag(tag.id)
    await tagStore.fetchTags()
    // 如果删除的是当前标签，切换到第一个标签
    if (tag.id === tagStore.currentTagId && tags.value.length > 0) {
      const nextTag = tags.value[0]
      await tagStore.setCurrentTagId(nextTag.id)
      tagStore.getCurrentTag()
      await chatStore.init(nextTag.id)
    }
  } catch (error) {
    console.error('Failed to delete tag:', error)
  }
}
</script>

<style scoped>
/* 保证滚动条样式一致 */
:deep(::-webkit-scrollbar) {
  width: 6px;
}

:deep(::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(::-webkit-scrollbar-thumb) {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

:deep(::-webkit-scrollbar-thumb:hover) {
  background: hsl(var(--muted-foreground) / 0.5);
}
</style>