<template>
  <div class="bar-chart-scroll">
    <svg
      class="bar-chart"
      :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
      :style="{ minWidth: `${chartWidth}px` }"
      role="img"
      :aria-label="ariaLabel"
    >
      <g v-for="tick in ticks" :key="tick.value">
        <line class="grid-line" :x1="plotLeft" :x2="chartWidth - plotRight" :y1="tick.y" :y2="tick.y" />
        <text class="axis-label axis-label--y" :x="plotLeft - 8" :y="tick.y + 4">{{ tick.value }}</text>
      </g>
      <g v-for="(item, index) in items" :key="`${item.label}-${index}`">
        <rect
          v-if="item.rest"
          class="rest-bg"
          :x="slotX(index)"
          :y="plotTop"
          :width="slotWidth"
          :height="plotHeight"
        />
        <rect
          v-if="selectedIndex === index"
          class="selected-bg"
          :x="slotX(index)"
          :y="plotTop"
          :width="slotWidth"
          :height="plotHeight"
        />
        <rect
          class="bar"
          :class="{ 'bar--empty': item.value <= 0 }"
          :x="barX(index)"
          :y="yFor(item.value)"
          :width="barWidth"
          :height="barHeight(item.value)"
          :fill="color"
        >
          <title>{{ item.title || `${item.label}：${item.value}` }}</title>
        </rect>
        <text class="axis-label axis-label--x" :x="slotX(index) + slotWidth / 2" :y="chartHeight - 10">{{ item.label }}</text>
        <rect
          class="hit-area"
          :class="{ clickable: selectable }"
          :x="slotX(index)"
          :y="plotTop"
          :width="slotWidth"
          :height="plotHeight"
          :tabindex="selectable ? 0 : -1"
          :aria-label="item.title || `${item.label} ${item.value}`"
          @click="selectable ? $emit('select', index) : undefined"
          @keydown.enter="selectable ? $emit('select', index) : undefined"
        />
      </g>
      <text class="axis-unit" :x="plotLeft" y="12">{{ unit }}</text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface CodeStatsBarItem {
  label: string
  value: number
  title?: string
  rest?: boolean
}

const props = withDefaults(defineProps<{
  items: CodeStatsBarItem[]
  color?: string
  unit?: string
  height?: number
  minSlotWidth?: number
  selectable?: boolean
  selectedIndex?: number
  ariaLabel?: string
}>(), {
  color: '#409EFF',
  unit: '',
  height: 250,
  minSlotWidth: 28,
  selectable: false,
  selectedIndex: -1,
  ariaLabel: '柱状图'
})

defineEmits<{ (event: 'select', index: number): void }>()

const plotLeft = 48
const plotRight = 16
const plotTop = 22
const plotBottom = 34
const chartHeight = computed(() => props.height)
const plotHeight = computed(() => chartHeight.value - plotTop - plotBottom)
const maxValue = computed(() => Math.max(4, Math.ceil(Math.max(1, ...props.items.map(item => Number(item.value || 0))) / 4) * 4))
const chartWidth = computed(() => Math.max(620, props.items.length * props.minSlotWidth + plotLeft + plotRight))
const slotWidth = computed(() => (chartWidth.value - plotLeft - plotRight) / Math.max(1, props.items.length))
const barWidth = computed(() => Math.max(3, Math.min(22, slotWidth.value * 0.58)))
const ticks = computed(() => Array.from({ length: 5 }, (_, index) => {
  const value = Math.round(maxValue.value * index / 4 * 10) / 10
  return { value, y: yFor(value) }
}).reverse())
const slotX = (index: number) => plotLeft + slotWidth.value * index
const barX = (index: number) => slotX(index) + (slotWidth.value - barWidth.value) / 2
const yFor = (value: number) => plotTop + plotHeight.value - (Math.max(0, value) / maxValue.value) * plotHeight.value
const barHeight = (value: number) => value <= 0 ? 0 : Math.max(1, (value / maxValue.value) * plotHeight.value)
</script>

<style scoped>
.bar-chart-scroll { width: 100%; overflow-x: auto; overflow-y: hidden; }
.bar-chart { display: block; width: 100%; height: 250px; }
.grid-line { stroke: #e7ebf2; stroke-width: 1; stroke-dasharray: 3 2; }
.rest-bg { fill: #f8f3e9; }
.selected-bg { fill: rgb(36 104 232 / 8%); }
.bar { rx: 1.5px; }
.bar--empty { opacity: .35; }
.axis-label { fill: #7d899c; font-size: 11px; }
.axis-label--y { text-anchor: end; }
.axis-label--x { text-anchor: middle; }
.axis-unit { fill: #98a2b3; font-size: 11px; }
.hit-area { fill: transparent; outline: none; }
.hit-area.clickable { cursor: pointer; }
.hit-area.clickable:focus { fill: rgb(36 104 232 / 6%); }
</style>
