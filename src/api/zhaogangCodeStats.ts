import { zhaogangRequest } from '@/api/zhaogang'
import type {
  ZhaogangCodeStatsCreateIdentityCommand,
  ZhaogangCodeStatsDiffRetryJob,
  ZhaogangCodeStatsEntriesQuery,
  ZhaogangCodeStatsEntryPage,
  ZhaogangCodeStatsFailures,
  ZhaogangCodeStatsIdentityMapping,
  ZhaogangCodeStatsIdentityPage,
  ZhaogangCodeStatsIdentityQuery,
  ZhaogangCodeStatsMemberStatistics,
  ZhaogangCodeStatsMemberStatisticsQuery,
  ZhaogangCodeStatsOptions,
  ZhaogangCodeStatsScan,
  ZhaogangCodeStatsScanCommand,
  ZhaogangCodeStatsScanQuery,
  ZhaogangCodeStatsScanTrigger,
  ZhaogangCodeStatsSelfStatistics,
  ZhaogangCodeStatsStatisticsQuery,
  ZhaogangCodeStatsTeamStatistics,
  ZhaogangCodeStatsUpdateIdentityCommand
} from '@/types/zhaogangCodeStats'

const BASE = '/code-stats'

const queryString = (params: Record<string, string | number | boolean | null | undefined>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value))
  })
  return search.toString()
}

export const getCodeStatsOptions = () => zhaogangRequest<ZhaogangCodeStatsOptions>(`${BASE}/options`)

export const getCodeStatsStatistics = (params: ZhaogangCodeStatsStatisticsQuery) =>
  zhaogangRequest<ZhaogangCodeStatsSelfStatistics | ZhaogangCodeStatsTeamStatistics>(
    `${BASE}/statistics?${queryString({ ...params })}`
  )

export const getCodeStatsMemberStatistics = (params: ZhaogangCodeStatsMemberStatisticsQuery) =>
  zhaogangRequest<ZhaogangCodeStatsMemberStatistics>(
    `${BASE}/member-statistics?${queryString({ ...params })}`
  )

export const getCodeStatsEntries = (params: ZhaogangCodeStatsEntriesQuery) =>
  zhaogangRequest<ZhaogangCodeStatsEntryPage>(`${BASE}/entries?${queryString({ ...params })}`)

export const getCodeStatsScan = (params: ZhaogangCodeStatsScanQuery) =>
  zhaogangRequest<ZhaogangCodeStatsScan>(`${BASE}/scan?${queryString({ ...params })}`)

export const triggerCodeStatsScan = (command: ZhaogangCodeStatsScanCommand) =>
  zhaogangRequest<ZhaogangCodeStatsScanTrigger>(`${BASE}/scan`, {
    method: 'POST',
    body: JSON.stringify(command)
  })

export const cancelCodeStatsScan = (jobId: number) =>
  zhaogangRequest<ZhaogangCodeStatsScan>(`${BASE}/scan/${jobId}/cancel`, { method: 'POST' })

export const getCodeStatsFailures = (jobId: number, pageNumber = 1, pageSize = 20) =>
  zhaogangRequest<ZhaogangCodeStatsFailures>(
    `${BASE}/scan/${jobId}/failures?${queryString({ pageNumber, pageSize })}`
  )

export const retryCodeStatsDiffs = (jobId: number, targets: { depotId: number; sha: string }[]) =>
  zhaogangRequest<ZhaogangCodeStatsDiffRetryJob>(`${BASE}/scan/${jobId}/diff-retry`, {
    method: 'POST',
    body: JSON.stringify({ targets })
  })

export const getCodeStatsDiffRetry = (jobId: number) =>
  zhaogangRequest<ZhaogangCodeStatsDiffRetryJob>(`${BASE}/diff-retry/${jobId}`)

export const getCodeStatsIdentities = (params: ZhaogangCodeStatsIdentityQuery) =>
  zhaogangRequest<ZhaogangCodeStatsIdentityPage>(`${BASE}/identities?${queryString({ ...params })}`)

export const createCodeStatsIdentity = (command: ZhaogangCodeStatsCreateIdentityCommand) =>
  zhaogangRequest<ZhaogangCodeStatsIdentityMapping>(`${BASE}/identities`, {
    method: 'POST',
    body: JSON.stringify(command)
  })

export const updateCodeStatsIdentity = (id: number, command: ZhaogangCodeStatsUpdateIdentityCommand) =>
  zhaogangRequest<ZhaogangCodeStatsIdentityMapping>(`${BASE}/identities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(command)
  })

export const deleteCodeStatsIdentity = (id: number) =>
  zhaogangRequest<void>(`${BASE}/identities/${id}`, { method: 'DELETE' })
