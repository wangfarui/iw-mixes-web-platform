import type { JsonStringHandling } from '../../types/formatter'
import { JSON_STRING_NORMALIZATION_LIMITS } from './config'

interface JsonStringNormalizationOptions {
  mode: JsonStringHandling
}

export interface ParsedJsonInput {
  value: unknown
  recoveredEscapedContainer: boolean
}

export interface JsonStringTransformation {
  path: string
  layers: number
}

export interface JsonStringNormalizationResult {
  value: unknown
  candidatePaths: string[]
  transformations: JsonStringTransformation[]
  limitReached: boolean
}

interface NormalizationState {
  candidatePaths: string[]
  transformations: JsonStringTransformation[]
  decodedCharacters: number
  limitReached: boolean
}

interface DecodedContainer {
  value: Record<string, unknown> | unknown[]
  layers: number
}

const isJsonContainer = (value: unknown): value is Record<string, unknown> | unknown[] => {
  return Boolean(value) && typeof value === 'object'
}

const tryParseEscapedJsonContainer = (source: string): Record<string, unknown> | unknown[] | null => {
  const trimmed = source.trim()
  const hasContainerEnvelope = (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  if (!hasContainerEnvelope || !trimmed.includes('\\"')) {
    return null
  }

  try {
    const decoded = JSON.parse(`"${trimmed}"`)
    if (typeof decoded !== 'string') {
      return null
    }
    const parsed = JSON.parse(decoded)
    return isJsonContainer(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const parseJsonInput = (source: string): ParsedJsonInput => {
  try {
    return {
      value: JSON.parse(source),
      recoveredEscapedContainer: false
    }
  } catch (directError) {
    const recovered = tryParseEscapedJsonContainer(source)
    if (!recovered) {
      throw directError
    }
    return {
      value: recovered,
      recoveredEscapedContainer: true
    }
  }
}

const canStartEncodedJson = (value: string) => {
  const firstCharacter = value[0]
  return firstCharacter === '{' || firstCharacter === '[' || firstCharacter === '"'
}

const decodeJsonContainerString = (
  source: string,
  state: NormalizationState
): DecodedContainer | null => {
  let current = source.trim()

  for (let layers = 1; layers <= JSON_STRING_NORMALIZATION_LIMITS.maxDecodeLayers; layers += 1) {
    if (!current || !canStartEncodedJson(current)) {
      return null
    }

    if (state.decodedCharacters + current.length > JSON_STRING_NORMALIZATION_LIMITS.maxDecodedCharacters) {
      state.limitReached = true
      return null
    }
    state.decodedCharacters += current.length

    let parsed: unknown
    try {
      parsed = JSON.parse(current)
    } catch {
      return null
    }

    if (isJsonContainer(parsed)) {
      return { value: parsed, layers }
    }
    if (typeof parsed !== 'string') {
      return null
    }
    current = parsed.trim()
  }

  state.limitReached = true
  return null
}

const appendObjectPath = (path: string, key: string) => {
  return /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`
}

export const normalizeJsonStrings = (
  value: unknown,
  options: JsonStringNormalizationOptions
): JsonStringNormalizationResult => {
  const state: NormalizationState = {
    candidatePaths: [],
    transformations: [],
    decodedCharacters: 0,
    limitReached: false
  }

  const visit = (current: unknown, path: string, depth: number, isRoot: boolean): unknown => {
    if (depth > JSON_STRING_NORMALIZATION_LIMITS.maxTraversalDepth) {
      state.limitReached = true
      return current
    }

    if (typeof current === 'string') {
      if (state.candidatePaths.length >= JSON_STRING_NORMALIZATION_LIMITS.maxCandidates) {
        state.limitReached = true
        return current
      }

      const decoded = decodeJsonContainerString(current, state)
      if (!decoded) {
        return current
      }

      state.candidatePaths.push(path)
      const shouldExpand = options.mode === 'recursive' || (options.mode === 'outer' && isRoot)
      if (!shouldExpand) {
        return current
      }

      state.transformations.push({ path, layers: decoded.layers })
      return visit(decoded.value, path, depth + 1, false)
    }

    if (Array.isArray(current)) {
      return current.map((item, index) => visit(item, `${path}[${index}]`, depth + 1, false))
    }

    if (isJsonContainer(current)) {
      return Object.fromEntries(
        Object.entries(current).map(([key, item]) => [
          key,
          visit(item, appendObjectPath(path, key), depth + 1, false)
        ])
      )
    }

    return current
  }

  return {
    value: visit(value, '$', 0, true),
    candidatePaths: state.candidatePaths,
    transformations: state.transformations,
    limitReached: state.limitReached
  }
}
