<template>
  <div>
    <div class="chart-frame">
      <svg v-if="scrollDates" class="chart-axis" :width="plotLeft" :height="chartHeight" aria-hidden="true">
        <text v-for="tick in ticks" :key="tick.value" class="axis-label axis-label--y" :x="plotLeft - 8" :y="tick.y + 4">{{ tick.value }}</text>
        <text class="axis-unit" :x="plotLeft - 8" y="12" text-anchor="end">{{ unit }}</text>
      </svg>
      <div
        ref="viewport"
        class="bar-chart-scroll"
        :class="{ 'code-stats-date-scroll': scrollDates }"
        :tabindex="scrollDates && items.length > 7 ? 0 : undefined"
        :aria-label="scrollDates && items.length > 7 ? `${ariaLabel}，可左右滚动浏览日期` : undefined"
        @scroll.passive="trackScroll"
      >
        <svg
          class="bar-chart"
          :viewBox="`${scrollDates ? plotLeft : 0} 0 ${svgWidth} ${chartHeight}`"
          :style="{ minWidth: `${svgWidth}px`, height: `${chartHeight}px` }"
          role="img"
          :aria-label="ariaLabel"
        >
          <g v-for="tick in ticks" :key="tick.value">
            <line class="grid-line" :x1="plotLeft" :x2="chartWidth - plotRight" :y1="tick.y" :y2="tick.y" />
            <text v-if="!scrollDates" class="axis-label axis-label--y" :x="plotLeft - 8" :y="tick.y + 4">{{ tick.value }}</text>
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
              class="bar"
              :class="{ 'bar--empty': item.value <= 0 }"
              :x="barX(index)"
              :y="yFor(item.value)"
              :width="barWidth"
              :height="barHeight(item.value)"
              :fill="color"
            />
            <text class="axis-label axis-label--x" :x="slotX(index) + slotWidth / 2" :y="chartHeight - 10">{{ item.label }}</text>
            <foreignObject :x="slotX(index)" :y="plotTop" :width="slotWidth" :height="plotHeight">
              <CodeStatsChartTooltip
                :disabled="!showDetails"
                :content="item.title || `${item.label}：${item.value}`"
                v-slot="{ pointerEvents }"
              >
                <div
                  v-on="pointerEvents"
                  class="hit-area"
                  :tabindex="showDetails ? 0 : undefined"
                  :aria-label="item.title || `${item.label}：${item.value}`"
                  :title="showDetails ? undefined : (item.title || `${item.label}：${item.value}`)"
                />
              </CodeStatsChartTooltip>
            </foreignObject>
          </g>
          <text v-if="!scrollDates" class="axis-unit" :x="plotLeft" y="12">{{ unit }}</text>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CodeStatsChartTooltip from './CodeStatsChartTooltip.vue'
import { computed } from 'vue'
import { useCodeStatsDateScroll } from './useCodeStatsDateScroll'

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
  showDetails?: boolean
  scrollDates?: boolean
  ariaLabel?: string
}>(), {
  color: '#409EFF',
  unit: '',
  height: 250,
  minSlotWidth: 28,
  ariaLabel: '柱状图'
})

const plotLeft = 48
const plotRight = 16
const plotTop = 22
const plotBottom = 34
const chartHeight = computed(() => props.height)
const plotHeight = computed(() => chartHeight.value - plotTop - plotBottom)
const maxValue = computed(() => Math.max(4, Math.ceil(Math.max(1, ...props.items.map(item => Number(item.value || 0))) / 4) * 4))
const { viewport, plotWidth, trackScroll } = useCodeStatsDateScroll(
  () => Boolean(props.scrollDates), () => props.items.length, plotRight
)
const chartWidth = computed(() => props.scrollDates
  ? Math.max(plotWidth.value, plotRight + 1) + plotLeft
  : Math.max(620, props.items.length * props.minSlotWidth + plotLeft + plotRight))
const svgWidth = computed(() => chartWidth.value - (props.scrollDates ? plotLeft : 0))
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
.chart-frame { display: flex; min-width: 0; }
.chart-axis { flex: none; }
.bar-chart-scroll { flex: 1; min-width: 0; overflow-x: auto; overflow-y: hidden; }
.bar-chart { display: block; width: 100%; height: 250px; }
.grid-line { stroke: #e7ebf2; stroke-width: 1; stroke-dasharray: 3 2; }
.rest-bg { fill: #f8f3e9; }
.bar { rx: 1.5px; }
.bar--empty { opacity: .35; }
.axis-label { fill: #7d899c; font-size: 11px; }
.axis-label--y { text-anchor: end; }
.axis-label--x { text-anchor: middle; }
.axis-unit { fill: #98a2b3; font-size: 11px; }
.hit-area { width: 100%; height: 100%; outline: none; }
.hit-area:focus-visible { background: rgb(36 104 232 / 6%); }
</style>
