import type {
  FormatterConversionResult,
  FormatterConversionTarget,
  FormatterSettings,
  ResolvedFormatterLanguage
} from '../../types/formatter'
import { parsePropertiesLines } from './formatters'

type StructuredValue = string | number | boolean | null | StructuredValue[] | { [key: string]: StructuredValue }

const parseScalar = (value: string): StructuredValue => {
  const trimmed = value.trim()
  if (trimmed === '') return ''
  if (trimmed === 'null' || trimmed === '~') return null
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed)
  return trimmed.replace(/^['"]|['"]$/g, '')
}

const parsePropertiesObject = (input: string) => {
  const result: Record<string, StructuredValue> = {}
  parsePropertiesLines(input).forEach((line) => {
    if (line.type === 'property' && line.key) {
      result[line.key] = parseScalar(line.value || '')
    }
  })
  return result
}

const parseSimpleYamlObject = (input: string) => {
  const root: Record<string, StructuredValue> = {}
  const stack: Array<{ indent: number; value: Record<string, StructuredValue> }> = [{ indent: -1, value: root }]

  input.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('- ')) {
      return
    }
    const match = line.match(/^(\s*)([^:]+):\s*(.*)$/)
    if (!match) {
      return
    }
    const indent = match[1].length
    const key = match[2].trim().replace(/^['"]|['"]$/g, '')
    const rawValue = match[3]

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop()
    }

    const parent = stack[stack.length - 1].value
    if (rawValue.trim() === '') {
      const child: Record<string, StructuredValue> = {}
      parent[key] = child
      stack.push({ indent, value: child })
      return
    }
    parent[key] = parseScalar(rawValue)
  })

  return root
}

const flattenObject = (value: StructuredValue, prefix = '', output: Record<string, StructuredValue> = {}) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenObject(item, prefix ? `${prefix}.${index}` : String(index), output))
    return output
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      flattenObject(child, prefix ? `${prefix}.${key}` : key, output)
    })
    return output
  }
  output[prefix] = value
  return output
}

const toProperties = (value: StructuredValue, settings: FormatterSettings) => {
  const flattened = flattenObject(value)
  const entries = Object.entries(flattened)
  if (settings.sortKeys) {
    entries.sort(([left], [right]) => left.localeCompare(right))
  }
  return entries.map(([key, item]) => `${key} = ${item ?? ''}`).join('\n')
}

const toYaml = (value: StructuredValue, settings: FormatterSettings, level = 0): string => {
  const indent = ' '.repeat(level * settings.indentSize)
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === 'object') {
        return `${indent}-\n${toYaml(item, settings, level + 1)}`
      }
      return `${indent}- ${String(item ?? 'null')}`
    }).join('\n')
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
    if (settings.sortKeys) {
      entries.sort(([left], [right]) => left.localeCompare(right))
    }
    return entries.map(([key, item]) => {
      if (item && typeof item === 'object') {
        return `${indent}${key}:\n${toYaml(item, settings, level + 1)}`
      }
      return `${indent}${key}: ${String(item ?? 'null')}`
    }).join('\n')
  }

  return `${indent}${String(value ?? 'null')}`
}

const parseStructuredValue = (input: string, language: ResolvedFormatterLanguage): StructuredValue => {
  if (language === 'json') {
    return JSON.parse(input)
  }
  if (language === 'properties') {
    return parsePropertiesObject(input)
  }
  if (language === 'yaml') {
    return parseSimpleYamlObject(input)
  }
  throw new Error('当前仅支持 JSON、Properties、YAML 之间转换')
}

export const convertFormatterText = (
  input: string,
  sourceLanguage: ResolvedFormatterLanguage,
  targetLanguage: FormatterConversionTarget,
  settings: FormatterSettings
): FormatterConversionResult => {
  const value = parseStructuredValue(input, sourceLanguage)
  let output = ''

  if (targetLanguage === 'json') {
    output = JSON.stringify(value, null, settings.indentSize)
  } else if (targetLanguage === 'properties') {
    output = toProperties(value, settings)
  } else {
    output = toYaml(value, settings)
  }

  return {
    sourceLanguage,
    targetLanguage,
    output,
    warnings: sourceLanguage === 'yaml'
      ? ['YAML 转换使用轻量解析，复杂数组、锚点和多行字符串建议人工复核']
      : []
  }
}
