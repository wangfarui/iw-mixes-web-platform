import type { FormatterHistoryRecord } from '../../types/formatter'
import {
  FORMATTER_HISTORY_ENABLED_KEY,
  FORMATTER_HISTORY_STORAGE_KEY,
  MAX_FORMATTER_HISTORY_RECORDS
} from './config'

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

export const isFormatterHistoryEnabled = () => {
  return localStorage.getItem(FORMATTER_HISTORY_ENABLED_KEY) === 'true'
}

export const setFormatterHistoryEnabled = (enabled: boolean) => {
  localStorage.setItem(FORMATTER_HISTORY_ENABLED_KEY, String(enabled))
}

export const listFormatterHistoryRecords = () => {
  return readStorage<FormatterHistoryRecord[]>(FORMATTER_HISTORY_STORAGE_KEY, [])
}

export const saveFormatterHistoryRecord = (record: FormatterHistoryRecord) => {
  const records = listFormatterHistoryRecords()
    .filter((item) => item.id !== record.id)
  records.unshift(record)
  writeStorage(FORMATTER_HISTORY_STORAGE_KEY, records.slice(0, MAX_FORMATTER_HISTORY_RECORDS))
}

export const deleteFormatterHistoryRecord = (id: string) => {
  writeStorage(
    FORMATTER_HISTORY_STORAGE_KEY,
    listFormatterHistoryRecords().filter((record) => record.id !== id)
  )
}

export const clearFormatterHistoryRecords = () => {
  writeStorage(FORMATTER_HISTORY_STORAGE_KEY, [])
}

export const exportFormatterHistoryRecords = () => {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    source: 'iw-mixes-web-platform:formatter',
    records: listFormatterHistoryRecords()
  }, null, 2)
}

export const importFormatterHistoryRecords = (jsonText: string) => {
  const parsed = JSON.parse(jsonText)
  const incoming = Array.isArray(parsed) ? parsed : parsed.records

  if (!Array.isArray(incoming)) {
    throw new Error('历史 JSON 格式不正确')
  }

  const current = listFormatterHistoryRecords()
  const mergedMap = new Map<string, FormatterHistoryRecord>()

  ;[...incoming, ...current].forEach((record: FormatterHistoryRecord) => {
    if (
      record?.id
      && record?.createdAt
      && typeof record.input === 'string'
      && typeof record.output === 'string'
      && record.language
    ) {
      mergedMap.set(record.id, record)
    }
  })

  const merged = Array.from(mergedMap.values())
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_FORMATTER_HISTORY_RECORDS)

  writeStorage(FORMATTER_HISTORY_STORAGE_KEY, merged)
  return merged.length
}
