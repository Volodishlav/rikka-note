//TagItem.vue
<template>
  <div
      @click="handleClick"
      class="relative group"
  >
    <div
        :class="[
        'flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent text-foreground'
      ]"
    >
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <!-- 图标 -->
        <component
            :is="tag.name === 'Idea' ? LightbulbIcon : TagIcon"
            :class="[
            'size-4 flex-shrink-0',
            tag.isPin && 'text-yellow-500',
            tag.isLocked && 'text-gray-500'
          ]"
        />

        <!-- 编辑模式 -->
        <div v-if="isEditing" class="flex-1 flex items-center gap-1 min-w-0">
          <input
              ref="inputRef"
              v-model="editName"
              type="text"
              class="flex-1 px-2 py-1 rounded border border-primary text-sm bg-background"
              @keydown.enter="handleConfirmRename"
              @keydown.escape="isEditing = false"
              @blur="handleConfirmRename"
              @click.stop
          />
        </div>

        <!-- 显示模式 -->
        <span v-else class="text-sm truncate">{{ tag.name }}</span>
      </div>

      <!-- 数字标记 -->
      <span class="text-xs text-muted-foreground ml-2 flex-shrink-0">
        {{ tag.total || 0 }}
      </span>

      <!-- 操作菜单（右键或hover显示） -->
      <div
          v-if="!isEditing"
          class="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop
      >
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
                variant="ghost"
                size="sm"
                class="h-6 w-6 p-0"
            >
              <MoreHorizontalIcon class="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <!-- 置顶 -->
            <DropdownMenuItem
                v-if="!tag.isLocked"
                @click="handlePinToggle"
            >
              <component
                  :is="tag.isPin ? PinOffIcon : PinIcon"
                  class="size-4 mr-2"
              />
              {{ tag.isPin ? t('record.tag.unpin') : t('record.tag.pin') }}
            </DropdownMenuItem>

            <!-- 重命名 -->
            <DropdownMenuItem
                v-if="!tag.isLocked"
                @click="startEdit"
            >
              <Edit2Icon class="size-4 mr-2" />
              {{ t('record.tag.rename') }}
            </DropdownMenuItem>

            <!-- 删除 -->
            <DropdownMenuItem
                v-if="!tag.isLocked"
                class="text-destructive"
                @click="handleDelete"
            >
              <TrashIcon class="size-4 mr-2" />
              {{ t('record.tag.delete') }}
            </DropdownMenuItem>

            <!-- 锁定提示 -->
            <DropdownMenuItem v-if="tag.isLocked" disabled>
              <LockIcon class="size-4 mr-2" />
              {{ t('record.tag.locked') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from '@/hooks/useI18n'
import { Tag } from '@/db/tags'
import Button from '@/components/ui/button/Button.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  TagIcon,
  LightbulbIcon,
  PinIcon,
  PinOffIcon,
  Edit2Icon,
  TrashIcon,
  LockIcon,
  MoreHorizontalIcon,
} from 'lucide-vue-next'

const { t } = useI18n()

interface Props {
  tag: Tag
  isSelected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
})

const emit = defineEmits<{
  select: [tag: Tag]
  rename: [tag: Tag, newName: string]
  pinToggle: [tag: Tag]
  delete: [tag: Tag]
}>()

// 状态
const isEditing = ref(false)
const editName = ref(props.tag.name)
const inputRef = ref<HTMLInputElement>()

// 处理点击（选择标签）
function handleClick() {
  if (!isEditing.value) {
    emit('select', props.tag)
  }
}

// 开始编辑
function startEdit() {
  isEditing.value = true
  editName.value = props.tag.name
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

// 确认重命名
function handleConfirmRename() {
  if (!editName.value.trim()) {
    editName.value = props.tag.name
    isEditing.value = false
    return
  }
  if (editName.value !== props.tag.name) {
    emit('rename', props.tag, editName.value.trim())
  }
  isEditing.value = false
}

// 置顶/取消置顶
function handlePinToggle() {
  emit('pinToggle', props.tag)
}

// 删除标签
function handleDelete() {
  // 可选：添加确认对话框
  emit('delete', props.tag)
}
</script>