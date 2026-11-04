<template>
  <section class="code-page">
    <CodeStatsHeader
      active="mine"
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
      <CodeStatsKpiCards v-if="statistics.dataReady" :items="kpiItems" />
      <CodeStatsScanBanner
        :scan="statistics.scan"
        :coverage="statistics.coverage"
        :refreshing="refreshing"
        @show-scope="scanScopeVisible = true"
        @cancelled="loadStatistics"
      />

      <div v-if="!statistics.dataReady" class="code-placeholder">
        <el-icon v-if="activeMonth" :size="30"><Loading /></el-icon>
        <strong v-if="['FAILED', 'INTERRUPTED', 'CANCELLED'].includes(statistics.scan.aggregateStatus)">扫描尚未完成，请查看上方原因后重试</strong>
        <strong v-else-if="!activeMonth">当前范围尚未同步，请点击“立即同步”</strong>
        <strong v-else>后台正在回补代码数据</strong>
        <span v-if="activeMonth">扫描会在后台继续，可以离开页面后再回来查看；也可以点击“立即同步”发起回补。</span>
      </div>

      <div v-if="statistics.dataReady && statistics.summary.commitCount === 0" class="code-placeholder">
        <el-icon :size="30"><Loading /></el-icon>
        <strong>当前范围没有已归属提交</strong>
        <span>扫描会覆盖你 PAT 可读的全部仓库和分支；如果确有提交，请检查“我的 Git 身份”是否已绑定正确的邮箱或作者名。</span>
      </div>
      <template v-else-if="statistics.dataReady">
        <div class="code-chart-grid">
          <article class="chart-card">
            <header><h3>每日提交频率</h3><p>点击日期筛选提交明细</p></header>
            <CodeStatsBarChart
              :items="dailyItems"
              :selected-index="selectedDateIndex"
              selectable
              unit="（次）"
              aria-label="每日提交频率"
              @select="selectDailyIndex"
            />
          </article>
          <article class="chart-card">
            <header><h3>提交日历热力图</h3><p>颜色越深表示当天提交越多</p></header>
            <CodeStatsCalendarHeatmap :daily="statistics.daily" :selected-date="selectedDate" @select="selectDate" />
          </article>
          <article class="chart-card">
            <header><h3>代码行变更趋势</h3><p>绿色新增，红色删除，蓝线为净增</p></header>
            <CodeStatsLineBarChart :items="statistics.daily" :selected-date="selectedDate" @select="selectDate" />
          </article>
          <article class="chart-card">
            <header><h3>提交时段分布</h3><p>按提交时间（Asia/Shanghai）汇总</p></header>
            <CodeStatsBarChart :items="hourlyItems" color="#56C7C2" unit="（次）" :min-slot-width="23" aria-label="提交时段分布" />
          </article>
          <article class="chart-card">
            <header><h3>仓库提交频率</h3><p>点击仓库筛选提交明细</p></header>
            <CodeStatsHorizontalBarChart
              :items="repositoryItems"
              :max-items="10"
              expandable
              selectable
              :selected-key="depotId"
              @select="selectRepository"
            />
          </article>
          <article class="chart-card">
            <header><h3>分支活跃度 Top 10</h3><p>按提交出现的分支分别计次</p></header>
            <CodeStatsHorizontalBarChart :items="branchItems" :max-items="10" />
          </article>
        </div>
        <p class="code-note">代码量不等于工作量；行数受格式化、生成代码和锁文件影响。仅统计已绑定 Git 身份命中的提交；合并提交不计数、不统计行数。</p>

        <CodeCommitTable
          :items="entries?.items || []"
          :page="entries?.page || null"
          :loading="entriesLoading"
          :error="entriesError"
          :range-label="entriesRangeLabel"
          :filters="{ date: selectedDate, depotName, keyword }"
          @page-change="changeEntryPage"
          @clear-date="clearDate"
          @clear-depot="clearDepot"
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
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
import type { CodeStatsKpiItem } from './components/CodeStatsKpiCards.vue'
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
import { activeScanMonth, formatCodeClock, formatCodeDuration, formatCodeNumber, formatSignedNumber, latestSuccessfulAt } from './codeStatsPresentation'
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
const selectedDate = ref('')
const depotId = ref<number | null>(null)
const depotName = ref('')
const identityDialogVisible = ref(false)
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
const rescanDisabled = computed(() => (Boolean(activeMonth.value) || ['RUNNING', 'QUEUED'].includes(statistics.value?.scan.sync?.status || '')) || (statistics.value?.scan.sync?.retryAfterSeconds ?? statistics.value?.scan.retryAfterSeconds ?? 0) > 0 || rescanning.value)
const rescanTip = computed(() => {
  if (activeMonth.value) return '扫描正在进行，可以离开页面，扫描会在后台继续'
  const retry = statistics.value?.scan.sync?.retryAfterSeconds ?? statistics.value?.scan.retryAfterSeconds ?? 0
  if (retry > 0) return `同步冷却中，约 ${formatCodeDuration(retry)} 后可再次同步`
  return ''
})
const entriesRangeLabel = computed(() => selectedDate.value || activeRange.value.label)

const kpiItems = computed<CodeStatsKpiItem[]>(() => {
  const summary = statistics.value?.summary
  if (!summary) return []
  return [
    { label: '提交次数', value: formatCodeNumber(summary.commitCount), tone: 'blue' },
    { label: '新增代码行', value: formatCodeNumber(summary.additions), tone: 'green' },
    { label: '删除代码行', value: formatCodeNumber(summary.deletions), tone: 'red' },
    { label: '净增代码行', value: formatSignedNumber(summary.netLines), tone: summary.netLines < 0 ? 'red' : 'default' },
    { label: '活跃天数', value: `${summary.activeDays} 天` },
    { label: '涉及仓库', value: `${summary.repoCount} 个` }
  ]
})

const dailyItems = computed<CodeStatsBarItem[]>(() => (statistics.value?.daily || []).map(item => ({
  label: item.date.slice(8),
  value: item.commitCount,
  title: `${item.date} · 提交 ${item.commitCount} 次 · 新增 ${item.additions} · 删除 ${item.deletions}`,
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
const selectedDateIndex = computed(() => (statistics.value?.daily || []).findIndex(item => item.date === selectedDate.value))

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

const loadEntries = async () => {
  const current = ++entriesSequence
  entriesLoading.value = true
  entriesError.value = ''
  const from = selectedDate.value || activeRange.value.from
  const to = selectedDate.value || activeRange.value.to
  try {
    const result = await getCodeStatsEntries({
      from,
      to,
      depotId: depotId.value,
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
  selectedDate.value = ''
  depotId.value = null
  depotName.value = ''
  keyword.value = ''
  pageNumber.value = 1
  void loadStatistics()
  void loadEntries()
}

const selectDailyIndex = (index: number) => {
  const item = statistics.value?.daily[index]
  if (item) selectDate(item.date)
}

const selectDate = (date: string) => {
  selectedDate.value = selectedDate.value === date ? '' : date
  pageNumber.value = 1
  void loadEntries()
}

const selectRepository = (key: string | number) => {
  const id = Number(key)
  if (depotId.value === id) {
    clearDepot()
    return
  }
  depotId.value = id
  depotName.value = repositoryItems.value.find(item => item.key === id)?.label || ''
  pageNumber.value = 1
  void loadEntries()
}

const clearDate = () => {
  selectedDate.value = ''
  pageNumber.value = 1
  void loadEntries()
}

const clearDepot = () => {
  depotId.value = null
  depotName.value = ''
  pageNumber.value = 1
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
  try {
    await ElMessageBox.confirm('将从 2026-01-01 回补你本人可读的代码数据，并启用每 3 小时后台增量同步。首次回补可能耗时较长。是否继续？', '同步代码', {
      confirmButtonText: '开始同步',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
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
      ElMessage.success('已启动后台持续同步，可继续查看已有数据')
      polling.begin(result.scan)
    } else if (result.reason === 'ALREADY_RUNNING') {
      ElMessage.info('已有扫描任务，正在同步进度')
      polling.begin(result.scan)
    } else {
      const skipped = result.skippedMonths.map(item => `${item.month}：${item.reason}`).join('；')
      ElMessage.warning(skipped || `暂时无法重扫：${result.reason}`)
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '重扫失败')
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
.chart-card header { margin-bottom: 8px; }
.chart-card h3 { margin: 0; color: #2b3a50; font-size: 15px; }
.chart-card p { margin: 5px 0 0; color: #8a96a9; font-size: 12px; }
.code-note { margin: 0; color: #8a96a9; font-size: 12px; line-height: 1.6; }
.code-placeholder { display: grid; min-height: 220px; place-items: center; align-content: center; gap: 10px; padding: 28px; color: #7b879a; background: #fff; border: 1px dashed #d8e2ef; border-radius: 10px; text-align: center; }
.code-placeholder strong { color: #44536a; font-size: 16px; }
.code-placeholder span { font-size: 12px; line-height: 1.6; }
.chart-card :deep(.member-select) { width: 180px; }
@media (max-width: 1000px) {
  .code-chart-grid { grid-template-columns: 1fr; }
}
</style>
