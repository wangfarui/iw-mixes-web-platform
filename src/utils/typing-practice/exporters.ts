import type {
  TypingExportFormat,
  TypingSessionSnapshot
} from '@/types/typingPractice'
import {
  CONTENT_KIND_LABELS,
  PRACTICE_MODE_LABELS
} from '@/utils/typing-practice/config'

const escapeCsv = (value: string | number | undefined): string => {
  const text = value === undefined ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const formatTypingResultText = (snapshot: TypingSessionSnapshot): string => [
  '打字练习成绩',
  `练习：${snapshot.title}`,
  `内容：${CONTENT_KIND_LABELS[snapshot.contentKind]}`,
  `模式：${PRACTICE_MODE_LABELS[snapshot.mode]}`,
  `随机种子：${snapshot.seed}`,
  `WPM：${snapshot.wpm}`,
  `CPM：${snapshot.cpm}`,
  `准确率：${snapshot.accuracy}%`,
  `有效时长：${(snapshot.elapsedMs / 1000).toFixed(1)} 秒`,
  `正确字符：${snapshot.correctCharacters}`,
  `错误尝试：${snapshot.mistakeAttempts}`,
  `修正次数：${snapshot.correctionCount}`,
  `最长连续正确：${snapshot.longestCorrectStreak}`,
  snapshot.progress === undefined ? `累计输入：${snapshot.typedLength} 字符` : `完成度：${snapshot.progress}%`
].join('\n')

export const formatTypingResult = (
  snapshot: TypingSessionSnapshot,
  format: TypingExportFormat
): string => {
  if (format === 'json') {
    return JSON.stringify({
      title: snapshot.title,
      contentKind: snapshot.contentKind,
      mode: snapshot.mode,
      seed: snapshot.seed,
      completedAt: snapshot.completedAt ? new Date(snapshot.completedAt).toISOString() : undefined,
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
      wpm: snapshot.wpm,
      progress: snapshot.progress,
      mistakes: snapshot.mistakes
    }, null, 2)
  }

  const headers = [
    'title', 'contentKind', 'mode', 'seed', 'completedAt', 'elapsedMs', 'targetLength', 'typedLength',
    'correctCharacters', 'mistakeAttempts', 'correctionCount', 'longestCorrectStreak', 'accuracy', 'cpm', 'wpm', 'progress'
  ]
  const values = [
    snapshot.title,
    snapshot.contentKind,
    snapshot.mode,
    snapshot.seed,
    snapshot.completedAt ? new Date(snapshot.completedAt).toISOString() : '',
    snapshot.elapsedMs,
    snapshot.targetLength,
    snapshot.typedLength,
    snapshot.correctCharacters,
    snapshot.mistakeAttempts,
    snapshot.correctionCount,
    snapshot.longestCorrectStreak,
    snapshot.accuracy,
    snapshot.cpm,
    snapshot.wpm,
    snapshot.progress
  ]
  return [headers.join(','), values.map(escapeCsv).join(',')].join('\n')
}

export const downloadTextContent = (
  content: string,
  filename: string,
  mime: string
) => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const downloadTypingResult = (
  snapshot: TypingSessionSnapshot,
  format: TypingExportFormat
) => {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  downloadTextContent(
    formatTypingResult(snapshot, format),
    `typing-practice-${timestamp}.${format}`,
    format === 'json' ? 'application/json' : 'text/csv'
  )
}
