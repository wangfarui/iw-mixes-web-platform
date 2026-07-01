import type { FormatterFileInfo } from '../../types/formatter'
import { FORMATTER_LIMITS, FORMATTER_TEXT_FILE_EXTENSIONS } from './config'
import { calculateFormatterMetrics, formatBytes } from './metrics'

export interface ReadFormatterFileResult {
  text: string
  info: FormatterFileInfo
}

const getExtension = (name: string) => {
  const dotIndex = name.lastIndexOf('.')
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : ''
}

const isSupportedTextFile = (file: File) => {
  const extension = getExtension(file.name)
  return FORMATTER_TEXT_FILE_EXTENSIONS.has(extension)
    || file.type.startsWith('text/')
    || file.type.includes('json')
    || file.type.includes('xml')
    || file.type.includes('javascript')
}

const isProbablyBinary = async (file: File) => {
  const sample = new Uint8Array(await file.slice(0, 4096).arrayBuffer())
  if (!sample.length) {
    return false
  }

  let suspicious = 0
  for (const byte of sample) {
    if (byte === 0) {
      return true
    }
    if (byte < 7 || (byte > 13 && byte < 32)) {
      suspicious += 1
    }
  }

  return suspicious / sample.length > 0.18
}

export const readFormatterTextFile = async (file: File): Promise<ReadFormatterFileResult> => {
  if (!isSupportedTextFile(file)) {
    throw new Error('仅支持常见文本、代码和配置文件类型')
  }

  if (file.size > FORMATTER_LIMITS.maxTextFileBytes) {
    throw new Error(`文件超过 ${formatBytes(FORMATTER_LIMITS.maxTextFileBytes)}，建议拆分后处理`)
  }

  if (await isProbablyBinary(file)) {
    throw new Error('检测到疑似非文本文件，当前工具不读取二进制内容')
  }

  const text = await file.text()
  const metrics = calculateFormatterMetrics(text)

  return {
    text,
    info: {
      name: file.name,
      size: file.size,
      lines: metrics.lines,
      encoding: 'UTF-8',
      status: 'ready',
      message: '读取完成'
    }
  }
}
