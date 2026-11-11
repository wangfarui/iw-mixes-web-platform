<template>
  <section class="code-page">
    <CodeStatsHeader
      active="mine"
      v-model:scan-details-visible="scanDetailsVisible"
      :scan-details="statistics"
      :cache-time="cacheTime"
      :rescan-loading="rescanning"
      :rescan-disabled="rescanDisabled"
      :rescan-tip="rescanTip"
      :refreshing="refreshing"
      @rescan="rescan"
    >
      <template #controls>
        <CodeStatsRangePicker
          :option="rangeOption"
          :month="month"
          :custom-range="customRange"
          @update:option="rangeOption = $event"
          @update:month="month = $event"
          @update:custom-range="customRange = $event"
          @change="changeRange"
        />
      </template>
      <template #actions>
        <el-button size="small" :icon="User" @click="identityDialogVisible = true">
          我的 Git 身份{{ options ? `（${options.myIdentityCount}）` : '' }}
        </el-button>
      </template>
    </CodeStatsHeader>

    <el-alert v-if="optionsError" type="warning" :closable="false" show-icon :title="optionsError" />
    <el-alert v-if="statisticsError" type="error" :closable="false" show-icon :title="statisticsError">
      <template #default><el-button link type="primary" @click="loadStatistics">重试</el-button></template>
    </el-alert>

    <div v-if="!statistics && statisticsLoading" class="code-loading"><el-skeleton :rows="9" animated /></div>
    <template v-else-if="statistics">
      <CodeStatsKpiCards v-if="statistics.dataReady" :summary="statistics.summary" />
      <CodeStatsScanBanner
        v-show="scanDetailsVisible"
        id="mine-code-scan-details"
        :scan="statistics.scan"
        :coverage="statistics.coverage"
        :refreshing="refreshing"
        @show-scope="scanScopeVisible = true"
        @cancelled="loadStatistics"
      />

      <div v-if="!statistics.dataReady" class="code-placeholder">
        <el-icon v-if="activeMonth" :size="30"><Loading /></el-icon>
        <strong v-if="['FAILED', 'INTERRUPTED', 'CANCELLED'].includes(statistics.scan.aggregateStatus)">扫描尚未完成，请展开「数据同步」详情查看原因后重试</strong>
        <strong v-else-if="!activeMonth">当前范围尚无同步数据</strong>
        <strong v-else>后台正在回补代码数据</strong>
        <span v-if="activeMonth">扫描会在后台继续，可以离开页面后再回来查看。</span>
      </div>

      <div v-if="statistics.dataReady && statistics.summary.commitCount === 0" class="code-placeholder">
        <el-icon :size="30"><Loading /></el-icon>
        <strong>当前范围没有已归属提交</strong>
        <span>扫描会覆盖你 PAT 可读的全部仓库和分支；如果确有提交，请检查“我的 Git 身份”是否已绑定正确的邮箱或作者名。</span>
      </div>
      <template v-else-if="statistics.dataReady">
        <div class="code-chart-grid">
          <article class="chart-card">
            <header><h3>每日提交频率</h3><p>按日期统计提交次数</p></header>
            <CodeStatsBarChart
              :key="chartRangeKey"
              :items="dailyItems"
              show-details
              scroll-dates
              unit="（次）"
              aria-label="每日提交频率"
            />
          </article>
          <article class="chart-card heatmap-card">
            <header><h3>提交日历热力图</h3><p>每行一周，颜色越深表示当天提交越多</p></header>
            <CodeStatsCalendarHeatmap :daily="statistics.daily" />
          </article>
          <article class="chart-card">
            <header><h3>代码行变更趋势</h3><p>零线上方为新增，下方为删除</p></header>
            <CodeStatsLineBarChart :key="chartRangeKey" :items="statistics.daily" show-details scroll-dates />
          </article>
          <article class="chart-card">
            <header><h3>提交时段分布</h3><p>按提交时间（Asia/Shanghai）汇总</p></header>
            <CodeStatsBarChart :items="hourlyItems" color="#56C7C2" unit="（次）" :min-slot-width="23" show-details aria-label="提交时段分布" />
          </article>
          <article class="chart-card">
            <header><h3>仓库提交频率</h3><p>按仓库统计提交次数</p></header>
            <CodeStatsHorizontalBarChart :items="repositoryItems" :max-items="10" expandable />
          </article>
          <article class="chart-card">
            <header><h3>分支活跃度 Top 10</h3><p>按提交出现的分支分别计次</p></header>
            <CodeStatsHorizontalBarChart :items="branchItems" :max-items="10" />
          </article>
        </div>

        <CodeCommitTable
          :items="entries?.items || []"
          :page="entries?.page || null"
          :loading="entriesLoading"
          :error="entriesError"
          :range-label="activeRange.label"
          :keyword="keyword"
          @page-change="changeEntryPage"
          @search="searchEntries"
        />
      </template>
    </template>
    <div v-else class="code-placeholder">
      <el-empty description="代码统计暂不可用" :image-size="80" />
      <el-button type="primary" plain @click="loadStatistics">重试</el-button>
    </div>

    <CodeIdentityDialog
      v-model="identityDialogVisible"
      scope="SELF"
      :workbench-team-id="null"
      :members="[]"
      :can-manage="true"
      @changed="identityChanged"
    />
    <CodeScanScopeDrawer
      v-if="statistics"
      v-model="scanScopeVisible"
      :scan="statistics.scan"
      :coverage="statistics.coverage"
      can-retry
      @retried="refreshAfterDiffRetry"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, User } from '@element-plus/icons-vue'
import {
  getCodeStatsEntries,
  getCodeStatsOptions,
  getCodeStatsScan,
  getCodeStatsStatistics,
  triggerCodeStatsScan
} from '@/api/zhaogangCodeStats'
import type {
  ZhaogangCodeStatsEntryPage,
  ZhaogangCodeStatsOptions,
  ZhaogangCodeStatsRangeOption,
  ZhaogangCodeStatsScan,
  ZhaogangCodeStatsSelfStatistics
} from '@/types/zhaogangCodeStats'
import type { CodeStatsBarItem } from './components/CodeStatsBarChart.vue'
import type { CodeStatsHorizontalItem } from './components/CodeStatsHorizontalBarChart.vue'
import CodeStatsBarChart from './components/CodeStatsBarChart.vue'
import CodeStatsCalendarHeatmap from './components/CodeStatsCalendarHeatmap.vue'
import CodeStatsHeader from './components/CodeStatsHeader.vue'
import CodeStatsHorizontalBarChart from './components/CodeStatsHorizontalBarChart.vue'
import CodeStatsKpiCards from './components/CodeStatsKpiCards.vue'
import CodeStatsLineBarChart from './components/CodeStatsLineBarChart.vue'
import CodeStatsRangePicker from './components/CodeStatsRangePicker.vue'
import CodeStatsScanBanner from './components/CodeStatsScanBanner.vue'
import CodeCommitTable from './components/CodeCommitTable.vue'
import CodeIdentityDialog from './components/CodeIdentityDialog.vue'
import CodeScanScopeDrawer from './components/CodeScanScopeDrawer.vue'
import {
  activeScanMonth,
  dailyCodeDetails,
  formatCodeClock,
  formatCodeDuration,
  formatCodeNumber,
  latestSuccessfulAt
} from './codeStatsPresentation'
import { monthText, resolveCodeStatsRange, type ResolvedCodeStatsRange } from '@/services/zhaogangCodeStatsRange'
import { useCodeStatsScanPolling } from './useCodeStatsScanPolling'

const rangeOption = ref<ZhaogangCodeStatsRangeOption>('month')
const month = ref(monthText())
const customRange = ref<[string, string] | null>(null)
const initialRange = resolveCodeStatsRange('month', month.value, null)
const activeRange = ref({ from: initialRange.from, to: initialRange.to, label: initialRange.label })
const options = ref<ZhaogangCodeStatsOptions | null>(null)
const optionsError = ref('')
const statistics = ref<ZhaogangCodeStatsSelfStatistics | null>(null)
const statisticsLoading = ref(false)
const statisticsError = ref('')
const entries = ref<ZhaogangCodeStatsEntryPage | null>(null)
const entriesLoading = ref(false)
const entriesError = ref('')
const pageNumber = ref(1)
const pageSize = 20
const keyword = ref('')
const identityDialogVisible = ref(false)
const scanDetailsVisible = ref(false)
const scanScopeVisible = ref(false)
const rescanning = ref(false)
let statisticsSequence = 0
let entriesSequence = 0

const polling = useCodeStatsScanPolling({
  fetchScan: () => getCodeStatsScan({
    from: activeRange.value.from,
    to: activeRange.value.to,
    scope: 'SELF'
  }),
  onScan: (scan) => {
    if (statistics.value) statistics.value = { ...statistics.value, scan }
  },
  onProgress: async () => {
    await Promise.all([loadStatistics(), loadEntries()])
  },
  onFinished: (scan) => {
    if (statistics.value) statistics.value = { ...statistics.value, scan }
    void loadStatistics()
    void loadEntries()
  }
})

const activeMonth = computed(() => activeScanMonth(statistics.value?.scan.months || []))
const cacheTime = computed(() => formatCodeClock(latestSuccessfulAt(statistics.value?.scan.months || [])))
const refreshing = computed(() => Boolean(statistics.value?.refreshing))
const syncInProgress = computed(() => Boolean(activeMonth.value) || ['RUNNING', 'QUEUED'].includes(statistics.value?.scan.sync?.status || ''))
const rescanDisabled = computed(() => syncInProgress.value || (statistics.value?.scan.sync?.retryAfterSeconds ?? statistics.value?.scan.retryAfterSeconds ?? 0) > 0 || rescanning.value)
const rescanTip = computed(() => {
  if (activeMonth.value) return '扫描正在进行，可以离开页面，扫描会在后台继续'
  const retry = statistics.value?.scan.sync?.retryAfterSeconds ?? statistics.value?.scan.retryAfterSeconds ?? 0
  if (retry > 0) return `同步冷却中，约 ${formatCodeDuration(retry)} 后可再次同步`
  return ''
})

const chartRangeKey = computed(() => {
  const range = statistics.value?.range
  return range ? `${range.from}:${range.to}` : ''
})
const dailyItems = computed<CodeStatsBarItem[]>(() => (statistics.value?.daily || []).map(item => ({
  label: item.date.slice(5),
  value: item.commitCount,
  title: dailyCodeDetails(item),
  rest: item.dayType === 'REST_DAY'
})))
const hourlyItems = computed<CodeStatsBarItem[]>(() => (statistics.value?.hourly || []).map(item => ({
  label: String(item.hour),
  value: item.commitCount,
  title: `${item.hour}:00 - ${item.hour}:59 · 提交 ${item.commitCount} 次`
})))
const repositoryItems = computed<CodeStatsHorizontalItem[]>(() => (statistics.value?.repositories || []).map(item => ({
  key: item.depotId,
  label: item.depotName,
  sublabel: item.projectDisplayName || item.projectName,
  value: item.commitCount,
  detail: item.lineStatsExcluded ? '仅统计提交次数' : `+${formatCodeNumber(item.additions)} / -${formatCodeNumber(item.deletions)}`
})))
const branchItems = computed<CodeStatsHorizontalItem[]>(() => (statistics.value?.branches || []).slice(0, 10).map(item => ({
  key: `${item.depotName}|${item.branchName}`,
  label: item.branchName,
  sublabel: item.depotName,
  value: item.commitCount
})))

const loadOptions = async () => {
  optionsError.value = ''
  try {
    options.value = await getCodeStatsOptions()
  } catch (error) {
    optionsError.value = error instanceof Error ? error.message : '代码统计选项加载失败'
  }
}

const loadStatistics = async () => {
  const current = ++statisticsSequence
  statisticsLoading.value = true
  statisticsError.value = ''
  try {
    const result = await getCodeStatsStatistics({
      from: activeRange.value.from,
      to: activeRange.value.to,
      scope: 'SELF'
    }) as ZhaogangCodeStatsSelfStatistics
    if (current !== statisticsSequence) return
    statistics.value = result
    polling.begin(result.scan)
  } catch (error) {
    if (current !== statisticsSequence) return
    statisticsError.value = error instanceof Error ? error.message : '我的代码统计加载失败'
  } finally {
    if (current === statisticsSequence) statisticsLoading.value = false
  }
}

const refreshAfterDiffRetry = () => Promise.all([loadStatistics(), loadEntries()])

const loadEntries = async () => {
  const current = ++entriesSequence
  entriesLoading.value = true
  entriesError.value = ''
  try {
    const result = await getCodeStatsEntries({
      from: activeRange.value.from,
      to: activeRange.value.to,
      keyword: keyword.value || undefined,
      pageNumber: pageNumber.value,
      pageSize
    })
    if (current !== entriesSequence) return
    entries.value = result
  } catch (error) {
    if (current !== entriesSequence) return
    entriesError.value = error instanceof Error ? error.message : '提交明细加载失败'
  } finally {
    if (current === entriesSequence) entriesLoading.value = false
  }
}

const changeRange = (range: ResolvedCodeStatsRange) => {
  activeRange.value = { from: range.from, to: range.to, label: range.label }
  keyword.value = ''
  pageNumber.value = 1
  void loadStatistics()
  void loadEntries()
}

const searchEntries = (value: string) => {
  keyword.value = value
  pageNumber.value = 1
  void loadEntries()
}

const changeEntryPage = (page: number) => {
  pageNumber.value = page
  void loadEntries()
}

const applyScan = (scan: ZhaogangCodeStatsScan) => {
  if (statistics.value) statistics.value = { ...statistics.value, scan }
}

const rescan = async () => {
  if (rescanDisabled.value) return
  rescanning.value = true
  try {
    const result = await triggerCodeStatsScan({
      scope: 'SELF',
      from: activeRange.value.from,
      to: activeRange.value.to,
      mode: 'SYNC'
    })
    applyScan(result.scan)
    if (result.accepted) {
      ElMessage.success('已提交本轮代码同步')
      polling.begin(result.scan)
    } else if (result.reason === 'ALREADY_RUNNING') {
      ElMessage.info('已有扫描任务，正在同步进度')
      polling.begin(result.scan)
    } else if (result.reason === 'QUEUE_FULL') {
      ElMessage.warning('同步队列已满，请稍后重试')
    } else {
      const skipped = result.skippedMonths.map(item => `${item.month}：${item.reason}`).join('；')
      ElMessage.warning(skipped || `暂时无法重扫：${result.reason}`)
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '同步失败')
  } finally {
    rescanning.value = false
  }
}

const identityChanged = async () => {
  await loadOptions()
  await loadStatistics()
  await loadEntries()
}

onMounted(async () => {
  await loadOptions()
  await loadStatistics()
  await loadEntries()
})
</script>

<style scoped>
.code-page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; min-width: 0; }
.code-loading { padding: 26px; background: #fff; border: 1px solid #e4e9f1; border-radius: 10px; }
.code-chart-grid { display: grid; min-width: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.chart-card { min-width: 0; padding: 14px 16px; background: #fff; border: 1px solid #e4e9f1; border-radius: 10px; }
.code-chart-grid :deep(.code-stats-date-scroll::-webkit-scrollbar) { height: 8px; }
.code-chart-grid :deep(.code-stats-date-scroll::-webkit-scrollbar-track) { background: #f2f5fa; border-radius: 999px; }
.code-chart-grid :deep(.code-stats-date-scroll::-webkit-scrollbar-thumb) { background: #c1cddc; border-radius: 999px; }
.code-chart-grid :deep(.code-stats-date-scroll::-webkit-scrollbar-thumb:hover) { background: #8a9cb3; }
.heatmap-card { display: flex; flex-direction: column; }
.chart-card header { margin-bottom: 8px; }
.chart-card h3 { margin: 0; color: #2b3a50; font-size: 15px; }
.chart-card p { margin: 5px 0 0; color: #8a96a9; font-size: 12px; }
.code-placeholder { display: grid; min-height: 220px; place-items: center; align-content: center; gap: 10px; padding: 28px; color: #7b879a; background: #fff; border: 1px dashed #d8e2ef; border-radius: 10px; text-align: center; }
.code-placeholder strong { color: #44536a; font-size: 16px; }
.code-placeholder span { font-size: 12px; line-height: 1.6; }
.chart-card :deep(.member-select) { width: 180px; }
@media (max-width: 1000px) {
  .code-chart-grid { grid-template-columns: 1fr; }
}
</style>
