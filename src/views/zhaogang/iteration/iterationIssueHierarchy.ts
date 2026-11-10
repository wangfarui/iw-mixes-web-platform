import type { TeamIterationIssue, TeamIterationIssueType } from '@/types/zhaogangIteration'

const manualChildTypes: Record<TeamIterationIssueType, TeamIterationIssueType[]> = {
  REQUIREMENT: ['USER_STORY', 'SUB_TASK'],
  TASK: ['SUB_TASK'],
  USER_STORY: ['SUB_TASK'],
  SUB_TASK: [],
  DEFECT: []
}

export const manualChildIssueTypes = (parentType: TeamIterationIssueType) =>
  [...manualChildTypes[parentType]]

export const canAddChildIssues = (parentType: TeamIterationIssueType) =>
  manualChildTypes[parentType].length > 0

export const defaultManualChildIssueType = (parentType: TeamIterationIssueType) =>
  manualChildTypes[parentType][0]

export const canSyncWorkbenchIssueType = (issueType: TeamIterationIssueType) =>
  issueType !== 'REQUIREMENT' && issueType !== 'TASK'

export interface ChildIssueAutoSyncAvailability {
  enabled: boolean
  reason: string
}

export const codingBacked = (issue: TeamIterationIssue) => (issue.issueCode ?? 0) > 0
  && (issue.source === 'CODING' || issue.syncStatus === 'SYNCED')

export const childIssueAutoSyncAvailability = (
  parent: TeamIterationIssue | undefined,
  childType: TeamIterationIssueType
): ChildIssueAutoSyncAvailability => {
  if (!parent || !manualChildTypes[parent.issueType].includes(childType) || !canSyncWorkbenchIssueType(childType)) {
    return { enabled: false, reason: '该事项类型不支持同步到 CODING' }
  }
  return codingBacked(parent)
    ? { enabled: true, reason: '' }
    : { enabled: false, reason: '父事项尚未关联 CODING，子事项只保存到工作台' }
}
