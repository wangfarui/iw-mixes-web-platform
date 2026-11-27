<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { Aim, DataAnalysis, InfoFilled, Refresh, Search, Timer, User, UserFilled, WarningFilled } from '@element-plus/icons-vue'
import { getStatisticsReport } from '@/api/zhaogangStatistics'
import { codingRoleLabels } from '@/services/zhaogangPreferences'
import type { ZhaogangSessionStatus } from '@/types/zhaogang'
import type {
  CodeMetric, StatisticsMember, StatisticsMetric, StatisticsRangeKind, StatisticsReport, StatisticsRole, WorklogMetric
} from '@/types/zhaogangStatistics'
import StatisticsRankingPanel from './StatisticsRankingPanel.vue'
import {
  formatDelta, formatIndicator, formatMetric, formatTime, metricLabels, sampleText, tableMetrics, worklogMetrics
} from './statisticsPresentation'

type Period = Exclude<StatisticsRangeKind, 'THIS_QUARTER'>

const periods: { kind: Period; label: string }[] = [
  { kind: 'THIS_WEEK', label: '本周' }, { kind: 'LAST_WEEK', label: '上周' },
  { kind: 'THIS_MONTH', label: '本月' }, { kind: 'LAST_MONTH', label: '上月' },
  { kind: 'CUSTOM', label: '自定义' }
]
const codeRankingMetrics = ['CHANGED_LINES', 'COMMIT_COUNT', 'ADDITIONS', 'DELETIONS'] as const
const session = inject<Ref<ZhaogangSessionStatus | null>>('zhaogangSession')
const report = ref<StatisticsReport | null>(null)
const rangeKind = ref<Period>('THIS_MONTH')
const customRange = ref<[string, string] | null>(null)
const datePicker = ref<{ handleOpen: () => void } | null>(null)
const worklogMetric = ref<WorklogMetric>('UTILIZATION_RATE')
const codeMetric = ref<CodeMetric>(codeRankingMetrics[0])
const sortMetric = ref<StatisticsMetric>('UTILIZATION_RATE')
const sortOrder = ref<'ASC' | 'DESC'>('DESC')
const keyword = ref('')
const role = ref<StatisticsRole | ''>('')
const page = ref(1)
const pageSize = 10
const table = ref<HTMLElement | null>(null)
const pending = ref(false)
const error = ref('')
const notice = ref('')
let request: AbortController | undefined
let pollTimer: number | undefined
let searchTimer: number | undefined
let midnightTimer: number | undefined
let pollAttempts = 0
let lastDay = shanghaiDate()
const isUpdating = computed(() => ['INITIALIZING', 'QUEUED', 'RUNNING'].includes(report.value?.refresh.state || ''))
const codeRankingNotice = computed(() =>
  report.value?.summary?.commitCount.reasonCodes.includes('CODE_REPOSITORY_PARTIAL')
    ? '部分仓库同步失败，代码榜按已同步数据统计。' : undefined)
const comparisonText = computed(() => report.value?.comparisonRange
  ? `上期 ${report.value.comparisonRange.from} 至 ${report.value.comparisonRange.to}` : '上期不可比')
const rangeError = computed(() => {
  if (rangeKind.value !== 'CUSTOM' || !customRange.value) return ''
  const [from, to] = customRange.value
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1
  return days < 1 || days > 366 || to >= shanghaiDate() ? '请选择截至昨天、最多 366 天的统计区间' : ''
})

function shanghaiDate() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function defaultCustomRange(period: Exclude<Period, 'CUSTOM'>): [string, string] | null {
  const current = report.value?.range
  if (current) return current.from <= current.to ? [current.from, current.to] : null

  const today = new Date(shanghaiDate())
  const dayAt = (offset: number) => new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10)
  const monthAt = (offset: number, day: number) =>
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, day)).toISOString().slice(0, 10)
  const monday = 1 - (today.getUTCDay() || 7)
  const ranges: Record<Exclude<Period, 'CUSTOM'>, [string, string]> = {
    THIS_WEEK: [dayAt(monday), dayAt(-1)],
    LAST_WEEK: [dayAt(monday - 7), dayAt(monday - 1)],
    THIS_MONTH: [monthAt(0, 1), dayAt(-1)],
    LAST_MONTH: [monthAt(-1, 1), monthAt(0, 0)]
  }
  const range = ranges[period]
  return range[0] <= range[1] ? range : null
}
const roleLabel = (value: StatisticsRole | null) => value === 'UNSET' || !value ? '未设置' : codingRoleLabels[value]
const statusIssues = (member: StatisticsMember) => member.issues.filter(issue => issue.reasonCode !== 'CODE_NOT_APPLICABLE')
const abnormal = (member: StatisticsMember) => statusIssues(member).some(issue => issue.reasonCode !== 'NO_WORKDAYS')
const issueMessages = (member: StatisticsMember) => Array.from(new Set(statusIssues(member).map(issue => issue.safeMessage))).join('；')

function stopPolling() {
  window.clearTimeout(pollTimer)
}

function schedulePolling() {
  stopPolling()
  if (isUpdating.value && document.visibilityState === 'visible' && pollAttempts < 30) {
    pollTimer = window.setTimeout(() => {
      pollAttempts++
      void load()
    }, 3500)
  }
}

async function load(refresh = false) {
  stopPolling()
  request?.abort()
  if (!session?.value || rangeError.value || (rangeKind.value === 'CUSTOM' && !customRange.value)) return
  const current = new AbortController()
  request = current
  error.value = ''
  pending.value = true
  try {
    const response = await getStatisticsReport({
      rangeKind: rangeKind.value, from: customRange.value?.[0], to: customRange.value?.[1],
      worklogMetric: worklogMetric.value, codeMetric: codeMetric.value, sortMetric: sortMetric.value,
      sortOrder: sortOrder.value, keyword: keyword.value.trim(), role: role.value || undefined,
      pageNumber: page.value, pageSize, snapshotId: report.value?.snapshotId || undefined,
      refresh: refresh || undefined
    }, current.signal)
    if (current.signal.aborted || request !== current) return
    report.value = response
    if (response.members) page.value = response.members.page.pageNumber
  } catch (failure) {
    if (current.signal.aborted || request !== current) return
    report.value = null
    error.value = failure instanceof Error ? failure.message : '读取统计失败'
  } finally {
    if (request === current) {
      pending.value = false
      schedulePolling()
    }
  }
}

async function choosePeriod(kind: Period) {
  const previous = rangeKind.value
  if (previous === kind) {
    if (kind === 'CUSTOM') datePicker.value?.handleOpen()
    return
  }
  customRange.value = kind === 'CUSTOM' && previous !== 'CUSTOM' ? defaultCustomRange(previous) : null
  rangeKind.value = kind
  resetRange(kind === 'CUSTOM' && !!customRange.value)
  if (kind === 'CUSTOM') {
    await nextTick()
    datePicker.value?.handleOpen()
  }
}

function chooseDates(value: [string, string] | null) {
  if (!value) return
  rangeKind.value = 'CUSTOM'
  customRange.value = value
  resetRange()
}

function resetRange(keepReport = false) {
  request?.abort()
  window.clearTimeout(searchTimer)
  page.value = 1
  pollAttempts = 0
  if (!keepReport) report.value = null
  notice.value = ''
  error.value = ''
  pending.value = false
  void load()
}

function selectWorklog(metric: StatisticsMetric) {
  worklogMetric.value = metric as WorklogMetric
  void load()
}

function selectCode(metric: StatisticsMetric) {
  codeMetric.value = metric as CodeMetric
  void load()
}

function sort(metric: StatisticsMetric) {
  sortOrder.value = sortMetric.value === metric && sortOrder.value === 'DESC' ? 'ASC' : 'DESC'
  sortMetric.value = metric
  filter()
}

function filter() {
  window.clearTimeout(searchTimer)
  page.value = 1
  notice.value = ''
  void load()
}

function search() {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(filter, 220)
}

function changePage(value: number) {
  page.value = value
  void load()
}

async function locateSelf() {
  notice.value = ''
  if (report.value?.members?.page.myPage == null && (keyword.value || role.value)) {
    keyword.value = ''
    role.value = ''
    window.clearTimeout(searchTimer)
    page.value = 1
    await load()
  }
  const myPage = report.value?.members?.page.myPage
  if (myPage == null) {
    notice.value = '你未纳入本期统计'
    return
  }
  if (page.value !== myPage) {
    page.value = myPage
    await load()
  }
  await nextTick()
  table.value?.querySelector('tr.statistics-self')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function refresh() {
  pollAttempts = 0
  void load(true)
}

function onVisibility() {
  if (document.visibilityState !== 'visible') {
    stopPolling()
    return
  }
  const today = shanghaiDate()
  if (today !== lastDay) {
    lastDay = today
    if (rangeKind.value !== 'CUSTOM') resetRange()
    else void load()
  } else if (isUpdating.value) {
    pollAttempts = 0
    schedulePolling()
  } else if (report.value && !pending.value) {
    // Revalidate visibility on returning to a tab that may have been open during a policy change.
    void load()
  }
}

watch(() => session?.value, () => {
  keyword.value = ''
  role.value = ''
  resetRange()
}, { immediate: true })
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  midnightTimer = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    if (lastDay !== shanghaiDate()) onVisibility()
    else if (!pending.value && !isUpdating.value && !error.value) void load()
  }, 15_000)
})
onBeforeUnmount(() => {
  request?.abort()
  request = undefined
  stopPolling()
  window.clearTimeout(searchTimer)
  window.clearInterval(midnightTimer)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <main class="statistics-view" aria-labelledby="statistics-title">
    <header class="statistics-header">
      <div>
        <h1 id="statistics-title">全员统计</h1>
        <div class="statistics-status">
          <span><el-icon><InfoFilled /></el-icon>统计截至昨天</span>
          <span>工时更新 {{ formatTime(report?.dataStatus?.worklogSyncedAt) }}</span>
          <span>代码更新 {{ formatTime(report?.dataStatus?.codeSyncedAt) }}</span>
          <span v-if="report?.dataStatus?.affectedMemberCount" class="statistics-warning">
            <el-icon><WarningFilled /></el-icon>{{ report.dataStatus.affectedMemberCount }} 人数据异常
          </span>
        </div>
      </div>
      <div class="period-controls">
        <div class="stats-segments" role="group" aria-label="统计范围">
          <button v-for="period in periods" :key="period.kind" type="button"
            :aria-pressed="rangeKind === period.kind" @click="choosePeriod(period.kind)">{{ period.label }}</button>
        </div>
        <div class="date-controls">
          <el-date-picker v-if="rangeKind === 'CUSTOM'" ref="datePicker" class="statistics-datepicker"
            :model-value="customRange" type="daterange" value-format="YYYY-MM-DD" range-separator="—"
            start-placeholder="开始日期" end-placeholder="结束日期" :clearable="false"
            popper-class="statistics-date-popup" unlink-panels
            :disabled-date="(date: Date) => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') >= shanghaiDate()"
            @update:model-value="chooseDates" />
          <el-button :icon="Refresh" :disabled="isUpdating || pending || !!rangeError || (rangeKind === 'CUSTOM' && !customRange)" @click="refresh">刷新</el-button>
        </div>
      </div>
    </header>

    <div v-if="rangeError || error" class="statistics-message statistics-card" role="alert">
      <strong>{{ rangeError || error }}</strong>
      <el-button v-if="!rangeError" :icon="Refresh" @click="refresh">重试</el-button>
    </div>
    <div v-else-if="!report?.hasData" class="statistics-message statistics-card" role="status">
      <strong v-if="rangeKind === 'CUSTOM' && !customRange">请选择统计开始和结束日期</strong>
      <template v-else-if="report?.refresh.state === 'FAILED'">
        <strong>{{ report.refresh.safeMessage || '统计更新失败' }}</strong>
        <el-button :icon="Refresh" @click="refresh">重试</el-button>
      </template>
      <template v-else>
        <strong>统计准备中</strong>
        <span>后台正在生成所选区间的报表。</span>
        <el-button v-if="pollAttempts >= 30" :icon="Refresh" @click="refresh">查看进度</el-button>
      </template>
    </div>

    <template v-else-if="report.summary && report.population && report.worklogRanking && report.codeRanking && report.members">
      <div v-if="report.refresh.stale || report.refresh.state === 'FAILED'" class="refresh-status" role="status">
        <span v-if="report.refresh.state === 'FAILED'">{{ report.refresh.safeMessage || '统计更新失败' }} · 保留上次报表</span>
        <span v-else-if="isUpdating">统计更新中 · 正在显示上次报表</span>
        <span v-else>正在显示上次报表</span>
        <span>生成于 {{ formatTime(report.refresh.generatedAt) }}</span>
        <el-button v-if="report.refresh.state === 'FAILED' || pollAttempts >= 30" link type="primary" @click="refresh">重试</el-button>
      </div>
      <section class="statistics-summary" aria-label="统计概览">
        <article class="statistics-card kpi">
          <span class="kpi-icon"><el-icon><User /></el-icon></span>
          <div><h2>参与统计人数</h2>
            <div class="kpi-value">{{ report.population.participating }} <small>人</small></div>
            <div class="kpi-sub">全部成员 {{ report.population.total }} · 排除 {{ report.population.excluded }}</div>
          </div>
        </article>
        <article class="statistics-card kpi">
          <span class="kpi-icon"><el-icon><Timer /></el-icon></span>
          <div><h2>工时情况</h2>
            <el-tooltip :content="'总工时 ÷ 应出勤人日 · ' + sampleText(report.summary.dailyHours)" placement="top">
              <div class="kpi-value" tabindex="0" :class="{ 'partial-sample': report.summary.dailyHours.status === 'PARTIAL' }">
                {{ formatIndicator(report.summary.dailyHours, 2) }} <small>h</small> <span>人均日工时</span>
              </div>
            </el-tooltip>
          </div>
        </article>
        <article class="statistics-card kpi">
          <span class="kpi-icon"><el-icon><DataAnalysis /></el-icon></span>
          <div><h2>加班情况</h2>
            <div class="paired-kpi">
              <el-tooltip :content="sampleText(report.summary.overtimeDays)" placement="top">
                <div tabindex="0"><div class="kpi-sub">人均加班天数</div>
                  <div class="kpi-number" :class="{ 'partial-sample': report.summary.overtimeDays.status === 'PARTIAL' }">
                    {{ formatIndicator(report.summary.overtimeDays, 1) }} <small>天</small>
                  </div>
                </div>
              </el-tooltip>
              <el-tooltip :content="sampleText(report.summary.overtimeHours)" placement="top">
                <div tabindex="0"><div class="kpi-sub">人均加班时长</div>
                  <div class="kpi-number" :class="{ 'partial-sample': report.summary.overtimeHours.status === 'PARTIAL' }">
                    {{ formatIndicator(report.summary.overtimeHours) }} <small>h</small>
                  </div>
                </div>
              </el-tooltip>
            </div>
          </div>
        </article>
        <article class="statistics-card kpi">
          <span class="kpi-icon"><el-icon><UserFilled /></el-icon></span>
          <div><h2>代码情况</h2>
            <div class="paired-kpi">
              <el-tooltip :content="sampleText(report.summary.commitCount)" placement="top">
                <div tabindex="0"><div class="kpi-sub">人均提交次数</div>
                  <div class="kpi-number" :class="{ 'partial-sample': report.summary.commitCount.status === 'PARTIAL' }">
                    {{ formatIndicator(report.summary.commitCount, 2) }} <small>次</small>
                  </div>
                </div>
              </el-tooltip>
              <el-tooltip :content="'新增行数 + 删除行数 · ' + sampleText(report.summary.changedLines)" placement="top">
                <div tabindex="0"><div class="kpi-sub">人均提交行数</div>
                  <div class="kpi-number" :class="{ 'partial-sample': report.summary.changedLines.status === 'PARTIAL' }">
                    {{ formatIndicator(report.summary.changedLines) }} <small>行</small>
                  </div>
                </div>
              </el-tooltip>
            </div>
          </div>
        </article>
      </section>

      <div class="statistics-rankings">
        <StatisticsRankingPanel title="工时榜" color="blue" :metrics="worklogMetrics" :metric="worklogMetric"
          :ranking="report.worklogRanking" @select="selectWorklog" />
        <StatisticsRankingPanel title="代码榜" color="teal" :metrics="codeRankingMetrics" :metric="codeMetric"
          :ranking="report.codeRanking" :notice="codeRankingNotice" @select="selectCode" />
      </div>

      <section class="statistics-card statistics-details" aria-labelledby="statistics-details-title">
        <header>
          <div class="details-heading"><h2 id="statistics-details-title">成员排行明细</h2>
            <span>当前按{{ metricLabels[sortMetric] }}排序</span>
          </div>
          <div class="details-filters">
            <el-input v-model="keyword" :prefix-icon="Search" maxlength="80" clearable aria-label="搜索成员"
              placeholder="搜索成员" @input="search" @clear="filter" />
            <el-select v-model="role" aria-label="按角色筛选" placeholder="全部角色" @change="filter">
              <el-option label="全部角色" value="" />
              <el-option v-for="option in report.members.roles" :key="option" :label="roleLabel(option)" :value="option" />
            </el-select>
            <el-button :icon="Aim" @click="locateSelf">定位我</el-button>
          </div>
        </header>
        <div v-if="notice" class="table-notice" role="status">{{ notice }}</div>
        <div ref="table" class="table-scroll" tabindex="0" aria-label="成员排行表格">
          <table>
            <thead>
              <tr>
                <th scope="col">名次</th><th scope="col">成员</th><th scope="col">角色</th>
                <th v-for="metric in tableMetrics" :key="metric" scope="col"
                  :aria-sort="sortMetric === metric ? (sortOrder === 'ASC' ? 'ascending' : 'descending') : undefined">
                  <button type="button" @click="sort(metric)">{{ metricLabels[metric] }}
                    <span v-if="sortMetric === metric" class="sort-icon" aria-hidden="true">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
                  </button>
                </th>
                <th scope="col" :title="comparisonText">较上期</th><th scope="col">数据状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in report.members.items" :key="member.userId" :class="{ 'statistics-self': member.self }">
                <td><span class="statistics-rank" :class="member.rank && member.rank <= 3 && member.values[sortMetric] ? 'rank-' + member.rank : ''">{{ member.rank ?? '—' }}</span></td>
                <td>
                  <span class="table-member" :title="member.name">
                    <el-avatar :src="member.avatar || undefined" :size="22">{{ Array.from(member.name)[0] }}</el-avatar>
                    <strong>{{ member.name }}</strong><span v-if="member.self" class="statistics-me">我</span>
                  </span>
                </td>
                <td>{{ roleLabel(member.role) }}</td>
                <td v-for="metric in tableMetrics" :key="metric">{{ formatMetric(metric, member.values[metric]) }}</td>
                <td :title="member.comparisonReason || comparisonText"
                  :class="{ up: (member.rankDelta ?? 0) > 0, down: (member.rankDelta ?? 0) < 0 }">{{ formatDelta(member.rankDelta) }}</td>
                <td>
                  <el-tooltip v-if="statusIssues(member).length" :content="issueMessages(member)" placement="top">
                    <span tabindex="0" :class="abnormal(member) ? 'statistics-warning' : 'statistics-muted'">
                      <el-icon v-if="abnormal(member)"><WarningFilled /></el-icon>{{ abnormal(member) ? '异常' : '部分不适用' }}
                    </span>
                  </el-tooltip>
                  <span v-else class="table-complete"><i />完整</span>
                </td>
              </tr>
              <tr v-if="!report.members.items.length"><td class="table-empty" colspan="13">没有匹配的成员</td></tr>
            </tbody>
          </table>
        </div>
        <footer><span>共 {{ report.members.page.total }} 人</span>
          <el-pagination small background layout="prev, pager, next" :pager-count="5" :current-page="page"
            :page-size="pageSize" :total="report.members.page.total" @current-change="changePage" />
        </footer>
      </section>
    </template>
    <footer v-if="report?.hasData" class="report-time">
      <span>成员去重后参与排名，工时与代码分别排名。</span>
      <span v-if="report.refresh.generatedAt && !report.refresh.stale">报表生成于 {{ formatTime(report.refresh.generatedAt) }}</span>
    </footer>
  </main>
</template>

<style>
.statistics-view { --stats-ink: #17233a; --stats-muted: #58657b; --stats-line: #dce6f5; color: var(--stats-ink); }
.statistics-view .statistics-card { background: rgba(255, 255, 255, .93); border: 1px solid var(--stats-line); border-radius: 8px; }
.statistics-view .stats-segments { display: flex; flex-wrap: wrap; border: 1px solid #cedcf3; border-radius: 5px; background: #f9fbff; overflow: hidden; }
.statistics-view .stats-segments button { background: transparent; color: var(--stats-ink); border: 0; padding: 5px 10px; line-height: 18px; cursor: pointer; white-space: nowrap; font: inherit; font-size: 12px; font-weight: 600; }
.statistics-view .stats-segments button + button { border-left: 1px solid #d9e4f5; }
.statistics-view .stats-segments button[aria-pressed="true"] { background: #0760f7; color: white; }
.statistics-view button:focus-visible { outline: 2px solid #174cba; outline-offset: -2px; }
.statistics-view .statistics-self { background: linear-gradient(100deg, #eaf3ff, #dce9fc); }
.statistics-view .statistics-rank { display: inline-grid; place-items: center; width: 20px; height: 19px; border-radius: 5px; font-weight: 600; font-size: 12px; color: #243147; }
.statistics-view .rank-1 { background: #ffdf8c; color: #754406; }
.statistics-view .rank-2 { background: #e1e5ef; }
.statistics-view .rank-3 { background: #ffdbc0; color: #803e19; }
.statistics-view .statistics-me { background: #eef5ff; border: 1px solid #93b7fb; border-radius: 5px; padding: 0 3px; font-size: 10px; line-height: 13px; color: #0056dd; font-weight: 600; }
.statistics-view .up { color: #167c3b; font-weight: 600; }
.statistics-view .down { color: #bd3541; font-weight: 600; }
@media (max-width: 700px) {
  .statistics-date-popup .el-date-range-picker { width: min(315px, calc(100vw - 24px)); }
  .statistics-date-popup .el-date-range-picker__content.is-left { width: 100%; border-right: 0; }
  .statistics-date-popup .el-date-range-picker__content.is-right { display: none; }
}
</style>

<style scoped>
.statistics-view { min-width: 0; min-height: 100%; padding: 16px; background: radial-gradient(ellipse at 85% 4%, #e6effd 0%, #f2f6fd 55%, #edf4ff 100%); font-variant-numeric: tabular-nums; }
.statistics-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin: 0 3px 12px; }
h1 { font-size: 26px; line-height: 1.2; margin: 0 0 11px; font-weight: 730; letter-spacing: -.3px; }
h2 { font-size: 15px; margin: 0 0 5px; line-height: 1.35; }
.statistics-status { display: flex; flex-wrap: wrap; color: var(--stats-muted); font-size: 12px; align-items: center; gap: 6px 0; }
.statistics-status > span { display: inline-flex; align-items: center; gap: 4px; line-height: 14px; padding: 0 10px; }
.statistics-status > span:first-child { padding-left: 0; }
.statistics-status > span + span { border-left: 1px solid #cad8ee; }
.statistics-warning { color: #a95b08; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
.period-controls { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.period-controls .stats-segments { flex-wrap: nowrap; }
.period-controls .stats-segments button { min-width: 51px; padding: 6px 12px; }
.date-controls { display: flex; align-items: center; justify-content: flex-end; position: relative; gap: 8px; }
.statistics-datepicker { max-width: min(290px, 59vw); }
.statistics-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 11px; margin-bottom: 11px; }
.kpi { display: flex; align-items: flex-start; gap: 11px; padding: 12px; }
.kpi-icon { flex: 0 0 38px; height: 38px; display: grid; place-items: center; border-radius: 50%; background: #e9f2ff; color: #065df2; font-size: 23px; }
.kpi-value { font-size: 27px; font-weight: 700; line-height: 1.15; white-space: nowrap; margin: 7px 0 4px; letter-spacing: -.4px; }
.kpi-value small, .kpi-number small { font-size: 14px; font-weight: 600; }
.kpi-value span { font-size: 12px; color: var(--stats-muted); font-weight: 500; letter-spacing: 0; }
.kpi-sub { color: var(--stats-muted); font-size: 12px; white-space: nowrap; }
.kpi-number { font-size: 21px; font-weight: 700; white-space: nowrap; }
.paired-kpi { display: grid; grid-template-columns: auto auto; gap: 10px; }
.paired-kpi > div + div { border-left: 1px solid #dce5f4; padding-left: 10px; }
.partial-sample { text-decoration: underline dotted #b77017; text-underline-offset: 4px; }
.statistics-rankings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; margin-bottom: 13px; }
.statistics-details { padding: 10px 7px 5px; }
.statistics-details header, .statistics-details footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 7px; padding: 0 7px 8px; }
.details-heading, .details-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }
.details-heading span, .statistics-details footer, .report-time, .table-notice, .statistics-muted { font-size: 12px; color: var(--stats-muted); }
.details-heading h2 { margin: 0; font-size: 17px; }
.details-filters :deep(.el-input) { width: 165px; }
.details-filters :deep(.el-select) { width: 115px; }
.table-scroll { overflow: auto; }
table { width: 100%; min-width: 960px; border-collapse: collapse; font-size: 12px; line-height: 1.25; }
th, td { white-space: nowrap; padding: 5px 6px; text-align: right; border-bottom: 1px solid #e8edf6; }
th { background: #eaf0f9; font-weight: 650; }
th:first-child, td:first-child, th:last-child, td:last-child { text-align: center; }
th:nth-child(2), th:nth-child(3), td:nth-child(2), td:nth-child(3) { text-align: left; }
th button { appearance: none; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; padding: 2px 0; }
.sort-icon { color: #095de9; }
.table-member { display: flex; align-items: center; gap: 6px; max-width: 154px; }
.table-member strong { overflow: hidden; text-overflow: ellipsis; }
.table-member :deep(.el-avatar) { flex: none; background: #5891f2; font-size: 11px; }
.table-empty { padding: 24px 0; color: var(--stats-muted); }
.table-complete { display: inline-flex; align-items: center; gap: 5px; }
.table-complete i { width: 7px; height: 7px; border-radius: 50%; background: #139d49; }
.table-notice { padding: 0 7px 7px; }
.statistics-details footer { padding: 8px 7px 2px; }
.statistics-message { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 11px; padding: 24px; min-height: 212px; color: var(--stats-muted); text-align: center; }
.statistics-message strong { color: var(--stats-ink); }
.refresh-status { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; color: #83551e; background: #fff8e7; border: 1px solid #efdfb7; border-radius: 7px; padding: 6px 10px; margin-bottom: 10px; font-size: 12px; }
.report-time { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; margin: 10px 3px 0; }
@media (max-width: 1300px) { .kpi-icon { flex-basis: 31px; height: 31px; font-size: 19px; } .kpi { gap: 7px; padding: 10px; } }
@media (max-width: 1080px) { .statistics-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 850px) { .statistics-rankings { grid-template-columns: minmax(0, 1fr); } .period-controls { justify-content: flex-start; margin-left: 0; } }
@media (max-width: 560px) {
  .statistics-view { padding: 10px; }
  .statistics-summary { grid-template-columns: minmax(0, 1fr); }
  .period-controls .stats-segments button { min-width: 0; padding: 5px 7px; }
}
</style>
