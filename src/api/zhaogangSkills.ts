import { ZHAOGANG_API_ROOT, zhaogangRequest } from './zhaogang'

export interface SkillEntry {
  id: string
  machineName: string
  currentVersion: string
  revision: number
  creator: boolean
  title: string
  summary: string
  updatedBy: string
  updatedAt: string
}
export interface SkillVersion {
  version: string
  title: string
  summary: string
  notes: string
  sha256: string
  publishedBy: string
  publishedAt: string
  deleted: boolean
}
export interface SkillEvent {
  action: string
  actor: string
  source: string
  previousVersion: string | null
  currentVersion: string | null
  targetVersion: string | null
  reason: string
  at: string
}
export interface SkillDetail {
  skill: SkillEntry
  versions: SkillVersion[]
  events: SkillEvent[]
}
export interface SkillDifference {
  before: string
  after: string
  files: Array<{ path: string; type: 'added' | 'removed' | 'modified' }>
}
export interface SkillPreview {
  draftId: string
  machineName: string
  description: string
  sha256: string
  baseVersion: string | null
  difference: SkillDifference
}
export interface SkillPublish {
  draftId: string
  title: string
  summary: string
  notes: string
  bump: 'patch' | 'minor' | 'major'
}
export interface SkillDevice { id: string; label: string; createdAt: string }

const path = (id: string) => `/skills/${encodeURIComponent(id)}`
const versionPath = (id: string, version: string) => `${path(id)}/versions/${encodeURIComponent(version)}`
const write = <T>(url: string, method: string, data?: unknown) => zhaogangRequest<T>(url, {
  method,
  headers: { 'X-ZG-Skills-Request': '1' },
  body: data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data)
})

export const listSkills = (q = '') => zhaogangRequest<SkillEntry[]>(`/skills?q=${encodeURIComponent(q)}`)
export const getSkill = (id: string) => zhaogangRequest<SkillDetail>(path(id))
export const compareSkill = (id: string, from: string, to: string) => zhaogangRequest<SkillDifference>(
  `${path(id)}/compare?${new URLSearchParams({ from, to })}`)
export const skillDownloadUrl = (id: string, version: string) => `${ZHAOGANG_API_ROOT}${versionPath(id, version)}/download`
export const previewSkill = (file: File, skill?: SkillEntry) => {
  const form = new FormData()
  form.append('file', file)
  if (skill) {
    form.append('skillId', skill.id)
    form.append('revision', String(skill.revision))
  }
  return write<SkillPreview>('/skills/preview', 'POST', form)
}
export const publishSkill = (data: SkillPublish) => write<{ skillId: string; version: string; sha256: string }>('/skills/publish', 'POST', data)
export const rollbackSkill = (id: string, version: string, revision: number, reason: string) =>
  write<void>(`${versionPath(id, version)}/rollback`, 'POST', { revision, reason })
export const deleteSkillVersion = (id: string, version: string, revision: number, reason: string) =>
  write<void>(versionPath(id, version), 'DELETE', { revision, reason })
export const deleteSkill = (id: string, revision: number, reason: string) =>
  write<void>(path(id), 'DELETE', { revision, reason })
export const listSkillDevices = () => zhaogangRequest<SkillDevice[]>('/skills/devices')
export const previewSkillPair = (code: string) => write<SkillDevice>('/skills/devices/pair/preview', 'POST', { code })
export const approveSkillPair = (code: string) => write<void>('/skills/devices/pair/approve', 'POST', { code })
export const revokeSkillDevice = (id: string) => write<void>(`/skills/devices/${encodeURIComponent(id)}`, 'DELETE')
