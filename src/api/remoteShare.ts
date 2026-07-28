import type { RemoteShareMaterial } from '@/utils/remote-share/remoteShareProtocol'

const API_ROOT = '/external-service/api/remote-share'

export interface RemoteShareDevice {
  slot: 'A' | 'B'
  capability: string
  expiresAt: string
}

export interface RemoteShareSessionState {
  slot: 'A' | 'B'
  paired: boolean
  expiresAt: string
}

export interface PendingRemoteShareText {
  id: string
  sender: 'A' | 'B'
  ciphertext: string
  expiresAt: string
}

const request = async <T>(path: string, init: RequestInit = {}) => {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  })
  const payload = await response.json() as { code: number; message: string; data: T }
  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.message || '远程共享请求失败')
  }
  return payload.data
}

export const createRemoteShareSession = (material: RemoteShareMaterial) => request<RemoteShareDevice>('/sessions', {
  method: 'POST',
  body: JSON.stringify({ roomId: material.roomId, accessToken: material.accessToken })
})

export const joinRemoteShareSession = (material: RemoteShareMaterial) => request<RemoteShareDevice>(`/sessions/${encodeURIComponent(material.roomId)}/join`, {
  method: 'POST',
  body: JSON.stringify({ accessToken: material.accessToken })
})

export const getRemoteShareState = (roomId: string, capability: string) => request<RemoteShareSessionState>(
  `/sessions/${encodeURIComponent(roomId)}?capability=${encodeURIComponent(capability)}`
)

export const closeRemoteShareSession = (roomId: string, capability: string) => request<void>(`/sessions/${encodeURIComponent(roomId)}/close`, {
  method: 'POST',
  body: JSON.stringify({ capability })
})

export const sendRemoteShareText = (roomId: string, capability: string, ciphertext: string) => request<void>(
  `/sessions/${encodeURIComponent(roomId)}/texts`, {
    method: 'POST',
    body: JSON.stringify({ capability, ciphertext })
  }
)

export const claimRemoteShareTexts = (roomId: string, capability: string) => request<PendingRemoteShareText[]>(
  `/sessions/${encodeURIComponent(roomId)}/texts?capability=${encodeURIComponent(capability)}`
)

export const beginRemoteShareBinary = (roomId: string, capability: string, itemId: string, totalBytes: number, chunks: number, encryptedManifest: string) => request<void>(`/sessions/${encodeURIComponent(roomId)}/binaries`, { method: 'POST', body: JSON.stringify({ capability, itemId, totalBytes, chunks, encryptedManifest }) })
export const uploadRemoteShareChunk = async (roomId: string, capability: string, itemId: string, index: number, chunk: Uint8Array) => {
  const response = await fetch(`${API_ROOT}/sessions/${encodeURIComponent(roomId)}/binaries/${encodeURIComponent(itemId)}/chunks/${index}?capability=${encodeURIComponent(capability)}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: chunk })
  const payload = await response.json() as { code: number; message: string }
  if (!response.ok || payload.code !== 200) throw new Error(payload.message || '临时存储上传失败')
}
export const completeRemoteShareBinary = (roomId: string, capability: string, itemId: string) => request<void>(`/sessions/${encodeURIComponent(roomId)}/binaries/${encodeURIComponent(itemId)}/complete`, { method: 'POST', body: JSON.stringify({ capability }) })
export interface PendingRemoteShareBinary { itemId: string; totalBytes: number; chunks: number; encryptedManifest: string }
export const pendingRemoteShareBinaries = (roomId: string, capability: string) => request<PendingRemoteShareBinary[]>(`/sessions/${encodeURIComponent(roomId)}/binaries?capability=${encodeURIComponent(capability)}`)
export const downloadRemoteShareChunk = async (roomId: string, capability: string, itemId: string, index: number) => {
  const response = await fetch(`${API_ROOT}/sessions/${encodeURIComponent(roomId)}/binaries/${encodeURIComponent(itemId)}/chunks/${index}?capability=${encodeURIComponent(capability)}`)
  if (!response.ok) throw new Error('临时文件已不可用')
  return new Uint8Array(await response.arrayBuffer())
}
export const receiptRemoteShareBinary = (roomId: string, capability: string, itemId: string) => request<void>(`/sessions/${encodeURIComponent(roomId)}/binaries/${encodeURIComponent(itemId)}/receipt`, { method: 'POST', body: JSON.stringify({ capability }) })
