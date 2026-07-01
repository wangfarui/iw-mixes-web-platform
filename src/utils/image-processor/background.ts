import type {
  BackgroundReplaceResult,
  IdPhotoSettings,
  ImagePixelBuffer
} from '@/types/imageProcessor'
import { getIdPhotoBackgroundColor } from './config'

export interface RgbColor {
  red: number
  green: number
  blue: number
}

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

export const parseHexColor = (value: string): RgbColor => {
  const normalized = value.trim().replace(/^#/, '')
  const hex = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      red: 67,
      green: 142,
      blue: 219
    }
  }

  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16)
  }
}

export const colorDistance = (
  red: number,
  green: number,
  blue: number,
  target: RgbColor
) => {
  const redDiff = red - target.red
  const greenDiff = green - target.green
  const blueDiff = blue - target.blue
  return Math.sqrt(redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff)
}

export const estimateEdgeColor = (pixels: ImagePixelBuffer): RgbColor => {
  const sampleStep = Math.max(1, Math.floor(Math.min(pixels.width, pixels.height) / 80))
  let red = 0
  let green = 0
  let blue = 0
  let count = 0

  const addPixel = (x: number, y: number) => {
    const offset = (y * pixels.width + x) * 4
    const alpha = pixels.data[offset + 3] / 255
    red += pixels.data[offset] * alpha + 255 * (1 - alpha)
    green += pixels.data[offset + 1] * alpha + 255 * (1 - alpha)
    blue += pixels.data[offset + 2] * alpha + 255 * (1 - alpha)
    count += 1
  }

  for (let x = 0; x < pixels.width; x += sampleStep) {
    addPixel(x, 0)
    addPixel(x, pixels.height - 1)
  }

  for (let y = 0; y < pixels.height; y += sampleStep) {
    addPixel(0, y)
    addPixel(pixels.width - 1, y)
  }

  if (!count) {
    return {
      red: 255,
      green: 255,
      blue: 255
    }
  }

  return {
    red: Math.round(red / count),
    green: Math.round(green / count),
    blue: Math.round(blue / count)
  }
}

const isBackgroundCandidate = (
  pixels: ImagePixelBuffer,
  index: number,
  edgeColor: RgbColor,
  tolerance: number,
  manualMask?: Uint8Array
) => {
  if (manualMask?.[index] === 1) {
    return false
  }
  if (manualMask?.[index] === 2) {
    return true
  }

  const offset = index * 4
  const alpha = pixels.data[offset + 3]
  if (alpha < 16) {
    return true
  }

  return colorDistance(
    pixels.data[offset],
    pixels.data[offset + 1],
    pixels.data[offset + 2],
    edgeColor
  ) <= tolerance
}

export const detectConnectedBackground = (
  pixels: ImagePixelBuffer,
  tolerance: number,
  manualMask?: Uint8Array
) => {
  const total = pixels.width * pixels.height
  const visited = new Uint8Array(total)
  const background = new Uint8Array(total)
  const queue = new Int32Array(total)
  let head = 0
  let tail = 0
  const edgeColor = estimateEdgeColor(pixels)

  const enqueue = (index: number) => {
    if (visited[index]) {
      return
    }
    visited[index] = 1
    if (!isBackgroundCandidate(pixels, index, edgeColor, tolerance, manualMask)) {
      return
    }
    background[index] = 1
    queue[tail] = index
    tail += 1
  }

  for (let x = 0; x < pixels.width; x += 1) {
    enqueue(x)
    enqueue((pixels.height - 1) * pixels.width + x)
  }

  for (let y = 0; y < pixels.height; y += 1) {
    enqueue(y * pixels.width)
    enqueue(y * pixels.width + pixels.width - 1)
  }

  while (head < tail) {
    const index = queue[head]
    head += 1
    const x = index % pixels.width
    const y = Math.floor(index / pixels.width)

    const tryNeighbor = (nextX: number, nextY: number) => {
      if (nextX < 0 || nextX >= pixels.width || nextY < 0 || nextY >= pixels.height) {
        return
      }
      enqueue(nextY * pixels.width + nextX)
    }

    tryNeighbor(x + 1, y)
    tryNeighbor(x - 1, y)
    tryNeighbor(x, y + 1)
    tryNeighbor(x, y - 1)
  }

  if (manualMask) {
    for (let index = 0; index < total; index += 1) {
      if (manualMask[index] === 2) {
        background[index] = 1
      } else if (manualMask[index] === 1) {
        background[index] = 0
      }
    }
  }

  return {
    background,
    edgeColor
  }
}

const hasBackgroundNeighbor = (
  mask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number
) => {
  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue
      }
      const nextX = x + offsetX
      const nextY = y + offsetY
      if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
        continue
      }
      if (mask[nextY * width + nextX]) {
        return true
      }
    }
  }
  return false
}

export const replaceBackgroundPixels = (
  pixels: ImagePixelBuffer,
  settings: IdPhotoSettings,
  manualMask?: Uint8Array
): BackgroundReplaceResult => {
  const tolerance = Math.max(4, Math.min(160, Math.round(settings.tolerance)))
  const feather = Math.max(0, Math.min(6, Math.round(settings.feather)))
  const targetColor = parseHexColor(getIdPhotoBackgroundColor(settings.background, settings.customColor))
  const output = new Uint8ClampedArray(pixels.data)
  const { background } = detectConnectedBackground(pixels, tolerance, manualMask)
  const warnings: string[] = []
  let backgroundPixels = 0
  let forcedBackgroundPixels = 0
  let forcedForegroundPixels = 0

  for (let index = 0; index < background.length; index += 1) {
    const offset = index * 4
    const x = index % pixels.width
    const y = Math.floor(index / pixels.width)
    const forcedBackground = manualMask?.[index] === 2
    const forcedForeground = manualMask?.[index] === 1

    if (forcedBackground) {
      forcedBackgroundPixels += 1
    }
    if (forcedForeground) {
      forcedForegroundPixels += 1
    }

    if (background[index]) {
      backgroundPixels += 1
      output[offset] = targetColor.red
      output[offset + 1] = targetColor.green
      output[offset + 2] = targetColor.blue
      output[offset + 3] = 255
    } else if (feather > 0 && !forcedForeground && hasBackgroundNeighbor(background, pixels.width, pixels.height, x, y, feather)) {
      const blend = 0.16
      output[offset] = clampByte(output[offset] * (1 - blend) + targetColor.red * blend)
      output[offset + 1] = clampByte(output[offset + 1] * (1 - blend) + targetColor.green * blend)
      output[offset + 2] = clampByte(output[offset + 2] * (1 - blend) + targetColor.blue * blend)
    }
  }

  const ratio = backgroundPixels / background.length
  if (ratio < 0.08) {
    warnings.push('识别到的背景区域较少，可提高容差或用画笔标记背景。')
  } else if (ratio > 0.82) {
    warnings.push('识别到的背景区域较多，可降低容差或用画笔标记人物区域。')
  }

  return {
    pixels: {
      width: pixels.width,
      height: pixels.height,
      data: output
    },
    backgroundPixels,
    forcedBackgroundPixels,
    forcedForegroundPixels,
    warnings
  }
}
