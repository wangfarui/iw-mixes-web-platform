import type {
  FormatterIssue,
  FormatterResult,
  FormatterSettings,
  ResolvedFormatterLanguage
} from '../../types/formatter'
import {
  calculateFormatterMetrics,
  ensureFinalNewline as appendFinalNewline,
  normalizeNewlines,
  trimLineEndings
} from './metrics'

interface FormatPayload {
  output: string
  issues?: FormatterIssue[]
  warnings?: string[]
}

interface CodeToken {
  type: 'word' | 'number' | 'string' | 'comment' | 'symbol' | 'operator' | 'space'
  value: string
}

const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
])

const SQL_KEYWORDS = new Set([
  'ADD',
  'ALTER',
  'AND',
  'AS',
  'ASC',
  'BETWEEN',
  'BY',
  'CASE',
  'CREATE',
  'CROSS',
  'DELETE',
  'DESC',
  'DISTINCT',
  'DROP',
  'ELSE',
  'END',
  'EXCEPT',
  'FETCH',
  'FROM',
  'FULL',
  'GROUP',
  'HAVING',
  'IN',
  'INNER',
  'INSERT',
  'INTERSECT',
  'INTO',
  'IS',
  'JOIN',
  'LEFT',
  'LIKE',
  'LIMIT',
  'NOT',
  'NULL',
  'OFFSET',
  'ON',
  'OR',
  'ORDER',
  'OUTER',
  'RIGHT',
  'SELECT',
  'SET',
  'TABLE',
  'THEN',
  'UNION',
  'UPDATE',
  'VALUES',
  'VIEW',
  'WHEN',
  'WHERE',
  'WITH'
])

const SQL_CLAUSE_KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP',
  'ORDER',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'FETCH',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'FULL',
  'CROSS',
  'UNION',
  'EXCEPT',
  'INTERSECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'VALUES',
  'SET',
  'RETURNING',
  'WITH'
])

const makeIndent = (level: number, settings: FormatterSettings) => {
  return ' '.repeat(Math.max(0, level) * settings.indentSize)
}

const getExtension = (fileName = '') => {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : ''
}

const languageFromExtension = (fileName?: string): ResolvedFormatterLanguage | null => {
  switch (getExtension(fileName)) {
    case '.json':
      return 'json'
    case '.xml':
      return 'xml'
    case '.sql':
      return 'sql'
    case '.properties':
    case '.props':
    case '.conf':
    case '.ini':
      return 'properties'
    case '.yaml':
    case '.yml':
      return 'yaml'
    case '.html':
    case '.htm':
      return 'html'
    case '.css':
      return 'css'
    case '.js':
    case '.jsx':
    case '.ts':
    case '.tsx':
      return 'javascript'
    case '.md':
    case '.markdown':
      return 'markdown'
    default:
      return null
  }
}

export const detectFormatterLanguage = (input: string, fileName?: string): ResolvedFormatterLanguage => {
  const byExtension = languageFromExtension(fileName)
  if (byExtension) {
    return byExtension
  }

  const text = input.trim()
  if (!text) {
    return 'json'
  }

  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      JSON.parse(text)
      return 'json'
    } catch {
      return 'json'
    }
  }

  if (/^<!doctype\s+html/i.test(text) || /<\/?(html|head|body|div|span|section|article|main|script|style)\b/i.test(text)) {
    return 'html'
  }

  if (/^<\?xml\b/i.test(text) || /^<[\w:.-]+(?:\s|>|\/>)/.test(text)) {
    return 'xml'
  }

  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(text)) {
    return 'sql'
  }

  if (/^[\w.-]+\s*[:=]/m.test(text) && !/^\s*[-\w]+\s*:\s*$/m.test(text)) {
    return 'properties'
  }

  if (/^\s*[-\w"']+\s*:\s+/m.test(text) || /^\s*-\s+\w+/m.test(text)) {
    return 'yaml'
  }

  if (/[.#]?[\w-]+\s*\{[\s\S]*:[\s\S]*;?[\s\S]*\}/.test(text)) {
    return 'css'
  }

  if (/\b(function|const|let|var|import|export|class|return)\b/.test(text)) {
    return 'javascript'
  }

  return 'markdown'
}

const parseJsonPosition = (message: string, input: string) => {
  const match = message.match(/position\s+(\d+)/i)
  if (!match) {
    return {}
  }
  const position = Number(match[1])
  const before = input.slice(0, position)
  const lines = before.split('\n')
  const lastLine = lines[lines.length - 1] || ''
  return {
    line: lines.length,
    column: lastLine.length + 1
  }
}

const sortJsonKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys)
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortJsonKeys((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }
  return value
}

const formatJson = (input: string, settings: FormatterSettings): FormatPayload => {
  try {
    const parsed = JSON.parse(input)
    const normalized = settings.sortKeys ? sortJsonKeys(parsed) : parsed
    if (settings.mode === 'validate') {
      return {
        output: input,
        issues: [{ level: 'info', message: 'JSON 语法校验通过' }]
      }
    }
    return {
      output: JSON.stringify(normalized, null, settings.mode === 'compact' ? 0 : settings.indentSize)
    }
  } catch (error: any) {
    const message = error?.message || 'JSON 解析失败'
    throw {
      message,
      ...parseJsonPosition(message, input)
    }
  }
}

const getTagName = (tag: string) => {
  const match = tag.match(/^<\/?\s*([a-zA-Z][\w:.-]*)/)
  return match?.[1]?.toLowerCase() || ''
}

const validateMarkup = (tokens: string[], language: ResolvedFormatterLanguage): FormatterIssue[] => {
  const issues: FormatterIssue[] = []
  const stack: string[] = []

  tokens.forEach((token) => {
    const trimmed = token.trim()
    if (!trimmed.startsWith('<') || /^<!--|^<!\[CDATA|^<!doctype|^<\?/.test(trimmed.toLowerCase())) {
      return
    }

    const name = getTagName(trimmed)
    if (!name) {
      return
    }

    if (trimmed.startsWith('</')) {
      const expected = stack.pop()
      if (expected && expected !== name) {
        issues.push({
          level: language === 'html' ? 'warning' : 'error',
          message: `标签闭合顺序可能不匹配：期望 </${expected}>，实际 </${name}>`
        })
      }
      return
    }

    const selfClosing = /\/>$/.test(trimmed) || (language === 'html' && VOID_HTML_TAGS.has(name))
    if (!selfClosing) {
      stack.push(name)
    }
  })

  if (stack.length) {
    issues.push({
      level: language === 'html' ? 'warning' : 'error',
      message: `存在未闭合标签：${stack.map((name) => `<${name}>`).join('、')}`
    })
  }

  return issues
}

const formatMarkup = (
  input: string,
  settings: FormatterSettings,
  language: 'xml' | 'html'
): FormatPayload => {
  const tokens = input.match(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!doctype[^>]*>|<[^>]+>|[^<]+/gi) || []
  const issues = validateMarkup(tokens, language)
  if (settings.mode === 'validate') {
    return {
      output: input,
      issues: issues.length ? issues : [{ level: 'info', message: `${language.toUpperCase()} 基础结构校验通过` }]
    }
  }

  if (settings.mode === 'compact') {
    return {
      output: input
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim(),
      issues
    }
  }

  const lines: string[] = []
  let level = 0

  tokens.forEach((token) => {
    const trimmed = token.trim()
    if (!trimmed) {
      return
    }

    if (trimmed.startsWith('</')) {
      level = Math.max(0, level - 1)
    }

    const chunks = trimmed.startsWith('<')
      ? [trimmed]
      : trimmed.split('\n').map((line) => line.trim()).filter(Boolean)

    chunks.forEach((chunk) => {
      lines.push(`${makeIndent(level, settings)}${chunk}`)
    })

    if (trimmed.startsWith('<') && !trimmed.startsWith('</')) {
      const name = getTagName(trimmed)
      const selfClosing = /\/>$/.test(trimmed)
        || /^<!--|^<!\[CDATA|^<!doctype|^<\?/.test(trimmed.toLowerCase())
        || (language === 'html' && VOID_HTML_TAGS.has(name))
      if (!selfClosing) {
        level += 1
      }
    }
  })

  return {
    output: lines.join('\n'),
    issues
  }
}

const tokenizeCode = (input: string): CodeToken[] => {
  const tokens: CodeToken[] = []
  let index = 0

  while (index < input.length) {
    const char = input[index]
    const next = input[index + 1]

    if (/\s/.test(char)) {
      let end = index + 1
      while (end < input.length && /\s/.test(input[end])) end += 1
      tokens.push({ type: 'space', value: input.slice(index, end) })
      index = end
      continue
    }

    if (char === '/' && next === '/') {
      let end = index + 2
      while (end < input.length && input[end] !== '\n') end += 1
      tokens.push({ type: 'comment', value: input.slice(index, end) })
      index = end
      continue
    }

    if (char === '/' && next === '*') {
      const end = input.indexOf('*/', index + 2)
      const stop = end >= 0 ? end + 2 : input.length
      tokens.push({ type: 'comment', value: input.slice(index, stop) })
      index = stop
      continue
    }

    if (char === '\'' || char === '"' || char === '`') {
      const quote = char
      let end = index + 1
      while (end < input.length) {
        if (input[end] === '\\') {
          end += 2
          continue
        }
        if (input[end] === quote) {
          end += 1
          break
        }
        end += 1
      }
      tokens.push({ type: 'string', value: input.slice(index, end) })
      index = end
      continue
    }

    if (/[A-Za-z_$-]/.test(char)) {
      let end = index + 1
      while (end < input.length && /[\w$-]/.test(input[end])) end += 1
      tokens.push({ type: 'word', value: input.slice(index, end) })
      index = end
      continue
    }

    if (/\d/.test(char)) {
      let end = index + 1
      while (end < input.length && /[\d._]/.test(input[end])) end += 1
      tokens.push({ type: 'number', value: input.slice(index, end) })
      index = end
      continue
    }

    if ('{}()[];,.:'.includes(char)) {
      tokens.push({ type: 'symbol', value: char })
      index += 1
      continue
    }

    tokens.push({ type: 'operator', value: char })
    index += 1
  }

  return tokens
}

const tokenNeedsSpace = (left: CodeToken | undefined, right: CodeToken) => {
  if (!left) {
    return false
  }
  if (['(', '[', '{', '.', ':'].includes(left.value)) {
    return false
  }
  if ([')', ']', '}', ',', ';', '.', ':'].includes(right.value)) {
    return false
  }
  return ['word', 'number', 'string'].includes(left.type)
    && ['word', 'number', 'string'].includes(right.type)
}

const compactCode = (input: string) => {
  const tokens = tokenizeCode(input).filter((token) => token.type !== 'space')
  let output = ''
  let previous: CodeToken | undefined
  tokens.forEach((token) => {
    if (tokenNeedsSpace(previous, token)) {
      output += ' '
    }
    output += token.value
    previous = token
  })
  return output.trim()
}

const formatGenericCode = (input: string, settings: FormatterSettings, cssMode = false): FormatPayload => {
  const tokens = tokenizeCode(input).filter((token) => token.type !== 'space')
  if (settings.mode === 'validate') {
    const balance = validateBraceBalance(tokens)
    return {
      output: input,
      issues: balance.length ? balance : [{ level: 'info', message: '基础括号结构校验通过' }]
    }
  }

  if (settings.mode === 'compact') {
    return {
      output: compactCode(input),
      issues: validateBraceBalance(tokens)
    }
  }

  const lines: string[] = []
  let line = ''
  let indent = 0
  let previous: CodeToken | undefined

  const pushLine = () => {
    const trimmed = line.trim()
    if (trimmed) {
      lines.push(`${makeIndent(indent, settings)}${trimmed}`)
    }
    line = ''
    previous = undefined
  }

  const append = (token: CodeToken) => {
    if (
      tokenNeedsSpace(previous, token)
      || (cssMode && previous?.value === ':' && ![';', '}', ')', ','].includes(token.value))
      || (cssMode && token.value === '{' && Boolean(line.trim()))
    ) {
      line += ' '
    }
    line += token.value
    previous = token
  }

  tokens.forEach((token) => {
    if (token.value === '}') {
      pushLine()
      indent = Math.max(0, indent - 1)
      append(token)
      if (cssMode) {
        pushLine()
      }
      return
    }

    append(token)

    if (token.value === '{') {
      pushLine()
      indent += 1
      return
    }

    if (token.value === ';') {
      pushLine()
      return
    }

    if (cssMode && token.value === ',') {
      pushLine()
    }
  })

  pushLine()

  return {
    output: lines.join('\n'),
    issues: validateBraceBalance(tokens)
  }
}

const validateBraceBalance = (tokens: CodeToken[]): FormatterIssue[] => {
  const stack: string[] = []
  const pairs: Record<string, string> = {
    ')': '(',
    ']': '[',
    '}': '{'
  }
  tokens.forEach((token) => {
    if (token.type !== 'symbol') {
      return
    }
    if (['(', '[', '{'].includes(token.value)) {
      stack.push(token.value)
      return
    }
    if ([')', ']', '}'].includes(token.value)) {
      const expected = pairs[token.value]
      const actual = stack.pop()
      if (actual !== expected) {
        stack.push(`missing:${expected}`)
      }
    }
  })

  return stack.length
    ? [{ level: 'warning', message: '括号或花括号可能未完全配对' }]
    : []
}

const tokenizeSql = tokenizeCode

const formatSqlKeyword = (value: string, settings: FormatterSettings) => {
  const upper = value.toUpperCase()
  if (!SQL_KEYWORDS.has(upper)) {
    return value
  }
  if (settings.sqlKeywordCase === 'lower') {
    return upper.toLowerCase()
  }
  if (settings.sqlKeywordCase === 'preserve') {
    return value
  }
  return upper
}

const formatSql = (input: string, settings: FormatterSettings): FormatPayload => {
  const tokens = tokenizeSql(input).filter((token) => token.type !== 'space')
  if (settings.mode === 'compact') {
    return {
      output: compactSql(tokens, settings)
    }
  }

  if (settings.mode === 'validate') {
    return {
      output: input,
      issues: validateBraceBalance(tokens).length
        ? validateBraceBalance(tokens)
        : [{ level: 'info', message: 'SQL 基础结构校验通过' }]
    }
  }

  const lines: string[] = []
  let line = ''
  let indent = 0
  let previous: CodeToken | undefined

  const pushLine = (nextIndent = indent) => {
    const trimmed = line.trim()
    if (trimmed) {
      lines.push(`${makeIndent(indent, settings)}${trimmed}`)
    }
    line = ''
    indent = nextIndent
    previous = undefined
  }

  const append = (token: CodeToken, rawValue?: string) => {
    const value = rawValue ?? token.value
    if (line && tokenNeedsSqlSpace(previous, token)) {
      line += ' '
    }
    line += value
    previous = { ...token, value }
  }

  tokens.forEach((token) => {
    const upper = token.value.toUpperCase()
    const keywordValue = token.type === 'word' ? formatSqlKeyword(token.value, settings) : token.value

    if (upper === 'AND' || upper === 'OR') {
      pushLine(1)
      append(token, keywordValue)
      return
    }

    if (token.type === 'word' && SQL_CLAUSE_KEYWORDS.has(upper)) {
      pushLine(0)
      indent = 0
      append(token, keywordValue)
      if (upper === 'SELECT' || upper === 'WHERE' || upper === 'SET' || upper === 'VALUES') {
        pushLine(1)
      }
      return
    }

    if (token.value === ',') {
      append(token)
      pushLine(Math.max(1, indent))
      return
    }

    if (token.value === ';') {
      append(token)
      pushLine(0)
      return
    }

    if (token.value === '(') {
      append(token)
      indent += 1
      return
    }

    if (token.value === ')') {
      indent = Math.max(0, indent - 1)
      append(token)
      return
    }

    append(token, keywordValue)
  })

  pushLine(0)

  return {
    output: lines.join('\n')
  }
}

const tokenNeedsSqlSpace = (left: CodeToken | undefined, right: CodeToken) => {
  if (!left) {
    return false
  }
  if (['(', '.', '['].includes(left.value)) {
    return false
  }
  if ([')', ']', ',', ';', '.'].includes(right.value)) {
    return false
  }
  return true
}

const compactSql = (tokens: CodeToken[], settings: FormatterSettings) => {
  let output = ''
  let previous: CodeToken | undefined
  tokens.forEach((token) => {
    const value = token.type === 'word' ? formatSqlKeyword(token.value, settings) : token.value
    if (output && tokenNeedsSqlSpace(previous, token)) {
      output += ' '
    }
    output += value
    previous = { ...token, value }
  })
  return output.trim()
}

interface PropertyLine {
  type: 'property' | 'comment' | 'blank'
  key?: string
  value?: string
  raw: string
}

export const parsePropertiesLines = (input: string): PropertyLine[] => {
  return normalizeNewlines(input).split('\n').map((line) => {
    const trimmed = line.trim()
    if (!trimmed) {
      return { type: 'blank', raw: line }
    }
    if (trimmed.startsWith('#') || trimmed.startsWith('!')) {
      return { type: 'comment', raw: trimmed }
    }

    let separatorIndex = -1
    let escaped = false
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index]
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '=' || char === ':') {
        separatorIndex = index
        break
      }
    }

    if (separatorIndex < 0) {
      const whitespaceMatch = line.match(/\s+/)
      if (whitespaceMatch?.index && whitespaceMatch.index > 0) {
        separatorIndex = whitespaceMatch.index
      }
    }

    if (separatorIndex < 0) {
      return { type: 'property', key: trimmed, value: '', raw: line }
    }

    return {
      type: 'property',
      key: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1).trim(),
      raw: line
    }
  })
}

const formatProperties = (input: string, settings: FormatterSettings): FormatPayload => {
  const lines = parsePropertiesLines(input)
  const properties = lines.filter((line) => line.type === 'property')
  const duplicateKeys = new Set<string>()
  const seenKeys = new Set<string>()
  properties.forEach((line) => {
    if (!line.key) {
      return
    }
    if (seenKeys.has(line.key)) {
      duplicateKeys.add(line.key)
    }
    seenKeys.add(line.key)
  })

  const warnings = duplicateKeys.size
    ? [`检测到重复 key：${Array.from(duplicateKeys).join('、')}`]
    : []

  if (settings.mode === 'validate') {
    return {
      output: input,
      warnings,
      issues: [{ level: 'info', message: 'Properties 基础结构校验完成' }]
    }
  }

  const propertyLines = settings.sortKeys
    ? [...properties].sort((left, right) => (left.key || '').localeCompare(right.key || ''))
    : lines

  return {
    output: propertyLines
      .filter((line) => settings.mode !== 'compact' || line.type !== 'blank')
      .map((line) => {
        if (line.type === 'blank') {
          return ''
        }
        if (line.type === 'comment') {
          return line.raw.trim()
        }
        return settings.mode === 'compact'
          ? `${line.key || ''}=${line.value || ''}`
          : `${line.key || ''} = ${line.value || ''}`
      })
      .join('\n'),
    warnings
  }
}

const formatYaml = (input: string, settings: FormatterSettings): FormatPayload => {
  const warnings: string[] = []
  const lines = normalizeNewlines(input).split('\n')
  if (lines.some((line) => /^\t+/.test(line))) {
    warnings.push('检测到 Tab 缩进，已按缩进级别转为空格')
  }

  if (settings.mode === 'validate') {
    return {
      output: input,
      warnings,
      issues: [{ level: 'info', message: 'YAML 已完成轻量结构检查，复杂语法建议用专用解析器复核' }]
    }
  }

  const formatted = lines
    .map((line) => {
      const trimmedRight = line.replace(/[ \t]+$/g, '')
      if (!trimmedRight.trim()) {
        return ''
      }
      const leading = trimmedRight.match(/^[ \t]*/)?.[0] || ''
      const level = Math.floor(leading.replace(/\t/g, '  ').length / 2)
      let body = trimmedRight.trim()
      if (body.startsWith('-')) {
        body = body.replace(/^-\s*/, '- ')
      } else if (!body.startsWith('#')) {
        body = body.replace(/^([^:'"{[].*?):\s*/, (_match, key) => `${String(key).trim()}: `)
      }
      return `${makeIndent(level, settings)}${body}`
    })

  return {
    output: settings.mode === 'compact'
      ? formatted.filter(Boolean).join('\n')
      : formatted.join('\n').replace(/\n{3,}/g, '\n\n'),
    warnings
  }
}

const formatMarkdown = (input: string, settings: FormatterSettings): FormatPayload => {
  if (settings.mode === 'validate') {
    return {
      output: input,
      issues: [{ level: 'info', message: 'Markdown 不做语法约束，已完成文本规范化检查' }]
    }
  }

  const lines = normalizeNewlines(input)
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))

  if (settings.mode === 'compact') {
    return {
      output: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    }
  }

  const output: string[] = []
  let inFence = false
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (/^```/.test(trimmed)) {
      inFence = !inFence
    }
    if (!inFence && /^#{1,6}\s+/.test(trimmed) && output.length && output[output.length - 1] !== '') {
      output.push('')
    }
    output.push(line)
  })

  return {
    output: output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  }
}

const prepareInput = (input: string, settings: FormatterSettings) => {
  let text = settings.normalizeLineEndings ? normalizeNewlines(input) : input
  if (settings.trimTrailingWhitespace) {
    text = trimLineEndings(text)
  }
  return text
}

const finalizeOutput = (output: string, settings: FormatterSettings) => {
  let text = settings.normalizeLineEndings ? normalizeNewlines(output) : output
  if (settings.trimTrailingWhitespace) {
    text = trimLineEndings(text)
  }
  if (settings.ensureFinalNewline) {
    text = appendFinalNewline(text)
  }
  return text
}

export const formatText = (
  input: string,
  settings: FormatterSettings,
  fileName?: string
): FormatterResult => {
  const startedAt = performance.now()
  const preparedInput = prepareInput(input, settings)
  const language = settings.language === 'auto'
    ? detectFormatterLanguage(preparedInput, fileName)
    : settings.language

  let payload: FormatPayload

  try {
    switch (language) {
      case 'json':
        payload = formatJson(preparedInput, settings)
        break
      case 'xml':
        payload = formatMarkup(preparedInput, settings, 'xml')
        break
      case 'html':
        payload = formatMarkup(preparedInput, settings, 'html')
        break
      case 'sql':
        payload = formatSql(preparedInput, settings)
        break
      case 'properties':
        payload = formatProperties(preparedInput, settings)
        break
      case 'yaml':
        payload = formatYaml(preparedInput, settings)
        break
      case 'css':
        payload = formatGenericCode(preparedInput, settings, true)
        break
      case 'javascript':
        payload = formatGenericCode(preparedInput, settings, false)
        break
      case 'markdown':
        payload = formatMarkdown(preparedInput, settings)
        break
      default:
        payload = { output: preparedInput }
    }
  } catch (error: any) {
    const issue: FormatterIssue = {
      level: 'error',
      message: error?.message || '格式化失败',
      line: error?.line,
      column: error?.column
    }
    return {
      language,
      mode: settings.mode,
      output: '',
      inputMetrics: calculateFormatterMetrics(preparedInput),
      outputMetrics: calculateFormatterMetrics(''),
      issues: [issue],
      warnings: [],
      durationMs: Math.round(performance.now() - startedAt),
      formattedAt: new Date().toISOString()
    }
  }

  const output = finalizeOutput(payload.output, settings)

  return {
    language,
    mode: settings.mode,
    output,
    inputMetrics: calculateFormatterMetrics(preparedInput),
    outputMetrics: calculateFormatterMetrics(output),
    issues: payload.issues || [],
    warnings: payload.warnings || [],
    durationMs: Math.round(performance.now() - startedAt),
    formattedAt: new Date().toISOString()
  }
}
