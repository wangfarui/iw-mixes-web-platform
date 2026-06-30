import type { TextMetrics } from '../../types/textDiff'

const textEncoder = new TextEncoder()

export const normalizeNewlines = (text: string) => text.replace(/\r\n?/g, '\n')

export const splitTextLines = (text: string) => {
  if (!text) {
    return []
  }
  return normalizeNewlines(text).split('\n')
}

export const splitDiffValueToLines = (value: string) => {
  if (!value) {
    return []
  }

  const matches = value.match(/[^\n]*\n|[^\n]+/g)
  if (!matches) {
    return []
  }

  return matches.map((line) => {
    const withoutNewline = line.endsWith('\n') ? line.slice(0, -1) : line
    return withoutNewline.endsWith('\r') ? withoutNewline.slice(0, -1) : withoutNewline
  })
}

export const countTextLines = (text: string) => {
  if (!text) {
    return 0
  }
  return normalizeNewlines(text).split('\n').length
}

export const calculateTextMetrics = (text: string): TextMetrics => {
  const trimmed = text.trim()
  return {
    characters: text.length,
    words: trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0,
    lines: countTextLines(text),
    bytes: textEncoder.encode(text).length
  }
}

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

export const shouldUseManualDiff = (oldText: string, newText: string, limits: {
  autoMaxCharacters: number
  autoMaxLines: number
}) => {
  const characters = oldText.length + newText.length
  const lines = countTextLines(oldText) + countTextLines(newText)
  return characters > limits.autoMaxCharacters || lines > limits.autoMaxLines
}

export const isHugeText = (oldText: string, newText: string, limits: {
  hugeTextCharacters: number
  hugeTextLines: number
}) => {
  const characters = oldText.length + newText.length
  const lines = countTextLines(oldText) + countTextLines(newText)
  return characters > limits.hugeTextCharacters || lines > limits.hugeTextLines
}

export const makeVisibleWhitespace = (text: string) => {
  return text
    .replace(/ /g, '·')
    .replace(/\t/g, '→   ')
}
