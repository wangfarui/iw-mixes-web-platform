import type { FormatterLanguage, FormatterSettings } from '../../types/formatter'

export const FORMATTER_LIMITS = {
  autoMaxCharacters: 80_000,
  autoMaxLines: 2_500,
  largeTextCharacters: 260_000,
  largeTextLines: 8_000,
  hugeTextCharacters: 1_200_000,
  hugeTextLines: 40_000,
  maxTextFileBytes: 8 * 1024 * 1024
} as const

export const FORMATTER_HISTORY_ENABLED_KEY = 'iw:formatter:history-enabled'

export const FORMATTER_HISTORY_STORAGE_KEY = 'iw:formatter:history-records'

export const FORMATTER_DIFF_PAYLOAD_KEY = 'iw:formatter:diff-payload'

export const MAX_FORMATTER_HISTORY_RECORDS = 40

export const FORMATTER_TEXT_FILE_EXTENSIONS = new Set([
  '.txt',
  '.json',
  '.xml',
  '.sql',
  '.properties',
  '.props',
  '.conf',
  '.ini',
  '.yaml',
  '.yml',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.md',
  '.markdown'
])

export const LANGUAGE_LABELS: Record<FormatterLanguage, string> = {
  auto: '自动识别',
  json: 'JSON',
  xml: 'XML',
  sql: 'SQL',
  properties: 'Properties',
  yaml: 'YAML',
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
  markdown: 'Markdown'
}

export const createDefaultFormatterSettings = (): FormatterSettings => ({
  language: 'auto',
  mode: 'format',
  indentSize: 2,
  sortKeys: false,
  sqlKeywordCase: 'upper',
  trimTrailingWhitespace: true,
  normalizeLineEndings: true,
  ensureFinalNewline: false
})
