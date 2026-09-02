import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const file = resolve(process.cwd(), 'public/zhaogang-release-notes.json')
const value = JSON.parse(await readFile(file, 'utf8'))
if (value.schemaVersion !== 1 || !Array.isArray(value.releases) || typeof value.currentReleaseId !== 'string') throw new Error('版本清单顶层字段无效')
const ids = new Set(); const versions = new Set()
for (const release of value.releases) {
  if (Object.prototype.hasOwnProperty.call(release, 'title') || typeof release?.id !== 'string' || typeof release.version !== 'string' || typeof release.publishedAt !== 'string' || !Array.isArray(release.items) || !release.items.length) throw new Error(`版本 ${release?.id || ''} 字段无效`)
  if (ids.has(release.id) || versions.has(release.version)) throw new Error('release ID 或展示版本重复')
  if (Number.isNaN(Date.parse(release.publishedAt))) throw new Error(`版本 ${release.id} 发布时间无效`)
  for (const item of release.items) if (!['FEATURE', 'IMPROVEMENT', 'FIX'].includes(item?.type) || !item.text?.trim()) throw new Error(`版本 ${release.id} 更新项无效`)
  ids.add(release.id); versions.add(release.version)
}
if (!ids.has(value.currentReleaseId)) throw new Error('currentReleaseId 未对应版本记录')
console.log(`zhaogang release notes valid: ${value.currentReleaseId} (${value.releases.length} releases)`)
