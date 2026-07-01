import type {
  CompressionSettings,
  ImageFileItem,
  ImageOutputFormat
} from '@/types/imageProcessor'
import {
  calculateContainSize,
  canvasToBlob,
  createOutputName,
  getFormatExtension,
  loadImageElement
} from './files'

export interface CompressionProcessResult {
  blob: Blob
  width: number
  height: number
  outputName: string
  mimeType: ImageOutputFormat
  durationMs: number
  compressionRatio: number
  warnings: string[]
}

export const normalizeQuality = (quality: number) => {
  if (!Number.isFinite(quality)) {
    return 0.82
  }
  return Math.min(1, Math.max(0.1, quality))
}

export const compressImageFile = async (
  item: ImageFileItem,
  settings: CompressionSettings
): Promise<CompressionProcessResult> => {
  const startedAt = performance.now()
  const image = await loadImageElement(item.objectUrl)
  const target = calculateContainSize(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    settings.maxWidth,
    settings.maxHeight,
    settings.keepOriginalSize
  )
  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D')
  }

  if (settings.format === 'image/jpeg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, target.width, target.height)
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, target.width, target.height)

  const quality = settings.format === 'image/png' ? 0.92 : normalizeQuality(settings.quality)
  const blob = await canvasToBlob(canvas, settings.format, quality)
  const durationMs = Math.round(performance.now() - startedAt)
  const warnings: string[] = []

  if (blob.size >= item.size && settings.format !== item.type) {
    warnings.push('转换后的图片体积未变小，保留原格式或降低尺寸可能更合适。')
  } else if (blob.size >= item.size) {
    warnings.push('当前参数未显著压缩图片，可继续降低质量或最大尺寸。')
  }

  return {
    blob,
    width: target.width,
    height: target.height,
    outputName: createOutputName(item.name, 'compressed', getFormatExtension(settings.format)),
    mimeType: settings.format,
    durationMs,
    compressionRatio: item.size ? 1 - blob.size / item.size : 0,
    warnings
  }
}
