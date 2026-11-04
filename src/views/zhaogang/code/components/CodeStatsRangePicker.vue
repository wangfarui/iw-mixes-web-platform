<template>
  <div class="code-range-picker">
    <el-radio-group :model-value="option" size="small" @change="changeOption">
      <el-radio-button value="week">本周</el-radio-button>
      <el-radio-button value="month">本月</el-radio-button>
      <el-radio-button value="specific">指定月</el-radio-button>
      <el-radio-button value="custom">自定义</el-radio-button>
    </el-radio-group>
    <el-date-picker
      v-if="option === 'specific'"
      :model-value="month"
      type="month"
      size="small"
      value-format="YYYY-MM"
      placeholder="选择月份"
      :clearable="false"
      :disabled-date="(date: Date) => disableCodeStatsDate(date)"
      class="range-month"
      @update:model-value="changeMonth"
    />
    <el-date-picker
      v-if="option === 'custom'"
      :model-value="customRange || undefined"
      type="daterange"
      size="small"
      value-format="YYYY-MM-DD"
      range-separator="至"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      :clearable="false"
      :disabled-date="(date: Date) => disableCodeStatsDate(date)"
      class="range-custom"
      @update:model-value="changeCustomRange"
    />
    <span v-if="resolved.valid" class="range-label">{{ resolved.label }} · {{ resolved.days }} 天</span>
    <span v-else class="range-error">{{ resolved.error }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ZhaogangCodeStatsRangeOption } from '@/types/zhaogangCodeStats'
import {
  disableCodeStatsDate,
  resolveCodeStatsRange,
  type ResolvedCodeStatsRange
} from '@/services/zhaogangCodeStatsRange'

const props = defineProps<{
  option: ZhaogangCodeStatsRangeOption
  month: string
  customRange: [string, string] | null
}>()

const emit = defineEmits<{
  (event: 'update:option', value: ZhaogangCodeStatsRangeOption): void
  (event: 'update:month', value: string): void
  (event: 'update:customRange', value: [string, string] | null): void
  (event: 'change', value: ResolvedCodeStatsRange): void
}>()

const resolved = computed(() => resolveCodeStatsRange(props.option, props.month, props.customRange))

const changeOption = (value: string | number | boolean | undefined) => {
  if (value !== 'week' && value !== 'month' && value !== 'specific' && value !== 'custom') return
  emit('update:option', value)
  notify(value, props.month, props.customRange)
}

const changeMonth = (value: string | null) => {
  if (!value) return
  emit('update:month', value)
  notify(props.option, value, props.customRange)
}

const changeCustomRange = (value: string[] | null) => {
  const range: [string, string] | null = value?.length === 2 && value[0] && value[1]
    ? [value[0], value[1]] : null
  emit('update:customRange', range)
  notify(props.option, props.month, range)
}

const notify = (option: ZhaogangCodeStatsRangeOption, month: string, customRange: [string, string] | null) => {
  const next = resolveCodeStatsRange(option, month, customRange)
  if (next.valid) emit('change', next)
}
</script>

<style scoped>
.code-range-picker { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.range-month { width: 132px; }
.range-custom { width: 232px; }
.range-label { color: #6b7a90; font-size: 12px; white-space: nowrap; }
.range-error { color: #dc4c4c; font-size: 12px; }
@media (max-width: 760px) {
  .range-month, .range-custom { width: 100%; }
}
</style>
