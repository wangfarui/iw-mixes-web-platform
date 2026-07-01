import type { EncodingFileInfo } from '@/types/encodingConverter'
import { ENCODING_LIMITS, ENCODING_TEXT_FILE_EXTENSIONS } from './config'
import { calculateEncodingMetrics, formatBytes } from './converters'

export interface ReadEncodingFileResult {
  text: string
  info: EncodingFileInfo
}

const getExtension = (name: string) => {
  const dotIndex = name.lastIndexOf('.')
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : ''
}

const isSupportedTextFile = (file: File) => {
  const extension = getExtension(file.name)
  return ENCODING_TEXT_FILE_EXTENSIONS.has(extension)
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

export const readEncodingTextFile = async (file: File): Promise<ReadEncodingFileResult> => {
  if (!isSupportedTextFile(file)) {
    throw new Error('仅支持常见文本、代码、日志和配置文件类型')
  }

  if (file.size > ENCODING_LIMITS.maxTextFileBytes) {
    throw new Error(`文件超过 ${formatBytes(ENCODING_LIMITS.maxTextFileBytes)}，建议拆分后处理`)
  }

  if (await isProbablyBinary(file)) {
    throw new Error('检测到疑似非文本文件，当前工具不读取二进制内容')
  }

  const text = await file.text()
  const metrics = calculateEncodingMetrics(text)

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
