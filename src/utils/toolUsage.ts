export const TOOL_USAGE_STORAGE_KEY = 'iw-tools-usage-last-reported'
export const TOOL_USAGE_DEDUP_WINDOW_MS = 30 * 60 * 1000

export interface ToolUsageStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type UsageTimestampMap = Record<string, number>

export const shouldReportToolUsage = (toolKey: string, storage: ToolUsageStorage, now: number): boolean => {
  const timestamps = readActiveTimestamps(storage, now)
  const lastReportedAt = timestamps[toolKey]
  return lastReportedAt === undefined || now - lastReportedAt >= TOOL_USAGE_DEDUP_WINDOW_MS
}

export const markToolUsageReported = (toolKey: string, storage: ToolUsageStorage, now: number): void => {
  const timestamps = readActiveTimestamps(storage, now)
  timestamps[toolKey] = now
  storage.setItem(TOOL_USAGE_STORAGE_KEY, JSON.stringify(timestamps))
}

const readActiveTimestamps = (storage: ToolUsageStorage, now: number): UsageTimestampMap => {
  const rawValue = storage.getItem(TOOL_USAGE_STORAGE_KEY)
  let parsed: unknown
  try {
    parsed = rawValue ? JSON.parse(rawValue) : {}
  } catch {
    parsed = {}
  }

  const timestamps: UsageTimestampMap = {}
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    Object.entries(parsed as Record<string, unknown>).forEach(([toolKey, timestamp]) => {
      if (typeof timestamp === 'number'
        && Number.isFinite(timestamp)
        && timestamp <= now
        && now - timestamp < TOOL_USAGE_DEDUP_WINDOW_MS) {
        timestamps[toolKey] = timestamp
      }
    })
  }
  const serialized = JSON.stringify(timestamps)
  if (rawValue !== serialized) {
    storage.setItem(TOOL_USAGE_STORAGE_KEY, serialized)
  }
  return timestamps
}
