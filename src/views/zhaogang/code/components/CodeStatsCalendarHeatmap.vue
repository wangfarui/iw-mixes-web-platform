<template>
  <div class="heatmap-shell">
    <div class="heatmap-grid" role="img" :aria-label="`提交日历热力图，共 ${days.length} 天`">
      <div v-for="weekday in weekdays" :key="weekday" class="heatmap-weekday">{{ weekday }}</div>
      <button
        v-for="(day, index) in cells"
        :key="`${index}-${day?.date || 'empty'}`"
        type="button"
        class="heatmap-cell"
        :class="[day ? `level-${day.level}` : 'empty', { selected: day?.date === selectedDate, rest: day?.rest }]"
        :disabled="!day"
        :title="day ? `${day.date} · 提交 ${day.commitCount} 次 · 新增 ${day.additions} · 删除 ${day.deletions}` : ''"
        :aria-label="day ? `${day.date} 提交 ${day.commitCount} 次` : undefined"
        @click="day ? $emit('select', day.date) : undefined"
      />
    </div>
    <div class="heatmap-legend">
      <span>少</span>
      <i v-for="level in 5" :key="level" :class="`level-${level - 1}`" />
      <span>多</span>
      <span class="heatmap-hint">周末底色区分</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ZhaogangCodeStatsDaily } from '@/types/zhaogangCodeStats'

interface HeatCell {
  date: string
  commitCount: number
  additions: number
  deletions: number
  level: number
  rest: boolean
}

const props = withDefaults(defineProps<{
  daily: ZhaogangCodeStatsDaily[]
  selectedDate?: string
}>(), { selectedDate: '' })

defineEmits<{ (event: 'select', date: string): void }>()

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const levelOf = (count: number) => count <= 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4
const cells = computed<Array<HeatCell | null>>(() => {
  if (!props.daily.length) return []
  const first = parseDate(props.daily[0].date)
  const offset = (first.getDay() + 6) % 7
  const result: Array<HeatCell | null> = Array.from({ length: offset }, () => null)
  props.daily.forEach(item => result.push({
    date: item.date,
    commitCount: item.commitCount,
    additions: item.additions,
    deletions: item.deletions,
    level: levelOf(item.commitCount),
    rest: item.dayType === 'REST_DAY'
  }))
  while (result.length % 7 !== 0) result.push(null)
  return result
})
const days = computed(() => props.daily)

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
</script>

<style scoped>
.heatmap-shell { display: grid; gap: 8px; }
.heatmap-grid { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 16px); grid-auto-columns: 16px; gap: 4px; justify-content: start; }
.heatmap-weekday { display: grid; width: 16px; height: 16px; place-items: center; color: #96a1b2; font-size: 10px; }
.heatmap-cell { width: 16px; height: 16px; padding: 0; background: #eef1f6; border: 1px solid transparent; border-radius: 3px; cursor: pointer; }
.heatmap-cell.empty { visibility: hidden; cursor: default; }
.heatmap-cell.level-1 { background: #cfe2ff; }
.heatmap-cell.level-2 { background: #9cc2fb; }
.heatmap-cell.level-3 { background: #5e94f1; }
.heatmap-cell.level-4 { background: #2468e8; }
.heatmap-cell.rest { border-color: #ecd5a8; }
.heatmap-cell.selected { outline: 2px solid #2468e8; outline-offset: 1px; }
.heatmap-legend { display: flex; align-items: center; gap: 5px; color: #8490a4; font-size: 11px; }
.heatmap-legend i { width: 11px; height: 11px; background: #eef1f6; border-radius: 2px; }
.heatmap-legend i.level-1 { background: #cfe2ff; }
.heatmap-legend i.level-2 { background: #9cc2fb; }
.heatmap-legend i.level-3 { background: #5e94f1; }
.heatmap-legend i.level-4 { background: #2468e8; }
.heatmap-hint { margin-left: auto; }
</style>
