import type { ZhaogangCodingRole } from './zhaogang'

export type WorklogMetric = 'UTILIZATION_RATE' | 'TOTAL_HOURS' | 'OVERTIME_HOURS' | 'OVERTIME_DAYS'
export type CodeMetric = 'COMMIT_COUNT' | 'CHANGED_LINES' | 'ADDITIONS' | 'DELETIONS'
export type StatisticsMetric = WorklogMetric | CodeMetric
export type StatisticsRangeKind = 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'CUSTOM'
export type StatisticsRole = ZhaogangCodingRole | 'UNSET'
export type StatisticsRefreshState = 'IDLE' | 'QUEUED' | 'RUNNING' | 'FAILED' | 'INITIALIZING'

export interface StatisticsQuery {
  rangeKind: StatisticsRangeKind
  from?: string
  to?: string
  worklogMetric: WorklogMetric
  codeMetric: CodeMetric
  sortMetric: StatisticsMetric
  sortOrder: 'ASC' | 'DESC'
  keyword?: string
  role?: StatisticsRole
  pageNumber: number
  pageSize: number
  snapshotId?: string
  refresh?: boolean
}

export interface StatisticsRange {
  from: string
  to: string
}

export interface StatisticsIndicator {
  value: number | null
  status: 'READY' | 'PARTIAL' | 'UNAVAILABLE' | 'NOT_APPLICABLE'
  reasonCodes: string[]
  sampleCount: number
  targetCount: number
}

export interface StatisticsIssue {
  domain: 'CODE' | 'WORKLOG'
  reasonCode: string
  safeMessage: string
  affectedMetrics: StatisticsMetric[]
}

export interface StatisticsRanking {
  metric: StatisticsMetric
  items: { userId: string; name: string; rank: number; value: number; self: boolean }[]
  myPosition: { rank: number | null; rankDelta: number | null; reason: string | null; comparisonReason: string | null }
  coverage: { sampleCount: number; targetCount: number }
  cutoffTied: boolean
  allZero: boolean
}

export interface StatisticsMember {
  userId: string
  name: string
  avatar: string | null
  role: ZhaogangCodingRole | null
  self: boolean
  rank: number | null
  rankDelta: number | null
  comparisonReason: string | null
  values: Partial<Record<StatisticsMetric, number>>
  issues: StatisticsIssue[]
}

export interface StatisticsReport {
  range: StatisticsRange
  comparisonRange: StatisticsRange | null
  snapshotId: string | null
  hasData: boolean
  refresh: {
    state: StatisticsRefreshState
    stale: boolean
    jobId: string | null
    generatedAt: string | null
    safeMessage: string | null
  }
  population: { total: number; participating: number; excluded: number; developers: number } | null
  summary: {
    dailyHours: StatisticsIndicator
    overtimeDays: StatisticsIndicator
    overtimeHours: StatisticsIndicator
    commitCount: StatisticsIndicator
    changedLines: StatisticsIndicator
  } | null
  worklogRanking: StatisticsRanking | null
  codeRanking: StatisticsRanking | null
  members: {
    items: StatisticsMember[]
    page: { pageNumber: number; pageSize: number; total: number; myPage: number | null }
    roles: StatisticsRole[]
  } | null
  dataStatus: { worklogSyncedAt: string | null; codeSyncedAt: string | null; affectedMemberCount: number } | null
}
