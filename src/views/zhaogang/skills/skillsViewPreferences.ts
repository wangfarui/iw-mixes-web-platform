export const skillColumnMinimumWidths = {
  skill: 230,
  summary: 240,
  currentVersion: 106,
  updatedBy: 120,
  updatedAt: 172
}

export type SkillColumnKey = keyof typeof skillColumnMinimumWidths
export interface SkillsViewPreferences {
  view: 'list' | 'card'
  widths: Partial<Record<SkillColumnKey, number>>
}

const storageKey = (userId: number) => `zhaogang:skills-view:${userId}`
export const normalizeSkillColumnWidth = (key: SkillColumnKey, width: number) =>
  Math.min(1600, Math.max(skillColumnMinimumWidths[key], Math.round(width)))

export function loadSkillsViewPreferences(userId?: number): SkillsViewPreferences {
  const defaults: SkillsViewPreferences = { view: 'list', widths: {} }
  if (!userId) return defaults
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    const value = raw ? JSON.parse(raw) : null
    if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults
    const widths: SkillsViewPreferences['widths'] = {}
    for (const key of Object.keys(skillColumnMinimumWidths) as SkillColumnKey[]) {
      const width = value.widths?.[key]
      if (typeof width === 'number' && Number.isFinite(width)) widths[key] = normalizeSkillColumnWidth(key, width)
    }
    return { view: value.view === 'card' ? 'card' : 'list', widths }
  } catch {
    return defaults
  }
}

export function saveSkillsViewPreferences(userId: number | undefined, value: SkillsViewPreferences) {
  if (!userId) return
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(value))
  } catch {
    // The view remains usable when browser storage is unavailable.
  }
}
