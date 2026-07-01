import SparkMD5 from 'spark-md5'
import type {
  EncodingConverterIssue,
  EncodingConverterResult,
  EncodingConverterSettings,
  EncodingDetail,
  EncodingMetrics
} from '@/types/encodingConverter'
import {
  ENCODING_LIMITS,
  HASH_ALGORITHM_LABELS,
  OPERATION_LABELS
} from './config'

const textEncoder = new TextEncoder()

export const calculateEncodingMetrics = (text: string): EncodingMetrics => {
  const characters = Array.from(text).length
  return {
    characters,
    bytes: textEncoder.encode(text).byteLength,
    lines: text ? text.split(/\r\n|\r|\n/).length : 0
  }
}

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export const shouldUseManualEncoding = (input: string) => input.length > ENCODING_LIMITS.autoRunCharacters

export const isHugeEncodingInput = (input: string) => input.length > ENCODING_LIMITS.hugeInputCharacters

const toByteArray = (input: string) => textEncoder.encode(input)

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

const base64ToBytes = (input: string) => {
  try {
    const binary = atob(input)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    throw new Error('Base64 内容格式不正确，无法解码')
  }
}

const normalizeBase64 = (input: string) => {
  const cleaned = input.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    throw new Error('Base64 只能包含 A-Z、a-z、0-9、+、/ 和最多两个 =')
  }
  if (cleaned.length % 4 === 1) {
    throw new Error('Base64 长度不合法，无法补齐 padding')
  }
  return cleaned.padEnd(Math.ceil(cleaned.length / 4) * 4, '=')
}

const base64UrlToBase64 = (input: string) => {
  const cleaned = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    throw new Error('Base64URL 只能包含 A-Z、a-z、0-9、-、_ 和可选 =')
  }
  if (cleaned.length % 4 === 1) {
    throw new Error('Base64URL 长度不合法，无法补齐 padding')
  }
  return cleaned.padEnd(Math.ceil(cleaned.length / 4) * 4, '=')
}

const base64ToBase64Url = (input: string) => normalizeBase64(input)
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '')

const decodeUtf8 = (bytes: Uint8Array) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('解码后的字节不是有效 UTF-8 文本')
  }
}

const encodeUrl = (input: string, settings: EncodingConverterSettings) => {
  const encoded = encodeURIComponent(input)
  return settings.urlSpaceMode === 'plus' ? encoded.replace(/%20/g, '+') : encoded
}

const decodeUrlOnce = (input: string, settings: EncodingConverterSettings) => {
  const normalized = settings.urlSpaceMode === 'plus' ? input.replace(/\+/g, ' ') : input
  try {
    return decodeURIComponent(normalized)
  } catch {
    throw new Error('URL 编码格式不完整，请检查 % 后是否为两位十六进制字符')
  }
}

const decodeUrlLayers = (input: string, settings: EncodingConverterSettings) => {
  const warnings: string[] = []
  let output = input
  let layers = 0
  for (let index = 0; index < settings.urlDecodeLayers; index += 1) {
    const next = decodeUrlOnce(output, settings)
    if (next === output) {
      break
    }
    output = next
    layers += 1
  }

  if (!layers) {
    warnings.push('没有检测到可继续解码的 URL 编码片段')
  } else if (/%[0-9a-fA-F]{2}/.test(output)) {
    warnings.push(`已解码 ${layers} 层，结果中仍包含 %XX 片段，可增加最大层数后重试`)
  } else {
    warnings.push(`已完成 ${layers} 层 URL 解码`)
  }

  return { output, warnings }
}

const escapeUnicode = (input: string) => {
  let output = ''
  for (let index = 0; index < input.length; index += 1) {
    output += `\\u${input.charCodeAt(index).toString(16).padStart(4, '0')}`
  }
  return output
}

const unescapeUnicode = (input: string) => input
  .replace(/\\u\{([0-9a-fA-F]{1,6})\}/g, (_, hex) => {
    const codePoint = Number.parseInt(hex, 16)
    if (codePoint > 0x10ffff) {
      throw new Error(`Unicode 码位超出范围：${hex}`)
    }
    return String.fromCodePoint(codePoint)
  })
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
  .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))

const escapeJsonString = (input: string) => JSON.stringify(input).slice(1, -1)

const unescapeJsonString = (input: string) => {
  const trimmed = input.trim()
  const quoted = trimmed.startsWith('"') && trimmed.endsWith('"')
  const source = quoted
    ? trimmed
    : `"${input}"`
  try {
    const parsed = JSON.parse(source)
    if (typeof parsed !== 'string') {
      throw new Error('JSON 值不是字符串')
    }
    return parsed
  } catch (error: any) {
    if (!quoted) {
      try {
        const fallbackSource = `"${input.replace(/(^|[^\\])"/g, '$1\\"')}"`
        const parsed = JSON.parse(fallbackSource)
        if (typeof parsed === 'string') {
          return parsed
        }
      } catch {
        // Keep the original parse error; it usually points closer to the malformed escape.
      }
    }
    throw new Error(error?.message ? `JSON 字符串反转义失败：${error.message}` : 'JSON 字符串反转义失败')
  }
}

const htmlEntityMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;'
}

const htmlDecodeMap: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  '#96': '`',
  nbsp: '\u00a0'
}

const encodeHtml = (input: string) => input.replace(/[&<>"'`]/g, (char) => htmlEntityMap[char])

const decodeHtml = (input: string) => input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (entity, body) => {
  if (body.startsWith('#x')) {
    return String.fromCodePoint(Number.parseInt(body.slice(2), 16))
  }
  if (body.startsWith('#')) {
    return String.fromCodePoint(Number.parseInt(body.slice(1), 10))
  }
  return htmlDecodeMap[body] ?? entity
})

const byteToHex = (byte: number, uppercase: boolean) => {
  const value = byte.toString(16).padStart(2, '0')
  return uppercase ? value.toUpperCase() : value
}

const bytesToHex = (bytes: Uint8Array, settings: EncodingConverterSettings) => Array.from(bytes)
  .map((byte) => byteToHex(byte, settings.uppercaseHex))
  .join(settings.bytesSeparator)

const normalizeHexInput = (input: string) => {
  const cleaned = input
    .replace(/0x/gi, '')
    .replace(/[\s,:;-]/g, '')
  if (!cleaned) {
    return ''
  }
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
    throw new Error('Hex 内容只能包含 0-9、a-f、A-F 和常见分隔符')
  }
  if (cleaned.length % 2 !== 0) {
    throw new Error('Hex 字节长度必须为偶数')
  }
  return cleaned
}

const hexToBytes = (input: string) => {
  const normalized = normalizeHexInput(input)
  const bytes = new Uint8Array(normalized.length / 2)
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16)
  }
  return bytes
}

const bytesToBinary = (bytes: Uint8Array) => Array.from(bytes)
  .map((byte) => byte.toString(2).padStart(8, '0'))
  .join(' ')

const displayChar = (char: string) => {
  if (char === '\n') {
    return '\\n'
  }
  if (char === '\r') {
    return '\\r'
  }
  if (char === '\t') {
    return '\\t'
  }
  if (char === ' ') {
    return 'space'
  }
  return char
}

const buildCodePointTable = (input: string, settings: EncodingConverterSettings) => {
  const warnings: string[] = []
  const chars = Array.from(input)
  const rows = chars.slice(0, ENCODING_LIMITS.maxCodePointRows).map((char, index) => {
    const codePoint = char.codePointAt(0) || 0
    const utf16 = Array.from(char)
      .map((part) => part.charCodeAt(0).toString(16).padStart(4, '0'))
      .join(' ')
    const utf8 = bytesToHex(toByteArray(char), settings)
    return [
      String(index + 1).padStart(4, ' '),
      displayChar(char),
      `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
      utf16,
      utf8
    ].join('\t')
  })

  if (chars.length > ENCODING_LIMITS.maxCodePointRows) {
    warnings.push(`码位列表已截断，仅展示前 ${ENCODING_LIMITS.maxCodePointRows} 个字符`)
  }

  return {
    output: ['#\t字符\t码位\tUTF-16\tUTF-8 Hex', ...rows].join('\n'),
    warnings
  }
}

const bufferToHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer))
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('')

const hexToBase64 = (hex: string) => {
  const bytes = hexToBytes(hex)
  return bytesToBase64(bytes)
}

const digestSha = async (input: string, algorithm: Exclude<EncodingConverterSettings['hashAlgorithm'], 'md5'>) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('当前浏览器不支持 Web Crypto，无法计算 SHA 摘要')
  }
  const digest = await globalThis.crypto.subtle.digest(algorithm.toUpperCase(), toByteArray(input))
  return bufferToHex(digest)
}

const digestHash = async (input: string, settings: EncodingConverterSettings) => {
  const bytes = toByteArray(input)
  const hex = settings.hashAlgorithm === 'md5'
    ? SparkMD5.ArrayBuffer.hash(toArrayBuffer(bytes))
    : await digestSha(input, settings.hashAlgorithm)
  const label = HASH_ALGORITHM_LABELS[settings.hashAlgorithm]
  const base64 = hexToBase64(hex)
  return {
    output: hex,
    details: [
      { label: '算法', value: label },
      { label: 'Hex', value: hex },
      { label: 'Base64', value: base64 },
      { label: '输入字节', value: String(bytes.byteLength) }
    ]
  }
}

interface OperationPayload {
  output: string
  details?: EncodingDetail[]
  warnings?: string[]
  issues?: EncodingConverterIssue[]
}

const runOperation = async (
  input: string,
  settings: EncodingConverterSettings
): Promise<OperationPayload> => {
  switch (settings.operation) {
    case 'url-encode':
      return { output: encodeUrl(input, settings) }
    case 'url-decode':
      return { output: decodeUrlOnce(input, settings) }
    case 'url-decode-layers':
      return decodeUrlLayers(input, settings)
    case 'base64-encode': {
      const output = bytesToBase64(toByteArray(input))
      return {
        output,
        details: [{ label: 'Base64URL', value: base64ToBase64Url(output) }]
      }
    }
    case 'base64-decode':
      return { output: decodeUtf8(base64ToBytes(normalizeBase64(input))) }
    case 'base64url-encode': {
      const standard = bytesToBase64(toByteArray(input))
      return {
        output: base64ToBase64Url(standard),
        details: [{ label: '标准 Base64', value: standard }]
      }
    }
    case 'base64url-decode':
      return { output: decodeUtf8(base64ToBytes(base64UrlToBase64(input))) }
    case 'base64-to-base64url':
      return { output: base64ToBase64Url(input) }
    case 'base64url-to-base64':
      return { output: base64UrlToBase64(input) }
    case 'unicode-escape':
      return { output: escapeUnicode(input) }
    case 'unicode-unescape':
      return { output: unescapeUnicode(input) }
    case 'json-escape':
      return { output: escapeJsonString(input) }
    case 'json-unescape':
      return { output: unescapeJsonString(input) }
    case 'html-encode':
      return { output: encodeHtml(input) }
    case 'html-decode':
      return { output: decodeHtml(input) }
    case 'text-to-hex':
      return { output: bytesToHex(toByteArray(input), settings) }
    case 'hex-to-text':
      return { output: decodeUtf8(hexToBytes(input)) }
    case 'text-to-binary':
      return { output: bytesToBinary(toByteArray(input)) }
    case 'code-points':
      return buildCodePointTable(input, settings)
    case 'hash':
      return digestHash(input, settings)
    default:
      throw new Error('暂不支持当前转换类型')
  }
}

export const convertEncodingText = async (
  input: string,
  settings: EncodingConverterSettings
): Promise<EncodingConverterResult> => {
  const startedAt = performance.now()
  const payload = await runOperation(input, settings)
  const inputMetrics = calculateEncodingMetrics(input)
  const outputMetrics = calculateEncodingMetrics(payload.output)

  return {
    category: settings.category,
    operation: settings.operation,
    operationLabel: OPERATION_LABELS[settings.operation],
    output: payload.output,
    inputMetrics,
    outputMetrics,
    details: payload.details || [],
    issues: payload.issues || [],
    warnings: payload.warnings || [],
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    convertedAt: new Date().toISOString()
  }
}
