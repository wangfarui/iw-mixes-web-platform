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
    </template>
    <el-empty v-else-if="!error" description="选择成员后查看汇总和趋势" :image-size="70" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getCodeStatsMemberStatistics } from '@/api/zhaogangCodeStats'
import type { ZhaogangCodeStatsMember, ZhaogangCodeStatsMemberStatistics } from '@/types/zhaogangCodeStats'
import CodeStatsBarChart, { type CodeStatsBarItem } from './CodeStatsBarChart.vue'
import CodeStatsKpiCards from './CodeStatsKpiCards.vue'
import CodeStatsLineBarChart from './CodeStatsLineBarChart.vue'
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

watch(() => [props.selectedMemberId, props.workbenchTeamId, props.from, props.to], load, { immediate: true })
</script>

<style scoped>
.selected-member-panel { padding: 16px 18px; background: #fff; border: 1px solid #e4e9f1; border-radius: 10px; }
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
