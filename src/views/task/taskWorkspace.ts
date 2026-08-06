import type { TaskBasicsVo, TaskUpdateDto } from '@/api/taskList'

export type WorkspaceGroupKind = 'smart' | 'custom' | 'system'

export interface WorkspaceGroup {
  id: string
  name: string
  icon: string
  count: number
  kind: WorkspaceGroupKind
  sort?: number
  isTop?: number
}

export interface TaskSection {
  id: string
  name: string
  taskNum: number
  tasks: TaskBasicsVo[]
  loading: boolean
  expanded: boolean
}

export type TaskSortMode = 'default' | 'deadline' | 'priority' | 'created'
export type TaskStatusFilter = 'all' | 'active' | 'completed'

export type TaskActionCommand =
  | 'deadline-today'
  | 'deadline-tomorrow'
  | 'deadline-week'
  | 'deadline-custom'
  | 'priority-high'
  | 'priority-medium'
  | 'priority-low'
  | 'priority-none'
  | 'move'
  | 'toggle-top'
  | 'points'
  | 'restore'
  | 'delete'

export const SMART_GROUP_IDS = ['today', 'week', 'deadline', 'inbox'] as const
export const SYSTEM_GROUP_IDS = ['completed', 'trash'] as const
export const SPECIAL_GROUP_IDS = [...SMART_GROUP_IDS, ...SYSTEM_GROUP_IDS]

export const isSpecialGroup = (id?: string): boolean => {
  return Boolean(id && SPECIAL_GROUP_IDS.some((groupId) => groupId === id))
}

export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const offsetDate = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return formatLocalDate(date)
}

export const defaultDeadlineForGroup = (groupId?: string): string | null => {
  if (groupId === 'today' || groupId === 'deadline') return offsetDate(0)
  if (groupId === 'week') return offsetDate(7)
  return null
}

export const taskIsCompleted = (task: TaskBasicsVo): boolean => {
  return task.completed === true || task.taskStatus === 1
}

export const withCompletionState = (task: TaskBasicsVo, completed?: boolean): TaskBasicsVo => {
  const nextCompleted = completed ?? task.taskStatus === 1
  return { ...task, completed: nextCompleted, taskStatus: nextCompleted ? 1 : task.taskStatus }
}

export const toTaskUpdate = (task: TaskBasicsVo, patch: Partial<TaskBasicsVo> = {}): TaskUpdateDto => {
  const next = { ...task, ...patch }
  return {
    id: next.id,
    taskName: next.taskName.trim(),
    taskGroupId: next.taskGroupId,
    taskRemark: next.taskRemark,
    deadlineDate: next.deadlineDate ?? null,
    deadlineTime: next.deadlineTime ?? null,
    priority: next.priority ?? 0,
    isTop: next.isTop ?? 0,
    sort: next.sort ?? 0
  }
}

export const filterAndSortTasks = (
  tasks: TaskBasicsVo[],
  searchText: string,
  statusFilter: TaskStatusFilter,
  sortMode: TaskSortMode
): TaskBasicsVo[] => {
  const keyword = searchText.trim().toLocaleLowerCase()
  const filtered = tasks.filter((task) => {
    if (statusFilter === 'active' && taskIsCompleted(task)) return false
    if (statusFilter === 'completed' && !taskIsCompleted(task)) return false
    if (!keyword) return true
    return [task.taskName, task.taskRemark, task.taskGroupName]
      .some((value) => value?.toLocaleLowerCase().includes(keyword))
  })

  if (sortMode === 'default') return filtered

  return [...filtered].sort((left, right) => {
    if (sortMode === 'priority') return (right.priority ?? 0) - (left.priority ?? 0)
    if (sortMode === 'created') return String(right.createTime ?? '').localeCompare(String(left.createTime ?? ''))
    return String(left.deadlineDate ?? '9999-12-31').localeCompare(String(right.deadlineDate ?? '9999-12-31'))
  })
}

export const getDeadlineTone = (deadlineDate?: string | null, taskStatus = 0): 'danger' | 'warning' | 'default' => {
  if (!deadlineDate || taskStatus !== 0) return 'default'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(`${deadlineDate}T00:00:00`)
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000)
  if (diffDays <= 0) return 'danger'
  if (diffDays <= 7) return 'warning'
  return 'default'
}

export const formatDeadlineLabel = (deadlineDate?: string | null): string => {
  if (!deadlineDate) return ''
  const today = offsetDate(0)
  if (deadlineDate === today) return '今天'
  if (deadlineDate === offsetDate(1)) return '明天'
  return deadlineDate
}
