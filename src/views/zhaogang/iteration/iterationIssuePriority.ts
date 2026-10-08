import type { TeamIterationIssuePriority } from '@/types/zhaogangIteration'

export const defaultSubTaskPriority: TeamIterationIssuePriority = '1'

export const subTaskPriorityOptions: { value: TeamIterationIssuePriority, label: string }[] = [
  { value: '0', label: '低' },
  { value: '1', label: '中' },
  { value: '2', label: '高' },
  { value: '3', label: '紧急' }
]
