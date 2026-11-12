<template>
  <section class="code-page">
    <CodeStatsHeader
      active="team"
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
        <el-select
          v-if="teams.length"
          v-model="teamId"
          class="team-select"
          filterable
          placeholder="选择工作台团队"
          :loading="optionsLoading"
          @change="changeTeam"
        >
          <el-option v-for="team in teams" :key="team.id" :label="`${team.name}（${team.memberCount} 人）`" :value="team.id" />
        </el-select>
        <CodeStatsRangePicker
          :option="rangeOption"
          :month="month"
          :custom-range="customRange"
          @update:option="rangeOption = $event"
          @update:month="month = $event"
          @update:custom-range="customRange = $event"
          @change="changeRange"
        />
        <span v-if="teamId" class="code-note">仅统计角色为后端开发或前端开发的成员</span>
      </template>
      <template #actions>
        <el-button size="small" :icon="User" @click="myIdentityVisible = true">我的 Git 身份</el-button>
        <el-button size="small" :icon="User" :disabled="!teamId" @click="identityDialogVisible = true">成员 Git 身份</el-button>
      </template>
    </CodeStatsHeader>

    <el-alert v-if="optionsError" type="warning" :closable="false" show-icon :title="optionsError" />
    <el-alert v-if="statisticsError" type="error" :closable="false" show-icon :title="statisticsError">
      <template #default><el-button link type="primary" @click="loadStatistics">重试</el-button></template>
    </el-alert>

    <div v-if="!teams.length && !optionsLoading" class="code-placeholder">
      <el-empty description="还没有加入工作台团队" :image-size="80" />
      <el-button type="primary" plain @click="openTeams">前往团队页</el-button>
    </div>
    <div v-else-if="!teamId" class="code-placeholder">
      <el-empty description="请选择工作台团队" :image-size="80" />
    </div>
    <div v-else-if="!statistics && statisticsLoading" class="code-loading"><el-skeleton :rows="9" animated /></div>
    <template v-else-if="statistics">
      <CodeStatsScanBanner
        v-show="scanDetailsVisible"
        id="team-code-scan-details"
        :scan="statistics.scan"
        :coverage="statistics.coverage"
        :refreshing="refreshing"
        @show-scope="scanScopeVisible = true"
        @cancelled="loadStatistics"
      />

      <div v-if="!statistics.members.length" class="code-placeholder">
        <el-empty description="当前团队没有配置为后端开发或前端开发的成员" :image-size="80" />
        <el-button type="primary" plain @click="openTeams">前往团队页</el-button>
      </div>
      <div v-else-if="!statistics.dataReady" class="code-placeholder">
        <el-icon v-if="activeMonth" :size="30"><Loading /></el-icon>
        <strong v-if="['FAILED', 'INTERRUPTED', 'CANCELLED'].includes(statistics.scan.aggregateStatus)">扫描尚未完成，请展开「数据同步」详情查看原因后重试</strong>
        <strong v-else-if="!activeMonth">当前范围尚无同步数据</strong>
        <strong v-else>正在准备团队代码统计</strong>
        <span v-if="activeMonth">扫描会覆盖团队全部成员可读的仓库和分支，在后台继续；可以离开页面后再回来查看。</span>
      </div>

      <template v-else>
        <div class="team-chart-grid">
          <article class="chart-card">
            <header>
              <h3>团队提交频率</h3>
              <p>按成员提交次数降序；点击成员柱联动指定成员分析</p>
            </header>
            <CodeStatsMemberBarChart :members="statistics.members" :selected-member-id="selectedMemberId" @select="selectMember" />
          </article>
          <article class="chart-card">
            <header>
              <h3>团队代码行变更</h3>
              <p>按新增代码行降序；绿色新增、红色删除，悬浮可查看净增</p>
            </header>
            <CodeStatsMemberDivergingChart :members="statistics.members" :selected-member-id="selectedMemberId" @select="selectMember" />
          </article>
        </div>
        <CodeStatsSelectedMemberPanel
          :key="panelKey"
          v-model:selected-member-id="selectedMemberId"
          :members="statistics.members"
          :workbench-team-id="teamId"
          :from="activeRange.from"
          :to="activeRange.to"
        />
      </template>
    </template>

    <CodeIdentityDialog
      v-model="identityDialogVisible"
      scope="WORKBENCH_TEAM"
      :workbench-team-id="teamId"
      :members="statistics?.members || []"
      :can-manage="selectedTeam?.administrator || false"
      @changed="identityChanged"
    />
    <CodeIdentityDialog
      v-model="myIdentityVisible"
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
      :can-retry="selectedTeam?.administrator || false"
      @retried="loadStatistics"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, User } from '@element-plus/icons-vue'
import {
  getCodeStatsOptions,
  getCodeStatsScan,
  getCodeStatsStatistics,
  triggerCodeStatsScan
} from '@/api/zhaogangCodeStats'
import type {
  ZhaogangCodeStatsOptions,
  ZhaogangCodeStatsRangeOption,
  ZhaogangCodeStatsScan,
  ZhaogangCodeStatsTeamStatistics
} from '@/types/zhaogangCodeStats'
import CodeStatsHeader from './components/CodeStatsHeader.vue'
import CodeStatsMemberBarChart from './components/CodeStatsMemberBarChart.vue'
import CodeStatsMemberDivergingChart from './components/CodeStatsMemberDivergingChart.vue'
import CodeStatsRangePicker from './components/CodeStatsRangePicker.vue'
import CodeStatsScanBanner from './components/CodeStatsScanBanner.vue'
import CodeStatsSelectedMemberPanel from './components/CodeStatsSelectedMemberPanel.vue'
import CodeIdentityDialog from './components/CodeIdentityDialog.vue'
import CodeScanScopeDrawer from './components/CodeScanScopeDrawer.vue'
import { activeScanMonth, formatCodeClock, formatCodeDuration, latestSuccessfulAt } from './codeStatsPresentation'
import { monthText, resolveCodeStatsRange, type ResolvedCodeStatsRange } from '@/services/zhaogangCodeStatsRange'
import { useCodeStatsScanPolling } from './useCodeStatsScanPolling'

const router = useRouter()
const rangeOption = ref<ZhaogangCodeStatsRangeOption>('week')
const month = ref(monthText())
const customRange = ref<[string, string] | null>(null)
const initialRange = resolveCodeStatsRange(rangeOption.value, month.value, customRange.value)
const activeRange = ref({ from: initialRange.from, to: initialRange.to, label: initialRange.label })
const options = ref<ZhaogangCodeStatsOptions | null>(null)
const optionsLoading = ref(false)
const optionsError = ref('')
const teamId = ref<number | null>(null)
const statistics = ref<ZhaogangCodeStatsTeamStatistics | null>(null)
const statisticsLoading = ref(false)
const statisticsError = ref('')
const selectedMemberId = ref<number | null>(null)
const identityDialogVisible = ref(false)
const myIdentityVisible = ref(false)
const scanScopeVisible = ref(false)
const scanDetailsVisible = ref(false)
const rescanning = ref(false)
const panelKey = ref(0)
let statisticsSequence = 0

const teams = computed(() => options.value?.teams || [])
const selectedTeam = computed(() => teams.value.find(team => team.id === teamId.value) || null)
const polling = useCodeStatsScanPolling({
  fetchScan: () => teamId.value
    ? getCodeStatsScan({
      from: activeRange.value.from,
      to: activeRange.value.to,
      scope: 'WORKBENCH_TEAM',
      workbenchTeamId: teamId.value
    })
    : Promise.reject(new Error('未选择团队')),
  onScan: (scan) => {
    if (statistics.value) statistics.value = { ...statistics.value, scan }
  },
  onProgress: async () => { await loadStatistics() },
  onFinished: (scan) => {
    if (statistics.value) statistics.value = { ...statistics.value, scan }
    void loadStatistics()
    panelKey.value += 1
  }
})

const activeMonth = computed(() => activeScanMonth(statistics.value?.scan.months || []))
const cacheTime = computed(() => formatCodeClock(latestSuccessfulAt(statistics.value?.scan.months || [])))
const refreshing = computed(() => Boolean(statistics.value?.refreshing))
const rescanDisabled = computed(() => !teamId.value || (Boolean(activeMonth.value) || ['RUNNING', 'QUEUED'].includes(statistics.value?.scan.sync?.status || ''))
  || (statistics.value?.scan.sync?.retryAfterSeconds ?? statistics.value?.scan.retryAfterSeconds ?? 0) > 0 || rescanning.value)
const rescanTip = computed(() => {
  if (activeMonth.value) return '扫描正在进行，可以离开页面，扫描会在后台继续'
  const retry = statistics.value?.scan.sync?.retryAfterSeconds ?? statistics.value?.scan.retryAfterSeconds ?? 0
  if (retry > 0) return `同步冷却中，约 ${formatCodeDuration(retry)} 后可再次同步`
  return ''
})

const loadOptions = async () => {
  optionsLoading.value = true
  optionsError.value = ''
  try {
    options.value = await getCodeStatsOptions()
    if (!teams.value.length) {
      teamId.value = null
      return
    }
    if (!teamId.value || !teams.value.some(team => team.id === teamId.value)) {
      teamId.value = teams.value[0].id
    }
  } catch (error) {
    optionsError.value = error instanceof Error ? error.message : '工作台团队加载失败'
  } finally {
    optionsLoading.value = false
  }
}

const loadStatistics = async () => {
  if (!teamId.value) {
    statistics.value = null
    return
  }
  const current = ++statisticsSequence
  statisticsLoading.value = true
  statisticsError.value = ''
  try {
    const result = await getCodeStatsStatistics({
      from: activeRange.value.from,
      to: activeRange.value.to,
      scope: 'WORKBENCH_TEAM',
      workbenchTeamId: teamId.value
    }) as ZhaogangCodeStatsTeamStatistics
    if (current !== statisticsSequence) return
    statistics.value = result
    if (!result.members.some(member => member.user.id === selectedMemberId.value)) {
      selectedMemberId.value = result.members[0]?.user.id ?? null
    }
    polling.begin(result.scan)
  } catch (error) {
    if (current !== statisticsSequence) return
    statisticsError.value = error instanceof Error ? error.message : '团队代码统计加载失败'
  } finally {
    if (current === statisticsSequence) statisticsLoading.value = false
  }
}

const changeTeam = () => {
  statistics.value = null
  selectedMemberId.value = null
  statisticsError.value = ''
  panelKey.value += 1
  void loadStatistics()
}

const changeRange = (range: ResolvedCodeStatsRange) => {
  activeRange.value = { from: range.from, to: range.to, label: range.label }
  panelKey.value += 1
  void loadStatistics()
}

const selectMember = (memberId: number) => {
  selectedMemberId.value = memberId
}



const applyScan = (scan: ZhaogangCodeStatsScan) => {
  if (statistics.value) statistics.value = { ...statistics.value, scan }
}

const rescan = async () => {
  if (rescanDisabled.value || !teamId.value) return
  rescanning.value = true
  try {
    const result = await triggerCodeStatsScan({
      scope: 'WORKBENCH_TEAM',
      workbenchTeamId: teamId.value,
      from: activeRange.value.from,
      to: activeRange.value.to,
      mode: 'SYNC'
    })
    applyScan(result.scan)
    if (result.accepted) {
      ElMessage.success('已提交本轮团队代码同步')
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
  panelKey.value += 1
}

const openTeams = () => { void router.push('/zhaogang/teams') }

onMounted(async () => {
  await loadOptions()
  await loadStatistics()
})
</script>

<style scoped>
.code-page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; min-width: 0; }
.code-loading { padding: 26px; background: #fff; border: 1px solid #e4e9f1; border-radius: 10px; }
.team-select { width: 220px; }
.team-chart-grid { display: grid; min-width: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.chart-card { min-width: 0; padding: 14px 16px; background: #fff; border: 1px solid #e4e9f1; border-radius: 10px; }
.chart-card header { margin-bottom: 8px; }
.chart-card h3 { margin: 0; color: #2b3a50; font-size: 15px; }
.chart-card p { margin: 5px 0 0; color: #8a96a9; font-size: 12px; }
.code-page :deep(:is(.member-chart-scroll, .bar-chart-scroll, .line-bar-scroll)::-webkit-scrollbar) { height: 8px; }
.code-page :deep(:is(.member-chart-scroll, .bar-chart-scroll, .line-bar-scroll)::-webkit-scrollbar-track) { background: #f2f5fa; border-radius: 999px; }
.code-page :deep(:is(.member-chart-scroll, .bar-chart-scroll, .line-bar-scroll)::-webkit-scrollbar-thumb) { background: #c1cddc; border-radius: 999px; }
.code-page :deep(:is(.member-chart-scroll, .bar-chart-scroll, .line-bar-scroll)::-webkit-scrollbar-thumb:hover) { background: #8a9cb3; }
.code-note { margin: 0; color: #8a96a9; font-size: 12px; line-height: 1.6; }
.code-placeholder { display: grid; min-height: 220px; place-items: center; align-content: center; gap: 10px; padding: 28px; color: #7b879a; background: #fff; border: 1px dashed #d8e2ef; border-radius: 10px; text-align: center; }
.code-placeholder strong { color: #44536a; font-size: 16px; }
.code-placeholder span { font-size: 12px; line-height: 1.6; }
@media (max-width: 1000px) {
  .team-chart-grid { grid-template-columns: 1fr; }
  .team-select { width: 100%; }
}
</style>
