<template>
  <el-dialog
    :model-value="modelValue"
    class="absence-dialog"
    title="缺勤统计"
    width="760px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-skeleton v-if="loading" :rows="5" animated />
    <el-alert v-else-if="error" type="error" :closable="false" show-icon :title="error" />
    <template v-else-if="report">
      <div class="absence-meta">
        <span>统计月份：{{ monthLabel }}</span>
        <span>统计范围：{{ rangeLabel }}</span>
      </div>
      <el-alert
        v-if="report.coverage.partial"
        class="absence-alert"
        type="warning"
        :closable="false"
        show-icon
        :title="coverageWarning"
      />
      <el-empty v-if="!report.members.length" description="所选范围内没有缺勤记录" :image-size="90" />
      <el-table v-else :data="report.members" size="small" stripe>
        <el-table-column label="成员" min-width="150">
          <template #default="{ row }">
            <div class="member-cell">
              <el-avatar :size="28" :src="row.user.avatar">{{ row.user.name?.slice(0, 1) }}</el-avatar>
              <span>{{ row.user.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="absenceDays" label="缺勤天数" width="100" align="center" />
        <el-table-column label="缺勤日期及工时" min-width="360">
          <template #default="{ row }">
            <div class="absence-day-list">
              <el-tag v-for="day in row.days" :key="day.date" size="small" effect="plain">
                {{ day.date }} · {{ formatHours(day.hours) }}h
              </el-tag>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <el-empty v-else description="暂无缺勤数据" :image-size="90" />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ZhaogangWorklogAbsence } from '@/types/zhaogang'

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const props = defineProps<{
  modelValue: boolean
  loading: boolean
  error: string
  month: string
  report: ZhaogangWorklogAbsence | null
}>()

const monthLabel = computed(() => {
  const [year, month] = props.month.split('-').map(Number)
  return `${year} 年 ${month} 月`
})
const rangeLabel = computed(() => {
  if (!props.report?.from || !props.report.toExclusive || props.report.from >= props.report.toExclusive) return '无工作日范围'
  const [year, month, day] = props.report.toExclusive.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day - 1))
  return `${props.report.from} 至 ${date.toISOString().slice(0, 10)}`
})
const coverageWarning = computed(() => {
  const failed = props.report?.coverage.failedMemberCount ?? 0
  return failed > 0
    ? `部分成员数据未完整取得，${failed} 名成员不纳入缺勤判断`
    : '部分成员数据未完整取得，数据不完整的成员不纳入缺勤判断'
})
const formatHours = (hours: number) => Number(hours || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
</script>

<style scoped>
.absence-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 18px; margin-bottom: 14px; color: #65738a; font-size: 13px; }
.absence-alert { margin-bottom: 14px; }
.member-cell { display: flex; align-items: center; gap: 8px; color: #35445b; }
.absence-day-list { display: flex; flex-wrap: wrap; gap: 6px; }
@media (max-width: 760px) {
  .absence-meta { flex-direction: column; }
}
</style>
