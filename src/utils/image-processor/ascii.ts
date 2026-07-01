import type {
  AsciiBuildResult,
  AsciiSettings,
  ImagePixelBuffer
} from '@/types/imageProcessor'
import {
  ASCII_CHARSETS,
  IMAGE_PROCESSOR_LIMITS
} from './config'

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const clampByte = (value: number) => Math.max(0, Math.min(255, value))

export const applyBrightnessContrast = (value: number, brightness: number, contrast: number) => {
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  return clampByte(contrastFactor * (value - 128) + 128 + brightness)
}

export const luminance = (red: number, green: number, blue: number) => {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export const mapLuminanceToChar = (
  value: number,
  charset: string,
  invert: boolean
) => {
  const normalized = clampByte(invert ? 255 - value : value) / 255
  const index = Math.min(charset.length - 1, Math.floor(normalized * charset.length))
  return charset[index] || ' '
}

const averageCell = (
  pixels: ImagePixelBuffer,
  startX: number,
  startY: number,
  endX: number,
  endY: number
) => {
  let red = 0
  let green = 0
  let blue = 0
  let alpha = 0
  let count = 0

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const offset = (y * pixels.width + x) * 4
      red += pixels.data[offset]
      green += pixels.data[offset + 1]
      blue += pixels.data[offset + 2]
      alpha += pixels.data[offset + 3]
      count += 1
    }
  }

  if (!count) {
    return {
      red: 255,
      green: 255,
      blue: 255,
      alpha: 255
    }
  }

  return {
    red: Math.round(red / count),
    green: Math.round(green / count),
    blue: Math.round(blue / count),
    alpha: Math.round(alpha / count)
  }
}

export const buildAsciiFromPixels = (
  pixels: ImagePixelBuffer,
  settings: AsciiSettings
): AsciiBuildResult => {
  const charset = ASCII_CHARSETS[settings.charset] || ASCII_CHARSETS.standard
  const columns = Math.max(8, Math.min(IMAGE_PROCESSOR_LIMITS.asciiMaxWidth, Math.round(settings.width)))
  const rows = Math.max(1, Math.round((pixels.height / pixels.width) * columns * 0.48))
  const cellWidth = pixels.width / columns
  const cellHeight = pixels.height / rows
  const lines: string[] = []
  const htmlLines: string[] = []
  const warnings: string[] = []

  if (settings.width > IMAGE_PROCESSOR_LIMITS.asciiMaxWidth) {
    warnings.push(`ASCII 宽度已限制为 ${IMAGE_PROCESSOR_LIMITS.asciiMaxWidth} 列，避免结果过大。`)
  }

  for (let row = 0; row < rows; row += 1) {
    let line = ''
    let htmlLine = ''
    const startY = Math.floor(row * cellHeight)
    const endY = Math.max(startY + 1, Math.min(pixels.height, Math.floor((row + 1) * cellHeight)))

    for (let column = 0; column < columns; column += 1) {
      const startX = Math.floor(column * cellWidth)
      const endX = Math.max(startX + 1, Math.min(pixels.width, Math.floor((column + 1) * cellWidth)))
      const color = averageCell(pixels, startX, startY, endX, endY)
      const adjusted = applyBrightnessContrast(luminance(color.red, color.green, color.blue), settings.brightness, settings.contrast)
      const char = mapLuminanceToChar(adjusted, charset, settings.invert)

      line += char
      if (settings.colored) {
        htmlLine += `<span style="color:rgb(${color.red},${color.green},${color.blue})">${escapeHtml(char)}</span>`
      } else {
        htmlLine += escapeHtml(char)
      }
    }

    lines.push(line)
    htmlLines.push(htmlLine)
  }

  const text = lines.join('\n')
  const html = [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8" />',
    '<title>ASCII 图片</title>',
    '<style>',
    `body{margin:0;background:${settings.backgroundColor};}`,
    `pre{margin:0;padding:16px;color:${settings.foregroundColor};background:${settings.backgroundColor};font:${settings.fontSize}px/0.58 "SFMono-Regular",Consolas,monospace;letter-spacing:0;white-space:pre;}`,
    '</style>',
    '</head>',
    '<body>',
    `<pre>${htmlLines.join('\n')}</pre>`,
    '</body>',
    '</html>'
  ].join('')

  return {
    text,
    html,
    columns,
    rows,
    warnings
  }
}
