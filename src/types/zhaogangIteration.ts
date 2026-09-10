import type { ZhaogangCodingPermissionError } from '@/types/zhaogang'

export type TeamIterationStage = 'NOT_STARTED' | 'DEVELOPING' | 'TESTING' | 'RELEASED'
export type TeamIterationRole = 'PRODUCT' | 'BACKEND' | 'FRONTEND' | 'QA'
export type TeamIterationIssueType = 'REQUIREMENT' | 'TASK' | 'USER_STORY' | 'SUB_TASK' | 'DEFECT'
export type TeamIterationIssueSource = 'CODING' | 'WORKBENCH'
export type TeamIterationIssueSyncStatus = 'NOT_REQUIRED' | 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'UNKNOWN'

export interface TeamIterationUser {
  userId: number
  userName: string
  avatar?: string
}

export interface TeamIterationTeam {
  id: number
  name: string
}

export interface TeamIterationMemberOption extends TeamIterationUser {}

export interface TeamIterationTeamOption {
  teamId: number
  teamName: string
  members: TeamIterationMemberOption[]
}

export interface TeamIterationMember {
  id: number
  team: TeamIterationTeam
  user: TeamIterationUser
  roles: TeamIterationRole[]
}

export interface TeamIterationMemberInput {
  teamId: number
  userId: number
  roles: TeamIterationRole[]
}

export interface TeamIterationPermissions {
  canEdit: boolean
  canManageMembers: boolean
  canDelete: boolean
}

export interface TeamIterationIssue {
  id: number
  parentId?: number
  source: TeamIterationIssueSource
  url?: string
  projectName: string
  issueId?: number
  issueCode?: number
  issueType: TeamIterationIssueType
  issueTypeName: string
  title: string
  description?: string
  statusName: string
  assigneeName?: string
  available: boolean
  warning?: string
  syncStatus: TeamIterationIssueSyncStatus
  syncMessage?: string
  developmentTeam?: string
  definitionOfDone?: string
  estimatedHours?: number
  taskType?: string
  onlineBug?: boolean
  bugPriority?: string
  syncedAt?: string
  createdAt: string
  worklogs: TeamIterationIssueWorklog[]
  recordedHours?: number
  recordedWorklogCount?: number
  children: TeamIterationIssue[]
}

export interface TeamIterationIssueWorklog {
  id: number
  spendHours: number
  registeredAt: string
  syncStatus: TeamIterationIssueSyncStatus
  syncMessage?: string
  syncedAt?: string
  creator: TeamIterationUser
  createdAt: string
}

export interface TeamIterationCodingSyncFailure {
  issueId: number
  title: string
  reason: string
  permissionError?: ZhaogangCodingPermissionError | null
}

export interface TeamIterationCodingSyncResult {
  successCount: number
  failureCount: number
  failures: TeamIterationCodingSyncFailure[]
}

export interface TeamIterationReleasePlan {
  id: number
  projectId: number
  projectName: string
  projectDisplayName: string
  planId: number
  planName: string
  quickBuildSupported: boolean
  creator: TeamIterationUser
  createdAt: string
}

export interface TeamIterationSelectionOption {
  value: string
  label: string
}

export interface TeamIterationIssueCreationOptions {
  issueType: TeamIterationIssueType
  developmentTeams: TeamIterationSelectionOption[]
  definitionsOfDone: TeamIterationSelectionOption[]
  taskTypes: TeamIterationSelectionOption[]
  bugPriorities: TeamIterationSelectionOption[]
}

export interface TeamIterationListItem {
  id: number
  name: string
  version?: string
  stage: TeamIterationStage
  startDate?: string
  plannedReleaseDate?: string
  creator: TeamIterationUser
  members: TeamIterationMember[]
  issueCount: number
  versionNo: number
  createdAt: string
  updatedAt: string
  permissions: TeamIterationPermissions
}

export interface TeamIterationDetail extends TeamIterationListItem {
  requestId: string
  releasedAt?: string
  issues: TeamIterationIssue[]
  releasePlans: TeamIterationReleasePlan[]
}

export interface TeamIterationPage<T> {
  items: T[]
  total: number
  pageNumber: number
  pageSize: number
}

export interface TeamIterationCreateCommand {
  requestId: string
  name: string
  stage: TeamIterationStage
  startDate?: string
  plannedReleaseDate?: string
  members: TeamIterationMemberInput[]
}

export interface TeamIterationUpdateCommand {
  versionNo: number
  name: string
  stage: TeamIterationStage
  startDate?: string
  plannedReleaseDate?: string
}

export interface TeamIterationCreateChildIssueCommand {
  issueType: TeamIterationIssueType
  title: string
  description?: string
  developmentTeam?: string
  definitionOfDone?: string
  estimatedHours?: number
  taskType?: string
  onlineBug?: boolean
  bugPriority?: string
  syncToCoding?: boolean
}

export interface TeamIterationUpdateIssueCommand {
  title: string
  description?: string
  developmentTeam?: string
  definitionOfDone?: string
  estimatedHours?: number
  taskType?: string
  onlineBug?: boolean
  bugPriority?: string
}

export interface TeamIterationRegisterWorklogCommand {
  spendHours: number
  registeredAt: string
}

export interface TeamIterationQuery {
  stage?: TeamIterationStage
  memberUserId?: number
  keyword?: string
  pageNumber?: number
  pageSize?: number
}
