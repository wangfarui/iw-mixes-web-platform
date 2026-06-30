import type { TextDiffHistoryRecord } from '../../types/textDiff'
import { HISTORY_ENABLED_KEY, HISTORY_STORAGE_KEY, MAX_HISTORY_RECORDS } from './config'

const readStorage = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

const writeStorage = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value))
}

export const isHistoryEnabled = () => {
  return localStorage.getItem(HISTORY_ENABLED_KEY) === 'true'
}

export const setHistoryEnabled = (enabled: boolean) => {
  localStorage.setItem(HISTORY_ENABLED_KEY, String(enabled))
}

export const listHistoryRecords = () => {
  return readStorage<TextDiffHistoryRecord[]>(HISTORY_STORAGE_KEY, [])
}

export const saveHistoryRecord = (record: TextDiffHistoryRecord) => {
  const records = listHistoryRecords()
    .filter((item) => item.id !== record.id)
  records.unshift(record)
  writeStorage(HISTORY_STORAGE_KEY, records.slice(0, MAX_HISTORY_RECORDS))
}

export const deleteHistoryRecord = (id: string) => {
  writeStorage(
    HISTORY_STORAGE_KEY,
    listHistoryRecords().filter((record) => record.id !== id)
  )
}

export const clearHistoryRecords = () => {
  writeStorage(HISTORY_STORAGE_KEY, [])
}

export const exportHistoryRecords = () => {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    source: 'iw-mixes-web-platform:text-diff',
    records: listHistoryRecords()
  }, null, 2)
}

export const importHistoryRecords = (jsonText: string) => {
  const parsed = JSON.parse(jsonText)
  const incoming = Array.isArray(parsed) ? parsed : parsed.records

  if (!Array.isArray(incoming)) {
    throw new Error('历史 JSON 格式不正确')
  }

  const current = listHistoryRecords()
  const mergedMap = new Map<string, TextDiffHistoryRecord>()

  ;[...incoming, ...current].forEach((record: TextDiffHistoryRecord) => {
    if (record?.id && record?.createdAt && typeof record.oldText === 'string' && typeof record.newText === 'string') {
      mergedMap.set(record.id, record)
    }
  })

  const merged = Array.from(mergedMap.values())
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_HISTORY_RECORDS)

  writeStorage(HISTORY_STORAGE_KEY, merged)
  return merged.length
}
