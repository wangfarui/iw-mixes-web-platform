export type DiffGranularity = 'line' | 'word' | 'char'

export type DiffViewMode = 'split' | 'unified'

export type DiffTheme = 'light' | 'dark'

export type DiffContextSize = 3 | 5 | 10 | 'all'

export type DiffRowType = 'context' | 'added' | 'removed' | 'modified' | 'fold'

export type InlineSegmentType = 'equal' | 'added' | 'removed'

export type PreprocessAction =
  | 'json-format'
  | 'json-compact'
  | 'json-sort-keys'
  | 'markup-format'
  | 'markdown-source'
  | 'url-encode'
  | 'url-decode'
  | 'base64-decode'
  | 'trim'
  | 'tabs-to-spaces'
  | 'normalize-newlines'

export type PreprocessTarget = 'old' | 'new' | 'both'

export interface IgnoreOptions {
  ignoreCase: boolean
  ignoreAllWhitespace: boolean
  ignoreTrimWhitespace: boolean
  ignoreBlankLines: boolean
  ignoreLineEndings: boolean
  ignoreTrailingNewline: boolean
  customIgnoreRegex: string
}

export interface DiffSettings {
  granularity: DiffGranularity
  viewMode: DiffViewMode
  contextSize: DiffContextSize
  collapseUnchanged: boolean
  showLineNumbers: boolean
  wrapLines: boolean
  showInvisibleChars: boolean
  theme: DiffTheme
}

export interface DiffComputeOptions {
  granularity: DiffGranularity
  ignoreOptions: IgnoreOptions
  oldFileName?: string
  newFileName?: string
}

export interface InlineSegment {
  text: string
  type: InlineSegmentType
}

export interface DiffRow {
  id: string
  type: DiffRowType
  oldLineNumber?: number
  newLineNumber?: number
  oldText: string
  newText: string
  oldSegments: InlineSegment[]
  newSegments: InlineSegment[]
  blockIndex?: number
  hiddenCount?: number
}

export interface TextMetrics {
  characters: number
  words: number
  lines: number
  bytes: number
}

export interface DiffStats {
  added: number
  deleted: number
  modified: number
  unchanged: number
  blocks: number
  oldMetrics: TextMetrics
  newMetrics: TextMetrics
  processedOldCharacters: number
  processedNewCharacters: number
  durationMs: number
}

export interface DiffResult {
  rows: DiffRow[]
  stats: DiffStats
  unifiedDiff: string
  activeIgnoreRules: string[]
  warnings: string[]
  comparedAt: string
  oldFileName: string
  newFileName: string
  processedOldText: string
  processedNewText: string
}

export interface FileReadInfo {
  name: string
  size: number
  lines: number
  encoding: string
  status: 'ready' | 'error'
  message: string
}

export interface TextDiffHistoryRecord {
  id: string
  name: string
  createdAt: string
  oldText: string
  newText: string
  oldFileName?: string
  newFileName?: string
  settings: DiffSettings
  ignoreOptions: IgnoreOptions
  stats?: DiffStats
}

export interface DiffWorkerRequest {
  id: number
  oldText: string
  newText: string
  options: DiffComputeOptions
}

export interface DiffWorkerSuccessResponse {
  id: number
  ok: true
  result: DiffResult
}

export interface DiffWorkerErrorResponse {
  id: number
  ok: false
  error: string
}

export type DiffWorkerResponse = DiffWorkerSuccessResponse | DiffWorkerErrorResponse
