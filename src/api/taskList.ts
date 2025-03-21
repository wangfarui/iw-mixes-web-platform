import request from "@/api/request"

// 通用响应类型
export interface GeneralResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 任务分组返回类型
export interface TaskGroupListVo {
  id: number;
  parentId: number;
  groupName: string;
  isTop: number;
  sort: number;
  taskNum: number;
}

// 分组数量统计返回类型
export interface StatisticsLatestTaskNumVo {
  todayNum: number;
  weekNum: number;
  noGroupNum: number;
}

// 添加任务清单分组
export const addTaskGroup = (data: { groupName: string; parentId?: string }) => {
  return request<GeneralResponse<void>>({
    url: '/bookkeeping-service/task/group/add',
    method: 'post',
    data
  })
}

// 获取任务清单分组列表
export const getTaskGroupList = (parentId?: string) => {
  return request<GeneralResponse<TaskGroupListVo[]>>({
    url: '/bookkeeping-service/task/group/list' + (parentId ? `?parentId=${parentId}` : ''),
    method: 'get'
  })
}

// 获取分组数量统计
export const getTaskGroupStatistics = (): Promise<GeneralResponse<StatisticsLatestTaskNumVo>> => {
  return request<GeneralResponse<StatisticsLatestTaskNumVo>>({
    url: '/bookkeeping-service/task/group/statisticsLatestTaskNum',
    method: 'get'
  })
}

// 获取任务列表
export interface TaskBasicsVo {
  id: number;
  taskName: string;
  completed: boolean;
  notes?: string;
}

// 获取任务列表
export const getTaskList = (taskGroupId: string) => {
  return request<GeneralResponse<TaskBasicsVo[]>>({
    url: '/bookkeeping-service/task/basics/list',
    method: 'post',
    data: { taskGroupId }
  })
}

// 创建任务
export const addTask = (data: { taskName: string; taskGroupId: number }) => {
  return request<GeneralResponse<void>>({
    url: '/bookkeeping-service/task/basics/add',
    method: 'post',
    data
  })
} 