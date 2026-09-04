import type { ZhaogangPlanPageSize, ZhaogangPlanTableColumnKey, ZhaogangPreferences } from '@/types/zhaogang'

const storageKey = (userId: number) => `zhaogang:preferences:${userId}`
const planTableColumnKeys: ZhaogangPlanTableColumnKey[] = ['service', 'status', 'branch', 'builder', 'duration', 'startedAt']
const planPageSizes: ZhaogangPlanPageSize[] = [10, 15, 20, 50]

const normalizePlanTableColumnWidths = (value: unknown): ZhaogangPreferences['planTableColumnWidths'] => {
  const widths: ZhaogangPreferences['planTableColumnWidths'] = { service: 320 }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return widths
  const storedWidths = value as Record<string, unknown>
  planTableColumnKeys.forEach((key) => {
    const width = storedWidths[key]
    if (typeof width === 'number' && Number.isFinite(width) && width >= 80 && width <= 1600) widths[key] = Math.round(width)
  })
  return widths
}

export const defaultZhaogangPreferences = (): ZhaogangPreferences => ({
  defaultTab: 'release',
  releaseTab: 'all',
  planView: 'table',
  rememberProjectFilter: true,
  projectFilterId: null,
  planPageSize: 15,
  planTableColumnWidths: { service: 320 },
  codingRole: null,
  autoSyncCreatedChildIssue: false
})

export const loadZhaogangPreferences = (userId: number): ZhaogangPreferences => {
  const defaults = defaultZhaogangPreferences()
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    const value = raw ? JSON.parse(raw) as Partial<ZhaogangPreferences> : {}
    return {
      defaultTab: value.defaultTab === 'worklog' || value.defaultTab === 'calendar'
        || value.defaultTab === 'iteration' || value.defaultTab === 'team' || value.defaultTab === 'services'
        ? value.defaultTab
        : defaults.defaultTab,
      releaseTab: value.releaseTab === 'favorites' ? 'favorites' : defaults.releaseTab,
      planView: value.planView === 'card' ? 'card' : defaults.planView,
      rememberProjectFilter: typeof value.rememberProjectFilter === 'boolean'
        ? value.rememberProjectFilter
        : defaults.rememberProjectFilter,
      projectFilterId: Number.isInteger(value.projectFilterId) ? value.projectFilterId as number : null,
      planPageSize: planPageSizes.includes(value.planPageSize as ZhaogangPlanPageSize)
        ? value.planPageSize as ZhaogangPlanPageSize
        : defaults.planPageSize,
      planTableColumnWidths: normalizePlanTableColumnWidths(value.planTableColumnWidths),
      codingRole: value.codingRole === 'PRODUCT' || value.codingRole === 'BACKEND' || value.codingRole === 'FRONTEND' || value.codingRole === 'QA'
        ? value.codingRole
        : defaults.codingRole,
      autoSyncCreatedChildIssue: typeof value.autoSyncCreatedChildIssue === 'boolean'
        ? value.autoSyncCreatedChildIssue
        : defaults.autoSyncCreatedChildIssue
    }
  } catch {
    return defaults
  }
}

export const saveZhaogangPreferences = (userId: number, preferences: ZhaogangPreferences) => {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(preferences))
}

export const resetZhaogangPreferences = (userId: number): ZhaogangPreferences => {
  const preferences = defaultZhaogangPreferences()
  saveZhaogangPreferences(userId, preferences)
  return preferences
}
