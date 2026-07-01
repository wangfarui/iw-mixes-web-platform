export type EncodingCategory =
  | 'url'
  | 'base64'
  | 'unicode'
  | 'html'
  | 'bytes'
  | 'hash'

export type EncodingOperation =
  | 'url-encode'
  | 'url-decode'
  | 'url-decode-layers'
  | 'base64-encode'
  | 'base64-decode'
  | 'base64url-encode'
  | 'base64url-decode'
  | 'base64-to-base64url'
  | 'base64url-to-base64'
  | 'unicode-escape'
  | 'unicode-unescape'
  | 'json-escape'
  | 'json-unescape'
  | 'html-encode'
  | 'html-decode'
  | 'text-to-hex'
  | 'hex-to-text'
  | 'text-to-binary'
  | 'code-points'
  | 'hash'

export type UrlSpaceMode = 'percent' | 'plus'

export type HashAlgorithm =
  | 'md5'
  | 'sha-1'
  | 'sha-256'
  | 'sha-384'
  | 'sha-512'

export type EncodingIssueLevel = 'info' | 'warning' | 'error'

export type EncodingExportKind = 'txt' | 'json' | 'markdown'

export interface EncodingConverterSettings {
  category: EncodingCategory
  operation: EncodingOperation
  urlSpaceMode: UrlSpaceMode
  urlDecodeLayers: number
  uppercaseHex: boolean
  bytesSeparator: string
  hashAlgorithm: HashAlgorithm
}

export interface EncodingMetrics {
  characters: number
  bytes: number
  lines: number
}

export interface EncodingDetail {
  label: string
  value: string
}

export interface EncodingDetectionHint {
  id: string
  operation: EncodingOperation
  category: EncodingCategory
  title: string
  description: string
  confidence: 'high' | 'medium' | 'low'
}

export interface EncodingConverterIssue {
  level: EncodingIssueLevel
  message: string
}

export interface EncodingConverterResult {
  category: EncodingCategory
  operation: EncodingOperation
  operationLabel: string
  output: string
  inputMetrics: EncodingMetrics
  outputMetrics: EncodingMetrics
  details: EncodingDetail[]
  issues: EncodingConverterIssue[]
  warnings: string[]
  durationMs: number
  convertedAt: string
}

export interface EncodingFileInfo {
  name: string
  size: number
  lines: number
  encoding: string
  status: 'ready' | 'error'
  message: string
}

export interface EncodingWorkerRequest {
  id: number
  input: string
  settings: EncodingConverterSettings
}

export interface EncodingWorkerSuccessResponse {
  id: number
  ok: true
  result: EncodingConverterResult
}

export interface EncodingWorkerErrorResponse {
  id: number
  ok: false
  error: string
}

export type EncodingWorkerResponse = EncodingWorkerSuccessResponse | EncodingWorkerErrorResponse
