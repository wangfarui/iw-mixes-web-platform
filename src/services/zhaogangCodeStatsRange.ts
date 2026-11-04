import type { ZhaogangCodeStatsRangeOption } from '@/types/zhaogangCodeStats'

export interface ResolvedCodeStatsRange {
  option: ZhaogangCodeStatsRangeOption
  month: string
  customRange: [string, string] | null
  from: string
  to: string
  label: string
  days: number
  valid: boolean
  error: string
}

export const CODE_STATS_MAX_DAYS = 31
export const CODE_STATS_RETENTION_MONTHS = 24

export const dateText = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const parseDateText = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const monthText = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export const addDays = (value: string, days: number) => {
  const date = parseDateText(value)
  date.setDate(date.getDate() + days)
  return dateText(date)
}

export const mondayOfWeek = (now: Date) => {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekday = date.getDay() || 7
  date.setDate(date.getDate() - weekday + 1)
  return dateText(date)
}

export const daysBetweenInclusive = (from: string, to: string) =>
  Math.round((parseDateText(to).getTime() - parseDateText(from).getTime()) / 86400000) + 1

export const earliestStatsDate = (now = new Date(), retentionMonths = CODE_STATS_RETENTION_MONTHS) =>
  dateText(new Date(now.getFullYear(), now.getMonth() - Math.max(1, retentionMonths) + 1, 1))

export const resolveCodeStatsRange = (
  option: ZhaogangCodeStatsRangeOption,
  month: string,
  customRange: [string, string] | null,
  now = new Date()
): ResolvedCodeStatsRange => {
  const today = dateText(now)
  const currentMonth = monthText(now)
  const base = { option, month, customRange }
  if (option === 'week') {
    const from = mondayOfWeek(now)
    return { ...base, from, to: today, label: rangeLabel(from, today), days: daysBetweenInclusive(from, today), valid: true, error: '' }
  }
  if (option === 'month') {
    const from = `${currentMonth}-01`
    return { ...base, from, to: today, label: rangeLabel(from, today), days: daysBetweenInclusive(from, today), valid: true, error: '' }
  }
  if (option === 'specific') {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return { ...base, from: '', to: '', label: '', days: 0, valid: false, error: '请选择月份' }
    }
    if (month > currentMonth) {
      return { ...base, from: '', to: '', label: '', days: 0, valid: false, error: '不能选择未来月份' }
    }
    const earliest = earliestStatsDate(now).slice(0, 7)
    if (month < earliest) {
      return { ...base, from: '', to: '', label: '', days: 0, valid: false, error: `只支持最近 ${CODE_STATS_RETENTION_MONTHS} 个自然月` }
    }
    const [year, monthNumber] = month.split('-').map(Number)
    const monthEnd = dateText(new Date(year, monthNumber, 0))
    const from = `${month}-01`
    const to = monthEnd > today ? today : monthEnd
    return { ...base, from, to, label: rangeLabel(from, to), days: daysBetweenInclusive(from, to), valid: true, error: '' }
  }
  if (!customRange || customRange.length !== 2 || !customRange[0] || !customRange[1]) {
    return { ...base, from: '', to: '', label: '', days: 0, valid: false, error: '请选择时间范围' }
  }
  const [from, to] = customRange
  if (to < from) {
    return { ...base, from, to, label: '', days: 0, valid: false, error: '结束日期不能早于开始日期' }
  }
  if (to > today) {
    return { ...base, from, to, label: '', days: 0, valid: false, error: '不能选择未来日期' }
  }
  if (from < earliestStatsDate(now)) {
    return { ...base, from, to, label: '', days: 0, valid: false, error: `只支持最近 ${CODE_STATS_RETENTION_MONTHS} 个自然月` }
  }
  const days = daysBetweenInclusive(from, to)
  if (days > CODE_STATS_MAX_DAYS) {
    return { ...base, from, to, label: '', days, valid: false, error: `最多选择 ${CODE_STATS_MAX_DAYS} 天` }
  }
  return { ...base, from, to, label: rangeLabel(from, to), days, valid: true, error: '' }
}

export const disableCodeStatsDate = (date: Date, now = new Date()) => {
  const value = dateText(date)
  return value > dateText(now) || value < earliestStatsDate(now)
}

const rangeLabel = (from: string, to: string) => `${from} ~ ${to}`
