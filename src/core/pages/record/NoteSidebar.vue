<template>
  <Sidebar collapsible="none" class="border-r w-full hidden md:flex md:w-[300px]">
    <SidebarHeader class="p-0">
      <MarkHeader />
      <div v-if="trashState" class="flex pl-2 relative border-b pb-2 h-6 items-center justify-between overflow-hidden">
        <p class="text-xs text-muted-foreground">{{ t('record.trash.records', { count: markStore.marks.length }) }}</p>
        <Button v-if="markStore.marks.length > 0" class="text-xs text-destructive" variant="link" @click="handleClearTrash">
           {{ t('record.trash.empty') }}
        </Button>
      </div>
    </SidebarHeader>
    
    <div v-if="trashState" class="flex-1 overflow-auto">
      <MarkList />
    </div>
    <TagList v-else />
  </Sidebar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Sidebar, SidebarHeader } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import MarkHeader from './mark/MarkHeader.vue'
import MarkList from './mark/MarkList.vue'
import TagList from './tag/TagList.vue'
import { useMarkStore } from '@/stores/mark'
import { useI18n } from '@/hooks/useI18n'
// import { confirm } from '@tauri-apps/plugin-dialog'

const markStore = useMarkStore()
const { t } = useI18n()

// Temporary trashState until implemented in store
const trashState = computed(() => (markStore as any).trashState || false)

async function handleClearTrash() {
  // const res = await confirm(...)
  // if (res) { ... }
}
</script>
