import type {
  TypingHistoryPayload,
  TypingHistoryRecord,
  TypingSessionSnapshot
} from '@/types/typingPractice'
import { TYPING_PRACTICE_LIMITS } from '@/utils/typing-practice/config'

export const TYPING_HISTORY_ENABLED_KEY = 'iw:typing-practice:history-enabled'
export const TYPING_HISTORY_STORAGE_KEY = 'iw:typing-practice:history-records'

const createId = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return `typing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const CONTENT_KINDS = new Set(['chinese', 'english', 'code', 'numbers'])
const PRACTICE_MODES = new Set(['fixed', 'infinite'])
const COMPLETION_REASONS = new Set(['length-complete', 'manual'])

const isHistoryRecord = (value: unknown): value is TypingHistoryRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.id === 'string'
    && typeof record.title === 'string'
    && typeof record.contentKind === 'string' && CONTENT_KINDS.has(record.contentKind)
    && typeof record.mode === 'string' && PRACTICE_MODES.has(record.mode)
    && typeof record.seed === 'string' && record.seed.length > 0
    && typeof record.completedAt === 'string'
    && !Number.isNaN(Date.parse(record.completedAt))
    && typeof record.completionReason === 'string' && COMPLETION_REASONS.has(record.completionReason)
    && [
      record.elapsedMs,
      record.typedLength,
      record.correctCharacters,
      record.mistakeAttempts,
      record.correctionCount,
      record.longestCorrectStreak,
      record.accuracy,
      record.cpm,
      record.wpm
    ].every((item) => typeof item === 'number' && Number.isFinite(item) && item >= 0)
    && (record.targetLength === undefined
      || (typeof record.targetLength === 'number' && Number.isFinite(record.targetLength) && record.targetLength >= 0))
}

const readRecords = (): TypingHistoryRecord[] => {
  try {
    const raw = localStorage.getItem(TYPING_HISTORY_STORAGE_KEY)
    const value = raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? value.filter(isHistoryRecord) : []
  } catch {
    return []
  }
}

const writeRecords = (records: TypingHistoryRecord[]) => {
  localStorage.setItem(
    TYPING_HISTORY_STORAGE_KEY,
    JSON.stringify(records.slice(0, TYPING_PRACTICE_LIMITS.maxHistoryRecords))
  )
}

export const isTypingHistoryEnabled = (): boolean => (
  localStorage.getItem(TYPING_HISTORY_ENABLED_KEY) === 'true'
)

export const setTypingHistoryEnabled = (enabled: boolean) => {
  localStorage.setItem(TYPING_HISTORY_ENABLED_KEY, String(enabled))
}

export const listTypingHistoryRecords = (): TypingHistoryRecord[] => readRecords()

export const createTypingHistoryRecord = (
  snapshot: TypingSessionSnapshot,
  id = createId()
): TypingHistoryRecord => {
  if (snapshot.status !== 'completed' || !snapshot.completionReason) {
    throw new Error('只有已完成的练习才能保存到历史')
  }
  return {
    id,
    title: snapshot.title,
    contentKind: snapshot.contentKind,
    mode: snapshot.mode,
    seed: snapshot.seed,
    completedAt: new Date(snapshot.completedAt ?? Date.now()).toISOString(),
    completionReason: snapshot.completionReason,
    elapsedMs: snapshot.elapsedMs,
    targetLength: snapshot.targetLength,
    typedLength: snapshot.typedLength,
    correctCharacters: snapshot.correctCharacters,
    mistakeAttempts: snapshot.mistakeAttempts,
    correctionCount: snapshot.correctionCount,
    longestCorrectStreak: snapshot.longestCorrectStreak,
    accuracy: snapshot.accuracy,
    cpm: snapshot.cpm,
    wpm: snapshot.wpm
  }
}

export const saveTypingHistoryRecord = (record: TypingHistoryRecord) => {
  writeRecords([record, ...readRecords().filter((item) => item.id !== record.id)])
}

export const deleteTypingHistoryRecord = (id: string) => {
  writeRecords(readRecords().filter((record) => record.id !== id))
}

export const clearTypingHistoryRecords = () => writeRecords([])

export const serializeTypingHistoryRecords = (records: TypingHistoryRecord[]): string => JSON.stringify({
  source: 'iw-mixes-web-platform:typing-practice',
  version: 2,
  exportedAt: new Date().toISOString(),
  records
} satisfies TypingHistoryPayload, null, 2)

export const parseTypingHistoryRecords = (raw: string): TypingHistoryRecord[] => {
  const parsed = JSON.parse(raw) as unknown
  const records = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && 'records' in parsed
      ? (parsed as { records: unknown }).records
      : undefined
  if (!Array.isArray(records)) {
    throw new Error('历史文件格式不正确')
  }
  const validRecords = records.filter(isHistoryRecord)
  if (!validRecords.length && records.length > 0) {
    throw new Error('历史文件中没有有效记录')
  }
  return validRecords.slice(0, TYPING_PRACTICE_LIMITS.maxHistoryRecords)
}

export const importTypingHistoryRecords = (records: TypingHistoryRecord[]): number => {
  const merged = [...records, ...readRecords()]
  const seen = new Set<string>()
  const unique = merged.filter((record) => {
    if (seen.has(record.id)) {
      return false
    }
    seen.add(record.id)
    return true
  })
  writeRecords(unique)
  return Math.min(records.length, TYPING_PRACTICE_LIMITS.maxHistoryRecords)
}
