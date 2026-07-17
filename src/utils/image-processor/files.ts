import type {
  ImageFileItem,
  ImageFitMode,
  ImageOutputFormat,
  ImagePixelBuffer
} from '@/types/imageProcessor'
import {
  FORMAT_EXTENSIONS,
  IMAGE_FILE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  IMAGE_PROCESSOR_LIMITS
} from './config'
import { isSvgImageFile, readSvgFile } from './svg'

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const precision = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(precision)} ${units[unitIndex]}`
}

export const safeTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-')

export const createImageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const getFileExtension = (name: string) => {
  const dotIndex = name.lastIndexOf('.')
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : ''
}

export const getBaseName = (name: string) => {
  const dotIndex = name.lastIndexOf('.')
  return dotIndex > 0 ? name.slice(0, dotIndex) : name
}

export const getFormatExtension = (mimeType: ImageOutputFormat | string) => {
  return FORMAT_EXTENSIONS[mimeType as ImageOutputFormat] || 'png'
}

export const isSupportedImageFile = (file: File) => {
  const extension = getFileExtension(file.name)
  return IMAGE_FILE_EXTENSIONS.has(extension) || IMAGE_MIME_TYPES.has(file.type)
}

export const validateImageFile = (file: File) => {
  if (!isSupportedImageFile(file)) {
    throw new Error('仅支持 PNG、JPG、WebP、GIF 和 SVG 图片')
  }

  if (file.size > IMAGE_PROCESSOR_LIMITS.maxImageBytes) {
    throw new Error(`图片超过 ${formatBytes(IMAGE_PROCESSOR_LIMITS.maxImageBytes)}，建议先拆分或缩小后处理`)
  }
}

export const loadImageElement = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片解码失败，请确认文件未损坏'))
    image.src = src
  })
}

export const readImageFileItem = async (file: File): Promise<ImageFileItem> => {
  validateImageFile(file)
  const isSvg = isSvgImageFile(file)
  const svg = isSvg ? await readSvgFile(file) : null
  const objectUrl = URL.createObjectURL(svg?.blob || file)

  try {
    const image = await loadImageElement(objectUrl)
    return {
      id: createImageId(),
      file,
      name: file.name,
      size: file.size,
      type: isSvg ? 'image/svg+xml' : file.type || 'image/png',
      width: svg?.width || image.naturalWidth || image.width || 1,
      height: svg?.height || image.naturalHeight || image.height || 1,
      objectUrl,
      lastModified: file.lastModified,
      status: 'ready',
      message: svg?.sanitized ? '读取完成，已移除不安全的 SVG 内容' : '读取完成'
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

export const calculateContainSize = (
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
  keepOriginalSize = false
) => {
  if (keepOriginalSize) {
    return {
      width: sourceWidth,
      height: sourceHeight,
      scale: 1
    }
  }

  const widthRatio = maxWidth / sourceWidth
  const heightRatio = maxHeight / sourceHeight
  const scale = Math.min(1, widthRatio, heightRatio)
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scale
  }
}

export const calculateLimitedSize = (
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number
) => {
  const longest = Math.max(sourceWidth, sourceHeight)
  if (longest <= maxDimension) {
    return {
      width: sourceWidth,
      height: sourceHeight,
      scale: 1
    }
  }

  const scale = maxDimension / longest
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scale
  }
}

export const getDrawRect = (
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fitMode: ImageFitMode
) => {
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = targetWidth / targetHeight

  if ((fitMode === 'cover' && sourceRatio > targetRatio) || (fitMode === 'contain' && sourceRatio <= targetRatio)) {
    const height = targetHeight
    const width = Math.round(height * sourceRatio)
    return {
      x: Math.round((targetWidth - width) / 2),
      y: 0,
      width,
      height
    }
  }

  const width = targetWidth
  const height = Math.round(width / sourceRatio)
  return {
    x: 0,
    y: Math.round((targetHeight - height) / 2),
    width,
    height
  }
}

export const drawImageToCanvas = async (
  item: ImageFileItem,
  targetWidth: number,
  targetHeight: number,
  fitMode: ImageFitMode,
  fillColor = '#ffffff'
) => {
  const image = await loadImageElement(item.objectUrl)
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D')
  }

  context.fillStyle = fillColor
  context.fillRect(0, 0, targetWidth, targetHeight)
  const rect = getDrawRect(image.naturalWidth || image.width, image.naturalHeight || image.height, targetWidth, targetHeight, fitMode)
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height)
  return canvas
}

export const getCanvasImageData = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D')
  }
  return context.getImageData(0, 0, canvas.width, canvas.height)
}

export const imageDataToBlob = (
  imageData: ImageData,
  mimeType: ImageOutputFormat,
  quality = 0.92
): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const context = canvas.getContext('2d')
  if (!context) {
    return Promise.reject(new Error('当前浏览器不支持 Canvas 2D'))
  }

  context.putImageData(imageData, 0, 0)
  return canvasToBlob(canvas, mimeType, quality)
}

export const pixelBufferToImageData = (pixels: ImagePixelBuffer) => {
  return new ImageData(pixels.data, pixels.width, pixels.height)
}

export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: ImageOutputFormat,
  quality = 0.92
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('图片编码失败，请尝试其他输出格式'))
        return
      }
      resolve(blob)
    }, mimeType, quality)
  })
}

export const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const downloadTextFile = (filename: string, content: string, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  downloadBlob(filename, blob)
}

export const createOutputName = (
  sourceName: string,
  suffix: string,
  extension: string
) => `${getBaseName(sourceName)}-${suffix}-${safeTimestamp()}.${extension}`
