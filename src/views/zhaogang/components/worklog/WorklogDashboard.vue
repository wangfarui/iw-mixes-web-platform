<template>
  <section class="worklog-dashboard">
    <el-alert v-if="optionsError" type="warning" :closable="false" show-icon :title="optionsError" />

    <el-card class="trend-card" shadow="never">
      <template #header>
        <div class="trend-header">
          <div class="trend-title">
            <h3>{{ trendMember ? `${trendMember.name} · 工时统计` : '工时统计' }}</h3>
            <p v-if="summary">{{ summary }}</p>
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
              {{ presentationMode === 'RANKING' ? '工时趋势' : '谁是卷王' }}
            </el-button>
            <el-select
              v-if="scope === 'WORKBENCH_TEAM'"
              v-model="workbenchTeamId"
              class="team-select"
              :style="{ width: teamSelectWidth }"
              filterable
              clearable
              :loading="optionsLoading"
              placeholder="选择 Dev Hub 团队"
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
                :loading="syncBusy || statisticsLoading || entriesLoading || optionsLoading"
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

      <el-alert
        v-if="entryRangeTooLong"
        class="view-error"
        type="warning"
        :closable="false"
        show-icon
        title="工时统计范围不能超过一个月（31 天）"
        :description="report ? `当前显示上次查询结果（${reportRangeLabel}）` : undefined"
      />

      <el-alert v-if="statisticsError" class="view-error" type="error" :closable="false" show-icon :title="statisticsError" />
      <el-alert
        v-if="trendMember && memberStatisticsIssue"
        class="view-error"
        type="warning"
        :closable="false"
        show-icon
        :title="`${trendMember.name}的工时未完整取得`"
        :description="memberStatisticsIssue.reason"
      />
      <WorklogCoverageNotice
        v-if="statistics && presentationMode === 'TREND' && !trendMember"
        :coverage="statistics.coverage"
        :title="statisticsCoverageMessage"
      />
      <el-skeleton v-if="statisticsLoading && !statistics" :rows="6" animated />
      <div v-else-if="scope === 'WORKBENCH_TEAM' && !workbenchTeamId" class="selection-placeholder">{{ teamSelectionHint }}</div>
      <WorklogRanking
        v-else-if="statistics && scope === 'WORKBENCH_TEAM' && presentationMode === 'RANKING'"
        :from="report!.from"
        :to-exclusive="report!.rankingToExclusive"
        v-model:metric="rankingMetric"
        :coverage="statistics.coverage"
        :member-daily-totals="report!.ranking.memberDailyTotals"
      />
      <WorklogTrendChart
        v-else-if="statistics && !statisticsUnavailable && (!trendMember || hasMemberTrend)"
        :scope="scope"
        :member-name="trendMember?.name"
        :daily-totals="trendDailyTotals"
        :member-daily-totals="trendMember ? undefined : statistics.memberDailyTotals"
      />
      <el-empty v-else :description="statisticsUnavailable ? '工时尚未同步完成或暂不可用' : trendMember ? '该成员的月度工时暂不可用' : '暂无工时数据'" :image-size="80" />
    </el-card>

    <el-card ref="entriesCard" class="week-card" shadow="never">
      <template #header>
        <div class="week-header">
          <h3>工时记录</h3>
          <div class="entry-controls">
            <el-button-group size="small">
              <el-button
                v-for="shortcut in entryShortcuts"
                :key="shortcut.value"
                :type="entryShortcut === shortcut.value ? 'primary' : 'default'"
                :disabled="entriesLoading"
                @click="setEntryShortcut(shortcut.value)"
              >{{ shortcut.label }}</el-button>
            </el-button-group>
            <el-date-picker
              v-model="entryRange"
              class="entry-date-picker"
              type="daterange"
              size="small"
              value-format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              :clearable="false"
              :disabled="entriesLoading"
            />
            <el-select
              v-if="scope === 'WORKBENCH_TEAM'"
              v-model="entryMemberId"
              class="entry-member-select"
              size="small"
              aria-label="筛选团队成员"
              placeholder="全部成员"
              filterable
              clearable
              :value-on-clear="null"
              :loading="optionsLoading"
              :disabled="!workbenchTeamId"
              :no-data-text="optionsError || '暂无参与工时统计的成员'"
            >
              <el-option
                v-for="member in entryMembers"
                :key="member.id"
                :label="member.name"
                :value="member.id"
              />
            </el-select>
            <span v-if="entries && !entriesUnavailable && !memberEntriesUnavailable">{{ entryScopeLabel }} · {{ formatHours(entries.totalHours) }}h</span>
          </div>
        </div>
      </template>
      <el-alert
        v-if="entryRangeTooLong"
        class="view-error"
        type="warning"
        :closable="false"
        show-icon
        title="工时统计范围不能超过一个月（31 天）"
        :description="entries ? `当前显示上次查询结果（${entries.from} 至 ${addDays(entries.toExclusive, -1)}）` : undefined"
      />
      <el-alert
        v-if="selectedEntryMember && memberEntriesIssue"
        class="view-error"
        type="warning"
        :closable="false"
        show-icon
        :title="`${selectedEntryMember.name}的工时记录未完整取得`"
        :description="memberEntriesIssue.reason"
      />
      <WorklogCoverageNotice
        v-if="entries?.coverage.partial && !selectedEntryMember"
        :coverage="entries.coverage"
        :title="entriesCoverageMessage"
      />
      <el-alert
        v-if="titlesIncomplete"
        class="view-error"
        type="info"
        :closable="false"
        title="部分事项详情暂未取得，可稍后刷新"
      />
      <el-alert v-if="entriesError" class="view-error" type="error" :closable="false" show-icon :title="entriesError" />
      <div v-if="scope === 'WORKBENCH_TEAM' && !workbenchTeamId" class="selection-placeholder">{{ teamSelectionHint }}</div>
      <el-skeleton v-else-if="!entries && !entriesError && !entryRangeTooLong" :rows="6" animated />
      <el-empty v-else-if="entriesUnavailable || memberEntriesUnavailable" description="工时记录尚未同步完成或暂不可用" :image-size="80" />
      <WorklogWeekList
        v-else-if="entries"
        :scope="scope"
        :entries="entries"
        :has-more="Boolean(nextEntriesCursor) && !entryRangeTooLong"
        :loading-more="entriesLoadingMore"
        :more-error="entriesMoreError"
        @load-more="loadMoreEntries"
      />
    </el-card>

    <WorklogAbsenceDialog
      v-model="absenceDialogVisible"
      :loading="absenceLoading"
      :error="absenceError"
      :selected-range="reportRangeLabel"
      :report="absenceReport"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Refresh, TrendCharts, TrophyBase, WarningFilled } from '@element-plus/icons-vue'
import { getZhaogangWorklogSync, getZhaogangWorklogEntriesPage, getZhaogangWorklogIssueCheck, getZhaogangWorklogOptions, getZhaogangWorklogReport } from '@/api/zhaogang'
import type {
  ZhaogangWorklogOptions,
  ZhaogangWorklogSyncStatus,
  ZhaogangWorklogIssueCheck,
  ZhaogangWorklogIssueCheckStatus,
  ZhaogangWorklogRankingMetric,
  ZhaogangWorklogScope,
  ZhaogangWorklogEntries,
  ZhaogangWorklogRangeReport
} from '@/types/zhaogang'
import WorklogTrendChart from './WorklogTrendChart.vue'
import WorklogRanking from './WorklogRanking.vue'
import WorklogWeekList from './WorklogWeekList.vue'
import WorklogAbsenceDialog from './WorklogAbsenceDialog.vue'
import WorklogCoverageNotice from './WorklogCoverageNotice.vue'

const syncState = ref<ZhaogangWorklogSyncStatus | null>(null)
const syncBusy = ref(false)
const scope = ref<ZhaogangWorklogScope>('SELF')
const presentationMode = ref<'TREND' | 'RANKING'>('TREND')
const rankingMetric = ref<ZhaogangWorklogRankingMetric>('UTILIZATION_RATE')
const workbenchTeamId = ref<number | null>(null)
const options = ref<ZhaogangWorklogOptions | null>(null)
const optionsLoading = ref(false)
const optionsError = ref('')
const report = ref<ZhaogangWorklogRangeReport | null>(null)
const statistics = computed(() => report.value?.statistics ?? null)
const statisticsKey = ref('')
const statisticsError = ref('')
const statisticsLoading = ref(false)
const entriesCard = ref<{ $el: HTMLElement } | null>(null)
const dashboardLoading = ref(true)
const entryPages = ref<ZhaogangWorklogEntries[]>([])
const entries = computed(() => {
  const latest = entryPages.value[entryPages.value.length - 1]
  if (!latest) return null
  return { ...latest, items: entryPages.value.flatMap(page => page.items) }
})
const nextEntriesCursor = ref<string>()
const entriesKey = ref('')
const entriesError = ref('')
const entriesLoading = ref(false)
const entriesMoreError = ref('')
const entriesLoadingMore = ref(false)
const titlesIncomplete = computed(() => entryPages.value.some(page => page.issueCheck?.incomplete))
const entryMemberId = ref<number | null>(null)
const absenceDialogVisible = ref(false)
const absenceLoading = computed(() => statisticsLoading.value)
const absenceError = computed(() => statisticsError.value)
const absenceReport = computed(() => report.value?.absences ?? null)
const entryShortcuts = [
  { value: 'week', label: '本周' },
  { value: 'lastWeek', label: '上周' },
  { value: 'month', label: '本月' },
  { value: 'lastMonth', label: '上月' }
] as const
type EntryShortcut = (typeof entryShortcuts)[number]['value']
type EntryRange = [string, string]
const entryRange = ref<EntryRange | null>(entryShortcutRanges().month)
const entryRangeTooLong = computed(() => {
  if (!entryRange.value) return false
  const [from, to] = entryRange.value
  // ISO 日期按 UTC 零点比较，起止日期均计入。
  return Date.parse(to) - Date.parse(from) > 30 * 86_400_000
})
const entryShortcut = computed(() => {
  if (!entryRange.value) return undefined
  const [from, to] = entryRange.value
  const ranges = entryShortcutRanges()
  return entryShortcuts.find(({ value }) => ranges[value][0] === from && ranges[value][1] === to)?.value
})
let statisticsRequestSequence = 0
let entriesRequest: AbortController | undefined
const stopEntryChecks = new Set<() => void>()
let entriesRefreshPending = false
let entriesCardSeen = false

const reportRangeLabel = computed(() => report.value
  ? `${report.value.from} 至 ${addDays(report.value.toExclusive, -1)}`
  : entryRange.value?.join(' 至 ') || '请选择日期范围')
const selectedTeam = computed(() => options.value?.teams.find(item => item.id === workbenchTeamId.value))
const entryMembers = computed(() => selectedTeam.value?.members ?? [])
const selectedEntryMember = computed(() => scope.value === 'WORKBENCH_TEAM'
  ? entryMembers.value.find(member => member.id === entryMemberId.value)
  : undefined)
const trendMember = computed(() => presentationMode.value === 'TREND' ? selectedEntryMember.value : undefined)
const memberStatistics = computed(() => statistics.value?.memberDailyTotals.find(item => item.user.id === trendMember.value?.id))
const memberStatisticsIssue = computed(() => statistics.value?.coverage.memberIssues?.find(item => item.user.id === trendMember.value?.id))
const trendDailyTotals = computed(() => (trendMember.value ? memberStatistics.value?.dailyTotals : statistics.value?.dailyTotals) ?? [])
const rangeTotal = computed(() => trendDailyTotals.value.reduce((sum, item) => sum + Number(item.hours || 0), 0))
const statisticsUnavailable = computed(() => !!statistics.value?.coverage.memberCount && statistics.value.coverage.failedMemberCount >= statistics.value.coverage.memberCount)
const entriesUnavailable = computed(() => !!entries.value?.coverage.memberCount && entries.value.coverage.failedMemberCount >= entries.value.coverage.memberCount)
const hasMemberTrend = computed(() => !!memberStatistics.value && (!memberStatisticsIssue.value || rangeTotal.value > 0))
const teamSelectionHint = computed(() => options.value?.teams.length ? '请选择 Dev Hub 团队' : '还没有加入 Dev Hub 团队')
const teamSelectWidth = computed(() => {
  const labels = (options.value?.teams || []).map(team => team.name)
  const longestLength = Math.max(0, ...labels.map(label => Array.from(label).length))
  return `${Math.min(280, Math.max(128, longestLength * 14 + 44))}px`
})
const emptyStatistics = { overtimeDays: 0, overtimeHours: 0, averageHours: 0 }
const summary = computed(() => {
  if (scope.value === 'WORKBENCH_TEAM' && !workbenchTeamId.value) return teamSelectionHint.value
  if (statisticsUnavailable.value) return syncBusy.value ? '工时正在同步' : '工时数据暂不可用'
  if (trendMember.value && !hasMemberTrend.value) return ''

  const metrics = (trendMember.value ? memberStatistics.value?.summary : statistics.value?.summary) ?? emptyStatistics
  const count = statistics.value?.coverage.memberCount ?? selectedTeam.value?.memberCount ?? 0
  const teamCount = scope.value === 'WORKBENCH_TEAM' && !trendMember.value ? ` · ${count} 人` : ''
  return `总计工时 ${formatHours(rangeTotal.value)}h${teamCount} · 加班天数 ${metrics.overtimeDays}天 · 加班工时 ${formatHours(metrics.overtimeHours)}h · 平均工时 ${formatAverageHours(metrics.averageHours)}h`
})
const statisticsCoverageMessage = computed(() => {
  const failed = statistics.value?.coverage.failedMemberCount || 0
  return failed > 0
    ? `部分成员工时暂未取得，失败成员 ${failed} 人，工时统计可能不完整`
    : '部分成员工时未完整取得，工时统计可能不完整'
})
const entriesCoverageMessage = computed(() => {
  const failed = entries.value?.coverage.failedMemberCount || 0
  return failed > 0
    ? `部分成员工时暂未取得，失败成员 ${failed} 人`
    : '部分成员工时未完整取得，登记明细可能不完整'
})
const entryScopeLabel = computed(() => {
  if (scope.value === 'SELF') return '我的工时'
  return selectedEntryMember.value?.name || selectedTeam.value?.name || '团队工时'
})
const memberEntriesIssue = computed(() => entries.value?.coverage.memberIssues?.find(item => item.user.id === selectedEntryMember.value?.id))
const memberEntriesUnavailable = computed(() => !!memberEntriesIssue.value && !entries.value?.items.length)
const syncTimeLabel = computed(() => {
  const syncedAt = syncState.value?.syncedAt || ''
  if (syncedAt) return `同步时间：${formatSyncTime(syncedAt)}`
  return syncBusy.value ? '同步中' : '尚未同步'
})

let syncTimer: ReturnType<typeof setTimeout> | undefined
let syncRequest: AbortController | undefined
let syncGeneration = 0
const syncScopeKey = () => `${scope.value}:${scope.value === 'WORKBENCH_TEAM' ? workbenchTeamId.value || '' : ''}`
const stopSyncPolling = () => {
  syncGeneration += 1
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = undefined
  syncRequest?.abort()
  syncRequest = undefined
}
const pollSync = async (trigger = false) => {
  if (scope.value === 'WORKBENCH_TEAM' && !workbenchTeamId.value) return
  stopSyncPolling()
  const generation = syncGeneration
  const key = syncScopeKey()
  const request = new AbortController()
  syncRequest = request
  if (trigger) syncBusy.value = true
  try {
    const result = await getZhaogangWorklogSync(scope.value, workbenchTeamId.value, trigger, request.signal)
    if (generation !== syncGeneration || key !== syncScopeKey()) return
    const previous = syncState.value
    syncState.value = result
    syncBusy.value = result.running
    const dataChanged = previous && (previous.dataVersion !== result.dataVersion || previous.syncedAt !== result.syncedAt)
    if (dataChanged || (!result.running && (previous?.running || trigger))) {
      await loadStatistics()
      if (generation !== syncGeneration || key !== syncScopeKey()) return
      if (entriesCardSeen) await loadEntries(false)
    }
  } catch (error) {
    if (request.signal.aborted || generation !== syncGeneration) return
    syncBusy.value = false
    statisticsError.value = error instanceof Error ? error.message : '工时同步状态暂未获取，请稍后重试'
  } finally {
    if (generation === syncGeneration) {
      syncRequest = undefined
      syncTimer = setTimeout(() => { void pollSync() }, syncBusy.value ? 2000 : 15000)
    }
  }
}
watch(syncScopeKey, () => {
  stopSyncPolling()
  syncState.value = null
  syncBusy.value = false
  if (!dashboardLoading.value) void pollSync()
})

watch([workbenchTeamId, entryMembers], ([teamId], [previousTeamId]) => {
  if (teamId !== previousTeamId || !selectedEntryMember.value) entryMemberId.value = null
})

const loadOptions = async () => {
  optionsLoading.value = true
  optionsError.value = ''
  try {
    options.value = await getZhaogangWorklogOptions()
    if (workbenchTeamId.value && !options.value.teams.some(team => team.id === workbenchTeamId.value)) {
      workbenchTeamId.value = null
      resetScopeResults()
    }
    if (scope.value === 'WORKBENCH_TEAM' && !workbenchTeamId.value && options.value.teams.length) {
      workbenchTeamId.value = options.value.teams[0].id
    }
  } catch (error) {
    optionsError.value = error instanceof Error ? error.message : 'Dev Hub 团队加载失败，我的工时仍可使用'
  } finally {
    optionsLoading.value = false
  }
}

const loadStatistics = async (refresh = false) => {
  const sequence = ++statisticsRequestSequence
  if (!entryRange.value || entryRangeTooLong.value || (scope.value === 'WORKBENCH_TEAM' && !workbenchTeamId.value)) {
    statisticsLoading.value = false
    return
  }
  const key = currentReportKey()
  if (statisticsKey.value !== key) report.value = null
  statisticsLoading.value = true
  statisticsError.value = ''
  try {
    const [from, to] = entryRange.value
    const result = await getZhaogangWorklogReport(from, to, scope.value, workbenchTeamId.value, refresh)
    if (sequence !== statisticsRequestSequence || key !== currentReportKey()) return
    report.value = result
    statisticsKey.value = key
  } catch (error) {
    if (sequence !== statisticsRequestSequence) return
    statisticsError.value = error instanceof Error ? error.message : '工时统计加载失败，请稍后重试'
  } finally {
    if (sequence === statisticsRequestSequence) statisticsLoading.value = false
  }
}

const currentReportKey = () => `${entryRange.value?.join(':') ?? ''}:${scope.value}:${workbenchTeamId.value || ''}`

watch(currentReportKey, () => {
  cancelEntryRequests()
  resetAbsence()
  if (!entryRangeTooLong.value) {
    entryPages.value = []
    nextEntriesCursor.value = undefined
    entriesKey.value = ''
  }
  if (!dashboardLoading.value) void loadStatistics()
})

const currentEntriesKey = () => {
  return `${entryRange.value?.join(':') ?? ''}:${scope.value}:${workbenchTeamId.value || ''}:${selectedEntryMember.value?.id ?? ''}`
}

const cancelEntryRequests = () => {
  entriesRequest?.abort()
  entriesRequest = undefined
  entriesLoading.value = false
  entriesLoadingMore.value = false
  stopEntryChecks.forEach(stop => stop())
  stopEntryChecks.clear()
}

const fetchEntriesPage = async (cursor?: string, refresh = false) => {
  if (!entryRange.value || entryRangeTooLong.value) return
  if (scope.value === 'WORKBENCH_TEAM' && !workbenchTeamId.value) return
  const [from, to] = entryRange.value
  if (!from || !to) return
  const key = currentEntriesKey()
  const request = new AbortController()
  entriesRequest = request
  const loading = cursor ? entriesLoadingMore : entriesLoading
  const errorMessage = cursor ? entriesMoreError : entriesError
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getZhaogangWorklogEntriesPage({
      from, to, scope: scope.value, workbenchTeamId: workbenchTeamId.value,
      memberUserId: selectedEntryMember.value?.id, cursor, refresh
    }, request.signal)
    if (request.signal.aborted || key !== currentEntriesKey()) return
    const previousRevision = entries.value?.issueCheck?.deletionRevision
    if (cursor && previousRevision !== undefined && result.entries.issueCheck?.deletionRevision !== previousRevision) {
      void loadEntries(false)
      return
    }
    entryPages.value.push(result.entries)
    nextEntriesCursor.value = result.nextCursor ?? undefined
    watchEntryPage(entryPages.value[entryPages.value.length - 1])
  } catch (error) {
    if (request.signal.aborted || key !== currentEntriesKey()) return
    if (cursor && error instanceof Error && error.message.includes('工时数据已更新')) {
      void loadEntries(false)
      return
    }
    errorMessage.value = error instanceof Error ? error.message : '工时登记加载失败，请稍后重试'
  } finally {
    if (entriesRequest === request) {
      entriesRequest = undefined
      loading.value = false
    }
  }
}

const loadEntries = (refresh = entriesRefreshPending) => {
  cancelEntryRequests()
  if (!entryRange.value || entryRangeTooLong.value) return
  if (scope.value === 'WORKBENCH_TEAM' && !workbenchTeamId.value) return
  entryPages.value = []
  nextEntriesCursor.value = undefined
  entriesMoreError.value = ''
  entriesKey.value = currentEntriesKey()
  entriesRefreshPending = false
  return fetchEntriesPage(undefined, refresh)
}

const loadMoreEntries = () => {
  if (!nextEntriesCursor.value || entriesRequest || dashboardLoading.value || entriesKey.value !== currentEntriesKey()) return
  void fetchEntriesPage(nextEntriesCursor.value)
}

watch(currentEntriesKey, key => {
  if (entriesCardSeen && !dashboardLoading.value && !statisticsLoading.value && entriesKey.value !== key) {
    void loadEntries()
  }
})

watch([entriesCard, dashboardLoading, statisticsLoading], ([card, initializing, loading], _, onCleanup) => {
  if (!card || initializing || loading) return
  const loadIfNeeded = () => {
    entriesCardSeen = true
    if (!entriesLoading.value && (entriesRefreshPending || entriesKey.value !== currentEntriesKey())) {
      void loadEntries()
    }
  }

  if (typeof IntersectionObserver === 'undefined') {
    loadIfNeeded()
    return
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) loadIfNeeded()
  })
  observer.observe(card.$el)
  onCleanup(() => observer.disconnect())
}, { flush: 'post' })

const openAbsenceDialog = () => {
  if ((scope.value === 'WORKBENCH_TEAM' && !workbenchTeamId.value) || statisticsLoading.value) return
  absenceDialogVisible.value = true
}

const pollIssueCheck = (
  check: ZhaogangWorklogIssueCheck | null | undefined,
  onCleanup: (cleanup: () => void) => void,
  onStatus: (status: ZhaogangWorklogIssueCheckStatus) => void,
  onTimeout?: () => void
) => {
  const checkId = check?.checkId
  if (!checkId) return
  const currentScope = scope.value
  const teamId = workbenchTeamId.value
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout>
  let attempts = 0
  onCleanup(() => {
    controller.abort()
    clearTimeout(timer)
  })

  const poll = async () => {
    attempts += 1
    try {
      const status = await getZhaogangWorklogIssueCheck(checkId, currentScope, teamId, controller.signal)
      if (controller.signal.aborted) return
      onStatus(status)
      if (!status.pending || controller.signal.aborted) return
    } catch {
      if (controller.signal.aborted) return
    }
    if (attempts < 60) timer = setTimeout(poll, attempts < 5 ? 1000 : 2000)
    else onTimeout?.()
  }
  timer = setTimeout(poll, 500)
}

const reloadChangedReports = (revision: number) => {
  if (!statisticsLoading.value && (statistics.value?.issueCheck?.deletionRevision ?? revision) < revision) {
    void loadStatistics()
  }
  if (!dashboardLoading.value && !entryRangeTooLong.value &&
      (entries.value?.issueCheck?.deletionRevision ?? revision) < revision) {
    void loadEntries(false)
  }
}

watch(() => statisticsLoading.value ? null : statistics.value?.issueCheck, (check, _, onCleanup) => {
  pollIssueCheck(check, onCleanup, status => reloadChangedReports(status.deletionRevision))
})

const watchEntryPage = (page: ZhaogangWorklogEntries) => {
  const check = page.issueCheck
  if (!check?.checkId) return
  let updatesApplied = 0
  let stop: () => void
  const finish = () => { stopEntryChecks.delete(stop) }
  pollIssueCheck(check, cleanup => {
    stop = cleanup
    stopEntryChecks.add(cleanup)
  }, status => {
    for (const update of status.updates?.slice(updatesApplied) ?? []) {
      const item = page.items[update.rowIndex]
      if (!item) continue
      item.issue = {
        ...update.issue,
        title: update.issue.title || item.workingDesc || `事项 #${update.issue.code}`
      }
      item.project = update.project
      item.issueUrl = update.issueUrl
    }
    updatesApplied = status.updates?.length ?? 0
    check.incomplete = Boolean(status.incomplete)
    if (!status.pending) finish()
    reloadChangedReports(status.deletionRevision)
  }, () => {
    check.incomplete = true
    finish()
  })
}

const resetAbsence = () => {
  absenceDialogVisible.value = false
}

const refreshDashboard = async () => {
  if (syncBusy.value) return
  await loadOptions()
  await pollSync(true)
}

const resetScopeResults = () => {
  statisticsRequestSequence += 1
  cancelEntryRequests()
  report.value = null
  statisticsKey.value = ''
  statisticsError.value = ''
  statisticsLoading.value = false
  entryPages.value = []
  nextEntriesCursor.value = undefined
  entriesKey.value = ''
  entriesError.value = ''
  entriesMoreError.value = ''
  entriesRefreshPending = false
  entriesCardSeen = false
  resetAbsence()
}

const changeScope = (value: string | number | boolean | undefined) => {
  entryRange.value = entryShortcutRanges()[value === 'WORKBENCH_TEAM' ? 'week' : 'month']
  if (value === 'WORKBENCH_TEAM') {
    workbenchTeamId.value = options.value?.teams[0]?.id || null
  } else {
    presentationMode.value = 'TREND'
    workbenchTeamId.value = null
  }
  resetScopeResults()
}

const togglePresentation = () => {
  presentationMode.value = presentationMode.value === 'RANKING' ? 'TREND' : 'RANKING'
}

const changeTeam = () => {
  resetScopeResults()
}

const setEntryShortcut = (shortcut: EntryShortcut) => {
  if (entriesLoading.value) return
  entryRange.value = entryShortcutRanges()[shortcut]
}

const formatHours = (hours: number) => Number(hours || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const formatAverageHours = (hours: number) => Number(hours || 0).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
function addDays(value: string, days: number) {
  const date = new Date(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
function entryShortcutRanges(): Record<EntryShortcut, EntryRange> {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value)
  const year = part('year')
  const monthIndex = part('month') - 1
  const date = new Date(Date.UTC(year, monthIndex, part('day')))
  const today = date.toISOString().slice(0, 10)
  const monday = addDays(today, 1 - (date.getUTCDay() || 7))
  const monthDate = (month: number, day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
  return {
    week: [monday, addDays(monday, 6)],
    lastWeek: [addDays(monday, -7), addDays(monday, -1)],
    month: [monthDate(monthIndex, 1), monthDate(monthIndex + 1, 0)],
    lastMonth: [monthDate(monthIndex - 1, 1), monthDate(monthIndex, 0)]
  }
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
  try {
    await loadOptions()
    await pollSync()
    await loadStatistics()
  } finally {
    dashboardLoading.value = false
  }
})
onBeforeUnmount(() => { stopSyncPolling(); cancelEntryRequests() })
</script>

<style scoped>
.worklog-dashboard { display: grid; gap: 14px; }
.trend-header, .scope-controls, .week-header { display: flex; align-items: center; }
.trend-card, .week-card { border-color: #e4e9f1; border-radius: 8px; }
.trend-header { justify-content: space-between; gap: 18px; }
.trend-title h3, .week-header h3 { margin: 0; color: #26344a; font-size: 17px; }
.trend-title p { margin: 6px 0 0; color: #6f7d92; font-size: 13px; }
.scope-controls { justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.sync-time { color: #7b879a; font-size: 12px; white-space: nowrap; }
.team-select { flex: 0 0 auto; }
.selection-placeholder { display: grid; min-height: 260px; place-items: center; color: #8a96a9; }
.view-error { margin-bottom: 12px; }
.week-header { justify-content: space-between; gap: 16px; }
.week-header h3 { flex-shrink: 0; }
.entry-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.entry-controls > span { color: #356ec8; font-size: 13px; font-weight: 600; white-space: nowrap; }
.entry-member-select { width: 144px; }
.entry-controls :deep(.entry-date-picker) {
  --el-date-editor-daterange-width: 200px;
  box-sizing: border-box;
  flex: 0 0 auto;
  max-width: 100%;
}
@media (max-width: 760px) {
  .trend-header, .week-header { align-items: flex-start; flex-direction: column; }
  .scope-controls { width: 100%; justify-content: flex-start; }
  .team-select { width: 100% !important; }
  .entry-controls { width: 100%; justify-content: flex-start; }
}
</style>
