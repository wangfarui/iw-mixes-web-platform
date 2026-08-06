import { realpath, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { findToolExecutable } from './executables.mjs'

const TOOL_TYPE_ALIASES = {
  codex: 'codex',
  '1': 'codex',
  claude: 'claude',
  'claude code': 'claude',
  '2': 'claude',
  gemini: 'gemini',
  'gemini cli': 'gemini',
  '3': 'gemini'
}

const CONTROL_CHAR_PATTERN = /[\0\r\n]/
const CODEX_DISABLE_TERMINAL_TITLE = 'tui.terminal_title=[]'

const normalizeText = (value, fieldName, maxLength, required = true) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (required && !normalized) {
    throw Object.assign(new Error(`${fieldName}不能为空`), { code: 'INVALID_ARGUMENT' })
  }
  if (normalized.length > maxLength || CONTROL_CHAR_PATTERN.test(normalized)) {
    throw Object.assign(new Error(`${fieldName}格式不正确`), { code: 'INVALID_ARGUMENT' })
  }
  return normalized
}

const normalizeWorkspacePath = (workspacePath) => {
  const normalized = normalizeText(workspacePath, '工作区', 1024)
  if (normalized === '~') {
    return os.homedir()
  }
  if (normalized.startsWith('~/')) {
    return path.join(os.homedir(), normalized.slice(2))
  }
  if (!path.isAbsolute(normalized)) {
    throw Object.assign(new Error('工作区必须使用绝对路径'), { code: 'INVALID_WORKSPACE' })
  }
  return normalized
}

const normalizeToolType = (toolType) => {
  const normalized = String(toolType ?? '').trim().toLowerCase()
  const tool = TOOL_TYPE_ALIASES[normalized]
  if (!tool) {
    throw Object.assign(new Error('不支持当前 CLI 工具'), { code: 'UNSUPPORTED_TOOL' })
  }
  return tool
}

const buildToolArgs = ({ tool, sessionKey, modelProvider }) => {
  if (tool === 'claude') {
    return ['--resume', sessionKey]
  }
  if (tool === 'gemini') {
    return ['session', 'resume', sessionKey]
  }
  const args = ['resume', sessionKey]
  if (modelProvider) {
    args.push('-c', `model_provider=${modelProvider}`)
  }
  args.push('-c', CODEX_DISABLE_TERMINAL_TITLE)
  return args
}

export const createSessionLauncher = ({
  terminalAdapter,
  configuredExecutables = {},
  resolveExecutable = findToolExecutable,
  resolveRealPath = realpath,
  readStat = stat
}) => {
  if (!terminalAdapter?.open) {
    throw new Error('缺少终端 adapter')
  }

  return {
    async launch(request) {
      const tool = normalizeToolType(request?.toolType)
      const sessionKey = normalizeText(request?.sessionKey, 'Session', 128)
      const sessionName = normalizeText(request?.sessionName, '会话名称', 80, false)
      const modelProvider = normalizeText(request?.modelProvider, '模型提供方', 64, false)
      const inputWorkspacePath = normalizeWorkspacePath(request?.workspacePath)

      let workspacePath
      try {
        workspacePath = await resolveRealPath(inputWorkspacePath)
        const workspaceStat = await readStat(workspacePath)
        if (!workspaceStat.isDirectory()) {
          throw new Error('not a directory')
        }
      } catch {
        throw Object.assign(new Error('工作区不存在或不是目录'), { code: 'INVALID_WORKSPACE' })
      }

      const executable = await resolveExecutable(tool, configuredExecutables[tool])
      if (!executable) {
        throw Object.assign(new Error(`本机未检测到 ${tool} CLI`), { code: 'CLI_NOT_FOUND' })
      }

      const args = buildToolArgs({
        tool,
        sessionKey,
        modelProvider: tool === 'codex' ? modelProvider : ''
      })
      const result = await terminalAdapter.open({
        executable,
        args,
        workspacePath,
        sessionName
      })
      return {
        toolType: tool,
        ...result
      }
    }
  }
}
