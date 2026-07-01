import { zipSync } from 'fflate'
import type {
  AsciiSettings,
  ImageProcessorResult
} from '@/types/imageProcessor'
import { downloadBlob } from './files'

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export const createZipBlob = async (results: ImageProcessorResult[]) => {
  const files: Record<string, Uint8Array> = {}

  for (const result of results) {
    const buffer = await result.blob.arrayBuffer()
    files[result.outputName] = new Uint8Array(buffer)
  }

  return new Blob([zipSync(files)], { type: 'application/zip' })
}

export const downloadResult = (result: ImageProcessorResult) => {
  downloadBlob(result.outputName, result.blob)
}

export const renderAsciiPng = async (
  asciiText: string,
  settings: AsciiSettings
) => {
  const lines = asciiText.split('\n')
  const fontSize = Math.max(6, Math.min(20, settings.fontSize))
  const lineHeight = Math.max(1, Math.round(fontSize * 0.78))
  const charWidth = Math.max(4, Math.round(fontSize * 0.62))
  const padding = 16
  const width = Math.max(1, Math.max(...lines.map((line) => line.length), 1) * charWidth + padding * 2)
  const height = Math.max(1, lines.length * lineHeight + padding * 2)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D')
  }

  context.fillStyle = settings.backgroundColor
  context.fillRect(0, 0, width, height)
  context.fillStyle = settings.foregroundColor
  context.font = `${fontSize}px "SFMono-Regular", Consolas, monospace`
  context.textBaseline = 'top'
  lines.forEach((line, index) => {
    context.fillText(line, padding, padding + index * lineHeight)
  })

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('ASCII 图片导出失败'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

export const buildAsciiHtmlDocument = (
  asciiText: string,
  settings: AsciiSettings
) => {
  return [
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
    `<pre>${escapeHtml(asciiText)}</pre>`,
    '</body>',
    '</html>'
  ].join('')
}
