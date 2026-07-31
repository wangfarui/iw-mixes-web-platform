import type {
  TypingCharacterView,
  TypingClock,
  TypingCompletionReason,
  TypingEngine,
  TypingMistakeStat,
  TypingSessionCommand,
  TypingSessionConfig,
  TypingSessionSnapshot,
  TypingSessionStatus
} from '@/types/typingPractice'
import {
  TYPING_PRACTICE_LIMITS,
  validateTargetLength
} from '@/utils/typing-practice/config'

interface MutableSessionState {
  status: TypingSessionStatus
  completionReason?: TypingCompletionReason
  target: string[]
  typed: string[]
  baseOffset: number
  archivedCorrectCharacters: number
  archivedIncorrectCharacters: number
  startedAt?: number
  pausedAt?: number
  completedAt?: number
  pausedDurationMs: number
  completedElapsedMs?: number
  totalCommittedAttempts: number
  correctCommittedAttempts: number
  mistakeAttempts: number
  correctionCount: number
  currentCorrectStreak: number
  longestCorrectStreak: number
  mistakes: Map<string, TypingMistakeStat>
}

const systemClock: TypingClock = {
  now: () => Date.now()
}

export const segmentPracticeText = (value: string): string[] => {
  const segmenterConstructor = (Intl as unknown as {
    Segmenter?: new (
      locale: string,
      options: { granularity: 'grapheme' }
    ) => { segment: (text: string) => Iterable<{ segment: string }> }
  }).Segmenter
  if (segmenterConstructor) {
    return Array.from(
      new segmenterConstructor('zh-CN', { granularity: 'grapheme' }).segment(value),
      (item) => item.segment
    )
  }
  return Array.from(value)
}

const roundMetric = (value: number): number => Number(value.toFixed(1))

export const createTypingEngine = (
  config: TypingSessionConfig,
  clock: TypingClock = systemClock
): TypingEngine => {
  const requestedLength = config.mode === 'fixed'
    ? validateTargetLength(config.targetLength ?? 100)
    : undefined
  const initialText = config.generator.next(
    requestedLength ?? TYPING_PRACTICE_LIMITS.infiniteAheadCharacters
  )
  const initialCharacters = segmentPracticeText(initialText)
  const fixedCharacters = config.mode === 'fixed' && config.contentKind !== 'code'
    ? initialCharacters.slice(0, requestedLength)
    : initialCharacters

  if (!fixedCharacters.length) {
    throw new Error('随机生成器未能生成练习内容')
  }

  const state: MutableSessionState = {
    status: 'ready',
    target: fixedCharacters,
    typed: [],
    baseOffset: 0,
    archivedCorrectCharacters: 0,
    archivedIncorrectCharacters: 0,
    pausedDurationMs: 0,
    totalCommittedAttempts: 0,
    correctCommittedAttempts: 0,
    mistakeAttempts: 0,
    correctionCount: 0,
    currentCorrectStreak: 0,
    longestCorrectStreak: 0,
    mistakes: new Map()
  }

  const activeElapsedAt = (now: number): number => {
    if (state.startedAt === undefined) return 0
    if (state.completedElapsedMs !== undefined) return state.completedElapsedMs
    const end = state.status === 'paused' && state.pausedAt !== undefined ? state.pausedAt : now
    return Math.max(0, end - state.startedAt - state.pausedDurationMs)
  }

  const complete = (reason: TypingCompletionReason, now: number) => {
    if (state.status === 'completed') return
    state.completedElapsedMs = activeElapsedAt(now)
    state.status = 'completed'
    state.completionReason = reason
    state.completedAt = now
    state.pausedAt = undefined
  }

  const startIfReady = (now: number) => {
    if (state.status === 'ready') {
      state.status = 'running'
      state.startedAt = now
    }
  }

  const recordMistake = (expected: string, actual: string) => {
    const key = `${expected}\u0000${actual}`
    const current = state.mistakes.get(key)
    state.mistakes.set(key, {
      expected,
      actual,
      count: (current?.count ?? 0) + 1
    })
  }

  const ensureInfiniteBuffer = () => {
    if (config.mode !== 'infinite') return
    const remaining = state.target.length - state.typed.length
    if (remaining < TYPING_PRACTICE_LIMITS.infiniteRefillThreshold) {
      state.target.push(...segmentPracticeText(
        config.generator.next(TYPING_PRACTICE_LIMITS.infiniteAheadCharacters)
      ))
    }
  }

  const trimInfiniteBuffer = () => {
    if (config.mode !== 'infinite' || state.typed.length <= TYPING_PRACTICE_LIMITS.infiniteRetainedCharacters) {
      return
    }
    const removeCount = state.typed.length - TYPING_PRACTICE_LIMITS.infiniteRetainedCharacters
    for (let index = 0; index < removeCount; index += 1) {
      if (state.typed[index] === state.target[index]) {
        state.archivedCorrectCharacters += 1
      } else {
        state.archivedIncorrectCharacters += 1
      }
    }
    state.target.splice(0, removeCount)
    state.typed.splice(0, removeCount)
    state.baseOffset += removeCount
  }

  const commit = (text: string, now: number) => {
    if (!text || state.status === 'paused' || state.status === 'completed') return
    startIfReady(now)
    if (state.status !== 'running') return

    for (const character of segmentPracticeText(text)) {
      ensureInfiniteBuffer()
      if (state.typed.length >= state.target.length) break
      const expected = state.target[state.typed.length] as string
      state.typed.push(character)
      state.totalCommittedAttempts += 1
      if (character === expected) {
        state.correctCommittedAttempts += 1
        state.currentCorrectStreak += 1
        state.longestCorrectStreak = Math.max(state.longestCorrectStreak, state.currentCorrectStreak)
      } else {
        state.mistakeAttempts += 1
        state.currentCorrectStreak = 0
        recordMistake(expected, character)
      }
    }

    if (config.mode === 'fixed' && state.typed.length >= state.target.length) {
      complete('length-complete', now)
      return
    }
    trimInfiniteBuffer()
    ensureInfiniteBuffer()
  }

  const backspace = () => {
    if (state.status !== 'running' || state.typed.length === 0) return
    state.typed.pop()
    state.correctionCount += 1
  }

  const pause = (now: number) => {
    if (state.status === 'running') {
      state.status = 'paused'
      state.pausedAt = now
    }
  }

  const resume = (now: number) => {
    if (state.status !== 'paused' || state.pausedAt === undefined) return
    state.pausedDurationMs += Math.max(0, now - state.pausedAt)
    state.pausedAt = undefined
    state.status = 'running'
  }

  const finish = (now: number) => {
    if (state.status === 'running' || state.status === 'paused') {
      complete('manual', now)
    }
  }

  const buildSnapshot = (): TypingSessionSnapshot => {
    const elapsedMs = activeElapsedAt(clock.now())
    const visibleCorrect = state.typed.reduce((count, character, index) => (
      count + (character === state.target[index] ? 1 : 0)
    ), 0)
    const correctCharacters = state.archivedCorrectCharacters + visibleCorrect
    const incorrectCharacters = state.archivedIncorrectCharacters + state.typed.length - visibleCorrect
    const typedLength = state.baseOffset + state.typed.length
    const minutes = elapsedMs / 60_000
    const cpm = minutes > 0 ? correctCharacters / minutes : 0
    const accuracy = state.totalCommittedAttempts > 0
      ? (state.correctCommittedAttempts / state.totalCommittedAttempts) * 100
      : 0
    const characters: TypingCharacterView[] = state.target.map((expected, index) => {
      const typed = state.typed[index]
      if (typed !== undefined) {
        return {
          index: state.baseOffset + index,
          expected,
          typed,
          status: typed === expected ? 'correct' : 'incorrect'
        }
      }
      return {
        index: state.baseOffset + index,
        expected,
        status: index === state.typed.length && state.status !== 'completed' ? 'current' : 'pending'
      }
    })
    const targetLength = config.mode === 'fixed' ? state.target.length : undefined

    return {
      title: config.title,
      contentKind: config.contentKind,
      mode: config.mode,
      seed: config.seed,
      status: state.status,
      completionReason: state.completionReason,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      elapsedMs,
      targetLength,
      generatedLength: state.baseOffset + state.target.length,
      typedLength,
      correctCharacters,
      incorrectCharacters,
      totalCommittedAttempts: state.totalCommittedAttempts,
      correctCommittedAttempts: state.correctCommittedAttempts,
      mistakeAttempts: state.mistakeAttempts,
      correctionCount: state.correctionCount,
      longestCorrectStreak: state.longestCorrectStreak,
      progress: targetLength === undefined ? undefined : roundMetric((typedLength / targetLength) * 100),
      accuracy: roundMetric(accuracy),
      cpm: roundMetric(cpm),
      wpm: roundMetric(cpm / 5),
      characters,
      mistakes: Array.from(state.mistakes.values())
        .sort((left, right) => right.count - left.count || left.expected.localeCompare(right.expected))
    }
  }

  const send = (command: TypingSessionCommand): TypingSessionSnapshot => {
    const now = clock.now()
    switch (command.type) {
      case 'commit': commit(command.text, now); break
      case 'backspace': backspace(); break
      case 'pause': pause(now); break
      case 'resume': resume(now); break
      case 'finish': finish(now); break
    }
    return buildSnapshot()
  }

  return {
    send,
    snapshot: buildSnapshot
  }
}
