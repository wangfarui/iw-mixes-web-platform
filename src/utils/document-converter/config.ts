import type {
  DocumentConversionSettings,
  DocumentSourceKind,
  DocumentTarget,
  DocumentTargetOption
} from '@/types/documentConverter'

export const DOCUMENT_ACCEPT = [
  '.docx',
  '.xlsx',
  '.xls',
  '.csv',
  '.pptx',
  '.ppt',
  '.pdf',
  '.txt',
  '.md',
  '.markdown',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp'
].join(',')

export const DOCUMENT_LIMITS = {
  maxFileBytes: 80 * 1024 * 1024,
  largeFileBytes: 16 * 1024 * 1024,
  maxBatchFiles: 20,
  maxTextPreviewChars: 120_000,
  maxZipEntryBytes: 60 * 1024 * 1024
}

export const TARGET_OPTIONS: Record<DocumentTarget, DocumentTargetOption> = {
  txt: {
    value: 'txt',
    label: '纯文本',
    description: '提取或转换为 UTF-8 文本文档',
    outputExtension: 'txt'
  },
  html: {
    value: 'html',
    label: 'HTML',
    description: '生成可预览的 HTML 页面',
    outputExtension: 'html'
  },
  markdown: {
    value: 'markdown',
    label: 'Markdown',
    description: '转换为 Markdown 文本',
    outputExtension: 'md'
  },
  json: {
    value: 'json',
    label: 'JSON',
    description: '转换为结构化 JSON 数据',
    outputExtension: 'json'
  },
  csv: {
    value: 'csv',
    label: 'CSV',
    description: '导出表格数据为 CSV',
    outputExtension: 'csv'
  },
  xlsx: {
    value: 'xlsx',
    label: 'Excel',
    description: '导出为 XLSX 工作簿',
    outputExtension: 'xlsx'
  },
  pdf: {
    value: 'pdf',
    label: 'PDF',
    description: '生成本地 PDF；文档类输出为近似排版',
    outputExtension: 'pdf'
  },
  'pdf-split': {
    value: 'pdf-split',
    label: '拆分 PDF',
    description: '将 PDF 按页拆成 ZIP 包',
    outputExtension: 'zip'
  },
  'pdf-merge': {
    value: 'pdf-merge',
    label: '合并 PDF',
    description: '将多个 PDF 合并为一个文件',
    outputExtension: 'pdf'
  },
  'pdf-images': {
    value: 'pdf-images',
    label: 'PDF 页面图片',
    description: '将 PDF 页面渲染为 PNG 图片 ZIP',
    outputExtension: 'zip'
  },
  'assets-zip': {
    value: 'assets-zip',
    label: '资源包 ZIP',
    description: '提取 Office 文档内嵌图片和媒体资源',
    outputExtension: 'zip'
  }
}

const KIND_LABELS: Record<DocumentSourceKind, string> = {
  docx: 'Word',
  xlsx: 'Excel',
  csv: 'CSV',
  pptx: 'PowerPoint',
  pdf: 'PDF',
  text: '文本',
  markdown: 'Markdown',
  image: '图片',
  unsupported: '不支持'
}

const EXTENSION_KIND_MAP = new Map<string, DocumentSourceKind>([
  ['.docx', 'docx'],
  ['.xlsx', 'xlsx'],
  ['.xls', 'unsupported'],
  ['.csv', 'csv'],
  ['.pptx', 'pptx'],
  ['.ppt', 'unsupported'],
  ['.pdf', 'pdf'],
  ['.txt', 'text'],
  ['.md', 'markdown'],
  ['.markdown', 'markdown'],
  ['.png', 'image'],
  ['.jpg', 'image'],
  ['.jpeg', 'image'],
  ['.webp', 'image']
])

export const createDefaultDocumentSettings = (): DocumentConversionSettings => ({
  target: 'txt',
  selectedSheet: '',
  includeSheetName: true,
  includeFileHeader: true,
  pdfImageScale: 1.5,
  splitPdfMode: 'single-zip',
  textPdfFontSize: 18
})

export const getExtension = (name: string): string => {
  const dotIndex = name.lastIndexOf('.')
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : ''
}

export const getBaseName = (name: string): string => {
  const extension = getExtension(name)
  return extension ? name.slice(0, -extension.length) : name
}

export const sanitizeFileName = (name: string): string => {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned || 'document'
}

export const createOutputName = (sourceName: string, suffix: string, extension: string): string => {
  const baseName = sanitizeFileName(getBaseName(sourceName))
  const normalizedSuffix = suffix ? `-${suffix}` : ''
  return `${baseName}${normalizedSuffix}.${extension}`
}

export const detectDocumentKind = (name: string, mime = ''): DocumentSourceKind => {
  const extension = getExtension(name)
  const extensionKind = EXTENSION_KIND_MAP.get(extension)
  if (extensionKind) {
    return extensionKind
  }

  if (mime.includes('pdf')) {
    return 'pdf'
  }
  if (mime.includes('spreadsheet') || mime.includes('excel')) {
    return 'xlsx'
  }
  if (mime.includes('presentation')) {
    return 'pptx'
  }
  if (mime.includes('wordprocessingml')) {
    return 'docx'
  }
  if (mime.startsWith('image/')) {
    return 'image'
  }
  if (mime.startsWith('text/')) {
    return 'text'
  }

  return 'unsupported'
}

export const getDocumentKindLabel = (kind: DocumentSourceKind): string => KIND_LABELS[kind]

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }

  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`
}

export const getSupportedTargetsForKind = (kind: DocumentSourceKind): DocumentTarget[] => {
  switch (kind) {
    case 'docx':
      return ['html', 'markdown', 'txt', 'pdf', 'assets-zip']
    case 'xlsx':
      return ['csv', 'json', 'html', 'xlsx', 'pdf']
    case 'csv':
      return ['xlsx', 'json', 'html', 'txt', 'pdf']
    case 'pptx':
      return ['markdown', 'txt', 'html', 'json', 'assets-zip']
    case 'pdf':
      return ['txt', 'pdf-images', 'pdf-split']
    case 'markdown':
      return ['html', 'txt', 'pdf']
    case 'text':
      return ['markdown', 'html', 'pdf']
    case 'image':
      return ['pdf']
    default:
      return []
  }
}

export const getBatchTargets = (kinds: DocumentSourceKind[]): DocumentTarget[] => {
  const supportedKinds = kinds.filter((kind) => kind !== 'unsupported')
  if (!supportedKinds.length) {
    return []
  }

  if (supportedKinds.every((kind) => kind === 'pdf') && supportedKinds.length > 1) {
    return ['pdf-merge', 'txt', 'pdf-images', 'pdf-split']
  }

  if (supportedKinds.every((kind) => kind === 'image')) {
    return ['pdf']
  }

  const [firstKind] = supportedKinds
  const firstTargets = new Set(getSupportedTargetsForKind(firstKind))
  for (const kind of supportedKinds.slice(1)) {
    const kindTargets = new Set(getSupportedTargetsForKind(kind))
    for (const target of Array.from(firstTargets)) {
      if (!kindTargets.has(target)) {
        firstTargets.delete(target)
      }
    }
  }

  return Array.from(firstTargets)
}

export const getTargetOption = (target: DocumentTarget): DocumentTargetOption => TARGET_OPTIONS[target]

export const getTargetOptions = (targets: DocumentTarget[]): DocumentTargetOption[] => {
  return targets.map((target) => TARGET_OPTIONS[target])
}
