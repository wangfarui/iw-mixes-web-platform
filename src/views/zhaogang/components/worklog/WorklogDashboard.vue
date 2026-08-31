<template>
  <section class="worklog-dashboard">
    <el-alert v-if="optionsError" type="warning" :closable="false" show-icon :title="optionsError" />

    <el-card class="trend-card" shadow="never">
      <template #header>
        <div class="trend-header">
          <div class="trend-title">
            <h3>月度工时统计</h3>
            <p>{{ summary }}</p>
          </div>
          <div class="scope-controls">
            <el-button
              plain
              :icon="WarningFilled"
              :disabled="(scope === 'WORKBENCH_TEAM' && !workbenchTeamId) || statisticsLoading || absenceLoading"
              @click="openAbsenceDialog"
            >
              缺勤统计
            </el-button>
            <el-button
              v-if="scope === 'WORKBENCH_TEAM'"
              :type="presentationMode === 'RANKING' ? 'primary' : 'warning'"
              plain
              :icon="presentationMode === 'RANKING' ? TrendCharts : TrophyBase"
              :disabled="!workbenchTeamId || !statistics || statisticsLoading"
              :aria-pressed="presentationMode === 'RANKING'"
              @click="togglePresentation"
            >
              {{ presentationMode === 'RANKING' ? '月度趋势' : '谁是卷王' }}
            </el-button>
            <el-select
              v-if="scope === 'WORKBENCH_TEAM'"
              v-model="workbenchTeamId"
              class="team-select"
              :style="{ width: teamSelectWidth }"
              filterable
              clearable
              :loading="optionsLoading"
              placeholder="选择工作台团队"
              @change="changeTeam"
            >
              <el-option
                v-for="team in options?.teams || []"
                :key="team.id"
                :label="team.name"
                :value="team.id"
              />
            </el-select>
            <span class="sync-time">{{ syncTimeLabel }}</span>
            <el-tooltip content="刷新当前工时数据">
              <el-button
                circle
                :icon="Refresh"
                :loading="statisticsLoading || entriesLoading || optionsLoading"
                aria-label="刷新当前工时数据"
                @click="refreshDashboard"
              />
            </el-tooltip>
            <el-radio-group v-model="scope" size="small" @change="changeScope">
              <el-radio-button value="SELF">我的工时</el-radio-button>
              <el-radio-button value="WORKBENCH_TEAM">团队工时</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <div class="month-controls">
        <el-tooltip content="上一月"><el-button circle :icon="ArrowLeft" aria-label="上一月" :disabled="statisticsLoading" @click="shiftMonth(-1)" /></el-tooltip>
        <strong>{{ monthLabel }}</strong>
        <el-tooltip content="下一月"><el-button circle :icon="ArrowRight" aria-label="下一月" :disabled="statisticsLoading" @click="shiftMonth(1)" /></el-tooltip>
      </div>

      <el-alert v-if="statisticsError" class="view-error" type="error" :closable="false" show-icon :title="statisticsError" />
      <el-skeleton v-if="statisticsLoading && !statistics" :rows="6" animated />
      <div v-else-if="scope === 'WORKBENCH_TEAM' && !workbenchTeamId" class="selection-placeholder">{{ teamSelectionHint }}</div>
      <WorklogRanking
        v-else-if="statistics && scope === 'WORKBENCH_TEAM' && presentationMode === 'RANKING'"
        :month="month"
        v-model:metric="rankingMetric"
        :coverage="statistics.coverage"
        :member-daily-totals="statistics.memberDailyTotals"
      />
      <WorklogTrendChart
        v-else-if="statistics"
        :month="month"
        :scope="scope"
        :daily-totals="statistics.dailyTotals"
        :member-daily-totals="statistics.memberDailyTotals"
      />
      <el-empty v-else description="暂无工时数据" :image-size="80" />
    </el-card>

    <el-card class="week-card" shadow="never">
      <template #header>
        <div class="week-header">
          <h3>本周工时登记</h3>
          <div class="entry-controls">
            <el-button-group size="small">
              <el-button :type="entryShortcut === 'week' ? 'primary' : 'default'" :disabled="entriesLoading" @click="setEntryShortcut('week')">本周</el-button>
              <el-button :type="entryShortcut === 'month' ? 'primary' : 'default'" :disabled="entriesLoading" @click="setEntryShortcut('month')">本月</el-button>
            </el-button-group>
            <el-date-picker
              v-model="entryRange"
              type="daterange"
              size="small"
              value-format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              :disabled-date="disableEntryDate"
              :clearable="false"
              :disabled="entriesLoading"
              @calendar-change="changeEntryCalendar"
              @change="changeEntryRange"
            />
            <span>{{ scopeLabel }} · {{ formatHours(entries?.totalHours || 0) }}h</span>
          </div>
        </div>
      </template>
      <el-alert
        v-if="entries?.coverage.partial"
        class="coverage-alert"
        type="warning"
        :closable="false"
        show-icon
        :title="`部分成员工时暂未取得，失败成员 ${entries.coverage.failedMemberCount} 人`"
      />
      <el-alert v-if="entriesError" class="view-error" type="error" :closable="false" show-icon :title="entriesError" />
      <el-skeleton v-if="entriesLoading && !entries" :rows="6" animated />
      <div v-else-if="scope === 'WORKBENCH_TEAM' && !workbenchTeamId" class="selection-placeholder">{{ teamSelectionHint }}</div>
      <WorklogWeekList v-else-if="entries" :scope="scope" :entries="entries" />
      <el-empty v-else description="当前范围暂无工时登记" :image-size="80" />
    </el-card>

    <WorklogAbsenceDialog
      v-model="absenceDialogVisible"
      :loading="absenceLoading"
      :error="absenceError"
      :month="month"
      :report="absenceReport"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowRight, Refresh, TrendCharts, TrophyBase, WarningFilled } from '@element-plus/icons-vue'
import { getZhaogangWorklogAbsences, getZhaogangWorklogEntries, getZhaogangWorklogOptions, getZhaogangWorklogStatistics } from '@/api/zhaogang'
import type {
  ZhaogangWorklogOptions,
  ZhaogangWorklogRankingMetric,
  ZhaogangWorklogScope,
  ZhaogangWorklogEntries,
  ZhaogangWorklogStatistics,
  ZhaogangWorklogAbsence
} from '@/types/zhaogang'
import WorklogTrendChart from './WorklogTrendChart.vue'
import WorklogRanking from './WorklogRanking.vue'
import WorklogWeekList from './WorklogWeekList.vue'
import WorklogAbsenceDialog from './WorklogAbsenceDialog.vue'

const current = new Date()
const month = ref(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`)
const scope = ref<ZhaogangWorklogScope>('SELF')
const presentationMode = ref<'TREND' | 'RANKING'>('TREND')
const rankingMetric = ref<ZhaogangWorklogRankingMetric>('OVERTIME_HOURS')
const workbenchTeamId = ref<number | null>(null)
const options = ref<ZhaogangWorklogOptions | null>(null)
const optionsLoading = ref(false)
const optionsError = ref('')
const statistics = ref<ZhaogangWorklogStatistics | null>(null)
const statisticsKey = ref('')
const statisticsError = ref('')
const statisticsLoading = ref(false)
const entries = ref<ZhaogangWorklogEntries | null>(null)
const entriesKey = ref('')
const entriesError = ref('')
const entriesLoading = ref(false)
const absenceDialogVisible = ref(false)
const absenceLoading = ref(false)
const absenceError = ref('')
const absenceReport = ref<ZhaogangWorklogAbsence | null>(null)
const entryRange = ref<[string, string]>([mondayOfCurrentWeek(), addDays(mondayOfCurrentWeek(), 6)])
const entryRangeStart = ref<string | null>(null)
const entryShortcut = ref<'week' | 'month' | null>('week')
let statisticsRequestSequence = 0
let entriesRequestSequence = 0
let absenceRequestSequence = 0

const monthLabel = computed(() => {
  const [year, value] = month.value.split('-').map(Number)
  return `${year} 年 ${value} 月`
})
const selectedTeam = computed(() => options.value?.teams.find(item => item.id === workbenchTeamId.value))
const teamSelectionHint = computed(() => options.value?.teams.length ? '请选择工作台团队' : '还没有加入工作台团队')
const monthTotal = computed(() => statistics.value?.dailyTotals.reduce((sum, item) => sum + Number(item.hours || 0), 0) || 0)
const teamSelectWidth = computed(() => {
  const labels = (options.value?.teams || []).map(team => team.name)
  const longestLength = Math.max(0, ...labels.map(label => Array.from(label).length))
  return `${Math.min(280, Math.max(128, longestLength * 14 + 44))}px`
})
const emptyStatistics = { overtimeDays: 0, overtimeHours: 0, averageHours: 0 }
const personalStatistics = computed(() => statistics.value?.summary || emptyStatistics)
const teamStatistics = computed(() => statistics.value?.summary || emptyStatistics)
const summary = computed(() => {
  if (scope.value === 'WORKBENCH_TEAM') {
    if (!workbenchTeamId.value) return teamSelectionHint.value
    const count = statistics.value?.coverage.memberCount || selectedTeam.value?.memberCount || 0
    return `总计工时 ${formatHours(monthTotal.value)}h · ${count} 人 · 加班天数 ${teamStatistics.value.overtimeDays}天 · 加班工时 ${formatHours(teamStatistics.value.overtimeHours)}h · 平均工时 ${formatAverageHours(teamStatistics.value.averageHours)}h`
  }
  return `总计工时 ${formatHours(monthTotal.value)}h · 加班天数 ${personalStatistics.value.overtimeDays}天 · 加班工时 ${formatHours(personalStatistics.value.overtimeHours)}h · 平均工时 ${formatAverageHours(personalStatistics.value.averageHours)}h`
})
const scopeLabel = computed(() => scope.value === 'SELF' ? '我的工时' : selectedTeam.value?.name || '团队工时')
const syncTimeLabel = computed(() => {
  if (statisticsLoading.value || entriesLoading.value) return '同步中'
  if (!statistics.value?.syncedAt && !entries.value?.syncedAt) return '尚未同步'
  const syncedAt = statistics.value?.syncedAt || entries.value?.syncedAt || ''
  return `同步时间：${formatSyncTime(syncedAt)}`
})

const loadOptions = async () => {
  optionsLoading.value = true
  optionsError.value = ''
  try {
    options.value = await getZhaogangWorklogOptions()
    if (workbenchTeamId.value && !options.value.teams.some(team => team.id === workbenchTeamId.value)) {
      workbenchTeamId.value = null
      statistics.value = null
      statisticsKey.value = ''
      entries.value = null
      entriesKey.value = ''
    }
    if (scope.value === 'WORKBENCH_TEAM' && !workbenchTeamId.value && options.value.teams.length) {
      workbenchTeamId.value = options.value.teams[0].id
    }
  } catch (error) {
    optionsError.value = error instanceof Error ? error.message : '工作台团队加载失败，我的工时仍可使用'
  } finally {
    optionsLoading.value = false
  }
}

const loadStatistics = async (refresh = false) => {
  if (scope.value === 'WORKBENCH_TEAM' && !workbenchTeamId.value) return
  const key = `${month.value}:${scope.value}:${workbenchTeamId.value || ''}`
  if (statisticsKey.value !== key) statistics.value = null
  const sequence = ++statisticsRequestSequence
  statisticsLoading.value = true
  statisticsError.value = ''
  try {
    const result = await getZhaogangWorklogStatistics(month.value, scope.value, workbenchTeamId.value, refresh)
    if (sequence !== statisticsRequestSequence) return
    statistics.value = result
    statisticsKey.value = key
  } catch (error) {
    if (sequence !== statisticsRequestSequence) return
    statisticsError.value = error instanceof Error ? error.message : '月度工时统计加载失败，请稍后重试'
  } finally {
    if (sequence === statisticsRequestSequence) statisticsLoading.value = false
  }
}

const loadEntries = async (refresh = false) => {
  if (scope.value === 'WORKBENCH_TEAM' && !workbenchTeamId.value) return
  const [from, to] = entryRange.value
  if (!from || !to) return
  const key = `${from}:${to}:${scope.value}:${workbenchTeamId.value || ''}`
  if (entriesKey.value !== key) entries.value = null
  const sequence = ++entriesRequestSequence
  entriesLoading.value = true
  entriesError.value = ''
  try {
    const result = await getZhaogangWorklogEntries(from, to, scope.value, workbenchTeamId.value, refresh)
    if (sequence !== entriesRequestSequence) return
    entries.value = result
    entriesKey.value = key
  } catch (error) {
    if (sequence !== entriesRequestSequence) return
    entriesError.value = error instanceof Error ? error.message : '工时登记加载失败，请稍后重试'
  } finally {
    if (sequence === entriesRequestSequence) entriesLoading.value = false
  }
}

const loadBoth = async (refresh = false) => {
  await Promise.all([loadStatistics(refresh), loadEntries(refresh)])
}

const openAbsenceDialog = async () => {
  if ((scope.value === 'WORKBENCH_TEAM' && !workbenchTeamId.value) || absenceLoading.value) return
  absenceDialogVisible.value = true
  absenceLoading.value = true
  absenceError.value = ''
  absenceReport.value = null
  const sequence = ++absenceRequestSequence
  try {
    const result = await getZhaogangWorklogAbsences(month.value, scope.value, workbenchTeamId.value)
    if (sequence !== absenceRequestSequence) return
    absenceReport.value = result
  } catch (error) {
    if (sequence !== absenceRequestSequence) return
    absenceError.value = error instanceof Error ? error.message : '缺勤统计加载失败，请稍后重试'
  } finally {
    if (sequence === absenceRequestSequence) absenceLoading.value = false
  }
}

const resetAbsence = () => {
  absenceRequestSequence += 1
  absenceDialogVisible.value = false
  absenceLoading.value = false
  absenceError.value = ''
  absenceReport.value = null
}

const refreshDashboard = async () => {
  await loadOptions()
  await loadBoth(true)
}

const changeScope = (value: string | number | boolean | undefined) => {
  resetAbsence()
  if (value === 'WORKBENCH_TEAM') {
    workbenchTeamId.value = options.value?.teams[0]?.id || null
    statistics.value = null
    statisticsKey.value = ''
    entries.value = null
    entriesKey.value = ''
    statisticsError.value = ''
    entriesError.value = ''
    if (workbenchTeamId.value) void loadBoth()
    return
  }
  presentationMode.value = 'TREND'
  workbenchTeamId.value = null
  statistics.value = null
  statisticsKey.value = ''
  entries.value = null
  entriesKey.value = ''
  void loadBoth()
}

const togglePresentation = () => {
  presentationMode.value = presentationMode.value === 'RANKING' ? 'TREND' : 'RANKING'
}

const changeTeam = () => {
  resetAbsence()
  statistics.value = null
  statisticsKey.value = ''
  entries.value = null
  entriesKey.value = ''
  statisticsError.value = ''
  entriesError.value = ''
  if (workbenchTeamId.value) void loadBoth()
}

const shiftMonth = (offset: number) => {
  if (statisticsLoading.value) return
  resetAbsence()
  const [year, value] = month.value.split('-').map(Number)
  const next = new Date(year, value - 1 + offset, 1)
  month.value = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  void loadStatistics()
}

const setEntryShortcut = (shortcut: 'week' | 'month') => {
  if (entriesLoading.value) return
  const today = new Date()
  if (shortcut === 'week') {
    const from = mondayOfCurrentWeek()
    entryRange.value = [from, addDays(from, 6)]
  } else {
    const from = dateText(new Date(today.getFullYear(), today.getMonth(), 1))
    const to = dateText(new Date(today.getFullYear(), today.getMonth() + 1, 0))
    entryRange.value = [from, to]
  }
  entryRangeStart.value = null
  entryShortcut.value = shortcut
  void loadEntries()
}

const changeEntryCalendar = (dates: [Date, Date] | [Date, null] | null) => {
  entryRangeStart.value = dates?.[0] ? dateText(dates[0]) : null
}

const changeEntryRange = (value: string[] | null) => {
  if (entriesLoading.value) return
  entryRangeStart.value = null
  if (!value || value.length !== 2) return
  const [from, to] = value
  if (!from || !to) return
  entryRange.value = [from, to]
  const weekFrom = mondayOfCurrentWeek()
  const weekTo = addDays(weekFrom, 6)
  const today = new Date()
  const monthFrom = dateText(new Date(today.getFullYear(), today.getMonth(), 1))
  const monthTo = dateText(new Date(today.getFullYear(), today.getMonth() + 1, 0))
  entryShortcut.value = from === weekFrom && to === weekTo ? 'week'
    : from === monthFrom && to === monthTo ? 'month' : null
  void loadEntries()
}

const disableEntryDate = (date: Date) => {
  const start = entryRangeStart.value || entryRange.value?.[0]
  if (!start) return false
  const difference = Math.abs(Math.round((date.getTime() - parseDate(start).getTime()) / 86400000))
  return difference > 30
}

const formatHours = (hours: number) => Number(hours || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
function parseDate(value: string) {
  return new Date(`${value}T00:00:00`)
}
const formatAverageHours = (hours: number) => Number(hours || 0).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
function dateText(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function addDays(value: string, days: number) {
  const date = parseDate(value)
  date.setDate(date.getDate() + days)
  return dateText(date)
}
function mondayOfCurrentWeek() {
  const date = new Date()
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return dateText(date)
}
const formatSyncTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date)
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || ''
  return `${valueOf('year')}-${valueOf('month')}-${valueOf('day')} ${valueOf('hour')}:${valueOf('minute')}:${valueOf('second')}`
}

onMounted(async () => {
  await loadOptions()
  await loadBoth()
})
</script>

<style scoped>
.worklog-dashboard { display: grid; gap: 14px; }
.trend-header, .scope-controls, .month-controls, .week-header { display: flex; align-items: center; }
.trend-card, .week-card { border-color: #e4e9f1; border-radius: 8px; }
.trend-header { justify-content: space-between; gap: 18px; }
.trend-title h3, .week-header h3 { margin: 0; color: #26344a; font-size: 17px; }
.trend-title p { margin: 6px 0 0; color: #6f7d92; font-size: 13px; }
.scope-controls { justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.sync-time { color: #7b879a; font-size: 12px; white-space: nowrap; }
.team-select { flex: 0 0 auto; }
.month-controls { justify-content: center; gap: 14px; margin-bottom: 12px; }
.month-controls strong { min-width: 120px; color: #35445b; text-align: center; }
.selection-placeholder { display: grid; min-height: 260px; place-items: center; color: #8a96a9; }
.view-error, .coverage-alert { margin-bottom: 12px; }
.week-header { justify-content: space-between; gap: 16px; }
.entry-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.entry-controls > span { color: #356ec8; font-size: 13px; font-weight: 600; white-space: nowrap; }
.entry-controls .el-date-editor--daterange {
  --el-date-editor-daterange-width: 220px;
  --el-date-editor-width: 220px;
  width: 220px;
}
@media (max-width: 760px) {
  .trend-header, .week-header { align-items: flex-start; flex-direction: column; }
  .scope-controls { width: 100%; justify-content: flex-start; }
  .team-select { width: 100% !important; }
  .entry-controls { width: 100%; justify-content: flex-start; }
  .entry-controls .el-date-editor--daterange {
    --el-date-editor-daterange-width: 100%;
    --el-date-editor-width: 100%;
    width: 100%;
  }
}
</style>
