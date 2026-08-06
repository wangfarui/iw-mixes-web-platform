import request from '@/api/request'
import type { AxiosRequestConfig } from 'axios'
import type { PageResponse, TaskRecordsPageDto, TaskRecordsPageVo } from '@/types/task'

export interface GeneralResponse<T> {
  code: number
  message: string
  data: T
}

const requestApi = <T>(config: AxiosRequestConfig): Promise<GeneralResponse<T>> => {
  return request<GeneralResponse<T>, GeneralResponse<T>>(config)
}

export interface TaskGroupListVo {
  id: number
  parentId: number
  groupName: string
  isTop: number
  sort: number
  taskNum: number
}

export interface StatisticsLatestTaskNumVo {
  todayNum: number
  weekNum: number
  noGroupNum: number
  withDeadlineNum: number
}

export interface TaskFileVo {
  id?: number
  taskId?: number
  fileName?: string
  fileUrl: string
}

export interface TaskBasicsVo {
  id: number
  parentId?: number
  taskName: string
  taskRemark?: string
  taskGroupId: number
  taskGroupName?: string
  deadlineDate?: string | null
  deadlineTime?: string | null
  priority?: number
  isTop?: number
  completed?: boolean
  taskStatus?: number
  sort?: number
  rewardPoints?: number
  punishPoints?: number
  doneTime?: string
  createTime?: string
  updateTime?: string
  fileList?: TaskFileVo[]
}

export interface TaskUpdateDto {
  id: number
  taskName: string
  taskGroupId: number
  taskRemark?: string
  deadlineDate?: string | null
  deadlineTime?: string | null
  priority?: number
  isTop?: number
  sort?: number
}

export interface TaskGroupMoveListVo {
  id: number
  groupName: string
  subGroupList: TaskGroupMoveListVo[]
}

export interface TaskPointsVo {
  id?: number
  taskId: number
  rewardPoints: number
  punishPoints: number
}

export interface UploadedFileVo {
  fileName: string
  fileUrl: string
}

export const addTaskGroup = (data: { groupName: string; parentId?: string }) => {
  return requestApi<number>({
    url: '/points-service/points/task/group/add',
    method: 'post',
    data
  })
}

export const getTaskGroupList = (parentId?: string) => {
  return requestApi<TaskGroupListVo[]>({
    url: '/points-service/points/task/group/list',
    method: 'get',
    params: parentId ? { parentId } : undefined
  })
}

export const getTaskGroupStatistics = () => {
  return requestApi<StatisticsLatestTaskNumVo>({
    url: '/points-service/points/task/group/statisticsLatestTaskNum',
    method: 'get'
  })
}

export const getTaskList = (
  taskGroupId: string,
  startDeadlineDate?: string,
  endDeadlineDate?: string,
  statisticsDeadline?: boolean
) => {
  return requestApi<TaskBasicsVo[]>({
    url: '/points-service/points/task/basics/list',
    method: 'post',
    data: {
      taskGroupId,
      startDeadlineDate,
      endDeadlineDate,
      statisticsDeadline,
      sortDeadline: taskGroupId === '0' || taskGroupId === ''
    }
  })
}

export const getCompletedTasks = (currentPage = 1) => {
  return requestApi<TaskBasicsVo[]>({
    url: '/points-service/points/task/basics/doneList',
    method: 'get',
    params: { currentPage }
  })
}

export const getDeletedTasks = () => {
  return requestApi<TaskBasicsVo[]>({
    url: '/points-service/points/task/basics/deletedList',
    method: 'get'
  })
}

export const getTaskDetail = (id: number) => {
  return requestApi<TaskBasicsVo>({
    url: '/points-service/points/task/basics/detail',
    method: 'get',
    params: { id }
  })
}

export const addTask = (data: {
  taskName: string
  taskGroupId: number
  deadlineDate?: string | null
}) => {
  return requestApi<number | void>({
    url: '/points-service/points/task/basics/add',
    method: 'post',
    data
  })
}

export const updateTask = (data: TaskUpdateDto) => {
  return requestApi<void>({
    url: '/points-service/points/task/basics/update',
    method: 'put',
    data
  })
}

export const updateTaskStatus = (id: number, taskStatus: number) => {
  return requestApi<void>({
    url: '/points-service/points/task/basics/updateStatus',
    method: 'put',
    data: { id, taskStatus }
  })
}

export const permanentlyDeleteTask = (id: number) => {
  return requestApi<void>({
    url: '/points-service/points/task/basics/delete',
    method: 'delete',
    params: { id }
  })
}

export const clearDeletedTasks = () => {
  return requestApi<void>({
    url: '/points-service/points/task/basics/clearDeletedList',
    method: 'delete'
  })
}

export const renameTaskGroup = (data: { id: number; groupName: string }) => {
  return requestApi<void>({
    url: '/points-service/points/task/group/update',
    method: 'put',
    data
  })
}

export const deleteTaskGroup = (id: number) => {
  return requestApi<void>({
    url: '/points-service/points/task/group/delete',
    method: 'delete',
    params: { id }
  })
}

export const getTaskGroupMoveList = () => {
  return requestApi<TaskGroupMoveListVo[]>({
    url: '/points-service/points/task/group/moveList',
    method: 'get'
  })
}

export const getTaskPoints = (taskId: number) => {
  return requestApi<TaskPointsVo | null>({
    url: '/points-service/points/task/relation/getByTaskId',
    method: 'get',
    params: { taskId }
  })
}

export const saveTaskPoints = (data: TaskPointsVo) => {
  return requestApi<number>({
    url: '/points-service/points/task/relation/save',
    method: 'post',
    data
  })
}

export const uploadTaskImage = (file: File) => {
  const data = new FormData()
  data.append('file', file)
  return requestApi<UploadedFileVo>({
    url: '/auth-service/file/upload',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const addTaskFile = (data: { taskId: number; fileName?: string; fileUrl: string }) => {
  return requestApi<void>({
    url: '/points-service/points/task/basics/addFile',
    method: 'post',
    data
  })
}

export const deleteTaskFile = (data: { taskId: number; fileUrl: string }) => {
  return requestApi<void>({
    url: '/points-service/points/task/basics/deleteFile',
    method: 'post',
    data
  })
}

export const queryTaskRecordsPage = (data: TaskRecordsPageDto) => {
  return requestApi<PageResponse<TaskRecordsPageVo>>({
    url: '/points-service/points/task/basics/page',
    method: 'post',
    data
  })
}
