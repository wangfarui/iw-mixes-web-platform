export type DocumentSourceKind =
  | 'docx'
  | 'xlsx'
  | 'csv'
  | 'pptx'
  | 'pdf'
  | 'text'
  | 'markdown'
  | 'image'
  | 'unsupported'

export type DocumentTarget =
  | 'txt'
  | 'html'
  | 'markdown'
  | 'json'
  | 'csv'
  | 'xlsx'
  | 'pdf'
  | 'pdf-split'
  | 'pdf-merge'
  | 'pdf-images'
  | 'assets-zip'

export type DocumentStatus = 'idle' | 'ready' | 'running' | 'success' | 'error'

export interface DocumentTargetOption {
  value: DocumentTarget
  label: string
  description: string
  outputExtension: string
}

export interface DocumentConverterFile {
  id: string
  name: string
  size: number
  type: string
  extension: string
  kind: DocumentSourceKind
  status: DocumentStatus
  message: string
  lastModified: number
}

export interface DocumentWorkerFile {
  id: string
  name: string
  size: number
  type: string
  extension: string
  kind: DocumentSourceKind
  data: ArrayBuffer
}

export interface DocumentConversionSettings {
  target: DocumentTarget
  selectedSheet: string
  includeSheetName: boolean
  includeFileHeader: boolean
  pdfImageScale: number
  splitPdfMode: 'single-zip' | 'first-page'
  textPdfFontSize: number
}

export interface DocumentConversionResultItem {
  id: string
  sourceId: string
  sourceName: string
  outputName: string
  target: DocumentTarget
  mime: string
  extension: string
  size: number
  text?: string
  data?: ArrayBuffer
  previewHtml?: string
  summary: string
  warnings: string[]
  metadata: Record<string, string | number | boolean>
}

export interface DocumentConversionResult {
  id: string
  target: DocumentTarget
  startedAt: string
  durationMs: number
  items: DocumentConversionResultItem[]
  warnings: string[]
}

export interface DocumentWorkerRequest {
  id: string
  files: DocumentWorkerFile[]
  settings: DocumentConversionSettings
}

export interface DocumentWorkerResponse {
  id: string
  ok: boolean
  result?: DocumentConversionResult
  error?: string
}

export interface DocumentResultDownload {
  blob: Blob
  fileName: string
}
