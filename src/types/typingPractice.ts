export type TypingContentKind = 'chinese' | 'english' | 'code' | 'numbers'

export type TypingCodeLanguage = 'javascript' | 'typescript' | 'java' | 'sql'

export type TypingPracticeMode = 'fixed' | 'infinite'

export type TypingSessionStatus = 'ready' | 'running' | 'paused' | 'completed'

export type TypingCompletionReason = 'length-complete' | 'manual'

export interface TypingGeneratorConfig {
  contentKind: TypingContentKind
  codeLanguage?: TypingCodeLanguage
  seed: string
}

export interface TypingTextGenerator {
  seed: string
  next: (minimumLength: number) => string
}

export interface TypingSessionConfig {
  title: string
  contentKind: TypingContentKind
  mode: TypingPracticeMode
  seed: string
  generator: TypingTextGenerator
  targetLength?: number
}

export interface TypingClock {
  now: () => number
}

export type TypingSessionCommand =
  | { type: 'commit'; text: string }
  | { type: 'backspace' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'finish' }

export type TypingCharacterStatus = 'pending' | 'current' | 'correct' | 'incorrect'

export interface TypingCharacterView {
  index: number
  expected: string
  typed?: string
  status: TypingCharacterStatus
}

export interface TypingMistakeStat {
  expected: string
  actual: string
  count: number
}

export interface TypingSessionSnapshot {
  title: string
  contentKind: TypingContentKind
  mode: TypingPracticeMode
  seed: string
  status: TypingSessionStatus
  completionReason?: TypingCompletionReason
  startedAt?: number
  completedAt?: number
  elapsedMs: number
  targetLength?: number
  generatedLength: number
  typedLength: number
  correctCharacters: number
  incorrectCharacters: number
  totalCommittedAttempts: number
  correctCommittedAttempts: number
  mistakeAttempts: number
  correctionCount: number
  longestCorrectStreak: number
  progress?: number
  accuracy: number
  cpm: number
  wpm: number
  characters: TypingCharacterView[]
  mistakes: TypingMistakeStat[]
}

export interface TypingEngine {
  send: (command: TypingSessionCommand) => TypingSessionSnapshot
  snapshot: () => TypingSessionSnapshot
}

export interface TypingHistoryRecord {
  id: string
  title: string
  contentKind: TypingContentKind
  mode: TypingPracticeMode
  seed: string
  completedAt: string
  completionReason: TypingCompletionReason
  elapsedMs: number
  targetLength?: number
  typedLength: number
  correctCharacters: number
  mistakeAttempts: number
  correctionCount: number
  longestCorrectStreak: number
  accuracy: number
  cpm: number
  wpm: number
}

export interface TypingHistoryPayload {
  source: 'iw-mixes-web-platform:typing-practice'
  version: 2
  exportedAt: string
  records: TypingHistoryRecord[]
}

export type TypingExportFormat = 'json' | 'csv'
