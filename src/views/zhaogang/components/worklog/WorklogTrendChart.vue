<template>
  <div ref="chartShell" class="trend-shell" @mouseleave="clearTooltip">
    <div ref="trendScroll" class="trend-scroll" @scroll="clearTooltip">
      <svg
        class="trend-chart"
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        :style="{ minWidth: `${chartWidth}px` }"
        role="img"
        :aria-label="`${monthLabel}每日工时趋势`"
      >
        <text class="axis-unit" :x="plotLeft" y="12">（小时）</text>
        <g v-for="tick in ticks" :key="tick.value">
          <line class="grid-line" :x1="plotLeft" :x2="chartWidth - plotRight" :y1="tick.y" :y2="tick.y" />
          <text class="axis-label axis-label--y" :x="plotLeft - 9" :y="tick.y + 4">{{ tick.value }}</text>
        </g>

        <g v-if="scope === 'SELF' && maxHours >= 8">
          <line class="reference-line" :x1="plotLeft" :x2="chartWidth - plotRight" :y1="yFor(8)" :y2="yFor(8)" />
          <text class="reference-label" :x="chartWidth - plotRight" :y="yFor(8) - 5">8h</text>
        </g>

        <g v-for="(day, index) in days" :key="day.date">
          <rect
            v-if="day.restDay"
            class="rest-day-background"
            :x="slotX(index)"
            :y="plotTop"
            :width="slotWidth"
            :height="plotHeight"
          />
          <rect
            v-if="day.today"
            class="today-background"
            :x="slotX(index)"
            :y="plotTop"
            :width="slotWidth"
            :height="plotHeight"
          />
          <template v-if="scope === 'SELF'">
            <rect
              v-if="day.baseHours > 0"
              class="bar bar--self"
              :class="{ 'bar--future': day.future }"
              :x="selfBarX(index)"
              :y="yFor(day.baseHours)"
              :width="selfBarWidth"
              :height="barHeight(day.baseHours)"
            />
            <rect
              v-if="day.extraHours > 0"
              class="bar bar--extra"
              :class="{ 'bar--future': day.future }"
              :x="selfBarX(index)"
              :y="yFor(day.hours)"
              :width="selfBarWidth"
              :height="barHeight(day.extraHours)"
            />
          </template>
          <template v-else>
            <rect
              v-for="(member, memberIndex) in day.members"
              v-show="member.hours > 0"
              :key="member.userId"
              class="bar bar--member"
              :class="{ 'bar--future': day.future }"
              :x="teamBarX(index, memberIndex)"
              :y="yFor(member.hours)"
              :width="teamBarWidth"
              :height="barHeight(member.hours)"
              :fill="member.color"
            />
          </template>
          <text
            class="axis-label axis-label--x"
            :class="{ 'axis-label--future': day.future, 'axis-label--rest-day': day.restDay }"
            :x="slotX(index) + slotWidth / 2"
            :y="chartHeight - 12"
          >
            {{ day.day }}
          </text>
          <rect
            class="hover-target"
            :class="{ 'hover-target--empty': !hasTooltipData(day) }"
            :x="slotX(index)"
            :y="plotTop"
            :width="slotWidth"
            :height="plotHeight"
            :tabindex="hasTooltipData(day) ? 0 : -1"
            :aria-label="hasTooltipData(day) ? `${day.date} · ${day.weekdayLabel}${scope === 'SELF' ? '我的工时' : '团队工时'}明细` : undefined"
            @mouseenter="showTooltip($event, day)"
            @mousemove="showTooltip($event, day)"
            @focus="showTooltip($event, day)"
            @blur="clearTooltip"
          />
        </g>
      </svg>
    </div>

    <div v-if="hoveredDay" class="trend-tooltip" :style="{ left: `${tooltipLeft}px` }">
      <strong>{{ hoveredDay.date }} · {{ hoveredDay.weekdayLabel }}</strong>
      <div v-if="scope === 'SELF'" class="tooltip-member">
        <span class="member-color" :style="{ backgroundColor: hoveredDay.restDay ? '#e5a126' : '#3478e5' }" />
        <span class="tooltip-name">我的工时</span>
        <b>{{ formatHours(hoveredDay.hours) }}h</b>
      </div>
      <template v-else>
        <div v-for="member in hoveredDay.members" :key="member.userId" class="tooltip-member">
          <span class="member-color" :style="{ backgroundColor: member.color }" />
          <span class="tooltip-name" :title="member.name">{{ member.name }}</span>
          <b>{{ formatHours(member.hours) }}h</b>
        </div>
      </template>
    </div>

    <div v-if="scope === 'WORKBENCH_TEAM' && teamMembers.length" class="member-legend" aria-label="团队成员颜色图例">
      <div v-for="member in teamMembers" :key="member.user.id" class="legend-item">
        <span class="member-color" :style="{ backgroundColor: member.color }" />
        <span :title="member.user.name">{{ member.user.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type {
  ZhaogangWorklogDailyTotal,
  ZhaogangWorklogMemberDailyTotal,
  ZhaogangWorklogScope,
  ZhaogangWorklogUser
} from '@/types/zhaogang'

interface MemberHours {
  userId: number
  name: string
  color: string
  hours: number
}

interface ChartDay {
  date: string
  day: number
  weekdayLabel: string
  restDay: boolean
  hours: number
  baseHours: number
  extraHours: number
  today: boolean
  future: boolean
  members: MemberHours[]
}

interface TeamMemberSeries {
  user: ZhaogangWorklogUser
  color: string
  totals: Map<string, number>
}

const props = withDefaults(defineProps<{
  month: string
  scope: ZhaogangWorklogScope
  dailyTotals: ZhaogangWorklogDailyTotal[]
  memberDailyTotals?: ZhaogangWorklogMemberDailyTotal[]
}>(), {
  memberDailyTotals: () => []
})

const memberColors = [
  '#2f8ff0', '#56c7c2', '#f5bd52', '#f05a3a', '#18be72', '#e96db5',
  '#8a70df', '#f39a5c', '#2ca7b8', '#d34f72', '#5d78d4', '#8daf3e',
  '#9c6ade', '#1f9d8a', '#d87a1f', '#4d9a40', '#c45fb1', '#667080',
  '#e14d5a', '#6c9fca'
]
const chartHeight = 302
const plotLeft = 54
const plotRight = 20
const plotTop = 24
const plotBottom = 42
const plotHeight = chartHeight - plotTop - plotBottom
const chartShell = ref<HTMLElement | null>(null)
const trendScroll = ref<HTMLElement | null>(null)
const hoveredDay = ref<ChartDay | null>(null)
const tooltipLeft = ref(12)
const monthLabel = computed(() => {
  const [year, month] = props.month.split('-').map(Number)
  return `${year} 年 ${month} 月`
})
const totalByDate = computed(() => new Map(props.dailyTotals.map(item => [item.date, item])))
const teamMembers = computed<TeamMemberSeries[]>(() => props.memberDailyTotals.map((member, index) => ({
  user: member.user,
  color: memberColors[index % memberColors.length],
  totals: new Map(member.dailyTotals.map(item => [item.date, Number(item.hours || 0)]))
})))
const today = new Date()
const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const days = computed<ChartDay[]>(() => {
  const [year, month] = props.month.split('-').map(Number)
  const count = new Date(year, month, 0).getDate()
  return Array.from({ length: count }, (_, index) => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
    const total = totalByDate.value.get(date)
    const hours = Number(total?.hours || 0)
    const weekday = new Date(`${date}T00:00:00`).getDay()
    const restDay = total?.dayType ? total.dayType === 'REST_DAY' : weekday === 0 || weekday === 6
    return {
      date,
      day: index + 1,
      weekdayLabel: weekdays[weekday],
      restDay,
      hours,
      baseHours: restDay ? 0 : Math.min(hours, 8),
      extraHours: restDay ? hours : Math.max(0, hours - 8),
      today: date === todayText,
      future: date > todayText,
      members: teamMembers.value.map(member => ({
        userId: member.user.id,
        name: member.user.name,
        color: member.color,
        hours: member.totals.get(date) || 0
      }))
    }
  })
})
const rawMaxHours = computed(() => {
  if (props.scope === 'WORKBENCH_TEAM') {
    return Math.max(0, ...days.value.flatMap(day => day.members.map(member => member.hours)))
  }
  return Math.max(8, ...days.value.map(day => day.hours))
})
const maxHours = computed(() => Math.max(4, Math.ceil(rawMaxHours.value / 4) * 4))
const minimumSlotWidth = computed(() => props.scope === 'WORKBENCH_TEAM'
  ? Math.max(32, teamMembers.value.length * 12 + 10)
  : 30)
const chartWidth = computed(() => Math.max(920, days.value.length * minimumSlotWidth.value + plotLeft + plotRight))
const slotWidth = computed(() => (chartWidth.value - plotLeft - plotRight) / Math.max(days.value.length, 1))
const selfBarWidth = computed(() => Math.min(18, slotWidth.value * 0.62))
const teamBarWidth = computed(() => {
  const memberCount = Math.max(teamMembers.value.length, 1)
  return Math.max(3, Math.min(10, (slotWidth.value - 10 - (memberCount - 1) * 2) / memberCount))
})
const teamBarsWidth = computed(() => teamMembers.value.length * teamBarWidth.value
  + Math.max(0, teamMembers.value.length - 1) * 2)
const ticks = computed(() => Array.from({ length: 5 }, (_, index) => {
  const value = Math.round((maxHours.value * index) / 4 * 100) / 100
  return { value, y: yFor(value) }
}).reverse())

const slotX = (index: number) => plotLeft + slotWidth.value * index
const selfBarX = (index: number) => slotX(index) + (slotWidth.value - selfBarWidth.value) / 2
const teamBarX = (dayIndex: number, memberIndex: number) => slotX(dayIndex)
  + (slotWidth.value - teamBarsWidth.value) / 2
  + memberIndex * (teamBarWidth.value + 2)
const yFor = (hours: number) => plotTop + plotHeight - (hours / maxHours.value) * plotHeight
const barHeight = (hours: number) => Math.max(1, (hours / maxHours.value) * plotHeight)
const formatHours = (hours: number) => Number(hours || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const hasTooltipData = (day: ChartDay) => props.scope === 'SELF'
  ? day.hours > 0
  : day.members.some(member => member.hours > 0)
const showTooltip = (event: MouseEvent | FocusEvent, day: ChartDay) => {
  if (!hasTooltipData(day)) {
    clearTooltip()
    return
  }
  hoveredDay.value = day
  const shell = chartShell.value
  if (!shell) return
  const bounds = shell.getBoundingClientRect()
  const target = event.currentTarget as SVGRectElement | null
  const pointerX = event instanceof MouseEvent
    ? event.clientX - bounds.left
    : (target?.getBoundingClientRect().left || bounds.left) - bounds.left
  const tooltipWidth = Math.min(268, Math.max(220, bounds.width - 24))
  tooltipLeft.value = Math.max(12, Math.min(pointerX + 12, bounds.width - tooltipWidth - 12))
}
const clearTooltip = () => {
  hoveredDay.value = null
}

const scrollToToday = async () => {
  await nextTick()
  const container = trendScroll.value
  const todayIndex = days.value.findIndex(day => day.today)
  if (!container || todayIndex < 0) return
  const todayCenter = slotX(todayIndex) + slotWidth.value / 2
  container.scrollLeft = Math.max(0, todayCenter - container.clientWidth / 2)
}

watch(
  () => [props.month, props.scope, chartWidth.value],
  () => { void scrollToToday() },
  { immediate: true }
)
</script>

<style scoped>
.trend-shell { position: relative; width: 100%; }
.trend-scroll { width: 100%; overflow-x: auto; overflow-y: hidden; }
.trend-chart { display: block; width: 100%; height: 302px; }
.grid-line { stroke: #e7ebf2; stroke-width: 1; stroke-dasharray: 3 2; }
.reference-line { stroke: #d89b2b; stroke-width: 1; stroke-dasharray: 5 4; }
.reference-label { fill: #b27612; font-size: 12px; text-anchor: end; }
.today-background { fill: #f3f7fc; }
.rest-day-background { fill: #fff7e8; }
.bar { rx: 1.5px; }
.bar--self { fill: #3478e5; }
.bar--extra { fill: #e5a126; }
.bar--future { opacity: 0.35; }
.axis-unit { fill: #8a96a9; font-size: 13px; }
.axis-label { fill: #7d899c; font-size: 12px; }
.axis-label--y { text-anchor: end; }
.axis-label--x { text-anchor: middle; }
.axis-label--future { fill: #b9c0cb; }
.axis-label--rest-day { fill: #c8891f; font-weight: 600; }
.hover-target { fill: transparent; cursor: crosshair; outline: none; }
.hover-target--empty { cursor: default; }
.hover-target:focus { fill: rgb(52 120 229 / 6%); }
.trend-tooltip {
  box-sizing: border-box;
  position: absolute;
  z-index: 4;
  top: 18px;
  width: min(268px, calc(100% - 24px));
  padding: 16px;
  border: 1px solid #e4e9f1;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(38 52 74 / 16%);
  color: #26344a;
  pointer-events: none;
}
.trend-tooltip > strong { display: block; margin-bottom: 10px; text-align: center; font-size: 16px; }
.tooltip-member { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; align-items: center; gap: 9px; min-height: 28px; }
.tooltip-name { overflow: hidden; color: #68768b; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.tooltip-member b { color: #43516a; font-size: 14px; font-weight: 600; }
.member-color { width: 9px; height: 9px; border-radius: 2px; flex: 0 0 auto; }
.member-legend {
  display: flex;
  align-items: center;
  justify-content: safe center;
  gap: 22px;
  min-height: 38px;
  padding: 8px 4px 0;
  overflow-x: auto;
  color: #69768a;
  font-size: 14px;
}
.legend-item { display: inline-flex; align-items: center; gap: 7px; flex: 0 0 auto; max-width: 180px; }
.legend-item span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 760px) {
  .member-legend { justify-content: flex-start; }
}
</style>
