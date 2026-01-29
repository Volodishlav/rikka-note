<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('record.tag.selectTag') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4">
        <!-- 搜索框 -->
        <div class="relative">
          <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('record.tag.searchPlaceholder')"
              class="w-full px-3 py-2 rounded border border-input bg-background placeholder-muted-foreground"
              @keydown.enter="handleSelectFirst"
          />
        </div>

        <!-- 标签列表 -->
        <div class="max-h-[300px] overflow-y-auto">
          <div v-if="filteredTags.length === 0" class="text-center py-4 text-muted-foreground text-sm">
            <p>{{ t('record.tag.noResults') }}</p>
            <Button
                variant="outline"
                size="sm"
                class="mt-3"
                @click="handleQuickAdd"
            >
              {{ t('record.tag.quickAdd') }}
            </Button>
          </div>

          <!-- 置顶标签 -->
          <div v-if="filteredPinnedTags.length > 0" class="mb-3">
            <div class="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
              {{ t('record.tag.pinned') }}
            </div>
            <button
                v-for="tag in filteredPinnedTags"
                :key="tag.id"
                @click="$emit('select', tag)"
                :class="[
                'w-full px-3 py-2 text-left rounded transition-colors text-sm',
                currentTag?.id === tag.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              ]"
            >
              <div class="flex items-center justify-between">
                <span>{{ tag.name }}</span>
                <span class="text-xs">{{ tag.total || 0 }}</span>
              </div>
            </button>
          </div>

          <!-- 普通标签 -->
          <div v-if="filteredNormalTags.length > 0">
            <div class="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
              {{ t('record.tag.others') }}
            </div>
            <button
                v-for="tag in filteredNormalTags"
                :key="tag.id"
                @click="$emit('select', tag)"
                :class="[
                'w-full px-3 py-2 text-left rounded transition-colors text-sm',
                currentTag?.id === tag.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              ]"
            >
              <div class="flex items-center justify-between">
                <span>{{ tag.name }}</span>
                <span class="text-xs">{{ tag.total || 0 }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { Tag } from '@/db/tags'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Button from '@/components/ui/button/Button.vue'

const { t } = useI18n()

interface Props {
  open?: boolean
  tags: Tag[]
  currentTag?: Tag
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [tag: Tag]
  'quick-add': [name: string]
}>()

const searchQuery = ref('')

const filteredTags = computed(() => {
  if (!searchQuery.value) return props.tags
  const query = searchQuery.value.toLowerCase()
  return props.tags.filter(tag => tag.name.toLowerCase().includes(query))
})

const filteredPinnedTags = computed(() =>
    filteredTags.value.filter(tag => tag.isPin)
)

const filteredNormalTags = computed(() =>
    filteredTags.value.filter(tag => !tag.isPin)
)

function handleSelectFirst() {
  if (filteredTags.value.length > 0) {
    emit('select', filteredTags.value[0])
  } else if (searchQuery.value.trim()) {
    handleQuickAdd()
  }
}

function handleQuickAdd() {
  if (searchQuery.value.trim()) {
    emit('quick-add', searchQuery.value.trim())
    searchQuery.value = ''
  }
}
</script>