// 任务状态枚举
export enum TaskStatusEnum {
  INCOMPLETE = 0,  // 未完成
  COMPLETED = 1,   // 已完成
  ABANDONED = 2,   // 已放弃
  DELETED = 3      // 已删除
}

// 任务记录分页查询DTO
export interface TaskRecordsPageDto {
  currentPage: number
  pageSize: number
  taskStatus?: TaskStatusEnum
  taskName?: string
  startDeadlineDate?: string
  endDeadlineDate?: string
  startDoneTime?: string
  endDoneTime?: string
}

// 任务记录分页查询VO
export interface TaskRecordsPageVo {
  id: number
  taskGroupName: string
  taskName: string
  taskRemark?: string
  taskStatus: number
  createTime?: string
  deadlineDate?: string
  deadlineTime?: string
  doneTime?: string
}

// 分页响应
export interface PageResponse<T> {
  records: T[]
  total: number
  size: number
  current: number
}
