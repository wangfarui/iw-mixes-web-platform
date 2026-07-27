export interface ToolUsageRecordDto {
  toolKey: string
}

export interface ToolUsageStat {
  toolKey: string
  totalUsageCount: number
  periodUsageCount: number
  todayUsageCount: number
}

export interface ToolUsageSummary {
  totalUsageCount: number
  todayUsageCount: number
  rankingPeriodDays: number
  toolStats: ToolUsageStat[]
  popularTools: ToolUsageStat[]
}

export interface GeneralResponse<T> {
  code: number
  message: string
  data: T
}
