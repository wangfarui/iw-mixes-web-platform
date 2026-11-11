<template>
  <div>
    <div class="chart-frame">
      <svg v-if="scrollDates" class="chart-axis" :width="plotLeft" :height="chartHeight" aria-hidden="true">
        <text v-for="tick in ticks" :key="tick.value" class="axis-label axis-label--y" :x="plotLeft - 8" :y="tick.y + 4">{{ tick.value }}</text>
      </svg>
      <div
        ref="viewport"
        class="line-bar-scroll"
        :class="{ 'code-stats-date-scroll': scrollDates }"
        :tabindex="scrollDates && items.length > 7 ? 0 : undefined"
        :aria-label="scrollDates && items.length > 7 ? `${ariaLabel}，可左右滚动浏览日期` : undefined"
        @scroll.passive="trackScroll"
      >
        <svg
          class="line-bar-chart"
          :viewBox="`${scrollDates ? plotLeft : 0} 0 ${svgWidth} ${chartHeight}`"
          :style="{ minWidth: `${svgWidth}px` }"
          role="img"
          :aria-label="ariaLabel"
        >
          <g v-for="tick in ticks" :key="tick.value">
            <line class="grid-line" :class="{ 'zero-line': tick.value === 0 }" :x1="plotLeft" :x2="chartWidth - plotRight" :y1="tick.y" :y2="tick.y" />
            <text v-if="!scrollDates" class="axis-label axis-label--y" :x="plotLeft - 8" :y="tick.y + 4">{{ tick.value }}</text>
          </g>
          <g v-for="(item, index) in items" :key="item.date" class="date-slot">
            <rect class="date-highlight" :x="slotX(index)" :y="plotTop" :width="slotWidth" :height="plotHeight" />
            <rect class="bar--add" :x="barX(index)" :y="zeroY - barHeight(item.additions)" :width="barWidth" :height="barHeight(item.additions)">
              <title>{{ item.date }} 新增 {{ item.additions }} 行</title>
            </rect>
            <rect class="bar--delete" :x="barX(index)" :y="zeroY" :width="barWidth" :height="barHeight(item.deletions)">
              <title>{{ item.date }} 删除 {{ item.deletions }} 行</title>
            </rect>
            <text class="axis-label axis-label--x" :x="slotX(index) + slotWidth / 2" :y="chartHeight - 10">{{ shortDate(item.date) }}</text>
            <foreignObject :x="slotX(index)" :y="plotTop" :width="slotWidth" :height="plotHeight">
              <CodeStatsChartTooltip
                :disabled="!showDetails"
                :content="dailyCodeDetails(item)"
                v-slot="{ pointerEvents }"
              >
                <div
                  v-on="pointerEvents"
                  class="hit-area"
                  :tabindex="showDetails ? 0 : undefined"
                  :aria-label="dailyCodeDetails(item)"
                  :title="showDetails ? undefined : (dailyCodeDetails(item))"
                />
              </CodeStatsChartTooltip>
            </foreignObject>
          </g>
        </svg>
      </div>
    </div>
    <div class="chart-legend">
      <span><i class="legend-add" />新增代码行</span>
      <span><i class="legend-delete" />删除代码行</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import CodeStatsChartTooltip from './CodeStatsChartTooltip.vue'
import { computed } from 'vue'
import { useCodeStatsDateScroll } from './useCodeStatsDateScroll'
import type { ZhaogangCodeStatsDaily } from '@/types/zhaogangCodeStats'
import { dailyCodeDetails } from '../codeStatsPresentation'

const props = withDefaults(defineProps<{
  items: ZhaogangCodeStatsDaily[]
  showDetails?: boolean
  scrollDates?: boolean
  ariaLabel?: string
}>(), {
  ariaLabel: '代码行变更趋势'
})

const chartHeight = 276
const plotLeft = 54
const plotRight = 16
const plotTop = 22
const plotBottom = 40
const plotHeight = chartHeight - plotTop - plotBottom
const zeroY = plotTop + plotHeight / 2
const { viewport, plotWidth, trackScroll } = useCodeStatsDateScroll(
  () => Boolean(props.scrollDates), () => props.items.length, plotRight
)
const chartWidth = computed(() => props.scrollDates
  ? Math.max(plotWidth.value, plotRight + 1) + plotLeft
  : Math.max(700, props.items.length * 32 + plotLeft + plotRight))
const svgWidth = computed(() => chartWidth.value - (props.scrollDates ? plotLeft : 0))
const slotWidth = computed(() => (chartWidth.value - plotLeft - plotRight) / Math.max(1, props.items.length))
const barWidth = computed(() => Math.max(2, Math.min(36, slotWidth.value * 0.22)))
const maxAbs = computed(() => Math.max(2,
  Math.ceil(Math.max(1, ...props.items.flatMap(item => [Math.abs(item.additions), Math.abs(item.deletions), Math.abs(item.netLines)])) / 2) * 2))
const ticks = computed(() => Array.from({ length: 5 }, (_, index) => {
  const value = Math.round(maxAbs.value * (index - 2) / 2 * 10) / 10
  return { value, y: yFor(value) }
}).reverse())
const slotX = (index: number) => plotLeft + slotWidth.value * index
const barX = (index: number) => slotX(index) + (slotWidth.value - barWidth.value) / 2
const yFor = (value: number) => zeroY - (value / maxAbs.value) * (plotHeight / 2)
const barHeight = (value: number) => value <= 0 ? 0 : Math.max(1, (value / maxAbs.value) * (plotHeight / 2))
const shortDate = (value: string) => value.slice(props.scrollDates ? 5 : 8)
</script>

<style scoped>
.chart-frame { display: flex; min-width: 0; }
.chart-axis { flex: none; }
.line-bar-scroll { flex: 1; min-width: 0; overflow-x: auto; overflow-y: hidden; }
.line-bar-chart { display: block; width: 100%; height: 276px; }
.grid-line { stroke: #e7ebf2; stroke-width: 1; stroke-dasharray: 3 2; }
.zero-line { stroke: #cdd5e1; stroke-dasharray: 0; }
.bar--add { fill: #3299f6; }
.bar--delete { fill: #68d6d2; }
.date-highlight { fill: transparent; pointer-events: none; }
.date-slot:hover .date-highlight { fill: #f3f6fb; }
.axis-label { fill: #7d899c; font-size: 11px; }
.axis-label--y { text-anchor: end; }
.axis-label--x { text-anchor: middle; }
.hit-area { width: 100%; height: 100%; outline: none; }
.hit-area:focus-visible { background: rgb(36 104 232 / 6%); }
.chart-legend { display: flex; align-items: center; justify-content: center; gap: 18px; padding-top: 6px; color: #758297; font-size: 12px; }
.chart-legend span { display: inline-flex; align-items: center; gap: 5px; }
.chart-legend i { width: 9px; height: 9px; border-radius: 2px; }
.legend-add { background: #3299f6; }
.legend-delete { background: #68d6d2; }
</style>
