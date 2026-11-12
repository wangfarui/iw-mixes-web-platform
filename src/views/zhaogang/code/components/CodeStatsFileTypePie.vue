<template>
  <p v-if="slices.length" class="pie-total">共 {{ format.format(changedLines) }} 行（新增 + 删除）</p>
  <div v-if="slices.length" class="pie-layout">
    <svg viewBox="0 0 200 200" role="img" aria-label="文件类型变更行数占比" class="pie">
      <path
        v-for="slice in slices"
        :key="slice.type"
        :d="slice.path"
        :fill="slice.color"
        :class="{ faded: active && active !== slice.type }"
        @pointerenter="active = slice.type"
        @pointerleave="active = ''"
      >
        <title>{{ details(slice) }}</title>
      </path>
    </svg>
    <ul class="pie-legend" aria-label="各文件类型变更行数">
      <li
        v-for="slice in slices"
        :key="slice.type"
        :title="details(slice)"
        :class="{ selected: active === slice.type }"
        @pointerenter="active = slice.type"
        @pointerleave="active = ''"
      >
        <i :style="{ backgroundColor: slice.color }" aria-hidden="true" />
        <span class="type">{{ slice.type }}</span>
        <span class="lines">{{ format.format(slice.lines) }} 行</span>
        <strong>{{ percentage(slice.share) }}</strong>
      </li>
    </ul>
  </div>
  <el-empty v-else description="所选范围暂无已统计的变更行数" :image-size="70" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ZhaogangCodeStatsFileType } from '@/types/zhaogangCodeStats'

const props = defineProps<{ items: ZhaogangCodeStatsFileType[]; additions: number; deletions: number }>()
const active = ref('')
const format = new Intl.NumberFormat('zh-CN')
const colors = ['#3288ed', '#38b5a9', '#e5a64b', '#8d75d8', '#ec7b82', '#59a5bc', '#748db3', '#a7ad63']
const unclassifiedType = '未分类'
const changedLines = computed(() => props.additions + props.deletions)
const pointAt = (fraction: number) => {
  const angle = fraction * 2 * Math.PI
  return `${100 + 100 * Math.sin(angle)} ${100 - 100 * Math.cos(angle)}`
}

const sectorPath = (start: number, end: number) => {
  if (start === 0 && end === 1) {
    return 'M 100 0 A 100 100 0 1 1 100 200 A 100 100 0 1 1 100 0 Z'
  }
  const largeArc = end - start > 0.5 ? 1 : 0
  return `M 100 100 L ${pointAt(start)} A 100 100 0 ${largeArc} 1 ${pointAt(end)} Z`
}

const slices = computed(() => {
  const classified = props.items
    .map(item => ({ ...item, lines: item.additions + item.deletions }))
    .filter(item => item.lines > 0)
  const classifiedAdditions = classified.reduce((sum, item) => sum + item.additions, 0)
  const classifiedDeletions = classified.reduce((sum, item) => sum + item.deletions, 0)
  const valid = classifiedAdditions <= props.additions && classifiedDeletions <= props.deletions
    && classified.every(item => item.additions >= 0 && item.deletions >= 0)
  const items = valid ? classified : []
  const unclassifiedAdditions = props.additions - (valid ? classifiedAdditions : 0)
  const unclassifiedDeletions = props.deletions - (valid ? classifiedDeletions : 0)
  const unclassifiedLines = unclassifiedAdditions + unclassifiedDeletions
  if (unclassifiedLines > 0) {
    items.push({
      type: unclassifiedType,
      additions: unclassifiedAdditions,
      deletions: unclassifiedDeletions,
      lines: unclassifiedLines
    })
  }
  const total = items.reduce((sum, item) => sum + item.lines, 0)
  let offset = 0
  return items.map((item, index) => {
    const start = offset / total
    offset += item.lines
    return {
      ...item,
      share: item.lines / total * 100,
      path: sectorPath(start, offset / total),
      color: item.type === unclassifiedType ? '#94a3b8' : colors[index % colors.length]
    }
  })
})
const percentage = (share: number) => share > 0 && share < 0.1
  ? '<0.1%' : `${Math.round(share * 10) / 10}%`
const details = (slice: (typeof slices.value)[number]) =>
  `${slice.type} · ${format.format(slice.lines)} 行（${percentage(slice.share)}）· 新增 ${format.format(slice.additions)} 行 / 删除 ${format.format(slice.deletions)} 行`
</script>

<style scoped>
.pie-total { margin: 0; color: #64748b; font-size: 12px; }
.pie-layout { min-height: 248px; display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; padding: 12px 4px; }
.pie { display: block; width: clamp(124px, 34%, 188px); flex: none; overflow: visible; }
.pie path { transition: opacity 120ms ease; }
.pie path.faded { opacity: .28; }
.pie-legend { flex: 1 1 210px; min-width: 0; max-height: 220px; overflow-y: auto; padding: 0 4px; margin: 0; list-style: none; }
.pie-legend li { display: grid; grid-template-columns: 9px minmax(0, 1fr) auto minmax(48px, auto); align-items: center; gap: 7px; padding: 6px 4px; border-radius: 4px; color: #526179; font-size: 12px; font-variant-numeric: tabular-nums; }
.pie-legend li.selected { background: #edf4ff; }
.pie-legend i { width: 9px; height: 9px; border-radius: 3px; }
.pie-legend .type { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pie-legend strong { text-align: right; color: #34465f; font-weight: 600; }
</style>
