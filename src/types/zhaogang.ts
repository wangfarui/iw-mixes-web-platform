import type { TeamIterationRole } from './zhaogangIteration'

export interface ZhaogangSessionStatus {
  connected: boolean
  userId: number
  userName: string
  avatar: string
  team: string
  tokenHint: string
  tokenRotationRequired: boolean
  warnings: string[]
}

export interface ZhaogangTokenValue {
  token: string
}

export type ZhaogangPlanTableColumnKey = 'service' | 'status' | 'branch' | 'builder' | 'duration' | 'startedAt'
export type ZhaogangPlanPageSize = 10 | 15 | 20 | 50

export interface ZhaogangPreferences {
  defaultTab: 'release' | 'team' | 'iteration' | 'calendar' | 'worklog' | 'services'
  releaseTab: 'all' | 'favorites'
  planView: 'table' | 'card'
  rememberProjectFilter: boolean
  projectFilterId: number | null
  planPageSize: ZhaogangPlanPageSize
  planTableColumnWidths: Partial<Record<ZhaogangPlanTableColumnKey, number>>
  codingRole: TeamIterationRole | null
  autoSyncCreatedChildIssue: boolean
}

export interface ZhaogangProject {
  id: number
  name: string
  displayName: string
}

export interface ZhaogangPlanCatalog {
  projects: ZhaogangProject[]
  plans: ZhaogangBuildPlan[]
  failedProjectIds: number[]
  lastSyncedAt: string
  refreshing: boolean
}

export interface ZhaogangPlanRef {
  projectId: number
  jobId: number
}

export interface ZhaogangPlanPageSync {
  plans: ZhaogangBuildPlan[]
  failedProjectIds: number[]
  lastSyncedAt: string
}

export interface ZhaogangPlanPageSyncDto {
  plans: ZhaogangPlanRef[]
  force: boolean
}

export interface ZhaogangBuildPlan {
  id: number
  projectId: number
  projectName: string
  projectDisplayName: string
  name: string
  defaultBranch: string
  environments: string[]
  quickBuildSupported: boolean
  latestBuild?: ZhaogangBuild
}

export interface ZhaogangBuild {
  id: number
  number: string
  status: string
  statusDetail: string
  branch: string
  commit: string
  triggerUser: string
  duration: string
  startedAt: string
  environment: string
}

export interface ZhaogangPlanDetail {
  plan: ZhaogangBuildPlan
  builds: ZhaogangBuild[]
  depotId: number | null
}

export interface ZhaogangBranch {
  name: string
}

export type ZhaogangWorklogScope = 'SELF' | 'WORKBENCH_TEAM'
export type ZhaogangWorklogRankingMetric = 'TOTAL_HOURS' | 'OVERTIME_HOURS' | 'OVERTIME_DAYS'
export type ZhaogangCalendarDayType = 'WORKDAY' | 'REST_DAY'

export interface ZhaogangCalendarDay {
  date: string
  dayType: ZhaogangCalendarDayType
  overridden: boolean
  leave: boolean
}

export interface ZhaogangCalendarMonth {
  month: string
  versionNo: number
  canManage: boolean
  canManageLeave: boolean
  days: ZhaogangCalendarDay[]
}

export interface ZhaogangWorklogTeamOption {
  id: number
  name: string
  memberCount: number
}

export interface ZhaogangWorklogOptions {
  teams: ZhaogangWorklogTeamOption[]
}

export interface ZhaogangWorklogCoverage {
  scope: ZhaogangWorklogScope
  workbenchTeamId: number | null
  memberCount: number
  visibleProjectCount: number
  partial: boolean
  failedMemberCount: number
  warning: string
}

export interface ZhaogangWorklogDailyTotal {
  date: string
  hours: number
  dayType: ZhaogangCalendarDayType
}

export interface ZhaogangWorklogSummary {
  overtimeDays: number
  overtimeHours: number
  averageHours: number
}

export interface ZhaogangWorklogUser {
  id: number
  name: string
  avatar: string
}

export interface ZhaogangWorklogMemberDailyTotal {
  user: ZhaogangWorklogUser
  dailyTotals: ZhaogangWorklogDailyTotal[]
  summary: ZhaogangWorklogSummary
}

export interface ZhaogangWorklogProject {
  name: string
  displayName: string
}

export interface ZhaogangWorklogIssue {
  code: number
  type: string
  typeName: string
  title: string
}

export interface ZhaogangWorklogItem {
  workLogId: number
  user: ZhaogangWorklogUser
  startAt: string
  createdAt: string
  updatedAt: string
  hours: number
  workingDesc: string
  project: ZhaogangWorklogProject
  issue: ZhaogangWorklogIssue
  issueUrl: string
}

export interface ZhaogangWorklogStatistics {
  coverage: ZhaogangWorklogCoverage
  month: string
  calendarVersion: number
  syncedAt: string
  summary: ZhaogangWorklogSummary
  dailyTotals: ZhaogangWorklogDailyTotal[]
  memberDailyTotals: ZhaogangWorklogMemberDailyTotal[]
}

export interface ZhaogangWorklogEntries {
  coverage: ZhaogangWorklogCoverage
  from: string
  toExclusive: string
  syncedAt: string
  totalHours: number
  items: ZhaogangWorklogItem[]
}

export interface ZhaogangWorklogAbsenceDay {
  date: string
  hours: number
}

export interface ZhaogangWorklogMemberAbsence {
  user: ZhaogangWorklogUser
  absenceDays: number
  days: ZhaogangWorklogAbsenceDay[]
}

export interface ZhaogangWorklogAbsence {
  coverage: ZhaogangWorklogCoverage
  month: string
  from: string
  toExclusive: string
  syncedAt: string
  members: ZhaogangWorklogMemberAbsence[]
}

export interface ZhaogangTriggerBuildDto {
  branch: string
  environment: string
}
