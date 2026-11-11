export type ZhaogangCodeStatsScope = 'SELF' | 'WORKBENCH_TEAM'
export type ZhaogangCodeStatsRangeOption = 'week' | 'month' | 'specific' | 'custom'
export type ZhaogangCodeScanStatus =
  | 'NOT_STARTED'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED'
  | 'INTERRUPTED'
export type ZhaogangCodeScanStage =
  | 'DISCOVERING'
  | 'IDENTITIES'
  | 'BRANCHES'
  | 'COMMITS'
  | 'DIFFS'
  | 'AGGREGATING'
  | 'DONE'
export type ZhaogangCodeScanMode = 'SYNC' | 'FULL' | 'INCREMENTAL' | 'DIFF_BACKFILL'
export type ZhaogangCodeDiffStatus =
  | 'PENDING'
  | 'OK'
  | 'SKIPPED_UNMAPPED'
  | 'SKIPPED_MERGE'
  | 'SKIPPED_REPOSITORY'
  | 'FAILED'
  | 'TOO_LARGE'
export type ZhaogangCodeIdentityType = 'EMAIL' | 'NAME'
export type ZhaogangCodeIdentitySource = 'AUTO' | 'MANUAL' | 'SELF' | 'DEFAULT'
export type ZhaogangCodeDayType = 'WORKDAY' | 'REST_DAY'

export interface ZhaogangCodeStatsRange {
  from: string
  to: string
  days: number
  months: string[]
}

export interface ZhaogangCodeStatsTeamOption {
  id: number
  name: string
  memberCount: number
  administrator: boolean
}

export interface ZhaogangCodeStatsRescanPolicy {
  currentMonthCooldownSeconds: number
  historicalMonthCooldownSeconds: number
  failedRetrySeconds: number
  perUserCooldownSeconds: number
}

export interface ZhaogangCodeStatsOptions {
  teams: ZhaogangCodeStatsTeamOption[]
  rescanPolicy: ZhaogangCodeStatsRescanPolicy
  myIdentityCount: number
  serverTime: string
}

export interface ZhaogangCodeStatsScanProgress {
  reposDone: number
  reposTotal: number
  branchesDone: number
  branchesTotal: number
  commitsDone: number
  commitsTotal: number
  diffsDone: number
  diffsTotal: number
}

export interface ZhaogangCodeStatsScanMonth {
  month: string
  jobId: number | null
  mode: ZhaogangCodeScanMode | null
  status: ZhaogangCodeScanStatus
  stage: ZhaogangCodeScanStage | null
  progress: ZhaogangCodeStatsScanProgress
  startedAt: string | null
  finishedAt: string | null
  lastSuccessfulAt: string | null
  cooldownUntil: string | null
  retryAfterSeconds: number
  error: string | null
}

export interface ZhaogangCodeStatsSync {
  jobId?: number | null
  failedRepoCount?: number
  unavailableDiffCount?: number
  enabled: boolean
  from: string
  to: string | null
  retryAfterSeconds: number
  lastFinishedAt: string | null
  nextSyncAt: string | null
  status: ZhaogangCodeScanStatus
}

export interface ZhaogangCodeStatsScan {
  sync?: ZhaogangCodeStatsSync
  scope: ZhaogangCodeStatsScope
  workbenchTeamId: number | null
  range?: ZhaogangCodeStatsRange
  aggregateStatus: ZhaogangCodeScanStatus
  months: ZhaogangCodeStatsScanMonth[]
  retryAfterSeconds: number
}

export interface ZhaogangCodeStatsUser {
  id: number
  name: string
  avatar: string
}

export interface ZhaogangCodeStatsMemberIssue {
  user: ZhaogangCodeStatsUser
  reasonCode: string
  reason: string
}

export interface ZhaogangCodeStatsRepoIssue {
  projectName: string
  depotName: string
  reasonCode: string
  reason: string
}

export interface ZhaogangCodeStatsCoverage {
  scope: ZhaogangCodeStatsScope
  workbenchTeamId: number | null
  memberCount: number
  patMemberCount: number
  repoCount: number
  branchCount: number
  partial: boolean
  truncated: boolean
  identityConflictCount: number
  unmatchedCommitCount: number | null
  failedDiffCount: number
  diffCoverage: number
  excludedMergeCommitCount: number
  memberIssues: ZhaogangCodeStatsMemberIssue[]
  repoIssues: ZhaogangCodeStatsRepoIssue[]
}

export interface ZhaogangCodeStatsSelfSummary {
  commitCount: number
  additions: number
  deletions: number
  netLines: number
  activeDays: number
  repoCount: number
  branchCount: number
}

export interface ZhaogangCodeStatsMember {
  user: ZhaogangCodeStatsUser
  commitCount: number
  additions: number
  deletions: number
  netLines: number
  activeDays: number
  repoCount: number
  branchCount: number
  lastCommitAt: string | null
}

export interface ZhaogangCodeStatsDaily {
  date: string
  commitCount: number
  additions: number
  deletions: number
  netLines: number
  dayType: ZhaogangCodeDayType
}

export interface ZhaogangCodeStatsHourly {
  hour: number
  commitCount: number
}

export interface ZhaogangCodeStatsRepository {
  depotId: number
  projectName: string
  projectDisplayName: string
  depotName: string
  commitCount: number
  additions: number
  deletions: number
  branchCount: number
  lastCommitAt: string | null
  lineStatsExcluded?: boolean
}

export interface ZhaogangCodeStatsBranch {
  depotName: string
  branchName: string
  commitCount: number
  lastCommitAt: string | null
}

export interface ZhaogangCodeStatsTeamStatistics {
  dataReady: boolean
  refreshing: boolean
  range: ZhaogangCodeStatsRange
  scan: ZhaogangCodeStatsScan
  coverage: ZhaogangCodeStatsCoverage
  members: ZhaogangCodeStatsMember[]
}

export interface ZhaogangCodeStatsSelfStatistics {
  dataReady: boolean
  refreshing: boolean
  range: ZhaogangCodeStatsRange
  scan: ZhaogangCodeStatsScan
  coverage: ZhaogangCodeStatsCoverage
  summary: ZhaogangCodeStatsSelfSummary
  daily: ZhaogangCodeStatsDaily[]
  hourly: ZhaogangCodeStatsHourly[]
  repositories: ZhaogangCodeStatsRepository[]
  branches: ZhaogangCodeStatsBranch[]
}

export interface ZhaogangCodeStatsMemberStatistics {
  member: ZhaogangCodeStatsUser
  summary: ZhaogangCodeStatsSelfSummary
  daily: ZhaogangCodeStatsDaily[]
}

export interface ZhaogangCodeStatsPage {
  pageNumber: number
  pageSize: number
  totalRow: number
  totalPage: number
}

export interface ZhaogangCodeStatsEntry {
  sha: string
  shortSha: string
  commitAt: string
  projectName: string
  projectDisplayName: string
  depotName: string
  branches: string[]
  branchCount: number
  branchTruncated: boolean
  message: string
  additions: number | null
  deletions: number | null
  filesChanged: number | null
  diffStatus: ZhaogangCodeDiffStatus
  commitUrl: string
}

export interface ZhaogangCodeStatsEntryPage {
  range: ZhaogangCodeStatsRange
  page: ZhaogangCodeStatsPage
  items: ZhaogangCodeStatsEntry[]
}

export interface ZhaogangCodeStatsSkippedMonth {
  month: string
  reason: string
  retryAfterSeconds: number
}

export interface ZhaogangCodeStatsScanTrigger {
  accepted: boolean
  reason: string
  skippedMonths: ZhaogangCodeStatsSkippedMonth[]
  retryAfterSeconds: number
  scan: ZhaogangCodeStatsScan
}

export interface ZhaogangCodeStatsRepoFailure {
  projectName: string
  projectDisplayName: string
  depotName: string
  reasonCode: string
  reason: string
}

export interface ZhaogangCodeStatsDiffFailure {
  depotId?: number | null
  commitAt?: string | null
  projectName: string
  depotName: string
  sha: string
  authorName: string
  reasonCode: string
  reason: string
}

export interface ZhaogangCodeStatsDiffRetryJob {
  jobId: number
  status: ZhaogangCodeScanStatus
  total: number
  done: number
  failed: number
  error?: string | null
}

export interface ZhaogangCodeStatsFailures {
  from?: string | null
  to?: string | null
  repoFailures: ZhaogangCodeStatsRepoFailure[]
  diffFailures: ZhaogangCodeStatsDiffFailure[]
  page: ZhaogangCodeStatsPage
}

export interface ZhaogangCodeStatsIdentityMapping {
  id: number
  identityType: ZhaogangCodeIdentityType
  displayValue: string
  authorName: string
  member: ZhaogangCodeStatsUser | null
  source: ZhaogangCodeIdentitySource
  ignored: boolean
  updatedAt: string | null
}

export interface ZhaogangCodeStatsIdentityCandidate {
  identityKey: string
  identityType: ZhaogangCodeIdentityType
  authorName: string
  commitCount: number
  repoCount: number
  lastCommitAt: string | null
  suggestedMember: ZhaogangCodeStatsUser | null
}

export interface ZhaogangCodeStatsIdentityPage {
  mappings: ZhaogangCodeStatsIdentityMapping[]
  candidates: ZhaogangCodeStatsIdentityCandidate[]
  page: ZhaogangCodeStatsPage
}

export interface ZhaogangCodeStatsStatisticsQuery {
  from: string
  to: string
  scope: ZhaogangCodeStatsScope
  workbenchTeamId?: number | null
  refresh?: boolean
}

export interface ZhaogangCodeStatsMemberStatisticsQuery {
  from: string
  to: string
  workbenchTeamId: number
  memberUserId: number
}

export interface ZhaogangCodeStatsEntriesQuery {
  from: string
  to: string
  depotId?: number | null
  keyword?: string
  pageNumber?: number
  pageSize?: number
  refresh?: boolean
}

export interface ZhaogangCodeStatsScanQuery {
  from: string
  to: string
  scope: ZhaogangCodeStatsScope
  workbenchTeamId?: number | null
}

export interface ZhaogangCodeStatsScanCommand {
  scope: ZhaogangCodeStatsScope
  workbenchTeamId?: number | null
  from: string
  to: string
  mode?: 'FULL' | 'SYNC'
}

export interface ZhaogangCodeStatsIdentityQuery {
  scope: ZhaogangCodeStatsScope
  workbenchTeamId?: number | null
  keyword?: string
  pageNumber?: number
  pageSize?: number
}

export interface ZhaogangCodeStatsCreateIdentityCommand {
  scope: ZhaogangCodeStatsScope
  workbenchTeamId?: number | null
  identityType: ZhaogangCodeIdentityType
  identityKey?: string
  codingUserId?: number | null
  ignored?: boolean
  identityValue?: string
  authorName?: string
}

export interface ZhaogangCodeStatsUpdateIdentityCommand {
  codingUserId?: number | null
  ignored?: boolean
}
