import type {
  TeamIterationCreateChildIssueCommand,
  TeamIterationCodingSyncResult,
  TeamIterationCreateCommand,
  TeamIterationDetail,
  TeamIterationListItem,
  TeamIterationIssue,
  TeamIterationIssueCreationOptions,
  TeamIterationIssueType,
  TeamIterationIssueWorklog,
  TeamIterationSelectionOption,
  TeamIterationMemberInput,
  TeamIterationPage,
  TeamIterationQuery,
  TeamIterationReleasePlan,
  TeamIterationStage,
  TeamIterationRegisterWorklogCommand,
  TeamIterationUpdateCommand,
  TeamIterationUpdateIssueCommand,
  TeamIterationUser,
  TeamIterationTeamOption
} from '@/types/zhaogangIteration'
import { zhaogangRequest } from '@/api/zhaogang'

const queryString = (query: Record<string, unknown>) => {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const text = params.toString()
  return text ? `?${text}` : ''
}

const normalizeIssue = (issue: TeamIterationIssue): TeamIterationIssue => ({
  ...issue,
  worklogs: Array.isArray(issue.worklogs) ? issue.worklogs : [],
  children: Array.isArray(issue.children) ? issue.children.map(normalizeIssue) : []
})

const normalizeDetail = (detail: TeamIterationDetail): TeamIterationDetail => {
  const issues = Array.isArray(detail.issues) ? detail.issues.map(normalizeIssue) : []
  const members = Array.isArray(detail.members)
    ? detail.members.map(member => ({
      ...member,
      roles: Array.isArray(member.roles) ? member.roles : []
    }))
    : []
  return {
    ...detail,
    issues,
    members,
    releasePlans: Array.isArray(detail.releasePlans) ? detail.releasePlans : [],
    issueCount: Number.isFinite(detail.issueCount) ? detail.issueCount : issues.length
  }
}

export const getTeamIterations = (query: TeamIterationQuery) => zhaogangRequest<TeamIterationPage<TeamIterationListItem>>(
  `/iterations${queryString({ ...query })}`
)

export const createTeamIteration = (command: TeamIterationCreateCommand) => zhaogangRequest<TeamIterationDetail>('/iterations', {
  method: 'POST', body: JSON.stringify(command)
}).then(normalizeDetail)

export const getTeamIteration = (id: number) => zhaogangRequest<TeamIterationDetail>(`/iterations/${id}`).then(normalizeDetail)

export const updateTeamIteration = (id: number, command: TeamIterationUpdateCommand) => zhaogangRequest<TeamIterationDetail>(
  `/iterations/${id}`, { method: 'PUT', body: JSON.stringify(command) }
).then(normalizeDetail)

export const transitionTeamIteration = (id: number, versionNo: number, targetStage: TeamIterationStage,
  previousIterationId?: number, nextIterationId?: number) =>
  zhaogangRequest<TeamIterationDetail>(`/iterations/${id}/stage`, {
    method: 'POST', body: JSON.stringify({ versionNo, targetStage, previousIterationId, nextIterationId })
  }).then(normalizeDetail)

export const replaceTeamIterationMembers = (id: number, versionNo: number, members: TeamIterationMemberInput[]) =>
  zhaogangRequest<TeamIterationDetail>(`/iterations/${id}/members`, {
    method: 'PUT', body: JSON.stringify({ versionNo, members })
  }).then(normalizeDetail)

export const deleteTeamIteration = (id: number) => zhaogangRequest<void>(`/iterations/${id}`, { method: 'DELETE' })

export const getTeamIterationTeamMembers = (keyword = '') => zhaogangRequest<TeamIterationUser[]>(
  `/iteration-team-members${queryString({ keyword })}`
)

export const getTeamIterationMemberOptions = () => zhaogangRequest<TeamIterationTeamOption[]>('/iteration-member-options')

export const addTeamIterationCodingIssue = (id: number, url: string, parentIssueId?: number) => zhaogangRequest<TeamIterationIssue>(
  `/iterations/${id}/coding-issues`, { method: 'POST', body: JSON.stringify({ url, parentIssueId }) }
)

export const addTeamIterationChildIssue = (id: number, parentIssueId: number, command: TeamIterationCreateChildIssueCommand) =>
  zhaogangRequest<TeamIterationIssue>(`/iterations/${id}/issues/${parentIssueId}/children`, {
    method: 'POST', body: JSON.stringify(command)
  })

export const syncTeamIterationIssue = (id: number, issueId: number) => zhaogangRequest<TeamIterationIssue>(
  `/iterations/${id}/issues/${issueId}/sync`, { method: 'POST' }
)

export const syncTeamIterationCodingIssues = (id: number) => zhaogangRequest<TeamIterationCodingSyncResult>(
  `/iterations/${id}/sync-coding-issues`, { method: 'POST' }
)

export const getTeamIterationIssueCreationOptions = (id: number, parentIssueId: number,
  issueType: TeamIterationIssueType) => zhaogangRequest<TeamIterationIssueCreationOptions>(
  `/iterations/${id}/issues/${parentIssueId}/creation-options${queryString({ issueType })}`
)

export const getTeamIterationIssueEditOptions = (id: number, issueId: number) =>
  zhaogangRequest<TeamIterationIssueCreationOptions>(
    `/iterations/${id}/issues/${issueId}/edit-options`
  )

export const updateTeamIterationIssue = (id: number, issueId: number, command: TeamIterationUpdateIssueCommand) =>
  zhaogangRequest<TeamIterationIssue>(`/iterations/${id}/issues/${issueId}`, {
    method: 'PUT', body: JSON.stringify(command)
  }).then(normalizeIssue)

export const getTeamIterationIssueStatusOptions = (id: number, issueId: number) =>
  zhaogangRequest<TeamIterationSelectionOption[]>(`/iterations/${id}/issues/${issueId}/status-options`)

export const updateTeamIterationIssueStatus = (id: number, issueId: number, statusId: number) =>
  zhaogangRequest<TeamIterationIssue>(`/iterations/${id}/issues/${issueId}/status`, {
    method: 'PUT', body: JSON.stringify({ statusId })
  }).then(normalizeIssue)

export const registerTeamIterationIssueWorklog = (id: number, issueId: number,
  command: TeamIterationRegisterWorklogCommand) => zhaogangRequest<TeamIterationIssueWorklog>(
  `/iterations/${id}/issues/${issueId}/worklogs`, { method: 'POST', body: JSON.stringify(command) }
)

export const retryTeamIterationIssueWorklog = (id: number, issueId: number, worklogId: number) =>
  zhaogangRequest<TeamIterationIssueWorklog>(
    `/iterations/${id}/issues/${issueId}/worklogs/${worklogId}/retry`, { method: 'POST' }
  )

export const removeTeamIterationIssue = (id: number, issueId: number) => zhaogangRequest<void>(
  `/iterations/${id}/issues/${issueId}`, { method: 'DELETE' }
)

export const removeTeamIterationIssues = (id: number, issueIds: number[]) => zhaogangRequest<void>(
  `/iterations/${id}/issues/batch-delete`, {
    method: 'POST', body: JSON.stringify({ issueIds })
  }
)

export const addTeamIterationReleasePlan = (id: number, projectId: number, planId: number) =>
  zhaogangRequest<TeamIterationReleasePlan>(`/iterations/${id}/release-plans`, {
    method: 'POST', body: JSON.stringify({ projectId, planId })
  })

export const removeTeamIterationReleasePlan = (id: number, releasePlanId: number) => zhaogangRequest<void>(
  `/iterations/${id}/release-plans/${releasePlanId}`, { method: 'DELETE' }
)
