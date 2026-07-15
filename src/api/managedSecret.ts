import request from '@/api/request'
import type * as ManagedSecret from '@/types/managedSecret'

export const queryManagedSecretPage = (dto: ManagedSecret.ManagedSecretPageDto) => {
  return request.post('/auth-service/managed/secret/page', dto)
}

export const addManagedSecret = (dto: ManagedSecret.ManagedSecretPayload) => {
  return request.post('/auth-service/managed/secret/add', dto)
}

export const updateManagedSecret = (dto: ManagedSecret.ManagedSecretPayload & { id: number }) => {
  return request.put('/auth-service/managed/secret/update', dto)
}

export const deleteManagedSecret = (id: number) => {
  return request.delete('/auth-service/managed/secret/delete?id=' + id)
}

export const queryManagedSecretDetail = (id: number) => {
  return request.get<unknown, { data: ManagedSecret.ManagedSecretDetail }>('/auth-service/managed/secret/detail?id=' + id)
}

export const revealManagedSecret = (dto: ManagedSecret.ManagedSecretRevealDto) => {
  return request.post<unknown, { data: ManagedSecret.ManagedSecretRevealResult }>('/auth-service/managed/secret/reveal', dto)
}
