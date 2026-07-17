import type {
  ImageFileItem,
  ImageOutputFormat,
  SvgConvertSettings
} from '@/types/imageProcessor'
import { IMAGE_PROCESSOR_LIMITS } from './config'
import { normalizeQuality } from './compress'
import {
  canvasToBlob,
  createOutputName,
  getFormatExtension,
  loadImageElement
} from './files'
import { isSvgImageFile } from './svg'

export interface SvgConvertResult {
  blob: Blob
  width: number
  height: number
  outputName: string
  mimeType: ImageOutputFormat
  durationMs: number
  warnings: string[]
}

const validateOutputSize = (width: number, height: number) => {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('SVG 输出宽高必须是正整数')
  }
  if (width > IMAGE_PROCESSOR_LIMITS.svgMaxDimension || height > IMAGE_PROCESSOR_LIMITS.svgMaxDimension) {
    throw new Error(`SVG 输出单边不能超过 ${IMAGE_PROCESSOR_LIMITS.svgMaxDimension}px`)
  }
  if (width * height > IMAGE_PROCESSOR_LIMITS.svgMaxPixels) {
    throw new Error('SVG 输出像素过多，请降低宽度或高度后重试')
  }
}

export const convertSvgFile = async (
  item: ImageFileItem,
  settings: SvgConvertSettings
): Promise<SvgConvertResult> => {
  if (!isSvgImageFile(item)) {
    throw new Error('SVG 转图片模式仅支持 SVG 文件')
  }

  const width = Math.round(settings.width)
  const height = Math.round(settings.height)
  validateOutputSize(width, height)
  const startedAt = performance.now()
  const image = await loadImageElement(item.objectUrl)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D')
  }

  const transparent = settings.transparent && settings.format !== 'image/jpeg'
  if (!transparent) {
    context.fillStyle = settings.backgroundColor || '#ffffff'
    context.fillRect(0, 0, width, height)
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)

  const quality = settings.format === 'image/png' ? 0.92 : normalizeQuality(settings.quality)
  const blob = await canvasToBlob(canvas, settings.format, quality)
  const warnings: string[] = []
  if (settings.transparent && settings.format === 'image/jpeg') {
    warnings.push('JPG 不支持透明背景，已使用所选背景色填充。')
  }

  return {
    blob,
    width,
    height,
    outputName: createOutputName(item.name, 'converted', getFormatExtension(settings.format)),
    mimeType: settings.format,
    durationMs: Math.round(performance.now() - startedAt),
    warnings
  }
}
