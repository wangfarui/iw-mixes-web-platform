<template>
  <section class="selected-member-panel">
    <header class="panel-header">
      <h3>指定成员分析</h3>
      <el-select
        :model-value="selectedMemberId"
        class="member-select"
        filterable
        placeholder="选择团队成员"
        :disabled="!members.length"
        @update:model-value="changeMember"
      >
        <el-option
          v-for="member in members"
          :key="member.user.id"
          :label="member.user.name"
          :value="member.user.id"
        />
      </el-select>
    </header>
    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error">
      <template #default><el-button link type="primary" @click="load">重试</el-button></template>
    </el-alert>
    <div v-if="!members.length" class="panel-empty">团队还没有可分析的成员</div>
    <div v-else-if="loading" class="panel-loading"><el-skeleton :rows="5" animated /></div>
    <template v-else-if="data">
      <CodeStatsKpiCards :summary="data.summary" />
      <div class="panel-grid">
        <div class="chart-panel">
          <h4>每日提交频率</h4>
          <CodeStatsBarChart :items="dailyBarItems" :height="276" show-details unit="（次）" aria-label="指定成员每日提交频率" />
        </div>
        <div class="chart-panel">
          <h4>代码行变更趋势</h4>
          <CodeStatsLineBarChart :items="data.daily" show-details aria-label="指定成员代码行变更趋势" />
        </div>
      </div>
      <div v-if="data.fileTypes && data.commitChanges" class="panel-grid">
        <div class="chart-panel">
          <h4>文件类型变更占比</h4>
          <CodeStatsFileTypePie :items="data.fileTypes" :changed-lines="data.summary.additions + data.summary.deletions" />
        </div>
        <div class="chart-panel">
          <h4>单次提交变更规模</h4>
          <CodeStatsCommitScatter :items="data.commitChanges" />
        </div>
      </div>
    </template>
    <el-empty v-else-if="!error" description="选择成员后查看汇总和趋势" :image-size="70" />
    <CodeCommitTable
      v-if="members.length && workbenchTeamId && selectedMemberId"
      :key="`${workbenchTeamId}:${selectedMemberId}:${from}:${to}`"
      class="member-entries"
      :items="entries?.items || []"
      :page="entries?.page || null"
      :loading="entriesLoading"
      :error="entriesError"
      :range-label="`${from} 至 ${to}`"
      :keyword="keyword"
      :depot-id="depotId"
      :repositories="repositories"
      show-repository-filter
      sortable
      empty-text="当前成员在所选范围及筛选条件下没有提交"
      @page-change="changePage"
      @search="searchEntries"
      @depot-change="changeDepot"
      @sort-change="changeSort"
      @retry="loadEntries"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getCodeStatsEntries, getCodeStatsMemberStatistics } from '@/api/zhaogangCodeStats'
import type {
  ZhaogangCodeStatsMember, ZhaogangCodeStatsMemberStatistics, ZhaogangCodeStatsEntryPage,
  ZhaogangCodeStatsRepository, ZhaogangCodeStatsEntrySort, ZhaogangCodeStatsSortOrder
} from '@/types/zhaogangCodeStats'
import CodeCommitTable from './CodeCommitTable.vue'
import CodeStatsBarChart, { type CodeStatsBarItem } from './CodeStatsBarChart.vue'
import CodeStatsKpiCards from './CodeStatsKpiCards.vue'
import CodeStatsLineBarChart from './CodeStatsLineBarChart.vue'
import CodeStatsFileTypePie from './CodeStatsFileTypePie.vue'
import CodeStatsCommitScatter from './CodeStatsCommitScatter.vue'
import { dailyCodeDetails } from '../codeStatsPresentation'

const props = defineProps<{
  members: ZhaogangCodeStatsMember[]
  workbenchTeamId: number | null
  from: string
  to: string
  selectedMemberId: number | null
}>()

const emit = defineEmits<{ (event: 'update:selectedMemberId', value: number): void }>()

const data = ref<ZhaogangCodeStatsMemberStatistics | null>(null)
const loading = ref(false)
const error = ref('')
let sequence = 0
const entries = ref<ZhaogangCodeStatsEntryPage | null>(null)
const repositories = ref<ZhaogangCodeStatsRepository[]>([])
const entriesLoading = ref(false)
const entriesError = ref('')
const keyword = ref('')
const depotId = ref<number | null>(null)
const pageNumber = ref(1)
const sortBy = ref<ZhaogangCodeStatsEntrySort>('COMMIT_AT')
const sortOrder = ref<ZhaogangCodeStatsSortOrder>('DESC')
let entriesSequence = 0

const dailyBarItems = computed<CodeStatsBarItem[]>(() => (data.value?.daily || []).map(item => ({
  label: item.date.slice(8),
  value: item.commitCount,
  title: dailyCodeDetails(item),
  rest: item.dayType === 'REST_DAY'
})))

const changeMember = (value: number) => {
  emit('update:selectedMemberId', value)
}

const load = async () => {
  const current = ++sequence
  data.value = null
  error.value = ''
  if (!props.workbenchTeamId || !props.selectedMemberId || !props.from || !props.to) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const result = await getCodeStatsMemberStatistics({
      from: props.from,
      to: props.to,
      workbenchTeamId: props.workbenchTeamId,
      memberUserId: props.selectedMemberId
    })
    if (current === sequence) data.value = result
  } catch (requestError) {
    if (current === sequence) {
      error.value = requestError instanceof Error ? requestError.message : '成员代码统计加载失败'
    }
  } finally {
    if (current === sequence) loading.value = false
  }
}

const loadEntries = async () => {
  const current = ++entriesSequence
  entriesError.value = ''
  if (!props.workbenchTeamId || !props.selectedMemberId || !props.from || !props.to) {
    entriesLoading.value = false
    return
  }
  entriesLoading.value = true
  try {
    const result = await getCodeStatsEntries({
      from: props.from, to: props.to, scope: 'WORKBENCH_TEAM',
      workbenchTeamId: props.workbenchTeamId, memberUserId: props.selectedMemberId,
      depotId: depotId.value, keyword: keyword.value || undefined,
      pageNumber: pageNumber.value, pageSize: 20,
      sortBy: sortBy.value, sortOrder: sortOrder.value
    })
    if (current !== entriesSequence) return
    // Older backends ignore team/member parameters and return personal entries.
    if (!Array.isArray(result.repositories) || result.items.some(item => typeof item.depotId !== 'number')) {
      throw new Error('成员提交明细暂不可用，请联系管理员更新后端服务后重试')
    }
    entries.value = result
    repositories.value = result.repositories
  } catch (requestError) {
    if (current !== entriesSequence) return
    entries.value = null
    entriesError.value = requestError instanceof Error ? requestError.message : '成员提交明细加载失败'
  } finally {
    if (current === entriesSequence) entriesLoading.value = false
  }
}

const searchEntries = (value: string) => {
  keyword.value = value
  pageNumber.value = 1
  void loadEntries()
}
const changeDepot = (value: number | null) => {
  depotId.value = value
  pageNumber.value = 1
  void loadEntries()
}
const changeSort = (field: ZhaogangCodeStatsEntrySort, order: ZhaogangCodeStatsSortOrder) => {
  if (sortBy.value === field && sortOrder.value === order) return
  sortBy.value = field
  sortOrder.value = order
  pageNumber.value = 1
  void loadEntries()
}
const changePage = (value: number) => {
  pageNumber.value = value
  void loadEntries()
}

watch(() => [props.selectedMemberId, props.workbenchTeamId, props.from, props.to], () => {
  entries.value = null
  repositories.value = []
  keyword.value = ''
  depotId.value = null
  pageNumber.value = 1
  sortBy.value = 'COMMIT_AT'
  sortOrder.value = 'DESC'
  void load()
  void loadEntries()
}, { immediate: true })
onBeforeUnmount(() => { sequence += 1; entriesSequence += 1 })
</script>

<style scoped>
.selected-member-panel { min-width: 0; padding: 16px 18px; background: #fff; border: 1px solid #e4e9f1; border-radius: 10px; }
.member-entries { min-width: 0; margin-top: 16px; padding: 16px 0 0; border: 0; border-top: 1px solid #e8edf5; border-radius: 0; }
.panel-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
.panel-header h3 { margin: 0; color: #2b3a50; font-size: 16px; }
.member-select { width: 220px; }
.panel-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 12px; }
.chart-panel { min-width: 0; padding: 12px; background: #fbfcff; border: 1px solid #e8edf5; border-radius: 8px; }
.chart-panel h4 { margin: 0 0 6px; color: #4d5c72; font-size: 13px; }
.panel-empty, .panel-loading { padding: 26px 0; }
.panel-empty { color: #8a96a9; text-align: center; }
@media (max-width: 900px) {
  .panel-grid { grid-template-columns: 1fr; }
  .member-select { width: 100%; }
}
</style>
