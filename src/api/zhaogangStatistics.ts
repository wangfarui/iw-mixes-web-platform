import { zhaogangRequest } from '@/api/zhaogang'
import type { StatisticsQuery, StatisticsReport } from '@/types/zhaogangStatistics'

export const getStatisticsReport = (query: StatisticsQuery, signal: AbortSignal) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return zhaogangRequest<StatisticsReport>(`/statistics/report?${params}`, { signal, cache: 'no-store' })
}
