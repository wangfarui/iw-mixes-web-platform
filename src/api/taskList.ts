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
  return request<GeneralResponse<number>>({
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
  taskRemark?: string;
  taskGroupId: number;
  deadlineDate?: string;
  priority?: number;
  isTop?: number;
  completed?: boolean;
  taskStatus?: number;
  sort?: number;
}

// 获取任务列表
export const getTaskList = (taskGroupId: string, startDeadlineDate?: string, endDeadlineDate?: string) => {
  return request<GeneralResponse<TaskBasicsVo[]>>({
    url: '/bookkeeping-service/task/basics/list',
    method: 'post',
    data: { 
      taskGroupId,
      startDeadlineDate,
      endDeadlineDate
    }
  })
}

// 创建任务
export const addTask = (data: { taskName: string; taskGroupId: number; deadlineDate?: string | null }) => {
  return request<GeneralResponse<void>>({
    url: '/bookkeeping-service/task/basics/add',
    method: 'post',
    data
  })
}

// 更新任务
export const updateTask = (params: TaskBasicsVo) => {
  return request.put('/bookkeeping-service/task/basics/update', params)
}

// 重命名分组
export const renameTaskGroup = (params: { id: number, groupName: string }) => {
  return request.put('/bookkeeping-service/task/group/update', params)
}

// 删除分组
export const deleteTaskGroup = (id: number) => {
  return request<GeneralResponse<void>>({
    url: `/bookkeeping-service/task/group/delete?id=${id}`,
    method: 'delete'
  })
}

// 移动清单列表项
export interface TaskGroupMoveListVo {
  id: number;
  groupName: string;
  subGroupList: TaskGroupMoveListVo[];
}

// 获取移动清单列表
export const getTaskGroupMoveList = () => {
  return request<GeneralResponse<TaskGroupMoveListVo[]>>({
    url: '/bookkeeping-service/task/group/moveList',
    method: 'get'
  })
} 