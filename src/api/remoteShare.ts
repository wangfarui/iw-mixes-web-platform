import type { RemoteShareMaterial } from '@/utils/remote-share/remoteShareProtocol'
import type { PendingRemoteShareBinary, PendingRemoteShareText, RemoteShareCodeJoin, RemoteShareDevice, RemoteShareSessionState } from '@/types/remoteShare'

export type { PendingRemoteShareBinary, PendingRemoteShareText, RemoteShareCodeJoin, RemoteShareDevice, RemoteShareSessionState } from '@/types/remoteShare'

// 远程共享页面部署在 web.itwray.com，公开服务部署在 api.itwray.com。
// 不能使用相对地址，否则生产环境会把 POST 发往静态站点并得到 405。
const API_ROOT = `${import.meta.env.VITE_BUILD_ENV === 'prod' ? '//api.itwray.com' : ''}/external-service/api/remote-share`

export class RemoteShareRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
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
  const payload = await response.json().catch(() => undefined) as { code: number; message: string; data: T } | undefined
  if (!response.ok || payload?.code !== 200) {
    throw new RemoteShareRequestError(payload?.message || '远程共享服务暂不可用，请稍后重试', response.status)
  }
  return payload.data
}

export const createRemoteShareSession = (material: RemoteShareMaterial, sessionSecret: string) => request<RemoteShareDevice>('/sessions', {
  method: 'POST',
  body: JSON.stringify({ roomId: material.roomId, accessToken: material.accessToken, sessionSecret })
})

export const joinRemoteShareSession = (material: RemoteShareMaterial) => request<RemoteShareDevice>(`/sessions/${encodeURIComponent(material.roomId)}/join`, {
  method: 'POST',
  body: JSON.stringify({ accessToken: material.accessToken })
})

export const joinRemoteShareSessionByCode = (joinCode: string) => request<RemoteShareCodeJoin>('/sessions/join-by-code', {
  method: 'POST',
  body: JSON.stringify({ joinCode })
})

export const getRemoteShareState = (roomId: string, capability: string) => request<RemoteShareSessionState>(
  `/sessions/${encodeURIComponent(roomId)}`, { headers: { 'X-Remote-Share-Capability': capability } }
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
  `/sessions/${encodeURIComponent(roomId)}/texts`, { headers: { 'X-Remote-Share-Capability': capability } }
)

export const beginRemoteShareBinary = (roomId: string, capability: string, itemId: string, totalBytes: number, chunks: number, encryptedManifest: string) => request<void>(`/sessions/${encodeURIComponent(roomId)}/binaries`, { method: 'POST', body: JSON.stringify({ capability, itemId, totalBytes, chunks, encryptedManifest }) })
export const uploadRemoteShareChunk = async (roomId: string, capability: string, itemId: string, index: number, chunk: Uint8Array) => {
  const response = await fetch(`${API_ROOT}/sessions/${encodeURIComponent(roomId)}/binaries/${encodeURIComponent(itemId)}/chunks/${index}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'X-Remote-Share-Capability': capability }, body: chunk })
  const payload = await response.json().catch(() => undefined) as { code: number; message: string } | undefined
  if (!response.ok || payload?.code !== 200) throw new RemoteShareRequestError(payload?.message || '文件上传服务暂不可用，请稍后重试', response.status)
}
export const completeRemoteShareBinary = (roomId: string, capability: string, itemId: string) => request<void>(`/sessions/${encodeURIComponent(roomId)}/binaries/${encodeURIComponent(itemId)}/complete`, { method: 'POST', body: JSON.stringify({ capability }) })
export const pendingRemoteShareBinaries = (roomId: string, capability: string) => request<PendingRemoteShareBinary[]>(`/sessions/${encodeURIComponent(roomId)}/binaries`, { headers: { 'X-Remote-Share-Capability': capability } })
export const downloadRemoteShareChunk = async (roomId: string, capability: string, itemId: string, index: number) => {
  const response = await fetch(`${API_ROOT}/sessions/${encodeURIComponent(roomId)}/binaries/${encodeURIComponent(itemId)}/chunks/${index}`, { headers: { 'X-Remote-Share-Capability': capability } })
  if (!response.ok) throw new RemoteShareRequestError('文件已不可用', response.status)
  return new Uint8Array(await response.arrayBuffer())
}
export const receiptRemoteShareBinary = (roomId: string, capability: string, itemId: string) => request<void>(`/sessions/${encodeURIComponent(roomId)}/binaries/${encodeURIComponent(itemId)}/receipt`, { method: 'POST', body: JSON.stringify({ capability }) })
