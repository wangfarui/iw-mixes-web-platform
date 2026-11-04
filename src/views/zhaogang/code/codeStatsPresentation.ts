import type {
  ZhaogangCodeScanStage,
  ZhaogangCodeScanStatus,
  ZhaogangCodeStatsScanMonth
} from '@/types/zhaogangCodeStats'

export const formatCodeNumber = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString('zh-CN')

export const formatSignedNumber = (value: number | null | undefined) => {
  const number = Number(value || 0)
  return `${number > 0 ? '+' : ''}${number.toLocaleString('zh-CN')}`
}

export const formatCodePercent = (value: number | null | undefined) =>
  `${(Number(value || 0) * 100).toFixed(1)}%`

export const formatCodeDateTime = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`
}

export const formatCodeClock = (value: string | null | undefined) => {
  const formatted = formatCodeDateTime(value)
  return formatted === '—' ? formatted : formatted.slice(11)
}

export const formatCodeDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds))
  if (safe < 60) return `${safe} 秒`
  if (safe < 3600) return `${Math.floor(safe / 60)} 分钟`
  return `${Math.floor(safe / 3600)} 小时 ${Math.floor((safe % 3600) / 60)} 分`
}

export const scanStatusText = (status: ZhaogangCodeScanStatus | null | undefined) => ({
  NOT_STARTED: '尚未同步',
  QUEUED: '排队中',
  RUNNING: '后台同步中',
  COMPLETED: '已同步',
  PARTIAL: '部分完成',
  FAILED: '同步失败',
  CANCELLED: '已取消',
  INTERRUPTED: '已中断'
}[status || 'NOT_STARTED'] || '未知状态')

export const scanStatusTagType = (status: ZhaogangCodeScanStatus | null | undefined): 'success' | 'warning' | 'danger' | 'info' =>
  status === 'COMPLETED' ? 'success'
    : status === 'RUNNING' || status === 'QUEUED' || status === 'PARTIAL' ? 'warning'
      : status === 'FAILED' || status === 'INTERRUPTED' ? 'danger' : 'info'

export const scanStageText = (stage: ZhaogangCodeScanStage | null | undefined) => ({
  DISCOVERING: '发现仓库',
  IDENTITIES: '匹配成员身份',
  BRANCHES: '读取分支',
  COMMITS: '读取提交',
  DIFFS: '统计代码行',
  AGGREGATING: '汇总结果',
  DONE: '已完成'
}[stage || 'DISCOVERING'] || '处理中')

export const activeScanMonth = (months: ZhaogangCodeStatsScanMonth[] = []) =>
  months.find(month => month.status === 'RUNNING' || month.status === 'QUEUED') || null

export const latestSuccessfulAt = (months: ZhaogangCodeStatsScanMonth[] = []) =>
  months.map(month => month.lastSuccessfulAt).filter((value): value is string => Boolean(value))
    .sort().reverse()[0] || null

export const scanProgressPercent = (month: ZhaogangCodeStatsScanMonth | null) => {
  if (!month) return 0
  const { progress } = month
  const total = progress.reposTotal + progress.branchesTotal + progress.commitsTotal + progress.diffsTotal
  const done = progress.reposDone + progress.branchesDone + progress.commitsDone + progress.diffsDone
  return total <= 0 ? 0 : Math.min(100, Math.round(done / total * 100))
}

export const diffStatusText = (status: string) => ({
  PENDING: '待统计',
  OK: '已统计',
  SKIPPED_UNMAPPED: '未归属',
  SKIPPED_MERGE: '合并提交',
  SKIPPED_REPOSITORY: '该仓库仅统计提交次数，不统计行数',
  FAILED: '统计失败',
  TOO_LARGE: 'diff 过大'
}[status] || status)
