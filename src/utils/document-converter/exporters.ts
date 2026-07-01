import type {
  DocumentConversionResult,
  DocumentConversionResultItem,
  DocumentResultDownload
} from '@/types/documentConverter'
import { strToU8, zipSync } from 'fflate'

const getExactArrayBuffer = (input: Uint8Array | ArrayBuffer): ArrayBuffer => {
  if (input instanceof ArrayBuffer) {
    return input.slice(0)
  }

  return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
}

const buildCombinedTextReport = (result: DocumentConversionResult): string => {
  return result.items
    .map((item) => {
      const body = item.text || `${item.outputName} (${item.mime}, ${item.size} bytes)`
      return [`# ${item.outputName}`, '', item.summary, '', body].join('\n')
    })
    .join('\n\n---\n\n')
}

const createZipFromResultItems = (items: DocumentConversionResultItem[]): ArrayBuffer => {
  const entries: Record<string, Uint8Array> = {}

  for (const item of items) {
    if (item.data) {
      entries[item.outputName] = new Uint8Array(item.data)
    } else if (item.text) {
      entries[item.outputName] = strToU8(item.text)
    }
  }

  return getExactArrayBuffer(zipSync(entries, { level: 6 }))
}

const createBlobFromItem = (item: DocumentConversionResultItem): Blob => {
  if (item.data) {
    return new Blob([item.data], { type: item.mime })
  }

  return new Blob([item.text || ''], { type: item.mime })
}

export const buildDocumentResultDownload = (
  item: DocumentConversionResultItem
): DocumentResultDownload => {
  return {
    blob: createBlobFromItem(item),
    fileName: item.outputName
  }
}

export const buildDocumentZipDownload = (
  result: DocumentConversionResult
): DocumentResultDownload => {
  return {
    blob: new Blob([createZipFromResultItems(result.items)], { type: 'application/zip' }),
    fileName: `document-results-${new Date().toISOString().slice(0, 10)}.zip`
  }
}

export const buildDocumentReportDownload = (
  result: DocumentConversionResult
): DocumentResultDownload => {
  return {
    blob: new Blob([buildCombinedTextReport(result)], { type: 'text/markdown;charset=utf-8' }),
    fileName: `document-report-${new Date().toISOString().slice(0, 10)}.md`
  }
}

export const downloadBlob = (download: DocumentResultDownload) => {
  const url = URL.createObjectURL(download.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = download.fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const copyDocumentResultText = async (
  item: DocumentConversionResultItem
): Promise<string> => {
  const text = item.text || item.summary
  await navigator.clipboard.writeText(text)
  return text
}
