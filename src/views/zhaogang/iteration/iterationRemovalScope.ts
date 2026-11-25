import type { TeamIterationIssue } from '@/types/zhaogangIteration'

export interface IterationRemovalRow { issue: TeamIterationIssue; depth: number; selected: boolean }

/** Traverse the full tree, including filtered/collapsed children; count selected descendants once. */
export function iterationRemovalScope(issues: TeamIterationIssue[], selectedIds: number[]): IterationRemovalRow[] {
  const selected = new Set(selectedIds)
  const result: IterationRemovalRow[] = []
  const seen = new Set<number>()
  const visit = (nodes: TeamIterationIssue[], included = false, depth = 0) => {
    for (const issue of nodes) {
      if (seen.has(issue.id)) continue
      seen.add(issue.id)
      const take = included || selected.has(issue.id)
      if (take) result.push({ issue, depth, selected: selected.has(issue.id) })
      visit(issue.children || [], take, take ? depth + 1 : 0)
    }
  }
  visit(issues)
  return result
}

export function removalCodingCount(rows: IterationRemovalRow[]): number {
  return new Set(rows.filter(({ issue }) => issue.projectName && issue.issueCode)
    .map(({ issue }) => `${issue.projectName}:${issue.issueCode}`)).size
}
