import type { EncodingCategory, EncodingDetectionHint, EncodingOperation } from '@/types/encodingConverter'

const createHint = (
  id: string,
  operation: EncodingOperation,
  category: EncodingCategory,
  title: string,
  description: string,
  confidence: EncodingDetectionHint['confidence']
): EncodingDetectionHint => ({
  id,
  operation,
  category,
  title,
  description,
  confidence
})

const looksLikeBase64 = (input: string) => {
  const normalized = input.replace(/\s+/g, '')
  return normalized.length >= 8
    && normalized.length % 4 === 0
    && /^[A-Za-z0-9+/]+={0,2}$/.test(normalized)
}

const looksLikeBase64Url = (input: string) => {
  const normalized = input.replace(/\s+/g, '')
  return normalized.length >= 8
    && /^[A-Za-z0-9_-]+={0,2}$/.test(normalized)
    && /[-_]/.test(normalized)
}

const looksLikeHex = (input: string) => {
  const normalized = input
    .replace(/0x/gi, '')
    .replace(/[\s,:;-]/g, '')
  return normalized.length >= 4
    && normalized.length % 2 === 0
    && /^[0-9a-fA-F]+$/.test(normalized)
}

export const detectEncodingHints = (input: string): EncodingDetectionHint[] => {
  const text = input.trim()
  if (!text) {
    return []
  }

  const hints: EncodingDetectionHint[] = []
  const encodedPercentMatches = text.match(/%[0-9a-fA-F]{2}/g) || []
  if (encodedPercentMatches.length >= 2) {
    hints.push(createHint(
      'url-decode',
      'url-decode',
      'url',
      '看起来像 URL 编码',
      '检测到多个 %XX 片段，可以尝试 URL 解码。',
      encodedPercentMatches.length >= 5 ? 'high' : 'medium'
    ))
  }

  if (/%25[0-9a-fA-F]{2}/.test(text)) {
    hints.push(createHint(
      'url-decode-layers',
      'url-decode-layers',
      'url',
      '可能被多层 URL 编码',
      '检测到 %25XX 片段，通常表示百分号本身也被编码。',
      'high'
    ))
  }

  if (/[?&][^=\s]+=[^\s]+/.test(text) && /\+/.test(text)) {
    hints.push(createHint(
      'url-plus-decode',
      'url-decode',
      'url',
      '可能是表单 URL 参数',
      '检测到查询参数和 + 号，解码时可启用 + 转空格。',
      'medium'
    ))
  }

  if (/\\u\{?[0-9a-fA-F]{4,6}\}?/.test(text) || /\\x[0-9a-fA-F]{2}/.test(text)) {
    hints.push(createHint(
      'unicode-unescape',
      'unicode-unescape',
      'unicode',
      '看起来像 Unicode 转义',
      '检测到 \\uXXXX、\\u{XXXX} 或 \\xXX 片段。',
      'high'
    ))
  }

  if (/\\[nrtbf"\\/]/.test(text)) {
    hints.push(createHint(
      'json-unescape',
      'json-unescape',
      'unicode',
      '可能是 JSON 字符串转义',
      '检测到 JSON 字符串常见转义符。',
      'medium'
    ))
  }

  if (/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-fA-F]+);/.test(text)) {
    hints.push(createHint(
      'html-decode',
      'html-decode',
      'html',
      '看起来像 HTML 实体',
      '检测到命名实体或数字实体。',
      'high'
    ))
  }

  if (looksLikeBase64Url(text)) {
    hints.push(createHint(
      'base64url-decode',
      'base64url-decode',
      'base64',
      '看起来像 Base64URL',
      '检测到 URL 安全 Base64 字符 - 或 _。',
      'high'
    ))
  } else if (looksLikeBase64(text)) {
    hints.push(createHint(
      'base64-decode',
      'base64-decode',
      'base64',
      '看起来像 Base64',
      '字符集和长度符合标准 Base64 形态。',
      'medium'
    ))
  }

  if (looksLikeHex(text)) {
    hints.push(createHint(
      'hex-to-text',
      'hex-to-text',
      'bytes',
      '看起来像 Hex 字节',
      '内容主要由十六进制字符和分隔符组成。',
      'medium'
    ))
  }

  return hints.slice(0, 6)
}
