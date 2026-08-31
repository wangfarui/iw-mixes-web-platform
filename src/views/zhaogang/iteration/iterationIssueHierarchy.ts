import type { TeamIterationIssueType } from '@/types/zhaogangIteration'

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
