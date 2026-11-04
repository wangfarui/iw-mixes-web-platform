<template>
  <div class="member-diverging-scroll">
    <svg
      class="member-diverging-chart"
      :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
      :style="{ minWidth: `${chartWidth}px` }"
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
        <rect class="bar bar--add" :x="addX(index)" :y="yFor(member.additions)" :width="barWidth" :height="barHeight(member.additions)">
          <title>{{ member.user.name }} 新增 {{ member.additions }} 行</title>
        </rect>
        <rect class="bar bar--delete" :x="deleteX(index)" :y="yFor(member.deletions)" :width="barWidth" :height="barHeight(member.deletions)">
          <title>{{ member.user.name }} 删除 {{ member.deletions }} 行，净增 {{ member.netLines }}</title>
        </rect>
        <text class="axis-label axis-label--x" :x="slotX(index) + slotWidth / 2" :y="chartHeight - 9">
          {{ shortName(member.user.name) }}<title>{{ member.user.name }}</title>
        </text>
        <rect
          class="hit-area"
          :x="slotX(index)"
          :y="plotTop"
          :width="slotWidth"
          :height="plotHeight"
          tabindex="0"
          :aria-label="`${member.user.name} 新增 ${member.additions} 删除 ${member.deletions} 净增 ${member.netLines}`"
          @click="$emit('select', member.user.id)"
          @keydown.enter="$emit('select', member.user.id)"
        >
          <title>{{ member.user.name }} · 提交 {{ member.commitCount }} · 新增 {{ member.additions }} · 删除 {{ member.deletions }} · 净增 {{ member.netLines }}</title>
        </rect>
      </g>
      <text class="axis-unit" :x="plotLeft" y="12">（行）</text>
    </svg>
    <div class="chart-legend">
      <span><i class="legend-add" />新增代码行</span>
      <span><i class="legend-delete" />删除代码行</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ZhaogangCodeStatsMember } from '@/types/zhaogangCodeStats'

const props = withDefaults(defineProps<{
  members: ZhaogangCodeStatsMember[]
  selectedMemberId?: number | null
}>(), { selectedMemberId: null })

defineEmits<{ (event: 'select', memberId: number): void }>()

const chartHeight = 286
const plotLeft = 58
const plotRight = 18
const plotTop = 24
const plotBottom = 42
const plotHeight = chartHeight - plotTop - plotBottom
const chartWidth = computed(() => Math.max(680, props.members.length * 62 + plotLeft + plotRight))
const slotWidth = computed(() => (chartWidth.value - plotLeft - plotRight) / Math.max(1, props.members.length))
const barWidth = computed(() => Math.max(5, Math.min(13, slotWidth.value * 0.22)))
const maxValue = computed(() => Math.max(4, Math.ceil(Math.max(1, ...props.members.flatMap(member => [member.additions, member.deletions])) / 4) * 4))
const ticks = computed(() => Array.from({ length: 5 }, (_, index) => {
  const value = Math.round(maxValue.value * index / 4)
  return { value, y: yFor(value) }
}).reverse())
const slotX = (index: number) => plotLeft + slotWidth.value * index
const addX = (index: number) => slotX(index) + (slotWidth.value - barWidth.value * 2 - 3) / 2
const deleteX = (index: number) => addX(index) + barWidth.value + 3
const yFor = (value: number) => plotTop + plotHeight - (Math.max(0, value) / maxValue.value) * plotHeight
const barHeight = (value: number) => value <= 0 ? 0 : Math.max(1, (value / maxValue.value) * plotHeight)
const shortName = (value: string) => Array.from(value).length > 5 ? `${Array.from(value).slice(0, 5).join('')}…` : value
</script>

<style scoped>
.member-diverging-scroll { width: 100%; overflow-x: auto; overflow-y: hidden; }
.member-diverging-chart { display: block; width: 100%; height: 286px; }
.grid-line { stroke: #e7ebf2; stroke-width: 1; stroke-dasharray: 3 2; }
.selected-bg { fill: rgb(36 104 232 / 8%); }
.bar { rx: 1.5px; }
.bar--add { fill: #67C23A; }
.bar--delete { fill: #F56C6C; }
.axis-label { fill: #7d899c; font-size: 11px; }
.axis-label--y { text-anchor: end; }
.axis-label--x { text-anchor: middle; }
.axis-unit { fill: #98a2b3; font-size: 11px; }
.hit-area { fill: transparent; cursor: pointer; outline: none; }
.hit-area:focus { fill: rgb(36 104 232 / 6%); }
.chart-legend { display: flex; align-items: center; justify-content: center; gap: 18px; padding-top: 6px; color: #758297; font-size: 12px; }
.chart-legend span { display: inline-flex; align-items: center; gap: 5px; }
.chart-legend i { width: 9px; height: 9px; border-radius: 2px; }
.legend-add { background: #67C23A; }
.legend-delete { background: #F56C6C; }
</style>
