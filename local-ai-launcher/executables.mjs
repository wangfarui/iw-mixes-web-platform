import { constants as fsConstants } from 'node:fs'
import { access } from 'node:fs/promises'
import path from 'node:path'

const TOOL_EXECUTABLES = {
  codex: 'codex',
  claude: 'claude',
  gemini: 'gemini'
}

const COMMON_BIN_DIRS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin'
]

const isExecutable = async (filePath) => {
  if (!filePath) {
    return false
  }
  try {
    await access(filePath, fsConstants.X_OK)
    return true
  } catch {
    return false
  }
}

export const findToolExecutable = async (toolType, configuredPath = '') => {
  const executableName = TOOL_EXECUTABLES[toolType]
  if (!executableName) {
    return ''
  }
  if (await isExecutable(configuredPath)) {
    return configuredPath
  }

  const pathDirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  const candidateDirs = [...new Set([...pathDirs, ...COMMON_BIN_DIRS])]
  for (const binDir of candidateDirs) {
    const candidate = path.join(binDir, executableName)
    if (await isExecutable(candidate)) {
      return candidate
    }
  }
  return ''
}

export const discoverToolExecutables = async (configured = {}) => {
  const result = {}
  for (const toolType of Object.keys(TOOL_EXECUTABLES)) {
    result[toolType] = await findToolExecutable(toolType, configured[toolType])
  }
  return result
}
