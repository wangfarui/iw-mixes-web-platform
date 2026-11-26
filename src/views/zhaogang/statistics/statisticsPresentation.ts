import type { StatisticsIndicator, StatisticsMetric } from '@/types/zhaogangStatistics'

export const worklogMetrics = ['UTILIZATION_RATE', 'TOTAL_HOURS', 'OVERTIME_HOURS', 'OVERTIME_DAYS'] as const
const codeMetrics = ['COMMIT_COUNT', 'CHANGED_LINES', 'ADDITIONS', 'DELETIONS'] as const

export const tableMetrics = [...worklogMetrics, ...codeMetrics]

export const metricLabels: Record<StatisticsMetric, string> = {
  UTILIZATION_RATE: '工时利用率',
  TOTAL_HOURS: '总工时',
  OVERTIME_HOURS: '加班时长',
  OVERTIME_DAYS: '加班天数',
  COMMIT_COUNT: '提交次数',
  CHANGED_LINES: '提交行数',
  ADDITIONS: '新增行数',
  DELETIONS: '删除行数'
}

const number = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })
const fixed = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const time = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
})

export function formatMetric(metric: StatisticsMetric, value?: number | null, ranking = false) {
  if (value == null) return '—'
  switch (metric) {
    case 'UTILIZATION_RATE': return fixed.format(value) + '%'
    case 'TOTAL_HOURS':
    case 'OVERTIME_HOURS': return number.format(value) + 'h'
    case 'OVERTIME_DAYS': return number.format(value) + '天'
    case 'COMMIT_COUNT': return number.format(value) + (ranking ? ' 次' : '')
    default: return number.format(value) + (ranking ? ' 行' : '')
  }
}

export function formatIndicator(indicator: StatisticsIndicator | undefined, precision?: number) {
  if (indicator?.value == null) return '—'
  return precision === undefined ? number.format(indicator.value) : new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(indicator.value)
}

export function sampleText(indicator?: StatisticsIndicator) {
  return indicator ? `有效样本 ${indicator.sampleCount} / ${indicator.targetCount} 人` : ''
}

export function formatTime(value?: string | null) {
  return value ? time.format(new Date(value)) : '—'
}

export function formatDelta(value: number | null) {
  if (value == null) return '—'
  if (value === 0) return '持平'
  return value > 0 ? `↑ ${value}` : `↓ ${-value}`
}
