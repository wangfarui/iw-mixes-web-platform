import type { IgnoreOptions, PreprocessAction } from '../../types/textDiff'
import { normalizeNewlines, splitTextLines } from './textMetrics'

export interface IgnoreProcessResult {
  text: string
  activeRules: string[]
  warnings: string[]
}

export interface PreprocessResult {
  text: string
  message: string
}

const sortJsonKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortJsonKeys((value as Record<string, unknown>)[key])
        return sorted
      }, {})
  }

  return value
}

const formatMarkup = (text: string) => {
  const normalized = text
    .replace(/>\s+</g, '><')
    .replace(/</g, '\n<')
    .replace(/>/g, '>\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  let depth = 0
  const formatted: string[] = []

  normalized.forEach((line) => {
    const isClosing = /^<\//.test(line)
    const isSelfClosing = /\/>$/.test(line) || /^<!|^<\?/.test(line)
    const isOpening = /^<[^/!?\s][^>]*>$/.test(line) && !isSelfClosing

    if (isClosing) {
      depth = Math.max(0, depth - 1)
    }

    formatted.push(`${'  '.repeat(depth)}${line}`)

    if (isOpening) {
      depth += 1
    }
  })

  return formatted.join('\n')
}

const decodeBase64 = (text: string) => {
  const compact = text.replace(/\s+/g, '')
  const binary = atob(compact)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export const applyPreprocessAction = (text: string, action: PreprocessAction): PreprocessResult => {
  switch (action) {
    case 'json-format':
      return {
        text: JSON.stringify(JSON.parse(text), null, 2),
        message: 'JSON 已格式化'
      }
    case 'json-compact':
      return {
        text: JSON.stringify(JSON.parse(text)),
        message: 'JSON 已压缩'
      }
    case 'json-sort-keys':
      return {
        text: JSON.stringify(sortJsonKeys(JSON.parse(text)), null, 2),
        message: 'JSON key 已排序'
      }
    case 'markup-format':
      return {
        text: formatMarkup(text),
        message: 'XML / HTML 已格式化'
      }
    case 'markdown-source':
      return {
        text,
        message: '已保持 Markdown 源码比对'
      }
    case 'url-encode':
      return {
        text: encodeURIComponent(text),
        message: '文本已 URL encode'
      }
    case 'url-decode':
      return {
        text: decodeURIComponent(text),
        message: '文本已 URL decode'
      }
    case 'base64-decode':
      return {
        text: decodeBase64(text),
        message: 'Base64 已解码'
      }
    case 'trim':
      return {
        text: text.trim(),
        message: '已去除首尾空白'
      }
    case 'tabs-to-spaces':
      return {
        text: text.replace(/\t/g, '  '),
        message: 'Tab 已转换为空格'
      }
    case 'normalize-newlines':
      return {
        text: normalizeNewlines(text),
        message: '换行符已统一为 LF'
      }
    default:
      return {
        text,
        message: '未执行预处理'
      }
  }
}

export const applyIgnoreOptions = (text: string, options: IgnoreOptions): IgnoreProcessResult => {
  const activeRules: string[] = []
  const warnings: string[] = []
  let processed = text

  if (options.ignoreLineEndings) {
    processed = normalizeNewlines(processed)
    activeRules.push('忽略 CRLF / LF 换行差异')
  }

  if (options.ignoreTrailingNewline) {
    processed = processed.replace(/(?:\r\n|\r|\n)+$/g, '')
    activeRules.push('忽略末尾换行差异')
  }

  const needsLinePass = options.ignoreTrimWhitespace
    || options.ignoreAllWhitespace
    || options.ignoreBlankLines
    || options.customIgnoreRegex.trim()

  if (needsLinePass) {
    let customRegex: RegExp | undefined

    if (options.customIgnoreRegex.trim()) {
      try {
        customRegex = new RegExp(options.customIgnoreRegex)
        activeRules.push(`忽略匹配正则的行：/${options.customIgnoreRegex}/`)
      } catch (error: any) {
        warnings.push(`自定义忽略正则无效：${error?.message || '无法解析'}`)
      }
    }

    let lines = splitTextLines(processed)

    if (customRegex) {
      lines = lines.filter((line) => !customRegex.test(line))
    }

    if (options.ignoreBlankLines) {
      lines = lines.filter((line) => line.trim() !== '')
      activeRules.push('忽略空行')
    }

    if (options.ignoreTrimWhitespace) {
      lines = lines.map((line) => line.trim())
      activeRules.push('忽略行首行尾空格')
    }

    if (options.ignoreAllWhitespace) {
      lines = lines.map((line) => line.replace(/[^\S\r\n]+/g, ''))
      activeRules.push('忽略所有空白差异')
    }

    processed = lines.join('\n')
  }

  if (options.ignoreCase) {
    processed = processed.toLocaleLowerCase()
    activeRules.push('忽略大小写')
  }

  return {
    text: processed,
    activeRules,
    warnings
  }
}
