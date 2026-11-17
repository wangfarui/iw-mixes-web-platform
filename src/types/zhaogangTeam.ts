import type { ZhaogangCodingRole } from './zhaogang'

export interface WorkbenchTeamMember {
  userId: number
  userName: string
  avatar: string
  joinedAt: string
  administrator: boolean
  codingRole: ZhaogangCodingRole | null
  mobile: string | null
  lastUsedAt?: string
  managedStatistics: boolean
  ignoreTeamStatistics?: boolean
}

export interface WorkbenchTeamPermissions {
  administrator: boolean
  canRename: boolean
  canManageStatistics: boolean
  canRemoveMembers: boolean
  canTransferAdministrator: boolean
  canLeave: boolean
  canDissolve: boolean
}

export interface WorkbenchTeamListItem {
  id: number
  name: string
  codingTeamKey: string
  memberCount: number
  administratorUserId: number
  administrator: boolean
  versionNo: number
  updateTime: string
}

export interface WorkbenchTeamDetail {
  id: number
  name: string
  inviteCode: string
  codingTeamId: number
  codingTeamKey: string
  codingTeamHost: string
  creatorUserId: number
  administratorUserId: number
  versionNo: number
  memberSourceProjectId?: number
  members: WorkbenchTeamMember[]
  permissions: WorkbenchTeamPermissions
  createTime: string
  updateTime: string
}

export interface WorkbenchTeamInvitationPreview {
  teamId: number
  teamName: string
  codingTeamKey: string
  memberCount: number
  alreadyMember: boolean
}

export interface WorkbenchTeamManagementTokenStatus {
  configured: boolean
  ownerUserId: number | null
  ownerName: string | null
  verifiedAt: string | null
}

export interface WorkbenchTeamMemberCandidates {
  members: WorkbenchTeamMemberCandidate[]
  projectId: number
  projectName: string
  versionNo: number
}

export interface WorkbenchTeamMemberCandidate {
  userId: number
  userName: string
  avatar: string | null
}
