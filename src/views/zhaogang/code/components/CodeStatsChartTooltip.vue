<template>
  <el-tooltip
    ref="tooltip"
    :content="content"
    :disabled="disabled"
    :reference-el="followingPointer ? pointerReference : undefined"
    :placement="followingPointer ? 'bottom-start' : 'top'"
    :show-arrow="!followingPointer"
    strategy="fixed"
    popper-class="code-stats-chart-tooltip"
    :show-after="120"
    :hide-after="0"
    :enterable="false"
    :trigger="['hover', 'focus']"
    @hide="resetPointerReference"
  >
    <slot :pointer-events="pointerEvents" />
  </el-tooltip>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TooltipInstance } from 'element-plus'

const props = defineProps<{ content: string; disabled?: boolean }>()
const tooltip = ref<TooltipInstance>()
const followingPointer = ref(false)
let pointerInside = false
let pointerX = 0
let pointerY = 0

const pointerReference = {
  getBoundingClientRect: () => new DOMRect(pointerX, pointerY, 0, 0)
}

const movePointer = (event: PointerEvent) => {
  if (props.disabled || event.pointerType === 'touch') return
  pointerInside = true
  pointerX = event.clientX
  pointerY = event.clientY
  followingPointer.value = true
  tooltip.value?.updatePopper()
}

// Keep the last mouse position while the tooltip fades out.
const leavePointer = () => { pointerInside = false }
const resetPointerReference = () => {
  if (!pointerInside) followingPointer.value = false
}

const pointerEvents = {
  pointerenter: movePointer,
  pointermove: movePointer,
  pointerleave: leavePointer,
  pointercancel: leavePointer,
  focus: resetPointerReference
}
</script>

<style scoped>
:global(.code-stats-chart-tooltip) {
  pointer-events: none;
}

:global(.code-stats-chart-tooltip:not([data-popper-placement])) {
  visibility: hidden;
}
</style>
