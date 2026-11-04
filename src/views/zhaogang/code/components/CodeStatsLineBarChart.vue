<template>
  <div class="line-bar-scroll">
    <svg
      class="line-bar-chart"
      :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
      :style="{ minWidth: `${chartWidth}px` }"
      role="img"
      :aria-label="ariaLabel"
    >
      <g v-for="tick in ticks" :key="tick.value">
        <line class="grid-line" :class="{ 'zero-line': tick.value === 0 }" :x1="plotLeft" :x2="chartWidth - plotRight" :y1="tick.y" :y2="tick.y" />
        <text class="axis-label axis-label--y" :x="plotLeft - 8" :y="tick.y + 4">{{ tick.value }}</text>
      </g>
      <g v-for="(item, index) in items" :key="item.date">
        <rect v-if="selectedDate === item.date" class="selected-bg" :x="slotX(index)" :y="plotTop" :width="slotWidth" :height="plotHeight" />
        <rect class="bar bar--add" :x="addX(index)" :y="yFor(Math.max(0, item.additions))" :width="barWidth" :height="barHeight(Math.max(0, item.additions))">
          <title>{{ item.date }} 新增 {{ item.additions }} 行</title>
        </rect>
        <rect class="bar bar--delete" :x="deleteX(index)" :y="yFor(Math.max(0, -item.deletions))" :width="barWidth" :height="barHeight(Math.max(0, -item.deletions))">
          <title>{{ item.date }} 删除 {{ item.deletions }} 行</title>
        </rect>
        <text class="axis-label axis-label--x" :x="slotX(index) + slotWidth / 2" :y="chartHeight - 10">{{ shortDate(item.date) }}</text>
        <rect
          class="hit-area"
          :x="slotX(index)"
          :y="plotTop"
          :width="slotWidth"
          :height="plotHeight"
          tabindex="0"
          :aria-label="`${item.date} 提交 ${item.commitCount} 次，新增 ${item.additions}，删除 ${item.deletions}，净增 ${item.netLines}`"
          @click="$emit('select', item.date)"
          @keydown.enter="$emit('select', item.date)"
        >
          <title>{{ item.date }} · 提交 {{ item.commitCount }} · 新增 {{ item.additions }} · 删除 {{ item.deletions }} · 净增 {{ item.netLines }}</title>
        </rect>
      </g>
      <polyline class="net-line" :points="netPoints" />
    </svg>
    <div class="chart-legend">
      <span><i class="legend-add" />新增代码行</span>
      <span><i class="legend-delete" />删除代码行</span>
      <span><i class="legend-net" />净增趋势</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ZhaogangCodeStatsDaily } from '@/types/zhaogangCodeStats'

const props = withDefaults(defineProps<{
  items: ZhaogangCodeStatsDaily[]
  selectedDate?: string
  ariaLabel?: string
}>(), {
  selectedDate: '',
  ariaLabel: '代码行变更趋势'
})

defineEmits<{ (event: 'select', date: string): void }>()

const chartHeight = 276
const plotLeft = 54
const plotRight = 16
const plotTop = 22
const plotBottom = 40
const plotHeight = chartHeight - plotTop - plotBottom
const chartWidth = computed(() => Math.max(700, props.items.length * 32 + plotLeft + plotRight))
const slotWidth = computed(() => (chartWidth.value - plotLeft - plotRight) / Math.max(1, props.items.length))
const barWidth = computed(() => Math.max(2, Math.min(11, slotWidth.value * 0.28)))
const maxAbs = computed(() => Math.max(2,
  Math.ceil(Math.max(1, ...props.items.flatMap(item => [Math.abs(item.additions), Math.abs(item.deletions), Math.abs(item.netLines)])) / 2) * 2))
const ticks = computed(() => Array.from({ length: 5 }, (_, index) => {
  const value = Math.round(maxAbs.value * (index - 2) / 2 * 10) / 10
  return { value, y: yFor(value) }
}).reverse())
const slotX = (index: number) => plotLeft + slotWidth.value * index
const addX = (index: number) => slotX(index) + (slotWidth.value - barWidth.value * 2 - 3) / 2
const deleteX = (index: number) => addX(index) + barWidth.value + 3
const yFor = (value: number) => plotTop + plotHeight / 2 - (value / maxAbs.value) * (plotHeight / 2)
const barHeight = (value: number) => value <= 0 ? 0 : Math.max(1, (value / maxAbs.value) * (plotHeight / 2))
const netPoints = computed(() => props.items.map((item, index) =>
  `${slotX(index) + slotWidth.value / 2},${yFor(item.netLines)}`).join(' '))
const shortDate = (value: string) => value.slice(8)
</script>

<style scoped>
.line-bar-scroll { width: 100%; overflow-x: auto; overflow-y: hidden; }
.line-bar-chart { display: block; width: 100%; height: 276px; }
.grid-line { stroke: #e7ebf2; stroke-width: 1; stroke-dasharray: 3 2; }
.zero-line { stroke: #cdd5e1; stroke-dasharray: 0; }
.selected-bg { fill: rgb(36 104 232 / 7%); }
.bar { rx: 1px; }
.bar--add { fill: #67C23A; }
.bar--delete { fill: #F56C6C; }
.net-line { fill: none; stroke: #409EFF; stroke-width: 1.6; }
.axis-label { fill: #7d899c; font-size: 11px; }
.axis-label--y { text-anchor: end; }
.axis-label--x { text-anchor: middle; }
.hit-area { fill: transparent; cursor: pointer; outline: none; }
.hit-area:focus { fill: rgb(36 104 232 / 6%); }
.chart-legend { display: flex; align-items: center; justify-content: center; gap: 18px; padding-top: 6px; color: #758297; font-size: 12px; }
.chart-legend span { display: inline-flex; align-items: center; gap: 5px; }
.chart-legend i { width: 9px; height: 9px; border-radius: 2px; }
.legend-add { background: #67C23A; }
.legend-delete { background: #F56C6C; }
.legend-net { height: 2px !important; background: #409EFF; }
</style>
