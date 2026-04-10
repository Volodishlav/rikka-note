<script setup lang="ts">
import type { ToastViewportProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { ToastViewport } from "reka-ui"
import { cn } from "@/lib/utils"
import { useSettingStore } from "@/stores/setting"
import { storeToRefs } from "pinia"

const props = defineProps<ToastViewportProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const settingStore = useSettingStore()
const { toastPosition } = storeToRefs(settingStore)

const positionClasses = {
  'top-left': 'top-[36px] left-0 flex-col',
  'top-right': 'top-[36px] right-0 flex-col',
  'bottom-left': 'bottom-0 left-0 flex-col-reverse',
  'bottom-right': 'bottom-0 right-0 flex-col-reverse',
}
</script>

<template>
  <ToastViewport v-bind="delegatedProps" :class="cn('fixed z-[100] flex max-h-screen w-full p-4 md:max-w-[420px] gap-[5px]', positionClasses[toastPosition], props.class)" />
</template>
