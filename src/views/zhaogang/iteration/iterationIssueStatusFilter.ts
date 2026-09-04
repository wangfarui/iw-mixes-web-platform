import type { TeamIterationIssue, TeamIterationIssueType } from '@/types/zhaogangIteration'

export interface IterationIssueStatusFilterOption {
  value: string
  label: string
}

export interface IterationIssueStatusFilterGroup {
  issueType: TeamIterationIssueType
  label: string
  options: IterationIssueStatusFilterOption[]
}

const noCodingStatus = '__NO_CODING_STATUS__'
const issueTypeOrder: TeamIterationIssueType[] = ['REQUIREMENT', 'TASK', 'USER_STORY', 'SUB_TASK', 'DEFECT']
const issueTypeLabels: Record<TeamIterationIssueType, string> = {
  REQUIREMENT: '需求',
  TASK: '任务',
  USER_STORY: '用户故事',
  SUB_TASK: '子工作项',
  DEFECT: '缺陷'
}

export const flattenIterationIssues = (issues: TeamIterationIssue[]): TeamIterationIssue[] => issues.flatMap(issue => [
  issue,
  ...flattenIterationIssues(issue.children)
])

const statusValue = (issue: TeamIterationIssue) => issue.statusName.trim() || noCodingStatus

export const iterationIssueStatusFilterKey = (issue: TeamIterationIssue) => `${issue.issueType}::${statusValue(issue)}`

export const buildIterationIssueStatusFilterGroups = (issues: TeamIterationIssue[]): IterationIssueStatusFilterGroup[] => {
  const flattened = flattenIterationIssues(issues)
  return issueTypeOrder.flatMap(issueType => {
    const typedIssues = flattened.filter(issue => issue.issueType === issueType)
    if (!typedIssues.length) return []
    const options = new Map<string, IterationIssueStatusFilterOption>()
    typedIssues.forEach(issue => {
      const value = iterationIssueStatusFilterKey(issue)
      if (!options.has(value)) options.set(value, {
        value,
        label: statusValue(issue) === noCodingStatus ? '无 CODING 状态' : issue.statusName.trim()
      })
    })
    return [{
      issueType,
      label: typedIssues.find(issue => issue.issueTypeName.trim())?.issueTypeName.trim() || issueTypeLabels[issueType],
      options: [...options.values()]
    }]
  })
}

export const filterIterationIssueTree = (issues: TeamIterationIssue[], selectedValues: string[]): TeamIterationIssue[] => {
  if (!selectedValues.length) return issues
  const selected = new Set(selectedValues)
  const visit = (items: TeamIterationIssue[]): TeamIterationIssue[] => items.flatMap(issue => {
    const children = visit(issue.children)
    return selected.has(iterationIssueStatusFilterKey(issue)) || children.length ? [{ ...issue, children }] : []
  })
  return visit(issues)
}

export const iterationIssueStatusMatchCount = (issues: TeamIterationIssue[], selectedValues: string[]) => {
  if (!selectedValues.length) return flattenIterationIssues(issues).length
  const selected = new Set(selectedValues)
  return flattenIterationIssues(issues).filter(issue => selected.has(iterationIssueStatusFilterKey(issue))).length
}

export const iterationIssueParentIds = (issues: TeamIterationIssue[]) => flattenIterationIssues(issues)
  .filter(issue => issue.children.length)
  .map(issue => issue.id)

export const retainExpandedIterationIssueIds = (expandedIssueIds: number[], issues: TeamIterationIssue[]) => {
  const parentIssueIds = new Set(iterationIssueParentIds(issues))
  return [...new Set(expandedIssueIds)].filter(issueId => parentIssueIds.has(issueId))
}

export const iterationIssueExpandRowKeys = (expandedIssueIds: number[]) =>
  [...new Set(expandedIssueIds)].map(String)
