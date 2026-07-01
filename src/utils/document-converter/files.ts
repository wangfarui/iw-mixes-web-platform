import type {
  DocumentConverterFile,
  DocumentWorkerFile
} from '@/types/documentConverter'
import {
  detectDocumentKind,
  DOCUMENT_LIMITS,
  formatBytes,
  getDocumentKindLabel,
  getExtension
} from './config'

export const createDocumentFileRecord = (file: File): DocumentConverterFile => {
  const kind = detectDocumentKind(file.name, file.type)
  const tooLarge = file.size > DOCUMENT_LIMITS.maxFileBytes
  const unsupported = kind === 'unsupported'

  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    extension: getExtension(file.name),
    kind,
    status: tooLarge || unsupported ? 'error' : 'ready',
    message: tooLarge
      ? `文件超过 ${formatBytes(DOCUMENT_LIMITS.maxFileBytes)}`
      : unsupported
        ? '暂不支持旧版 Office、加密文档或未知格式'
        : `${getDocumentKindLabel(kind)} 文件已就绪`,
    lastModified: file.lastModified
  }
}

export const prepareDocumentWorkerFiles = async (
  entries: Array<{ record: DocumentConverterFile, file: File }>
): Promise<DocumentWorkerFile[]> => {
  const readyEntries = entries.filter(({ record }) => record.status !== 'error')
  const workerFiles: DocumentWorkerFile[] = []

  for (const { record, file } of readyEntries) {
    workerFiles.push({
      id: record.id,
      name: record.name,
      size: record.size,
      type: record.type,
      extension: record.extension,
      kind: record.kind,
      data: await file.arrayBuffer()
    })
  }

  return workerFiles
}

export const shouldWarnLargeFiles = (files: DocumentConverterFile[]): boolean => {
  return files.some((file) => file.size >= DOCUMENT_LIMITS.largeFileBytes)
}
