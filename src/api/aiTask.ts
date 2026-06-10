import request from '@/api/request'
import type * as AiTaskType from '@/types/aiTask'

export const queryAiTaskPage = (pageDto: AiTaskType.AiTaskPageDto) => {
  return request.post('/auth-service/ai/task/page', pageDto)
}

export const addAiTask = (addDto: AiTaskType.AiTaskAddDto) => {
  return request.post('/auth-service/ai/task/add', addDto)
}

export const updateAiTask = (updateDto: AiTaskType.AiTaskUpdateDto) => {
  return request.put('/auth-service/ai/task/update', updateDto)
}

export const deleteAiTask = (id: number) => {
  return request.delete('/auth-service/ai/task/delete?id=' + id)
}

export const queryAiTaskDetail = (id: number) => {
  return request.get('/auth-service/ai/task/detail?id=' + id)
}
