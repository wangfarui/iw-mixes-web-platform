<template>
  <section class="calendar-view">
    <header class="calendar-toolbar">
      <div class="calendar-title">
        <h2>找钢日历</h2>
        <el-tag :type="calendar?.canManage ? 'success' : 'info'" effect="plain">
          {{ calendar?.canManage ? '日历维护人' : '只读' }}
        </el-tag>
      </div>
      <div class="month-switcher">
        <el-tooltip content="上一月">
          <el-button circle :icon="ArrowLeft" aria-label="上一月" :disabled="loading" @click="shiftMonth(-1)" />
        </el-tooltip>
        <strong>{{ monthLabel }}</strong>
        <el-tooltip content="下一月">
          <el-button circle :icon="ArrowRight" aria-label="下一月" :disabled="loading" @click="shiftMonth(1)" />
        </el-tooltip>
        <el-button :icon="Aim" :disabled="loading || month === currentMonth" @click="goToday">本月</el-button>
      </div>
    </header>

    <div class="calendar-legend" aria-label="日期状态图例">
      <span><i class="legend-swatch legend-swatch--workday" />工作日</span>
      <span><i class="legend-swatch legend-swatch--rest" />休息日</span>
      <span><i class="legend-dot" />已调整</span>
      <span><i class="leave-mark" />我的请假</span>
    </div>

    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
    <el-skeleton v-if="loading && !calendar" :rows="8" animated />
    <div v-else class="calendar-shell">
      <div class="weekday-row" role="row">
        <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
      </div>
      <div class="month-grid">
        <div v-for="index in leadingDays" :key="`before-${index}`" class="day-cell day-cell--empty" />
        <button
          v-for="day in calendar?.days || []"
          :key="day.date"
          class="day-cell"
          :class="{
            'day-cell--workday': day.dayType === 'WORKDAY',
            'day-cell--rest': day.dayType === 'REST_DAY',
            'day-cell--today': day.date === today,
            'day-cell--leave': day.leave,
            'day-cell--editable': calendar?.canManage || (calendar?.canManageLeave && day.dayType === 'WORKDAY')
          }"
          type="button"
          :disabled="!calendar?.canManage && !(calendar?.canManageLeave && day.dayType === 'WORKDAY')"
          :aria-label="`${day.date} ${day.dayType === 'WORKDAY' ? '工作日' : '休息日'}${day.leave ? '，我的请假' : ''}`"
          @click="openEditor(day)"
        >
          <span class="day-number">{{ Number(day.date.slice(-2)) }}</span>
          <span class="day-status">{{ day.dayType === 'WORKDAY' ? '工作日' : '休息日' }}</span>
          <span v-if="day.overridden" class="override-mark">已调整</span>
          <span v-if="day.leave" class="leave-label">我的请假</span>
        </button>
        <div v-for="index in trailingDays" :key="`after-${index}`" class="day-cell day-cell--empty" />
      </div>
    </div>

    <el-dialog
      v-model="editorVisible"
      :title="selectedDay ? formatDateTitle(selectedDay.date) : '设置日期'"
      width="min(420px, calc(100% - 28px))"
      :close-on-click-modal="!saving"
    >
      <el-radio-group v-if="calendar?.canManage" v-model="selectedType" class="day-type-control">
        <el-radio-button value="WORKDAY">工作日</el-radio-button>
        <el-radio-button value="REST_DAY">休息日</el-radio-button>
      </el-radio-group>
      <div v-if="calendar?.canManageLeave" class="leave-control">
        <el-checkbox v-model="selectedLeave" :disabled="selectedType !== 'WORKDAY'">我的请假</el-checkbox>
        <small>请假日不计缺勤和平均工时分母；当天登记工时仍按工作日规则计算加班。</small>
      </div>
      <template #footer>
        <el-button v-if="selectedDay?.overridden" :icon="RefreshLeft" :loading="saving" @click="resetDay">恢复默认</el-button>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveDay">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Aim, ArrowLeft, ArrowRight, RefreshLeft } from '@element-plus/icons-vue'
import { getZhaogangCalendarMonth, resetZhaogangCalendarDay, updateZhaogangCalendarDay, updateZhaogangCalendarLeave } from '@/api/zhaogang'
import type { ZhaogangCalendarDay, ZhaogangCalendarDayType, ZhaogangCalendarMonth } from '@/types/zhaogang'

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const now = new Date()
const today = dateText(now)
const currentMonth = today.slice(0, 7)
const month = ref(currentMonth)
const calendar = ref<ZhaogangCalendarMonth | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const editorVisible = ref(false)
const selectedDay = ref<ZhaogangCalendarDay | null>(null)
const selectedType = ref<ZhaogangCalendarDayType>('WORKDAY')
const selectedLeave = ref(false)

const monthLabel = computed(() => {
  const [year, value] = month.value.split('-').map(Number)
  return `${year} 年 ${value} 月`
})
const leadingDays = computed(() => {
  const [year, value] = month.value.split('-').map(Number)
  return (new Date(year, value - 1, 1).getDay() + 6) % 7
})
const trailingDays = computed(() => {
  const used = leadingDays.value + (calendar.value?.days.length || 0)
  return used ? Math.ceil(used / 7) * 7 - used : 0
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    calendar.value = await getZhaogangCalendarMonth(month.value)
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '日历加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const shiftMonth = (offset: number) => {
  const [year, value] = month.value.split('-').map(Number)
  const next = new Date(year, value - 1 + offset, 1)
  month.value = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  calendar.value = null
  void load()
}

const goToday = () => {
  month.value = currentMonth
  calendar.value = null
  void load()
}

const openEditor = (day: ZhaogangCalendarDay) => {
  if (!calendar.value?.canManage && !(calendar.value?.canManageLeave && day.dayType === 'WORKDAY')) return
  selectedDay.value = day
  selectedType.value = day.dayType
  selectedLeave.value = day.leave
  editorVisible.value = true
}

const saveDay = async () => {
  if (!selectedDay.value) return
  saving.value = true
  try {
    if (calendar.value?.canManage && selectedType.value !== selectedDay.value.dayType) {
      calendar.value = await updateZhaogangCalendarDay(selectedDay.value.date, selectedType.value)
    }
    const desiredLeave = selectedType.value === 'WORKDAY' && selectedLeave.value
    if (calendar.value?.canManageLeave && desiredLeave !== selectedDay.value.leave) {
      calendar.value = await updateZhaogangCalendarLeave(selectedDay.value.date, desiredLeave)
    }
    editorVisible.value = false
    ElMessage.success('日历设置已更新')
  } catch (saveError) {
    ElMessage.error(saveError instanceof Error ? saveError.message : '日期状态更新失败')
  } finally {
    saving.value = false
  }
}

const resetDay = async () => {
  if (!selectedDay.value) return
  saving.value = true
  try {
    calendar.value = await resetZhaogangCalendarDay(selectedDay.value.date)
    editorVisible.value = false
    ElMessage.success('已恢复默认状态')
  } catch (resetError) {
    ElMessage.error(resetError instanceof Error ? resetError.message : '默认状态恢复失败')
  } finally {
    saving.value = false
  }
}

function dateText(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateTitle = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

onMounted(load)
</script>

<style scoped>
.calendar-view { display: grid; gap: 16px; min-width: 0; }
.calendar-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.calendar-title, .month-switcher, .calendar-legend { display: flex; align-items: center; }
.calendar-title { gap: 12px; }
.calendar-title h2 { margin: 0; color: #26344a; font-size: 22px; }
.month-switcher { gap: 10px; }
.month-switcher strong { min-width: 120px; color: #35445b; text-align: center; }
.calendar-legend { gap: 20px; color: #65738a; font-size: 13px; }
.calendar-legend span { display: inline-flex; align-items: center; gap: 7px; }
.legend-swatch { width: 14px; height: 14px; border: 1px solid; border-radius: 3px; }
.legend-swatch--workday { border-color: #b7cbea; background: #edf4ff; }
.legend-swatch--rest { border-color: #e8c98c; background: #fff7e8; }
.legend-dot { width: 7px; height: 7px; border-radius: 50%; background: #d85643; }
.leave-mark { width: 8px; height: 8px; border-radius: 50%; background: #7c5ce0; }
.calendar-shell { overflow: hidden; border: 1px solid #dfe5ee; border-radius: 8px; background: #fff; }
.weekday-row, .month-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.weekday-row { border-bottom: 1px solid #dfe5ee; background: #f7f9fc; }
.weekday-row span { padding: 11px 8px; color: #65738a; font-size: 13px; font-weight: 600; text-align: center; }
.month-grid { background: #e4e9f1; gap: 1px; }
.day-cell { position: relative; box-sizing: border-box; min-width: 0; min-height: 112px; padding: 12px; border: 0; border-radius: 0; background: #fff; color: #26344a; text-align: left; }
.day-cell:disabled { opacity: 1; cursor: default; }
.day-cell--editable { cursor: pointer; }
.day-cell--editable:hover { box-shadow: inset 0 0 0 2px #5790df; }
.day-cell--workday { background: #f8fbff; }
.day-cell--rest { background: #fff9ef; }
.day-cell--leave { background: #f7f2ff; }
.day-cell--empty { background: #f5f7fa; }
.day-cell--today { box-shadow: inset 0 0 0 2px #3478e5; }
.day-number { display: block; margin-bottom: 18px; font-size: 16px; font-weight: 700; }
.day-status { display: inline-flex; align-items: center; min-height: 24px; padding: 0 8px; border: 1px solid; border-radius: 4px; font-size: 12px; font-weight: 600; }
.day-cell--workday .day-status { border-color: #abc4e8; background: #e8f1ff; color: #3569ad; }
.day-cell--rest .day-status { border-color: #e5c27e; background: #fff1d6; color: #996518; }
.override-mark { position: absolute; right: 10px; bottom: 10px; color: #c44b3c; font-size: 11px; font-weight: 600; }
.leave-label { position: absolute; left: 10px; bottom: 10px; color: #7252c7; font-size: 11px; font-weight: 600; }
.day-type-control { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
.day-type-control :deep(.el-radio-button), .day-type-control :deep(.el-radio-button__inner) { width: 100%; }
.leave-control { display: grid; gap: 6px; margin-top: 18px; padding-top: 16px; border-top: 1px solid #e6ebf2; }
.leave-control small { color: #7a8799; font-size: 12px; line-height: 1.5; }
@media (max-width: 760px) {
  .calendar-toolbar { align-items: flex-start; flex-direction: column; }
  .month-switcher { width: 100%; justify-content: space-between; }
  .calendar-legend { gap: 12px; flex-wrap: wrap; }
  .calendar-shell { overflow-x: auto; }
  .weekday-row, .month-grid { min-width: 700px; }
  .day-cell { min-height: 96px; }
}
</style>
