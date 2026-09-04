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

const codingBacked = (issue: TeamIterationIssue) => (issue.issueCode ?? 0) > 0
  && (issue.source === 'CODING' || issue.syncStatus === 'SYNCED')

const issueMap = (issues: TeamIterationIssue[]) => {
  const result = new Map<number, TeamIterationIssue>()
  const visit = (items: TeamIterationIssue[]) => items.forEach(issue => {
    result.set(issue.id, issue)
    visit(issue.children || [])
  })
  visit(issues)
  return result
}

export const childIssueAutoSyncAvailability = (
  parent: TeamIterationIssue | undefined,
  childType: TeamIterationIssueType,
  issues: TeamIterationIssue[]
): ChildIssueAutoSyncAvailability => {
  if (!parent || !canSyncWorkbenchIssueType(childType)) {
    return { enabled: false, reason: '该事项类型不支持同步到 CODING' }
  }
  if (childType === 'USER_STORY') {
    return parent.issueType === 'REQUIREMENT' && codingBacked(parent)
      ? { enabled: true, reason: '' }
      : { enabled: false, reason: '父级需求尚未关联 CODING' }
  }
  const byId = issueMap(issues)
  let current: TeamIterationIssue | undefined = parent
  const visited = new Set<number>()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    if (['REQUIREMENT', 'TASK', 'USER_STORY'].includes(current.issueType) && codingBacked(current)) {
      return { enabled: true, reason: '' }
    }
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return { enabled: false, reason: '上级需求、任务或用户故事尚未关联 CODING' }
}
