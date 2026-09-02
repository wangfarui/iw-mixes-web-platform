import { acknowledgeZhaogangRelease, getZhaogangReleaseReceipt } from '@/api/zhaogang'
import type { ZhaogangRelease, ZhaogangReleaseCheck, ZhaogangReleaseItemType, ZhaogangReleaseManifest, ZhaogangReleaseReceipt } from '@/types/zhaogangRelease'

const RELEASE_TYPES: readonly ZhaogangReleaseItemType[] = ['FEATURE', 'IMPROVEMENT', 'FIX']
const LOCAL_PREFIX = 'zhaogang:release-read:'
const manifestUrl = `${import.meta.env.BASE_URL || '/'}zhaogang-release-notes.json`

export const validateZhaogangReleaseManifest = (value: unknown): ZhaogangReleaseManifest => {
  if (!value || typeof value !== 'object') throw new Error('版本清单格式无效')
  const manifest = value as Partial<ZhaogangReleaseManifest>
  if (manifest.schemaVersion !== 1 || typeof manifest.currentReleaseId !== 'string' || !Array.isArray(manifest.releases)) throw new Error('版本清单版本不受支持')
  const ids = new Set<string>(); const versions = new Set<string>()
  const releases = manifest.releases.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new Error('版本记录格式无效')
    const item = raw as Partial<ZhaogangRelease>
    if ('title' in item || typeof item.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(item.id) || typeof item.version !== 'string' || !item.version.trim() || typeof item.publishedAt !== 'string' || !Array.isArray(item.items) || !item.items.length || ids.has(item.id) || versions.has(item.version)) throw new Error('版本记录缺少必要字段或存在重复')
    if (Number.isNaN(Date.parse(item.publishedAt))) throw new Error('版本发布时间无效')
    const items = item.items.map((entry) => {
      if (!entry || typeof entry !== 'object' || !RELEASE_TYPES.includes(entry.type) || !entry.text?.trim()) throw new Error('版本更新项无效')
      return { type: entry.type, text: entry.text.trim() }
    })
    ids.add(item.id); versions.add(item.version)
    return { id: item.id, version: item.version, publishedAt: item.publishedAt!, items }
  })
  if (!ids.has(manifest.currentReleaseId)) throw new Error('当前版本不存在')
  return { schemaVersion: 1, currentReleaseId: manifest.currentReleaseId, releases }
}

const localKey = (userId: number, releaseId: string) => `${LOCAL_PREFIX}${userId}:${releaseId}`
const readLocal = (userId: number, releaseId: string): ZhaogangReleaseReceipt => {
  try { const value = window.localStorage.getItem(localKey(userId, releaseId)); return value ? { read: true, readAt: value } : { read: false, readAt: null } } catch { return { read: false, readAt: null } }
}
const writeLocal = (userId: number, releaseId: string, readAt = new Date().toISOString()) => {
  try { window.localStorage.setItem(localKey(userId, releaseId), readAt) } catch { /* 服务端状态仍然可用 */ }
}

export const loadZhaogangReleaseManifest = async (): Promise<ZhaogangReleaseManifest> => {
  const response = await fetch(manifestUrl, { cache: 'no-store' })
  if (!response.ok) throw new Error('版本清单加载失败')
  return validateZhaogangReleaseManifest(await response.json())
}

export const loadCurrentZhaogangRelease = async (userId: number): Promise<ZhaogangReleaseCheck | null> => {
  try {
    const manifest = await loadZhaogangReleaseManifest()
    const currentRelease = manifest.releases.find((release) => release.id === manifest.currentReleaseId)
    if (!currentRelease) return null
    const localReceipt = readLocal(userId, currentRelease.id)
    let receipt = localReceipt; let synced = false
    try {
      const remote = await getZhaogangReleaseReceipt(currentRelease.id)
      receipt = remote.read ? remote : localReceipt
      synced = true
      if (remote.read && remote.readAt) writeLocal(userId, currentRelease.id, remote.readAt)
      if (!remote.read && localReceipt.read) void acknowledgeZhaogangRelease(currentRelease.id).then((result) => { if (result.readAt) writeLocal(userId, currentRelease.id, result.readAt) }).catch(() => undefined)
    } catch { /* 通知故障不得阻塞工作台 */ }
    return { manifest, currentRelease, receipt, synced }
  } catch { return null }
}

export const acknowledgeCurrentZhaogangRelease = async (userId: number, releaseId: string): Promise<ZhaogangReleaseReceipt> => {
  const optimistic = { read: true, readAt: new Date().toISOString() }
  writeLocal(userId, releaseId, optimistic.readAt)
  try {
    const remote = await acknowledgeZhaogangRelease(releaseId)
    if (remote.readAt) writeLocal(userId, releaseId, remote.readAt)
    return remote
  } catch { return optimistic }
}

export const zhaogangReleaseLocalPrefix = LOCAL_PREFIX
