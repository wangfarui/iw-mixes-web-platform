<template>
  <div>
    <div ref="viewport" class="member-chart-scroll">
      <svg
        class="member-diverging-chart"
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        :width="chartWidth"
        :height="chartHeight"
        role="img"
        aria-label="团队成员新增与删除代码行对比"
      >
        <g v-for="tick in ticks" :key="tick.value">
          <line class="grid-line" :x1="plotLeft" :x2="chartWidth - plotRight" :y1="tick.y" :y2="tick.y" />
          <text class="axis-label axis-label--y" :x="plotLeft - 8" :y="tick.y + 4">{{ tick.value }}</text>
        </g>
        <g v-for="(member, index) in members" :key="member.user.id">
          <rect
            v-if="selectedMemberId === member.user.id"
            class="selected-bg"
            :x="slotX(index)"
            :y="plotTop"
            :width="slotWidth"
            :height="plotHeight"
          />
          <rect class="bar bar--add" :x="addX(index)" :y="yFor(member.additions)" :width="barWidth" :height="barHeight(member.additions)" />
          <rect class="bar bar--delete" :x="deleteX(index)" :y="yFor(member.deletions)" :width="barWidth" :height="barHeight(member.deletions)" />
          <text class="axis-label axis-label--x" :x="slotX(index) + slotWidth / 2" :y="chartHeight - 9">
            {{ shortName(member.user.name) }}<title>{{ member.user.name }}</title>
          </text>
          <foreignObject :x="slotX(index)" :y="plotTop" :width="slotWidth" :height="plotHeight">
            <CodeStatsChartTooltip :content="memberDetails(member)" v-slot="{ pointerEvents }">
              <button
                v-on="pointerEvents"
                type="button"
                class="hit-area"
                :aria-label="memberDetails(member)"
                :aria-pressed="selectedMemberId === member.user.id"
                @click="$emit('select', member.user.id)"
              />
            </CodeStatsChartTooltip>
          </foreignObject>
        </g>
        <text class="axis-unit" :x="plotLeft" y="12">（行）</text>
      </svg>
    </div>
    <div class="chart-legend">
      <span><i class="legend-add" />新增代码行</span>
      <span><i class="legend-delete" />删除代码行</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ZhaogangCodeStatsMember } from '@/types/zhaogangCodeStats'
import { formatCodeNumber, formatSignedNumber } from '../codeStatsPresentation'
import CodeStatsChartTooltip from './CodeStatsChartTooltip.vue'
import { useCodeStatsMemberChart } from './useCodeStatsMemberChart'

const props = withDefaults(defineProps<{
  members: ZhaogangCodeStatsMember[]
  selectedMemberId?: number | null
}>(), { selectedMemberId: null })

defineEmits<{ (event: 'select', memberId: number): void }>()

const { viewport, chartWidth, chartHeight, plotLeft, plotRight, plotTop, plotHeight, slotWidth, slotX } =
  useCodeStatsMemberChart(() => props.members.length)
const barWidth = computed(() => Math.max(5, Math.min(13, slotWidth.value * 0.22)))
const maxValue = computed(() => Math.max(4, Math.ceil(Math.max(1, ...props.members.flatMap(member => [member.additions, member.deletions])) / 4) * 4))
const ticks = computed(() => Array.from({ length: 5 }, (_, index) => {
  const value = Math.round(maxValue.value * index / 4)
  return { value, y: yFor(value) }
}).reverse())
const addX = (index: number) => slotX(index) + (slotWidth.value - barWidth.value * 2 - 3) / 2
const deleteX = (index: number) => addX(index) + barWidth.value + 3
const yFor = (value: number) => plotTop + plotHeight - (Math.max(0, value) / maxValue.value) * plotHeight
const barHeight = (value: number) => value <= 0 ? 0 : Math.max(1, (value / maxValue.value) * plotHeight)
const shortName = (value: string) => Array.from(value).length > 5 ? `${Array.from(value).slice(0, 5).join('')}…` : value
const memberDetails = (member: ZhaogangCodeStatsMember) =>
  `${member.user.name} · 提交 ${formatCodeNumber(member.commitCount)} 次 · 新增 ${formatCodeNumber(member.additions)} 行 · 删除 ${formatCodeNumber(member.deletions)} 行 · 净增 ${formatSignedNumber(member.netLines)} 行`
</script>

<style scoped>
.member-chart-scroll { width: 100%; overflow-x: auto; overflow-y: hidden; }
.member-diverging-chart { display: block; }
.grid-line { stroke: #e7ebf2; stroke-width: 1; stroke-dasharray: 3 2; }
.selected-bg { fill: rgb(36 104 232 / 8%); }
.bar { rx: 1.5px; }
.bar--add { fill: #67C23A; }
.bar--delete { fill: #F56C6C; }
.axis-label { fill: #7d899c; font-size: 11px; }
.axis-label--y { text-anchor: end; }
.axis-label--x { text-anchor: middle; }
.axis-unit { fill: #98a2b3; font-size: 11px; }
.hit-area { display: block; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; cursor: pointer; }
.hit-area:focus-visible { background: rgb(36 104 232 / 6%); outline: none; }
.chart-legend { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 18px; padding-top: 8px; color: #758297; font-size: 12px; }
.chart-legend span { display: inline-flex; align-items: center; gap: 5px; }
.chart-legend i { width: 9px; height: 9px; border-radius: 2px; }
.legend-add { background: #67C23A; }
.legend-delete { background: #F56C6C; }
</style>
