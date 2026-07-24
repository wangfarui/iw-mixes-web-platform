import { createReadStream } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'

const SESSION_ID_PATTERN = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const CODEX_COMMAND_PATTERN = new RegExp(
  `^codex\\s+resume\\s+(?:"(${SESSION_ID_PATTERN})"|'(${SESSION_ID_PATTERN})'|(${SESSION_ID_PATTERN}))(?:\\s+-c\\s+model_provider=(?:"([^"\\r\\n]{1,64})"|'([^'\\r\\n]{1,64})'|([^\\s\\r\\n]{1,64})))?$`,
  'i'
)
const CONTROL_CHAR_PATTERN = /[\0\r\n]/

const createInspectorError = (message, code) => Object.assign(new Error(message), { code })

const clampText = (text, maxLength) => {
  const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength - 3)}...`
}

const extractTextContent = (content) => {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => typeof item?.text === 'string' ? item.text : '')
      .filter(Boolean)
      .join(' ')
  }
  if (content && typeof content === 'object' && typeof content.text === 'string') {
    return content.text
  }
  return ''
}

const recordMessageText = (target, text) => {
  const normalized = clampText(text, 255)
  if (!normalized) {
    return
  }
  if (!target.firstText) {
    target.firstText = normalized
  }
  target.lastText = normalized
  target.recentTexts.push(normalized)
  if (target.recentTexts.length > 20) {
    target.recentTexts.shift()
  }
}

const buildLocalDescription = (firstUserMessage, lastUserMessage) => {
  if (!firstUserMessage) {
    return lastUserMessage
  }
  if (!lastUserMessage || lastUserMessage === firstUserMessage) {
    return firstUserMessage
  }
  return clampText(`${firstUserMessage}；补充：${lastUserMessage}`, 255)
}

export const parseResumeCommand = (resumeCommand) => {
  const normalized = typeof resumeCommand === 'string' ? resumeCommand.trim() : ''
  if (!normalized || normalized.length > 512 || CONTROL_CHAR_PATTERN.test(normalized)) {
    throw createInspectorError('继续命令格式不正确', 'INVALID_COMMAND')
  }
  const fullScriptMatch = normalized.match(/^cd\s+--\s+.+?\s+&&\s+(codex\s+resume\s+.+)$/i)
  const codexCommand = fullScriptMatch?.[1] || normalized
  if (!codexCommand.toLowerCase().startsWith('codex ')) {
    throw createInspectorError('当前仅支持识别 Codex resume 命令', 'UNSUPPORTED_TOOL')
  }

  const match = codexCommand.match(CODEX_COMMAND_PATTERN)
  if (!match) {
    throw createInspectorError(
      '命令格式应为 codex resume <session-id>，可选追加 -c model_provider=<provider>',
      'INVALID_COMMAND'
    )
  }

  return {
    toolType: 'codex',
    sessionKey: (match[1] || match[2] || match[3]).toLowerCase(),
    modelProvider: (match[4] || match[5] || match[6] || '').trim(),
    resumeCommand: normalized
  }
}

const readSessionIndexEntry = async (indexPath, sessionKey) => {
  try {
    const rawText = await readFile(indexPath, 'utf8')
    for (const line of rawText.split('\n')) {
      if (!line.trim()) {
        continue
      }
      try {
        const entry = JSON.parse(line)
        if (String(entry?.id || '').toLowerCase() === sessionKey) {
          return entry
        }
      } catch {
        continue
      }
    }
  } catch {
    return null
  }
  return null
}

const findSessionFile = async (rootDir, sessionKey) => {
  let entries
  try {
    entries = await readdir(rootDir, { withFileTypes: true })
  } catch {
    return ''
  }

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.jsonl') && entry.name.toLowerCase().includes(sessionKey)) {
      return path.join(rootDir, entry.name)
    }
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    const match = await findSessionFile(path.join(rootDir, entry.name), sessionKey)
    if (match) {
      return match
    }
  }
  return ''
}

const parseSessionFile = async (filePath) => {
  const input = createReadStream(filePath, { encoding: 'utf8' })
  const lines = readline.createInterface({ input, crlfDelay: Infinity })
  const userMessages = { firstText: '', lastText: '', recentTexts: [] }
  const assistantMessages = { firstText: '', lastText: '', recentTexts: [] }
  const metadata = {
    workspacePath: '',
    modelName: '',
    modelProvider: '',
    gitBranch: '',
    lastActiveAt: '',
    taskCompleteMessage: ''
  }

  try {
    for await (const line of lines) {
      if (!line.trim()) {
        continue
      }
      let entry
      try {
        entry = JSON.parse(line)
      } catch {
        continue
      }

      if (typeof entry.timestamp === 'string') {
        metadata.lastActiveAt = entry.timestamp
      }
      if (entry.type === 'session_meta') {
        if (typeof entry.payload?.cwd === 'string') {
          metadata.workspacePath = entry.payload.cwd
        }
        if (typeof entry.payload?.model_provider === 'string') {
          metadata.modelProvider = entry.payload.model_provider
        }
        if (typeof entry.payload?.git?.branch === 'string') {
          metadata.gitBranch = entry.payload.git.branch
        }
        continue
      }
      if (entry.type === 'turn_context') {
        if (typeof entry.payload?.cwd === 'string' && entry.payload.cwd) {
          metadata.workspacePath = entry.payload.cwd
        }
        if (typeof entry.payload?.model === 'string' && entry.payload.model) {
          metadata.modelName = entry.payload.model
        }
        continue
      }
      if (entry.type === 'event_msg') {
        if (entry.payload?.type === 'user_message' && typeof entry.payload?.message === 'string') {
          recordMessageText(userMessages, entry.payload.message)
        }
        if (entry.payload?.type === 'agent_message' && typeof entry.payload?.message === 'string') {
          recordMessageText(assistantMessages, entry.payload.message)
        }
        if (entry.payload?.type === 'task_complete' && typeof entry.payload?.last_agent_message === 'string') {
          metadata.taskCompleteMessage = clampText(entry.payload.last_agent_message, 1000)
        }
        continue
      }
      if (entry.type === 'response_item' && entry.payload?.type === 'message') {
        const messageText = extractTextContent(entry.payload.content)
        if (entry.payload.role === 'user') {
          recordMessageText(userMessages, messageText)
        }
        if (entry.payload.role === 'assistant') {
          recordMessageText(assistantMessages, messageText)
        }
      }
    }
  } finally {
    lines.close()
    input.close()
  }

  return {
    ...metadata,
    firstUserMessage: userMessages.firstText,
    lastUserMessage: userMessages.lastText,
    recentUserMessages: userMessages.recentTexts.slice(-3),
    lastAssistantMessage: assistantMessages.lastText
  }
}

const readSessionContext = async (codexHomeDir, request) => {
  const command = parseResumeCommand(request?.resumeCommand)
  const indexEntry = await readSessionIndexEntry(
    path.join(codexHomeDir, 'session_index.jsonl'),
    command.sessionKey
  )
  const sessionFilePath = await findSessionFile(
    path.join(codexHomeDir, 'sessions'),
    command.sessionKey
  ) || await findSessionFile(
    path.join(codexHomeDir, 'archived_sessions'),
    command.sessionKey
  )

  if (!indexEntry && !sessionFilePath) {
    throw createInspectorError('本机未找到对应的 Codex 会话', 'SESSION_NOT_FOUND')
  }

  const sessionData = sessionFilePath
    ? await parseSessionFile(sessionFilePath)
    : {
        workspacePath: '',
        modelName: '',
        modelProvider: '',
        gitBranch: '',
        lastActiveAt: '',
        taskCompleteMessage: '',
        firstUserMessage: '',
        lastUserMessage: '',
        recentUserMessages: [],
        lastAssistantMessage: ''
      }
  const workspacePath = sessionData.workspacePath.trim()
  const warnings = []
  if (!sessionFilePath) {
    warnings.push('只读取到 Codex 会话索引，未找到会话记录文件')
  }
  if (!workspacePath) {
    warnings.push('未从本地会话中读取到工作区')
  }

  return {
    command,
    indexEntry,
    sessionFilePath,
    sessionData,
    workspacePath,
    warnings
  }
}

export const createSessionInspector = ({
  codexHomeDir = process.env.CODEX_HOME || path.join(os.homedir(), '.codex')
} = {}) => {
  const inspect = async (request) => {
    const context = await readSessionContext(codexHomeDir, request)
    const { command, indexEntry, sessionFilePath, sessionData, workspacePath, warnings } = context
    return {
      toolType: command.toolType,
      title: clampText(
        indexEntry?.thread_name || sessionData.firstUserMessage || sessionData.lastUserMessage || command.sessionKey,
        80
      ),
      description: buildLocalDescription(sessionData.firstUserMessage, sessionData.lastUserMessage),
      modelName: sessionData.modelName.trim(),
      modelProvider: command.modelProvider || sessionData.modelProvider.trim(),
      sessionKey: command.sessionKey,
      workspacePath,
      projectName: workspacePath ? path.basename(workspacePath) : '',
      gitBranch: sessionData.gitBranch.trim(),
      transcriptPath: sessionFilePath,
      resumeCommand: command.resumeCommand,
      lastActiveAt: sessionData.lastActiveAt,
      warnings
    }
  }

  return {
    inspect,
    async collectEvidence(request) {
      const context = await readSessionContext(codexHomeDir, request)
      const { command, indexEntry, sessionData } = context
      return {
        sessionKey: command.sessionKey,
        modelName: sessionData.modelName.trim(),
        modelProvider: command.modelProvider || sessionData.modelProvider.trim(),
        threadName: clampText(indexEntry?.thread_name || '', 160),
        firstUserMessage: sessionData.firstUserMessage,
        recentUserMessages: sessionData.recentUserMessages,
        taskCompleteMessage: sessionData.taskCompleteMessage || sessionData.lastAssistantMessage
      }
    }
  }
}
