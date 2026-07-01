import type { FormatterMetrics } from '../../types/formatter'
import { FORMATTER_LIMITS } from './config'

export const normalizeNewlines = (value: string) => value.replace(/\r\n?/g, '\n')

export const trimLineEndings = (value: string) => {
  return value
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
}

export const ensureFinalNewline = (value: string) => {
  return value && !value.endsWith('\n') ? `${value}\n` : value
}

export const calculateFormatterMetrics = (value: string): FormatterMetrics => {
  const bytes = new TextEncoder().encode(value).length
  const lines = value.length ? normalizeNewlines(value).split('\n').length : 0
  const nonEmptyLines = value.length
    ? normalizeNewlines(value).split('\n').filter((line) => line.trim()).length
    : 0

  return {
    characters: value.length,
    bytes,
    lines,
    nonEmptyLines
  }
}

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export const shouldUseManualFormat = (value: string) => {
  const metrics = calculateFormatterMetrics(value)
  return metrics.characters > FORMATTER_LIMITS.autoMaxCharacters
    || metrics.lines > FORMATTER_LIMITS.autoMaxLines
}

export const isHugeFormatterInput = (value: string) => {
  const metrics = calculateFormatterMetrics(value)
  return metrics.characters > FORMATTER_LIMITS.hugeTextCharacters
    || metrics.lines > FORMATTER_LIMITS.hugeTextLines
}
