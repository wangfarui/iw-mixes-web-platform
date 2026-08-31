import { zhaogangRequest } from '@/api/zhaogang'
import type {
  WorkbenchTeamDetail,
  WorkbenchTeamInvitationPreview,
  WorkbenchTeamListItem
} from '@/types/zhaogangTeam'

export const getWorkbenchTeams = () => zhaogangRequest<WorkbenchTeamListItem[]>('/workbench-teams')

export const reorderWorkbenchTeams = (teamIds: number[]) => zhaogangRequest<WorkbenchTeamListItem[]>(
  '/workbench-teams/order', { method: 'PUT', body: JSON.stringify({ teamIds }) }
)

export const createWorkbenchTeam = (requestId: string, name: string) => zhaogangRequest<WorkbenchTeamDetail>(
  '/workbench-teams', { method: 'POST', body: JSON.stringify({ requestId, name }) }
)

export const getWorkbenchTeam = (teamId: number) => zhaogangRequest<WorkbenchTeamDetail>(
  `/workbench-teams/${teamId}`
)

export const renameWorkbenchTeam = (teamId: number, versionNo: number, name: string) => zhaogangRequest<WorkbenchTeamDetail>(
  `/workbench-teams/${teamId}`, { method: 'PATCH', body: JSON.stringify({ versionNo, name }) }
)

export const removeWorkbenchTeamMember = (teamId: number, userId: number, versionNo: number) => zhaogangRequest<WorkbenchTeamDetail>(
  `/workbench-teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
    body: JSON.stringify({ versionNo })
  }
)

export const transferWorkbenchTeamAdministrator = (teamId: number, versionNo: number, successorUserId: number) => zhaogangRequest<WorkbenchTeamDetail>(
  `/workbench-teams/${teamId}/administrator/transfer`, {
    method: 'POST',
    body: JSON.stringify({ versionNo, successorUserId })
  }
)

export const leaveWorkbenchTeam = (teamId: number, versionNo: number, successorUserId?: number) => zhaogangRequest<void>(
  `/workbench-teams/${teamId}/leave`, {
    method: 'POST',
    body: JSON.stringify({ versionNo, successorUserId: successorUserId || null })
  }
)

export const dissolveWorkbenchTeam = (teamId: number, versionNo: number) => zhaogangRequest<void>(
  `/workbench-teams/${teamId}/dissolve`, { method: 'POST', body: JSON.stringify({ versionNo }) }
)

export const getWorkbenchTeamInvitation = (inviteCode: string) => zhaogangRequest<WorkbenchTeamInvitationPreview>(
  `/workbench-team-invitations/${encodeURIComponent(inviteCode)}`
)

export const joinWorkbenchTeam = (inviteCode: string) => zhaogangRequest<WorkbenchTeamDetail>(
  `/workbench-team-invitations/${encodeURIComponent(inviteCode)}/join`, { method: 'POST' }
)
