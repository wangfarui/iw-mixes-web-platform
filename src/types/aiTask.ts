export type ToolTypeCode = 1 | 2 | 3
export type TaskStatusCode = 1 | 2 | 3

export type AiTaskPageDto = {
  currentPage: number
  pageSize: number
  keyword?: string
  toolType?: ToolTypeCode
  taskStatus?: TaskStatusCode
  projectName?: string
  workspaceKeyword?: string
  sessionKey?: string
}

export type AiTaskAddDto = {
  title: string
  description?: string
  toolType: ToolTypeCode
  sessionKey: string
  taskStatus: TaskStatusCode
  projectName?: string
  workspacePath?: string
  modelName?: string
  gitBranch?: string
  transcriptPath?: string
  resumeCommand?: string
}

export type AiTaskUpdateDto = AiTaskAddDto & {
  id: number
}

export type AiTaskPageVo = {
  id: number
  title?: string
  description?: string
  toolType?: ToolTypeCode
  sessionKey?: string
  taskStatus?: TaskStatusCode
  projectName?: string
  workspacePath?: string
  modelName?: string
  gitBranch?: string
  transcriptPath?: string
  resumeCommand?: string
  lastActiveAt?: string
  createTime?: string
  updateTime?: string
}

export type AiTaskDetailVo = AiTaskPageVo
