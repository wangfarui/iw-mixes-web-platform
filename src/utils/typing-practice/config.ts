import type {
  TypingCodeLanguage,
  TypingContentKind,
  TypingPracticeMode
} from '@/types/typingPractice'

export const TYPING_PRACTICE_LIMITS = {
  minTargetLength: 10,
  maxTargetLength: 5_000,
  maxHistoryRecords: 200,
  infiniteAheadCharacters: 360,
  infiniteRefillThreshold: 120,
  infiniteRetainedCharacters: 200
} as const

export const TARGET_LENGTH_PRESETS = [50, 100, 200, 500, 1_000] as const

export const CONTENT_KIND_OPTIONS: Array<{ value: TypingContentKind; label: string }> = [
  { value: 'chinese', label: '中文' },
  { value: 'english', label: '英文' },
  { value: 'code', label: '代码' },
  { value: 'numbers', label: '数字与符号' }
]

export const CODE_LANGUAGE_OPTIONS: Array<{ value: TypingCodeLanguage; label: string }> = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'sql', label: 'SQL' }
]

export const PRACTICE_MODE_OPTIONS: Array<{ value: TypingPracticeMode; label: string }> = [
  { value: 'fixed', label: '定长练习' },
  { value: 'infinite', label: '无限挑战' }
]

export const CONTENT_KIND_LABELS = CONTENT_KIND_OPTIONS.reduce<Record<TypingContentKind, string>>(
  (result, item) => {
    result[item.value] = item.label
    return result
  },
  {} as Record<TypingContentKind, string>
)

export const PRACTICE_MODE_LABELS = PRACTICE_MODE_OPTIONS.reduce<Record<TypingPracticeMode, string>>(
  (result, item) => {
    result[item.value] = item.label
    return result
  },
  {} as Record<TypingPracticeMode, string>
)

export const validateTargetLength = (value: number): number => {
  if (!Number.isInteger(value)) {
    throw new Error('目标长度必须是整数')
  }
  if (value < TYPING_PRACTICE_LIMITS.minTargetLength || value > TYPING_PRACTICE_LIMITS.maxTargetLength) {
    throw new Error(`目标长度需在 ${TYPING_PRACTICE_LIMITS.minTargetLength}～${TYPING_PRACTICE_LIMITS.maxTargetLength.toLocaleString('zh-CN')} 个字符之间`)
  }
  return value
}
