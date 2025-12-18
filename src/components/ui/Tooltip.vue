<template>
  <span class="relative inline-block" ref="root">
    <!-- Trigger -->
    <span
        ref="trigger"
        class="inline-flex items-center"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
        @focus="onFocus"
        @blur="onBlur"
        @click="onClick"
        :tabindex="disabled ? -1 : 0"
        :aria-describedby="tooltipId"
    >
      <slot />
    </span>

    <!-- Content -->
    <transition name="scale-fade">
      <div
          v-if="visible && !disabled"
          :id="tooltipId"
          ref="contentEl"
          role="tooltip"
          class="z-50 pointer-events-none bg-gray-900 text-white text-xs px-2 py-1 rounded shadow"
          :style="contentStyle"
      >
        <slot name="content">
          {{ content }}
        </slot>
      </div>
    </transition>
  </span>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  content: { type: String, default: '' },
  side: { type: String as () => 'top'|'bottom'|'left'|'right', default: 'top' },
  align: { type: String as () => 'center'|'start'|'end', default: 'center' },
  delay: { type: Number, default: 100 }, // ms
  disabled: { type: Boolean, default: false },
  offset: { type: Number, default: 8 },
})

const visible = ref(false)
const showTimer = ref<number | null>(null)
const hideTimer = ref<number | null>(null)
const trigger = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const root = ref<HTMLElement | null>(null)

const tooltipId = `tooltip-${Math.random().toString(36).slice(2,9)}`

function scheduleShow() {
  if (props.disabled) return
  if (hideTimer.value) {
    clearTimeout(hideTimer.value); hideTimer.value = null
  }
  showTimer.value = window.setTimeout(() => {
    visible.value = true
    updatePosition()
  }, props.delay)
}

function scheduleHide() {
  if (showTimer.value) { clearTimeout(showTimer.value); showTimer.value = null }
  hideTimer.value = window.setTimeout(() => (visible.value = false), 50)
}

function onMouseEnter() { scheduleShow() }
function onMouseLeave() { scheduleHide() }
function onFocus() { scheduleShow() }
function onBlur() { scheduleHide() }
function onClick() { /* allow click-through on buttons */ }

function updatePosition() {
  if (!trigger.value || !contentEl.value) return
  const trig = trigger.value.getBoundingClientRect()
  const cont = contentEl.value
  const width = cont.offsetWidth, height = cont.offsetHeight
  let top = 0, left = 0

  if (props.side === 'top') {
    top = trig.top - height - props.offset + window.scrollY
    left = trig.left + trig.width / 2 - width / 2 + window.scrollX
  } else if (props.side === 'bottom') {
    top = trig.bottom + props.offset + window.scrollY
    left = trig.left + trig.width / 2 - width / 2 + window.scrollX
  } else if (props.side === 'left') {
    top = trig.top + trig.height / 2 - height / 2 + window.scrollY
    left = trig.left - width - props.offset + window.scrollX
  } else { // right
    top = trig.top + trig.height / 2 - height / 2 + window.scrollY
    left = trig.right + props.offset + window.scrollX
  }

  // basic viewport clamp
  const maxLeft = document.documentElement.clientWidth - width - 8
  left = Math.max(8, Math.min(left, maxLeft))
  const maxTop = window.scrollY + document.documentElement.clientHeight - height - 8
  top = Math.max(window.scrollY + 8, Math.min(top, maxTop))

  contentStyle.value = {
    position: 'absolute',
    top: `${top}px`,
    left: `${left}px`,
  }
}

const contentStyle = ref<Record<string,string>>({ position:'absolute' })

let resizeObs: ResizeObserver | null = null
onMounted(() => {
  resizeObs = new ResizeObserver(() => visible.value && updatePosition())
  if (root.value) resizeObs.observe(root.value)
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
})

onBeforeUnmount(() => {
  if (showTimer.value) clearTimeout(showTimer.value)
  if (hideTimer.value) clearTimeout(hideTimer.value)
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
  if (resizeObs) resizeObs.disconnect()
})

watch(visible, (v) => { if (v) updatePosition() })
</script>

<style scoped>
:deep(.scale-fade-enter-active), :deep(.scale-fade-leave-active) {
  transition: all .12s ease;
}
:deep(.scale-fade-enter-from) { transform: scale(.96); opacity: 0; }
:deep(.scale-fade-enter-to) { transform: scale(1); opacity: 1; }
:deep(.scale-fade-leave-from) { transform: scale(1); opacity: 1; }
:deep(.scale-fade-leave-to) { transform: scale(.96); opacity: 0; }
</style>