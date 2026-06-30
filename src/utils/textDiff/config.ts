import type { DiffSettings, IgnoreOptions } from '../../types/textDiff'

export const DIFF_LIMITS = {
  autoMaxCharacters: 30_000,
  autoMaxLines: 1_200,
  largeTextCharacters: 220_000,
  largeTextLines: 8_000,
  hugeTextCharacters: 1_200_000,
  hugeTextLines: 40_000,
  maxTextFileBytes: 5 * 1024 * 1024,
  diffTimeoutMs: 12_000,
  initialRenderRows: 900,
  renderStepRows: 900
} as const

export const TEXT_FILE_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.html',
  '.css',
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.sql',
  '.log'
])

export const DEFAULT_IGNORE_OPTIONS: IgnoreOptions = {
  ignoreCase: false,
  ignoreAllWhitespace: false,
  ignoreTrimWhitespace: false,
  ignoreBlankLines: false,
  ignoreLineEndings: true,
  ignoreTrailingNewline: true,
  customIgnoreRegex: ''
}

export const DEFAULT_DIFF_SETTINGS: DiffSettings = {
  granularity: 'line',
  viewMode: 'split',
  contextSize: 5,
  collapseUnchanged: false,
  showLineNumbers: true,
  wrapLines: true,
  showInvisibleChars: false,
  theme: 'light'
}

export const HISTORY_ENABLED_KEY = 'iw:text-diff:history-enabled'

export const HISTORY_STORAGE_KEY = 'iw:text-diff:history-records'

export const MAX_HISTORY_RECORDS = 40
