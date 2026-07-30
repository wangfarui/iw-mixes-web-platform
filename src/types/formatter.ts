export type FormatterLanguage =
  | 'auto'
  | 'json'
  | 'xml'
  | 'sql'
  | 'properties'
  | 'yaml'
  | 'html'
  | 'css'
  | 'javascript'
  | 'markdown'

export type ResolvedFormatterLanguage = Exclude<FormatterLanguage, 'auto'>

export type FormatterMode = 'format' | 'compact' | 'validate'

export type SqlKeywordCase = 'preserve' | 'upper' | 'lower'

export type JsonStringHandling = 'preserve' | 'outer' | 'recursive'

export type FormatterIssueLevel = 'error' | 'warning' | 'info'

export interface FormatterSettings {
  language: FormatterLanguage
  mode: FormatterMode
  indentSize: number
  sortKeys: boolean
  jsonStringHandling: JsonStringHandling
  sqlKeywordCase: SqlKeywordCase
  trimTrailingWhitespace: boolean
  normalizeLineEndings: boolean
  ensureFinalNewline: boolean
}

export interface FormatterMetrics {
  characters: number
  bytes: number
  lines: number
  nonEmptyLines: number
}

export interface FormatterIssue {
  level: FormatterIssueLevel
  message: string
  line?: number
  column?: number
}

export interface FormatterJsonStringInfo {
  detectedCount: number
  expandedCount: number
  samplePaths: string[]
  limitReached: boolean
}

export interface FormatterResult {
  language: ResolvedFormatterLanguage
  mode: FormatterMode
  output: string
  inputMetrics: FormatterMetrics
  outputMetrics: FormatterMetrics
  issues: FormatterIssue[]
  warnings: string[]
  jsonStringInfo?: FormatterJsonStringInfo
  durationMs: number
  formattedAt: string
}

export interface FormatterFileInfo {
  name: string
  size: number
  lines: number
  encoding: string
  status: 'ready' | 'error'
  message: string
}

export type FormatterExportKind = 'source' | 'txt' | 'json' | 'markdown' | 'html'

export type FormatterConversionTarget = 'json' | 'properties' | 'yaml'

export interface FormatterConversionResult {
  sourceLanguage: ResolvedFormatterLanguage
  targetLanguage: FormatterConversionTarget
  output: string
  warnings: string[]
}

export interface FormatterHistoryRecord {
  id: string
  name: string
  createdAt: string
  input: string
  output: string
  fileName?: string
  language: ResolvedFormatterLanguage
  settings: FormatterSettings
  summary: string
}

export interface FormatterWorkerRequest {
  id: number
  input: string
  fileName?: string
  settings: FormatterSettings
}

export interface FormatterWorkerSuccessResponse {
  id: number
  ok: true
  result: FormatterResult
}

export interface FormatterWorkerErrorResponse {
  id: number
  ok: false
  error: string
}

export type FormatterWorkerResponse = FormatterWorkerSuccessResponse | FormatterWorkerErrorResponse
