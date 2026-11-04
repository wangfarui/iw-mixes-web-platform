<template>
  <div class="member-bar-scroll">
    <svg
      class="member-bar-chart"
      :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
      :style="{ minWidth: `${chartWidth}px` }"
      role="img"
      aria-label="团队成员提交次数对比"
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
        <rect
          class="bar"
          :class="{ 'bar--zero': member.commitCount <= 0 }"
          :x="barX(index)"
          :y="yFor(member.commitCount)"
          :width="barWidth"
          :height="barHeight(member.commitCount)"
        >
          <title>{{ member.user.name }}：提交 {{ member.commitCount }} 次</title>
        </rect>
        <text class="bar-value" :x="slotX(index) + slotWidth / 2" :y="yFor(member.commitCount) - 5">{{ member.commitCount }}</text>
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
          :aria-label="`${member.user.name} 提交 ${member.commitCount} 次`"
          @click="$emit('select', member.user.id)"
          @keydown.enter="$emit('select', member.user.id)"
        />
      </g>
      <text class="axis-unit" :x="plotLeft" y="12">（次）</text>
    </svg>
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

const chartHeight = 260
const plotLeft = 48
const plotRight = 18
const plotTop = 24
const plotBottom = 42
const plotHeight = chartHeight - plotTop - plotBottom
const chartWidth = computed(() => Math.max(680, props.members.length * 62 + plotLeft + plotRight))
const slotWidth = computed(() => (chartWidth.value - plotLeft - plotRight) / Math.max(1, props.members.length))
const barWidth = computed(() => Math.max(8, Math.min(24, slotWidth.value * 0.48)))
const maxValue = computed(() => Math.max(4, Math.ceil(Math.max(1, ...props.members.map(member => member.commitCount)) / 4) * 4))
const ticks = computed(() => Array.from({ length: 5 }, (_, index) => {
  const value = Math.round(maxValue.value * index / 4 * 10) / 10
  return { value, y: yFor(value) }
}).reverse())
const slotX = (index: number) => plotLeft + slotWidth.value * index
const barX = (index: number) => slotX(index) + (slotWidth.value - barWidth.value) / 2
const yFor = (value: number) => plotTop + plotHeight - (Math.max(0, value) / maxValue.value) * plotHeight
const barHeight = (value: number) => value <= 0 ? 0 : Math.max(1, (value / maxValue.value) * plotHeight)
const shortName = (value: string) => Array.from(value).length > 5 ? `${Array.from(value).slice(0, 5).join('')}…` : value
</script>

<style scoped>
.member-bar-scroll { width: 100%; overflow-x: auto; overflow-y: hidden; }
.member-bar-chart { display: block; width: 100%; height: 260px; }
.grid-line { stroke: #e7ebf2; stroke-width: 1; stroke-dasharray: 3 2; }
.selected-bg { fill: rgb(36 104 232 / 8%); }
.bar { fill: #409EFF; rx: 2px; }
.bar--zero { fill: #cdd5e1; }
.bar-value { fill: #4a5a70; font-size: 11px; text-anchor: middle; }
.axis-label { fill: #7d899c; font-size: 11px; }
.axis-label--y { text-anchor: end; }
.axis-label--x { text-anchor: middle; }
.axis-unit { fill: #98a2b3; font-size: 11px; }
.hit-area { fill: transparent; cursor: pointer; outline: none; }
.hit-area:focus { fill: rgb(36 104 232 / 6%); }
</style>
