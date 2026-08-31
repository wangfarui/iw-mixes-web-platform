export interface WorkbenchTeamMember {
  userId: number
  userName: string
  avatar: string
  joinedAt: string
  administrator: boolean
}

export interface WorkbenchTeamPermissions {
  administrator: boolean
  canRename: boolean
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
