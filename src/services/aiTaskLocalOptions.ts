const OPTION_LIMIT = 20

const STORAGE_KEYS = {
  project: 'iw.aiSession.projectNames.v1',
  workspace: 'iw.aiSession.workspacePaths.v1',
  modelProvider: 'iw.aiSession.modelProviders.v1'
} as const

export type AiTaskLocalOptionType = keyof typeof STORAGE_KEYS

const readOptions = (type: AiTaskLocalOptionType) => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEYS[type])
    const values = rawValue ? JSON.parse(rawValue) : []
    if (!Array.isArray(values)) {
      return []
    }
    return values
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      .map((value) => value.trim())
      .slice(0, OPTION_LIMIT)
  } catch {
    return []
  }
}

const writeOptions = (type: AiTaskLocalOptionType, values: string[]) => {
  window.localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(values.slice(0, OPTION_LIMIT)))
}

export const getAiTaskLocalOptions = (type: AiTaskLocalOptionType) => readOptions(type)

export const rememberAiTaskLocalOption = (type: AiTaskLocalOptionType, value: string) => {
  const normalized = value.trim()
  if (!normalized) {
    return readOptions(type)
  }
  const nextValues = [
    normalized,
    ...readOptions(type).filter((item) => item !== normalized)
  ].slice(0, OPTION_LIMIT)
  writeOptions(type, nextValues)
  return nextValues
}

export const removeAiTaskLocalOption = (type: AiTaskLocalOptionType, value: string) => {
  const nextValues = readOptions(type).filter((item) => item !== value)
  writeOptions(type, nextValues)
  return nextValues
}
