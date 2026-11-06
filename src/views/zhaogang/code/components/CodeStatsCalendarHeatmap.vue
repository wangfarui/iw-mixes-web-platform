<template>
  <div class="heatmap-shell">
    <table class="heatmap-grid" aria-label="提交日历热力图，列为星期，每行一周">
      <thead>
        <tr>
          <th v-for="weekday in weekdays" :key="weekday" scope="col">{{ weekday }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="week in weeks" :key="week.firstDate">
          <td v-for="(day, index) in week.days" :key="index">
            <CodeStatsChartTooltip
              v-if="day"
              :content="dailyCodeDetails(day)"
              v-slot="{ pointerEvents }"
            >
              <span
                v-on="pointerEvents"
                class="heatmap-cell"
                :class="[`level-${levelOf(day.commitCount)}`, { rest: day.dayType === 'REST_DAY' }]"
                tabindex="0"
                :aria-label="dailyCodeDetails(day)"
              >{{ Number(day.date.slice(8)) }}</span>
            </CodeStatsChartTooltip>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="heatmap-legend">
      <span>提交少</span>
      <i v-for="level in 5" :key="level" :class="`level-${level - 1}`" />
      <span>多</span>
      <span class="heatmap-hint">金色边框为休息日</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import CodeStatsChartTooltip from './CodeStatsChartTooltip.vue'
import { computed } from 'vue'
import type { ZhaogangCodeStatsDaily } from '@/types/zhaogangCodeStats'
import { dailyCodeDetails } from '../codeStatsPresentation'

const props = defineProps<{ daily: ZhaogangCodeStatsDaily[] }>()

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const levelOf = (count: number) => count <= 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4
const weeks = computed(() => {
  if (!props.daily.length) return []
  const first = new Date(`${props.daily[0].date}T00:00:00Z`)
  const offset = (first.getUTCDay() + 6) % 7
  const cells: Array<ZhaogangCodeStatsDaily | null> = [
    ...Array<null>(offset).fill(null), ...props.daily
  ]
  return Array.from({ length: Math.ceil(cells.length / 7) }, (_, row) => {
    const start = row * 7
    return {
      firstDate: props.daily[Math.max(0, start - offset)].date,
      days: weekdays.map((_, column) => cells[start + column] ?? null)
    }
  })
})
</script>

<style scoped>
.heatmap-shell { display: flex; flex-direction: column; justify-content: center; flex: 1; gap: 8px; min-width: 0; }
.heatmap-grid { width: calc(100% + 8px); margin: 0 -4px; border-collapse: separate; border-spacing: 4px; table-layout: fixed; text-align: center; }
.heatmap-grid th { padding: 0; color: #5c6b80; font-size: 12px; font-weight: 500; }
.heatmap-grid td { padding: 0; }
.heatmap-cell { display: grid; min-height: clamp(35px, 3vw, 52px); place-items: center; box-sizing: border-box; border: 1px solid transparent; border-radius: 4px; background: #eef1f6; color: #354761; font-size: 12px; font-variant-numeric: tabular-nums; }
.heatmap-cell:is(:hover, :focus-visible) { outline: 2px solid #2468e8; outline-offset: -2px; }
.heatmap-cell.rest { border-color: #c5923d; }
.heatmap-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; color: #69788e; font-size: 11px; }
.heatmap-legend i { width: 11px; height: 11px; background: #eef1f6; border-radius: 2px; }
.heatmap-shell .level-1 { background: #cfe2ff; }
.heatmap-shell .level-2 { background: #9cc2fb; }
.heatmap-shell .level-3 { background: #4274cb; color: #fff; }
.heatmap-shell .level-4 { background: #1552bd; color: #fff; }
.heatmap-hint { margin-left: auto; }
</style>
