<template>
  <section class="worklog-ranking" aria-label="团队月度卷王排行榜">
    <el-alert
      v-if="coverage.partial"
      class="ranking-alert"
      type="warning"
      :closable="false"
      show-icon
      :title="coverageMessage"
    />

    <div class="ranking-intro">
      <div class="ranking-heading">
        <strong>团队月度卷王榜</strong>
        <span>按{{ metricLabel }}排序 · 统计 {{ memberDailyTotals.length }} 人</span>
      </div>
      <div class="ranking-controls">
        <el-radio-group v-model="selectedMetric" size="small" aria-label="排行榜统计维度">
          <el-radio-button value="TOTAL_HOURS">总工时</el-radio-button>
          <el-radio-button value="OVERTIME_HOURS">加班工时</el-radio-button>
          <el-radio-button value="OVERTIME_DAYS">加班天数</el-radio-button>
        </el-radio-group>
        <span class="ranking-month">{{ monthLabel }}</span>
      </div>
    </div>

    <el-empty v-if="!hasRankingResult" :description="emptyDescription" :image-size="92" />
    <template v-else>
      <div class="champion-card">
        <div class="champion-crown" aria-hidden="true"><el-icon><Trophy /></el-icon></div>
        <div class="champion-copy">
          <span>{{ champions.length > 1 ? `本月并列${championTitle}` : `本月${championTitle}` }}</span>
          <strong :title="championNames">{{ championNames }}</strong>
          <small v-if="champions.length === 1">{{ championDetails }}</small>
          <small v-else>{{ metricLabel }}相同，共享本月第一</small>
        </div>
        <div class="champion-hours">
          <strong>{{ formatMetricValue(champions[0]) }}</strong>
          <span>{{ metricUnit }}</span>
        </div>
      </div>

      <ol v-if="remainingStandings.length" class="ranking-list">
        <li v-for="member in remainingStandings" :key="member.user.id" class="ranking-row">
          <span class="rank-number" :class="`rank-number--${Math.min(member.rank, 4)}`">{{ rankLabel(member.rank) }}</span>
          <el-avatar :size="34" :src="member.user.avatar">{{ member.user.name?.slice(0, 1) }}</el-avatar>
          <div class="member-summary">
            <div class="member-line">
              <strong :title="member.user.name">{{ member.user.name }}</strong>
              <span>{{ metricLabel }} {{ formatMetricValue(member) }}{{ metricUnit }}</span>
            </div>
            <div class="progress-track" aria-hidden="true">
              <span :style="{ width: `${progressWidth(member)}%` }" />
            </div>
          </div>
          <div class="member-metrics">
            <span v-for="item in secondaryMetrics(member)" :key="item.label">{{ item.label }} {{ item.value }}</span>
          </div>
        </li>
      </ol>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Trophy } from '@element-plus/icons-vue'
import type {
  ZhaogangWorklogCoverage,
  ZhaogangWorklogMemberDailyTotal,
  ZhaogangWorklogRankingMetric,
  ZhaogangWorklogUser
} from '@/types/zhaogang'

interface WorklogStanding {
  user: ZhaogangWorklogUser
  rank: number
  totalHours: number
  overtimeHours: number
  overtimeDays: number
}

const props = defineProps<{
  month: string
  metric: ZhaogangWorklogRankingMetric
  coverage: ZhaogangWorklogCoverage
  memberDailyTotals: ZhaogangWorklogMemberDailyTotal[]
}>()
const emit = defineEmits<{
  'update:metric': [value: ZhaogangWorklogRankingMetric]
}>()

const selectedMetric = computed({
  get: () => props.metric,
  set: value => emit('update:metric', value)
})

const monthLabel = computed(() => {
  const [year, month] = props.month.split('-').map(Number)
  return `${year} 年 ${month} 月`
})
const memberStatistics = computed<Omit<WorklogStanding, 'rank'>[]>(() => props.memberDailyTotals.map(member => {
  const totalHours = member.dailyTotals.reduce((sum, item) => sum + Number(item.hours || 0), 0)
  return {
    user: member.user,
    rank: 0,
    totalHours,
    overtimeHours: Number(member.summary?.overtimeHours || 0),
    overtimeDays: Number(member.summary?.overtimeDays || 0)
  }
}))
const standings = computed<WorklogStanding[]>(() => {
  const sorted = [...memberStatistics.value]
    .sort((left, right) => metricValue(right) - metricValue(left) || left.user.name.localeCompare(right.user.name, 'zh-CN'))

  let previousValue: number | null = null
  let previousRank = 0
  return sorted.map((member, index) => {
    const value = metricValue(member)
    const rank = previousValue !== null && sameValue(value, previousValue) ? previousRank : index + 1
    previousValue = value
    previousRank = rank
    return { ...member, rank }
  })
})
const hasRankingResult = computed(() => standings.value.some(member => metricValue(member) > 0))
const champions = computed(() => standings.value.filter(member => member.rank === 1 && metricValue(member) > 0))
const remainingStandings = computed(() => standings.value.filter(member => member.rank > 1))
const championNames = computed(() => champions.value.map(member => member.user.name).join('、'))
const maximumMetricValue = computed(() => standings.value[0] ? metricValue(standings.value[0]) : 0)
const metricLabel = computed(() => ({
  TOTAL_HOURS: '总工时',
  OVERTIME_HOURS: '加班工时',
  OVERTIME_DAYS: '加班天数'
}[props.metric]))
const metricUnit = computed(() => props.metric === 'OVERTIME_DAYS' ? '天' : 'h')
const championTitle = computed(() => ({
  TOTAL_HOURS: '总工时卷王',
  OVERTIME_HOURS: '加班王',
  OVERTIME_DAYS: '加班天数王'
}[props.metric]))
const emptyDescription = computed(() => ({
  TOTAL_HOURS: '本月暂无工时，暂未产生总工时卷王',
  OVERTIME_HOURS: '本月暂无加班工时，暂未产生加班王',
  OVERTIME_DAYS: '本月暂无加班天数，暂未产生加班天数王'
}[props.metric]))
const championDetails = computed(() => {
  const champion = champions.value[0]
  if (!champion) return ''
  return secondaryMetrics(champion).map(item => `${item.label} ${item.value}`).join(' · ')
})
const coverageMessage = computed(() => props.coverage.failedMemberCount > 0
  ? `榜单暂不完整：已展示 ${props.memberDailyTotals.length}/${props.coverage.memberCount} 名成员，${props.coverage.failedMemberCount} 名成员工时获取失败，排名可能发生变化`
  : '榜单数据暂不完整：部分成员工时未完整取得，排名可能发生变化')

const metricValue = (member: Omit<WorklogStanding, 'rank'> | WorklogStanding) => ({
  TOTAL_HOURS: member.totalHours,
  OVERTIME_HOURS: member.overtimeHours,
  OVERTIME_DAYS: member.overtimeDays
}[props.metric])
const sameValue = (left: number, right: number) => Math.abs(left - right) < 0.000001
const formatHours = (hours: number) => Number(hours || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const formatMetricValue = (member?: WorklogStanding) => member
  ? (props.metric === 'OVERTIME_DAYS' ? String(member.overtimeDays) : formatHours(metricValue(member)))
  : '0'
const secondaryMetrics = (member: WorklogStanding) => [
  props.metric === 'TOTAL_HOURS' ? null : { label: '总工时', value: `${formatHours(member.totalHours)}h` },
  props.metric === 'OVERTIME_HOURS' ? null : { label: '加班工时', value: `${formatHours(member.overtimeHours)}h` },
  props.metric === 'OVERTIME_DAYS' ? null : { label: '加班天数', value: `${member.overtimeDays}天` }
].filter((item): item is { label: string; value: string } => item !== null)
const progressWidth = (member: WorklogStanding) => {
  const value = metricValue(member)
  return value > 0 && maximumMetricValue.value ? Math.max(2, value / maximumMetricValue.value * 100) : 0
}
const rankLabel = (rank: number) => rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : String(rank)
</script>

<style scoped>
.worklog-ranking { min-height: 302px; color: #26344a; }
.ranking-alert { margin-bottom: 14px; }
.ranking-intro { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.ranking-heading { display: flex; min-width: 0; align-items: baseline; gap: 10px; }
.ranking-intro strong { font-size: 16px; }
.ranking-intro span { color: #7b879a; font-size: 12px; }
.ranking-controls { display: flex; align-items: center; gap: 12px; }
.ranking-month { flex: 0 0 auto; }
.champion-card {
  display: grid;
  position: relative;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  min-height: 112px;
  padding: 20px 24px;
  overflow: hidden;
  border: 1px solid #f2d38b;
  border-radius: 10px;
  background: linear-gradient(120deg, #fff9e9 0%, #fffdf7 58%, #fff7df 100%);
}
.champion-card::after {
  position: absolute;
  width: 180px;
  height: 180px;
  right: -56px;
  top: -92px;
  border-radius: 50%;
  background: rgb(229 161 38 / 9%);
  content: '';
}
.champion-crown { display: grid; width: 56px; height: 56px; place-items: center; border-radius: 50%; background: #e5a126; color: #fff; font-size: 28px; }
.champion-copy { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
.champion-copy > span { color: #a56b0c; font-size: 12px; font-weight: 600; }
.champion-copy strong { overflow: hidden; font-size: 22px; text-overflow: ellipsis; white-space: nowrap; }
.champion-copy small { color: #7b6d55; font-size: 12px; }
.champion-hours { display: flex; z-index: 1; align-items: baseline; gap: 5px; color: #b87507; white-space: nowrap; }
.champion-hours strong { font-size: 34px; font-variant-numeric: tabular-nums; }
.champion-hours span { font-size: 13px; }
.ranking-list { max-height: 430px; margin: 14px 0 0; padding: 0; overflow-x: hidden; overflow-y: auto; border: 1px solid #e7ebf2; border-radius: 8px; list-style: none; }
.ranking-row { display: grid; min-height: 66px; grid-template-columns: 34px 34px minmax(180px, 1fr) auto; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid #edf0f5; }
.ranking-row:last-child { border-bottom: 0; }
.ranking-row:hover { background: #f8faff; }
.rank-number { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; background: #eef2f7; color: #69768a; font-size: 13px; font-weight: 700; }
.rank-number--2, .rank-number--3 { background: #fff7e6; font-size: 17px; }
.member-summary { min-width: 0; }
.member-line { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.member-line strong { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.member-line span { color: #356ec8; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.progress-track { height: 6px; margin-top: 7px; overflow: hidden; border-radius: 999px; background: #edf1f7; }
.progress-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #4b8dea, #79b4f5); }
.member-metrics { display: flex; align-items: center; gap: 14px; color: #7b879a; font-size: 12px; white-space: nowrap; }
@media (max-width: 760px) {
  .ranking-intro { align-items: flex-start; flex-direction: column; gap: 4px; }
  .ranking-heading { align-items: flex-start; flex-direction: column; gap: 3px; }
  .ranking-controls { width: 100%; align-items: flex-start; flex-direction: column; gap: 6px; }
  .champion-card { grid-template-columns: auto minmax(0, 1fr); gap: 12px; padding: 16px; }
  .champion-crown { width: 46px; height: 46px; font-size: 23px; }
  .champion-hours { grid-column: 2; }
  .champion-hours strong { font-size: 27px; }
  .ranking-row { grid-template-columns: 30px 32px minmax(0, 1fr); gap: 8px; padding: 10px; }
  .member-metrics { grid-column: 3; flex-wrap: wrap; gap: 4px 10px; white-space: normal; }
}
</style>
