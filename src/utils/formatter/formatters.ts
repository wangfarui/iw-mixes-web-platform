import type {
  FormatterIssue,
  FormatterJsonStringInfo,
  FormatterResult,
  FormatterSettings,
  ResolvedFormatterLanguage
} from '../../types/formatter'
import * as prettier from 'prettier/standalone'
import * as prettierPluginBabel from 'prettier/plugins/babel'
import * as prettierPluginEstree from 'prettier/plugins/estree'
import * as prettierPluginHtml from 'prettier/plugins/html'
import * as prettierPluginMarkdown from 'prettier/plugins/markdown'
import * as prettierPluginPostcss from 'prettier/plugins/postcss'
import * as prettierPluginYaml from 'prettier/plugins/yaml'
import { format as formatSqlWithLibrary } from 'sql-formatter'
import xmlFormat from 'xml-formatter'
import { getProperties } from 'properties-file'
import {
  calculateFormatterMetrics,
  ensureFinalNewline as appendFinalNewline,
  normalizeNewlines,
  trimLineEndings
} from './metrics'
import { normalizeJsonStrings, parseJsonInput } from './jsonStringNormalizer'

interface FormatPayload {
  output: string
  issues?: FormatterIssue[]
  warnings?: string[]
  jsonStringInfo?: FormatterJsonStringInfo
}

interface CodeToken {
  type: 'word' | 'number' | 'string' | 'comment' | 'symbol' | 'operator' | 'space'
  value: string
}

const PRETTIER_PLUGINS = [
  prettierPluginBabel,
  prettierPluginEstree,
  prettierPluginHtml,
  prettierPluginMarkdown,
  prettierPluginPostcss,
  prettierPluginYaml
]

const PRETTIER_PARSERS: Partial<Record<ResolvedFormatterLanguage, string>> = {
  yaml: 'yaml',
  html: 'html',
  css: 'css',
  javascript: 'babel-ts',
  markdown: 'markdown'
}

const trimFormatterFinalNewline = (value: string) => value.replace(/\n$/, '')

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
  'ALL',
  'AS',
  'ASC',
  'AUTO_INCREMENT',
  'BETWEEN',
  'BY',
  'CASE',
  'CHARSET',
  'COLLATE',
  'COMMENT',
  'CREATE',
  'CROSS',
  'DEFAULT',
  'DELETE',
  'DESC',
  'DISTINCT',
  'DROP',
  'ELSE',
  'END',
  'ENGINE',
  'EXCEPT',
  'EXISTS',
  'FETCH',
  'FOREIGN',
  'FROM',
  'FULL',
  'GROUP',
  'HAVING',
  'IF',
  'IN',
  'INDEX',
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
  'OVER',
  'PARTITION',
  'PRIMARY',
  'KEY',
  'RIGHT',
  'RETURNING',
  'ROW_FORMAT',
  'SELECT',
  'SET',
  'TABLE',
  'THEN',
  'UNION',
  'UNIQUE',
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

const SQL_JOIN_MODIFIERS = new Set(['LEFT', 'RIGHT', 'INNER', 'FULL', 'CROSS'])

const SQL_FUNCTION_LIKE_KEYWORDS = new Set([
  'CAST',
  'COALESCE',
  'CONVERT',
  'COUNT',
  'DATE',
  'EXTRACT',
  'IFNULL',
  'MAX',
  'MIN',
  'NOW',
  'NULLIF',
  'SUM'
])

const SQL_MULTI_CHAR_OPERATORS = [
  '!~*',
  '#>>',
  '->>',
  '::',
  '>=',
  '<=',
  '<>',
  '!=',
  '!<',
  '!>',
  '||',
  '&&',
  ':=',
  '=>',
  '->',
  '#>',
  '@>',
  '<@',
  '?|',
  '?&',
  '!~'
]

const SQL_TIGHT_OPERATORS = new Set(['::', '->', '->>', '#>', '#>>'])

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

const getSignificantConfigLines = (text: string) => {
  return normalizeNewlines(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('!'))
}

const isLikelyPropertiesLine = (line: string) => {
  return /^[A-Za-z0-9_.\-[\]]+\s*[:=]/.test(line)
}

const looksLikeProperties = (text: string) => {
  const lines = getSignificantConfigLines(text)
  if (!lines.length) {
    return false
  }

  const propertyLineCount = lines.filter(isLikelyPropertiesLine).length
  if (propertyLineCount === 0) {
    return false
  }

  if (lines.length <= 2) {
    return propertyLineCount === lines.length
  }

  return propertyLineCount >= 3 && propertyLineCount / lines.length >= 0.45
}

const stripLeadingSqlComments = (text: string) => {
  return text
    .replace(/^\s*(?:--[^\n]*(?:\n|$)|#[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/\s*)+/g, '')
    .trim()
}

const looksLikeSql = (text: string) => {
  const normalized = stripLeadingSqlComments(text)
  if (!normalized) {
    return false
  }
  if (/^(WITH|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|MERGE|REPLACE)\b/i.test(normalized)) {
    return true
  }
  return /^\s*(?:--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*(SELECT|FROM|WHERE|JOIN|GROUP\s+BY|ORDER\s+BY)\b/im.test(normalized)
    && /\b(FROM|WHERE|JOIN|GROUP\s+BY|ORDER\s+BY)\b/i.test(normalized)
}

const looksLikeJavascript = (text: string) => {
  return /(^|[;\n]\s*)(function|const|let|var|import|export|class)\b/.test(text)
    || /\breturn\b/.test(text)
    || /=>/.test(text)
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

  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed === 'string') {
        const inspection = normalizeJsonStrings(parsed, { mode: 'preserve' })
        if (inspection.candidatePaths.length) {
          return 'json'
        }
      }
    } catch {
      // 继续使用其它语言的识别规则。
    }
  }

  if (/^<!doctype\s+html/i.test(text) || /<\/?(html|head|body|div|span|section|article|main|script|style)\b/i.test(text)) {
    return 'html'
  }

  if (/^<\?xml\b/i.test(text) || /^<[\w:.-]+(?:\s|>|\/>)/.test(text)) {
    return 'xml'
  }

  if (looksLikeProperties(text)) {
    return 'properties'
  }

  if (looksLikeSql(text)) {
    return 'sql'
  }

  if (/^[\w.-]+\s*[:=]/m.test(text) && !/^\s*[-\w]+\s*:\s*$/m.test(text)) {
    return 'properties'
  }

  if (/^\s*[-\w"']+\s*:\s+/m.test(text) || /^\s*-\s+\w+/m.test(text)) {
    return 'yaml'
  }

  if (looksLikeJavascript(text)) {
    return 'javascript'
  }

  if (/[.#]?[\w-]+\s*\{[\s\S]*:[\s\S]*;?[\s\S]*\}/.test(text)) {
    return 'css'
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
    const parsedInput = parseJsonInput(input)
    const parsed = parsedInput.value
    const handlingMode = settings.mode === 'validate'
      ? 'preserve'
      : settings.jsonStringHandling || 'preserve'
    const normalization = normalizeJsonStrings(parsed, { mode: handlingMode })
    const normalized = settings.sortKeys ? sortJsonKeys(normalization.value) : normalization.value
    const detectedCount = normalization.candidatePaths.length
    const expandedCount = normalization.transformations.length
    const samplePaths = (expandedCount
      ? normalization.transformations.map((item) => item.path)
      : normalization.candidatePaths
    ).slice(0, 5)
    const jsonStringInfo: FormatterJsonStringInfo | undefined = detectedCount
      ? {
          detectedCount,
          expandedCount,
          samplePaths,
          limitReached: normalization.limitReached
        }
      : undefined
    const warnings: string[] = []

    if (parsedInput.recoveredEscapedContainer) {
      warnings.push('输入是缺少外层引号的转义 JSON，已安全还原一层转义后格式化。')
    }

    if (expandedCount) {
      const remainingCount = detectedCount - expandedCount
      warnings.push(
        `已展开 ${expandedCount} 处 JSON 字符串：${samplePaths.join('、')}${expandedCount > samplePaths.length ? ' 等' : ''}；对应值已由字符串转换为对象或数组。`
      )
      if (remainingCount > 0) {
        warnings.push(`另有 ${remainingCount} 处内嵌 JSON 字符串未按当前模式展开。`)
      }
    } else if (detectedCount && settings.mode === 'validate') {
      warnings.push(
        `检测到 ${detectedCount} 处可展开的 JSON 字符串；校验模式不会改变输入。`
      )
    }
    if (normalization.limitReached) {
      warnings.push('JSON 字符串检查已达到安全限额，部分深层或超大内容保持原值。')
    }

    if (settings.mode === 'validate') {
      return {
        output: input,
        issues: [{ level: 'info', message: 'JSON 语法校验通过' }],
        warnings,
        jsonStringInfo
      }
    }
    return {
      output: JSON.stringify(normalized, null, settings.mode === 'compact' ? 0 : settings.indentSize),
      warnings,
      jsonStringInfo
    }
  } catch (error: any) {
    const message = error?.message || 'JSON 解析失败'
    throw {
      message,
      ...parseJsonPosition(message, input)
    }
  }
}

const runPrettier = async (input: string, parser: string, settings: FormatterSettings) => {
  return trimFormatterFinalNewline(await prettier.format(input, {
    parser,
    plugins: PRETTIER_PLUGINS,
    tabWidth: settings.indentSize,
    printWidth: 120,
    proseWrap: 'preserve',
    bracketSameLine: false
  }))
}

const formatWithPrettier = async (
  input: string,
  settings: FormatterSettings,
  language: ResolvedFormatterLanguage
): Promise<FormatPayload> => {
  const parser = PRETTIER_PARSERS[language]
  if (!parser) {
    return { output: input }
  }

  if (settings.mode === 'compact') {
    if (language === 'css') {
      return formatGenericCode(input, settings, true)
    }
    if (language === 'javascript') {
      return formatGenericCode(input, settings, false)
    }
    if (language === 'html') {
      return formatMarkup(input, settings, 'html')
    }
    if (language === 'yaml') {
      return formatYaml(input, settings)
    }
    if (language === 'markdown') {
      return formatMarkdown(input, settings)
    }
  }

  try {
    const output = await runPrettier(input, parser, settings)
    if (settings.mode === 'validate') {
      return {
        output: input,
        issues: [{ level: 'info', message: `${language.toUpperCase()} 语法校验通过` }]
      }
    }
    return { output }
  } catch (error: any) {
    if (language === 'yaml') {
      const fallback = formatYaml(input, settings)
      return {
        ...fallback,
        warnings: [
          ...(fallback.warnings || []),
          `YAML 已使用宽松格式化；Prettier 解析提示：${error?.message || '解析失败'}`
        ]
      }
    }
    throw error
  }
}

const formatXmlWithLibrary = (input: string, settings: FormatterSettings): FormatPayload => {
  if (settings.mode === 'validate') {
    xmlFormat(input, {
      indentation: makeIndent(1, settings),
      collapseContent: true,
      lineSeparator: '\n',
      throwOnFailure: true,
      strictMode: true
    })
    return {
      output: input,
      issues: [{ level: 'info', message: 'XML 语法校验通过' }]
    }
  }

  if (settings.mode === 'compact') {
    return {
      output: xmlFormat.minify(input, {
        collapseContent: true,
        throwOnFailure: true
      })
    }
  }

  return {
    output: xmlFormat(input, {
      indentation: makeIndent(1, settings),
      collapseContent: true,
      lineSeparator: '\n',
      throwOnFailure: true,
      strictMode: true
    })
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

const readSqlQuotedValue = (input: string, start: number, quote: string) => {
  let end = start + 1
  while (end < input.length) {
    if (input[end] === '\\') {
      end += 2
      continue
    }
    if (input[end] === quote) {
      if (input[end + 1] === quote) {
        end += 2
        continue
      }
      end += 1
      break
    }
    end += 1
  }
  return input.slice(start, end)
}

const readSqlBracketIdentifier = (input: string, start: number) => {
  let end = start + 1
  while (end < input.length) {
    if (input[end] === ']') {
      if (input[end + 1] === ']') {
        end += 2
        continue
      }
      end += 1
      break
    }
    end += 1
  }
  return input.slice(start, end)
}

const readSqlDollarQuotedValue = (input: string, start: number) => {
  const match = input.slice(start).match(/^\$[A-Za-z_]\w*\$|^\$\$/)
  if (!match) {
    return ''
  }
  const delimiter = match[0]
  const end = input.indexOf(delimiter, start + delimiter.length)
  return end >= 0
    ? input.slice(start, end + delimiter.length)
    : input.slice(start, start + delimiter.length)
}

const readSqlNumber = (input: string, start: number) => {
  let end = start + 1
  while (end < input.length && /[\d_]/.test(input[end])) end += 1
  if (input[end] === '.' && /\d/.test(input[end + 1] || '')) {
    end += 1
    while (end < input.length && /[\d_]/.test(input[end])) end += 1
  }
  if (/e/i.test(input[end] || '')) {
    let exponentEnd = end + 1
    if (/[+-]/.test(input[exponentEnd] || '')) {
      exponentEnd += 1
    }
    const digitStart = exponentEnd
    while (exponentEnd < input.length && /\d/.test(input[exponentEnd])) exponentEnd += 1
    if (exponentEnd > digitStart) {
      end = exponentEnd
    }
  }
  return input.slice(start, end)
}

const matchSqlOperator = (input: string, start: number) => {
  return SQL_MULTI_CHAR_OPERATORS.find((operator) => input.startsWith(operator, start)) || ''
}

const tokenizeSql = (input: string): CodeToken[] => {
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

    if (char === '-' && next === '-') {
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

    const operator = matchSqlOperator(input, index)
    if (operator) {
      tokens.push({ type: 'operator', value: operator })
      index += operator.length
      continue
    }

    if (char === '#') {
      let end = index + 1
      while (end < input.length && input[end] !== '\n') end += 1
      tokens.push({ type: 'comment', value: input.slice(index, end) })
      index = end
      continue
    }

    if (char === '$') {
      const dollarQuoted = readSqlDollarQuotedValue(input, index)
      if (dollarQuoted) {
        tokens.push({ type: 'string', value: dollarQuoted })
        index += dollarQuoted.length
        continue
      }
      if (/\d/.test(next || '')) {
        let end = index + 2
        while (end < input.length && /\d/.test(input[end])) end += 1
        tokens.push({ type: 'word', value: input.slice(index, end) })
        index = end
        continue
      }
    }

    if (char === '\'' || char === '"' || char === '`') {
      const quoted = readSqlQuotedValue(input, index, char)
      tokens.push({ type: char === '\'' ? 'string' : 'word', value: quoted })
      index += quoted.length
      continue
    }

    if (char === '[') {
      const quoted = readSqlBracketIdentifier(input, index)
      tokens.push({ type: 'word', value: quoted })
      index += quoted.length
      continue
    }

    if ((char === ':' || char === '@') && /[A-Za-z_]/.test(next || '')) {
      let end = index + 2
      while (end < input.length && /[\w$]/.test(input[end])) end += 1
      tokens.push({ type: 'word', value: input.slice(index, end) })
      index = end
      continue
    }

    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1
      while (end < input.length && /[\w$#]/.test(input[end])) end += 1
      tokens.push({ type: 'word', value: input.slice(index, end) })
      index = end
      continue
    }

    if (/\d/.test(char)) {
      const number = readSqlNumber(input, index)
      tokens.push({ type: 'number', value: number })
      index += number.length
      continue
    }

    if ('()[],;.'.includes(char)) {
      tokens.push({ type: 'symbol', value: char })
      index += 1
      continue
    }

    tokens.push({ type: 'operator', value: char })
    index += 1
  }

  return tokens
}

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

const sqlKeywordCase = (settings: FormatterSettings) => {
  if (settings.sqlKeywordCase === 'lower') {
    return 'lower'
  }
  if (settings.sqlKeywordCase === 'preserve') {
    return 'preserve'
  }
  return 'upper'
}

const normalizeSqlLibraryOutput = (value: string) => {
  return normalizeSqlTableOptions(normalizeSqlTypeParameters(value))
    .replace(/\s+(->>|->|#>>|#>)\s+/g, '$1')
    .replace(/\bauto_increment\b/gi, 'AUTO_INCREMENT')
    .replace(/\bdefault\b/gi, 'DEFAULT')
    .replace(/\bcomment\b/gi, 'COMMENT')
    .replace(/\bengine\b/gi, 'ENGINE')
    .replace(/\bcharset\b/gi, 'CHARSET')
    .replace(/\bcollate\b/gi, 'COLLATE')
    .replace(/\brow_format\b/gi, 'ROW_FORMAT')
}

const formatSqlWithMatureLibrary = (input: string, settings: FormatterSettings): FormatPayload => {
  if (settings.mode === 'compact') {
    return {
      output: compactSql(tokenizeSql(input).filter((token) => token.type !== 'space'), settings)
    }
  }

  let output = ''
  try {
    output = normalizeSqlLibraryOutput(formatSqlWithLibrary(input, {
      language: 'mysql',
      tabWidth: settings.indentSize,
      keywordCase: sqlKeywordCase(settings),
      linesBetweenQueries: 1,
      paramTypes: {
        numbered: ['?', ':', '$'],
        named: [':', '@', '$']
      }
    }))
  } catch (error: any) {
    const fallback = formatSql(input, settings)
    return {
      ...fallback,
      warnings: [
        ...(fallback.warnings || []),
        `SQL 已使用兼容格式化；sql-formatter 解析提示：${error?.message || '解析失败'}`
      ]
    }
  }

  if (settings.mode === 'validate') {
    return {
      output: input,
      issues: [{ level: 'info', message: 'SQL 语法校验通过' }]
    }
  }

  return { output }
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

  const ddlOutput = formatSqlStatements(tokens, settings)
  if (ddlOutput) {
    return {
      output: ddlOutput
    }
  }

  return {
    output: formatSqlTokens(tokens, settings)
  }
}

const formatSqlTokens = (tokens: CodeToken[], settings: FormatterSettings) => {
  const lines: string[] = []
  let line = ''
  let indent = 0
  let parenDepth = 0
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

  const appendKeyword = (token: CodeToken) => {
    append(token, token.type === 'word' ? formatSqlKeyword(token.value, settings) : token.value)
  }

  const nextToken = (index: number) => tokens[index + 1]

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const upper = token.value.toUpperCase()

    if (token.type === 'comment') {
      pushLine(indent)
      append(token)
      pushLine(indent)
      continue
    }

    if (upper === 'AND' || upper === 'OR') {
      const logicalIndent = Math.max(1, indent)
      pushLine(logicalIndent)
      appendKeyword(token)
      continue
    }

    if ((upper === 'GROUP' || upper === 'ORDER') && nextToken(index)?.value.toUpperCase() === 'BY') {
      pushLine(0)
      indent = 0
      appendKeyword(token)
      appendKeyword(nextToken(index)!)
      pushLine(1)
      index += 1
      continue
    }

    if (upper === 'UNION' && nextToken(index)?.value.toUpperCase() === 'ALL') {
      pushLine(0)
      indent = 0
      appendKeyword(token)
      appendKeyword(nextToken(index)!)
      pushLine(0)
      index += 1
      continue
    }

    if (SQL_JOIN_MODIFIERS.has(upper) && nextToken(index)?.value.toUpperCase() === 'JOIN') {
      pushLine(0)
      indent = 0
      appendKeyword(token)
      appendKeyword(nextToken(index)!)
      index += 1
      continue
    }

    if (token.type === 'word' && SQL_CLAUSE_KEYWORDS.has(upper)) {
      pushLine(0)
      indent = 0
      appendKeyword(token)
      if (upper === 'SELECT' || upper === 'WHERE' || upper === 'SET' || upper === 'VALUES' || upper === 'RETURNING') {
        pushLine(1)
      }
      continue
    }

    if (token.value === ',') {
      append(token)
      if (parenDepth === 0) {
        pushLine(Math.max(1, indent))
      }
      continue
    }

    if (token.value === ';') {
      append(token)
      pushLine(0)
      continue
    }

    if (token.value === '(') {
      append(token)
      parenDepth += 1
      continue
    }

    if (token.value === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
      append(token)
      continue
    }

    appendKeyword(token)
  }

  pushLine(0)

  return lines.join('\n')
}

interface SqlStatement {
  tokens: CodeToken[]
  hasSemicolon: boolean
}

const splitSqlStatements = (tokens: CodeToken[]): SqlStatement[] => {
  const statements: SqlStatement[] = []
  let current: CodeToken[] = []
  let depth = 0

  tokens.forEach((token) => {
    if (token.value === '(') {
      depth += 1
    } else if (token.value === ')') {
      depth = Math.max(0, depth - 1)
    }

    if (token.value === ';' && depth === 0) {
      statements.push({ tokens: current, hasSemicolon: true })
      current = []
      return
    }

    current.push(token)
  })

  if (current.length) {
    statements.push({ tokens: current, hasSemicolon: false })
  }

  return statements.filter((statement) => statement.tokens.length)
}

const isCreateTableStatement = (tokens: CodeToken[]) => {
  const words = tokens
    .filter((token) => token.type === 'word')
    .slice(0, 6)
    .map((token) => token.value.toUpperCase().replace(/[`"]/g, ''))
  return words[0] === 'CREATE' && words.includes('TABLE')
}

const getSqlWord = (token: CodeToken | undefined) => {
  if (!token || token.type !== 'word') {
    return ''
  }
  return token.value.toUpperCase().replace(/[`"]/g, '')
}

const findTopLevelSqlWord = (tokens: CodeToken[], word: string, startIndex = 0) => {
  let depth = 0
  for (let index = startIndex; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.value === '(') {
      depth += 1
      continue
    }
    if (token.value === ')') {
      depth = Math.max(0, depth - 1)
      continue
    }
    if (depth === 0 && getSqlWord(token) === word) {
      return index
    }
  }
  return -1
}

const isInsertSelectStatement = (tokens: CodeToken[]) => {
  return getSqlWord(tokens.find((token) => token.type === 'word')) === 'INSERT'
    && findTopLevelSqlWord(tokens, 'SELECT') >= 0
}

const findMatchingSqlParen = (tokens: CodeToken[], openIndex: number) => {
  let depth = 0
  for (let index = openIndex; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.value === '(') {
      depth += 1
    } else if (token.value === ')') {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }
  return -1
}

const splitSqlDefinitionItems = (tokens: CodeToken[]) => {
  const items: CodeToken[][] = []
  let current: CodeToken[] = []
  let depth = 0

  tokens.forEach((token) => {
    if (token.value === '(') {
      depth += 1
      current.push(token)
      return
    }

    if (token.value === ')') {
      depth = Math.max(0, depth - 1)
      current.push(token)
      return
    }

    if (token.value === ',' && depth === 0) {
      if (current.length) {
        items.push(current)
      }
      current = []
      return
    }

    current.push(token)
  })

  if (current.length) {
    items.push(current)
  }

  return items
}

const splitSqlTopLevelItems = splitSqlDefinitionItems

const normalizeSqlTypeParameters = (value: string) => {
  return value.replace(
    /\b(decimal|numeric|number|varchar|nvarchar|char|nchar|bigint|int|integer|tinyint|smallint|mediumint|datetime|timestamp|time|double|float)\(([^)]*)\)/gi,
    (match, typeName: string, body: string) => `${typeName}(${body.replace(/\s*,\s*/g, ',')})`
  )
}

const normalizeSqlIndexDefinition = (value: string) => {
  return value
    .replace(/\b(KEY|INDEX)\s+((?:`[^`]+`|"[^"]+"|\[[^\]]+\]|[A-Za-z_]\w*))\(/gi, '$1 $2 (')
    .replace(/\b(UNIQUE KEY|UNIQUE INDEX)\s+((?:`[^`]+`|"[^"]+"|\[[^\]]+\]|[A-Za-z_]\w*))\(/gi, '$1 $2 (')
}

const normalizeSqlTableOptions = (value: string) => {
  return value
    .replace(/\b(ENGINE|CHARSET|COLLATE|ROW_FORMAT|COMMENT|AUTO_INCREMENT)\s*=\s*/gi, '$1=')
    .replace(/\bDEFAULT\s+CHARSET=/gi, 'DEFAULT CHARSET=')
}

const formatSqlInline = (tokens: CodeToken[], settings: FormatterSettings) => {
  return compactSql(tokens, settings)
}

const formatSqlDefinitionItem = (tokens: CodeToken[], settings: FormatterSettings) => {
  return normalizeSqlIndexDefinition(normalizeSqlTypeParameters(formatSqlInline(tokens, settings)))
}

const hasSqlSubquery = (tokens: CodeToken[]) => tokens.some((token) => getSqlWord(token) === 'SELECT')

const isWrappedSqlSubquery = (tokens: CodeToken[]) => {
  return tokens[0]?.value === '('
    && findMatchingSqlParen(tokens, 0) === tokens.length - 1
    && getSqlWord(tokens.find((token, index) => index > 0 && token.type === 'word')) === 'SELECT'
}

const isShortSqlLiteralItem = (tokens: CodeToken[]) => {
  if (tokens.length !== 1) {
    return false
  }
  const [token] = tokens
  if (token.type === 'number' || token.type === 'string') {
    return token.value.length <= 12
  }
  return ['NULL', 'TRUE', 'FALSE'].includes(getSqlWord(token))
}

const formatSqlExpressionLines = (
  tokens: CodeToken[],
  settings: FormatterSettings,
  indentLevel: number
): string[] => {
  if (!tokens.length) {
    return []
  }

  if (isWrappedSqlSubquery(tokens)) {
    return [
      `${makeIndent(indentLevel, settings)}(`,
      ...formatSelectStatement(tokens.slice(1, -1), settings, indentLevel + 1),
      `${makeIndent(indentLevel, settings)})`
    ]
  }

  if (
    tokens[0]?.type === 'word'
    && tokens[1]?.value === '('
    && findMatchingSqlParen(tokens, 1) === tokens.length - 1
    && hasSqlSubquery(tokens)
  ) {
    const openIndex = 1
    const closeIndex = tokens.length - 1
    const functionName = formatSqlInline(tokens.slice(0, openIndex), settings)
    const args = splitSqlTopLevelItems(tokens.slice(openIndex + 1, closeIndex))
    const lines = [`${makeIndent(indentLevel, settings)}${functionName}(`]
    args.forEach((arg, index) => {
      const argLines = formatSqlExpressionLines(arg, settings, indentLevel + 1)
      if (index < args.length - 1 && argLines.length) {
        argLines[argLines.length - 1] += ','
      }
      lines.push(...argLines)
    })
    lines.push(`${makeIndent(indentLevel, settings)})`)
    return lines
  }

  return [`${makeIndent(indentLevel, settings)}${formatSqlInline(tokens, settings)}`]
}

const formatCreateTableStatement = (tokens: CodeToken[], settings: FormatterSettings) => {
  const openIndex = tokens.findIndex((token) => token.value === '(')
  if (openIndex < 0) {
    return null
  }

  const closeIndex = findMatchingSqlParen(tokens, openIndex)
  if (closeIndex < 0) {
    return null
  }

  const header = formatSqlInline(tokens.slice(0, openIndex), settings)
  const definitionItems = splitSqlDefinitionItems(tokens.slice(openIndex + 1, closeIndex))
  const optionText = normalizeSqlTableOptions(formatSqlInline(tokens.slice(closeIndex + 1), settings))
  const lines = [`${header} (`]

  definitionItems.forEach((item, index) => {
    const suffix = index < definitionItems.length - 1 ? ',' : ''
    lines.push(`${makeIndent(1, settings)}${formatSqlDefinitionItem(item, settings)}${suffix}`)
  })

  lines.push(`)${optionText ? ` ${optionText}` : ''}`)
  return lines.join('\n')
}

interface SqlClauseBoundary {
  type: 'FROM' | 'WHERE' | 'GROUP BY' | 'ORDER BY' | 'HAVING' | 'LIMIT' | 'OFFSET' | 'FETCH'
  index: number
  headerLength: number
}

const findSelectClauseBoundaries = (tokens: CodeToken[]) => {
  const boundaries: SqlClauseBoundary[] = []
  let depth = 0

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.value === '(') {
      depth += 1
      continue
    }
    if (token.value === ')') {
      depth = Math.max(0, depth - 1)
      continue
    }
    if (depth !== 0) {
      continue
    }

    const word = getSqlWord(token)
    const nextWord = getSqlWord(tokens[index + 1])
    if ((word === 'GROUP' || word === 'ORDER') && nextWord === 'BY') {
      boundaries.push({ type: `${word} BY` as 'GROUP BY' | 'ORDER BY', index, headerLength: 2 })
      index += 1
      continue
    }
    if (['FROM', 'WHERE', 'HAVING', 'LIMIT', 'OFFSET', 'FETCH'].includes(word)) {
      boundaries.push({ type: word as SqlClauseBoundary['type'], index, headerLength: 1 })
    }
  }

  return boundaries
}

const appendSqlSelectItems = (
  lines: string[],
  items: CodeToken[][],
  settings: FormatterSettings,
  indentLevel: number
) => {
  for (let index = 0; index < items.length; index += 1) {
    const literalGroup: CodeToken[][] = []
    while (index < items.length && isShortSqlLiteralItem(items[index])) {
      literalGroup.push(items[index])
      index += 1
    }

    if (literalGroup.length > 1) {
      const isLastGroup = index >= items.length
      lines.push(`${makeIndent(indentLevel, settings)}${literalGroup.map((item) => formatSqlInline(item, settings)).join(', ')}${isLastGroup ? '' : ','}`)
      index -= 1
      continue
    }

    if (literalGroup.length === 1) {
      index -= 1
    }

    const itemLines = formatSqlExpressionLines(items[index], settings, indentLevel)
    if (index < items.length - 1 && itemLines.length) {
      itemLines[itemLines.length - 1] += ','
    }
    lines.push(...itemLines)
  }
}

const splitSqlLogicalConditions = (tokens: CodeToken[]) => {
  const conditions: CodeToken[][] = []
  let current: CodeToken[] = []
  let depth = 0

  tokens.forEach((token) => {
    if (token.value === '(') {
      depth += 1
      current.push(token)
      return
    }
    if (token.value === ')') {
      depth = Math.max(0, depth - 1)
      current.push(token)
      return
    }
    if (depth === 0 && (getSqlWord(token) === 'AND' || getSqlWord(token) === 'OR')) {
      if (current.length) {
        conditions.push(current)
      }
      current = [token]
      return
    }
    current.push(token)
  })

  if (current.length) {
    conditions.push(current)
  }

  return conditions
}

const formatSqlConditionClause = (
  lines: string[],
  clauseType: 'WHERE' | 'HAVING',
  tokens: CodeToken[],
  settings: FormatterSettings,
  indentLevel: number
) => {
  const conditions = splitSqlLogicalConditions(tokens)
  if (!conditions.length) {
    lines.push(`${makeIndent(indentLevel, settings)}${clauseType}`)
    return
  }

  lines.push(`${makeIndent(indentLevel, settings)}${clauseType} ${formatSqlInline(conditions[0], settings)}`)
  conditions.slice(1).forEach((condition) => {
    lines.push(`${makeIndent(indentLevel + 1, settings)}${formatSqlInline(condition, settings)}`)
  })
}

const formatSqlListClause = (
  lines: string[],
  clauseType: 'GROUP BY' | 'ORDER BY',
  tokens: CodeToken[],
  settings: FormatterSettings,
  indentLevel: number
) => {
  const items = splitSqlTopLevelItems(tokens)
  if (items.length <= 1) {
    lines.push(`${makeIndent(indentLevel, settings)}${clauseType}${items[0] ? ` ${formatSqlInline(items[0], settings)}` : ''}`)
    return
  }

  lines.push(`${makeIndent(indentLevel, settings)}${clauseType}`)
  items.forEach((item, index) => {
    lines.push(`${makeIndent(indentLevel + 1, settings)}${formatSqlInline(item, settings)}${index < items.length - 1 ? ',' : ''}`)
  })
}

const formatSelectStatement = (
  tokens: CodeToken[],
  settings: FormatterSettings,
  indentLevel = 0
): string[] => {
  const boundaries = findSelectClauseBoundaries(tokens)
  const selectListEnd = boundaries[0]?.index ?? tokens.length
  const selectItems = splitSqlTopLevelItems(tokens.slice(1, selectListEnd))
  const lines: string[] = []

  if (selectItems.length === 1) {
    const itemLines = formatSqlExpressionLines(selectItems[0], settings, indentLevel)
    if (itemLines.length === 1) {
      lines.push(`${makeIndent(indentLevel, settings)}SELECT ${itemLines[0].trim()}`)
    } else {
      lines.push(`${makeIndent(indentLevel, settings)}SELECT`)
      lines.push(...itemLines.map((line) => `${makeIndent(1, settings)}${line}`))
    }
  } else {
    lines.push(`${makeIndent(indentLevel, settings)}SELECT`)
    appendSqlSelectItems(lines, selectItems, settings, indentLevel + 1)
  }

  boundaries.forEach((boundary, index) => {
    const clauseStart = boundary.index + boundary.headerLength
    const clauseEnd = boundaries[index + 1]?.index ?? tokens.length
    const clauseTokens = tokens.slice(clauseStart, clauseEnd)

    if (boundary.type === 'WHERE' || boundary.type === 'HAVING') {
      formatSqlConditionClause(lines, boundary.type, clauseTokens, settings, indentLevel)
      return
    }

    if (boundary.type === 'GROUP BY' || boundary.type === 'ORDER BY') {
      formatSqlListClause(lines, boundary.type, clauseTokens, settings, indentLevel)
      return
    }

    lines.push(`${makeIndent(indentLevel, settings)}${boundary.type}${clauseTokens.length ? ` ${formatSqlInline(clauseTokens, settings)}` : ''}`)
  })

  return lines
}

const formatInsertColumnList = (tokens: CodeToken[], settings: FormatterSettings) => {
  const openIndex = tokens.findIndex((token) => token.value === '(')
  if (openIndex < 0) {
    return [formatSqlInline(tokens, settings)]
  }

  const closeIndex = findMatchingSqlParen(tokens, openIndex)
  if (closeIndex < 0) {
    return [formatSqlInline(tokens, settings)]
  }

  const header = formatSqlInline(tokens.slice(0, openIndex), settings)
  const columns = splitSqlTopLevelItems(tokens.slice(openIndex + 1, closeIndex))
  const trailing = formatSqlInline(tokens.slice(closeIndex + 1), settings)
  const lines = [`${header} (`]
  columns.forEach((column, index) => {
    lines.push(`${makeIndent(1, settings)}${formatSqlInline(column, settings)}${index < columns.length - 1 ? ',' : ''}`)
  })
  lines.push(`)${trailing ? ` ${trailing}` : ''}`)
  return lines
}

const formatInsertSelectStatement = (tokens: CodeToken[], settings: FormatterSettings) => {
  const selectIndex = findTopLevelSqlWord(tokens, 'SELECT')
  if (selectIndex < 0) {
    return null
  }

  return [
    ...formatInsertColumnList(tokens.slice(0, selectIndex), settings),
    ...formatSelectStatement(tokens.slice(selectIndex), settings)
  ].join('\n')
}

const formatSqlStatements = (tokens: CodeToken[], settings: FormatterSettings) => {
  const statements = splitSqlStatements(tokens)
  const containsSpecialStatement = statements.some((statement) => (
    isCreateTableStatement(statement.tokens) || isInsertSelectStatement(statement.tokens)
  ))
  if (!containsSpecialStatement) {
    return null
  }

  return statements
    .map((statement) => {
      const createTableOutput = isCreateTableStatement(statement.tokens)
        ? formatCreateTableStatement(statement.tokens, settings)
        : null
      const insertSelectOutput = !createTableOutput && isInsertSelectStatement(statement.tokens)
        ? formatInsertSelectStatement(statement.tokens, settings)
        : null
      const output = createTableOutput ?? insertSelectOutput ?? formatSqlTokens(statement.tokens, settings)
      return `${output}${statement.hasSemicolon ? ';' : ''}`
    })
    .join('\n\n')
}

const isSqlFunctionCall = (left: CodeToken | undefined) => {
  if (!left || left.type !== 'word') {
    return false
  }
  const upper = left.value.toUpperCase()
  return !SQL_KEYWORDS.has(upper) || SQL_FUNCTION_LIKE_KEYWORDS.has(upper)
}

const tokenNeedsSqlSpace = (left: CodeToken | undefined, right: CodeToken) => {
  if (!left) {
    return false
  }
  if (right.type === 'comment') {
    return true
  }
  if (['(', '.', '['].includes(left.value)) {
    return false
  }
  if (SQL_TIGHT_OPERATORS.has(left.value) || SQL_TIGHT_OPERATORS.has(right.value)) {
    return false
  }
  if ([')', ']', ',', ';', '.'].includes(right.value)) {
    return false
  }
  if (right.value === '(') {
    return !isSqlFunctionCall(left)
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
  try {
    getProperties(input)
  } catch (error: any) {
    throw {
      message: error?.message || 'Properties 解析失败'
    }
  }

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

export const formatText = async (
  input: string,
  settings: FormatterSettings,
  fileName?: string
): Promise<FormatterResult> => {
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
        payload = formatXmlWithLibrary(preparedInput, settings)
        break
      case 'html':
        payload = await formatWithPrettier(preparedInput, settings, 'html')
        break
      case 'sql':
        payload = formatSqlWithMatureLibrary(preparedInput, settings)
        break
      case 'properties':
        payload = formatProperties(preparedInput, settings)
        break
      case 'yaml':
        payload = await formatWithPrettier(preparedInput, settings, 'yaml')
        break
      case 'css':
        payload = await formatWithPrettier(preparedInput, settings, 'css')
        break
      case 'javascript':
        payload = await formatWithPrettier(preparedInput, settings, 'javascript')
        break
      case 'markdown':
        payload = await formatWithPrettier(preparedInput, settings, 'markdown')
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
    jsonStringInfo: payload.jsonStringInfo,
    durationMs: Math.round(performance.now() - startedAt),
    formattedAt: new Date().toISOString()
  }
}
