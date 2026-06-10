import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'

const CODEX_HOME_DIR = path.join(os.homedir(), '.codex')
const CODEX_SESSION_INDEX_FILE = path.join(CODEX_HOME_DIR, 'session_index.jsonl')
const CODEX_SESSIONS_DIR = path.join(CODEX_HOME_DIR, 'sessions')
const CODEX_ARCHIVED_SESSIONS_DIR = path.join(CODEX_HOME_DIR, 'archived_sessions')
const DEFAULT_LIMIT = 12

function clampText(text, maxLength = 72) {
  if (!text) {
    return ''
  }
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength - 1)}...`
}

function buildNumericId(sessionId) {
  let hash = 0
  for (const char of sessionId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647
  }
  return hash
}

function extractTextFromMessageContent(content) {
  if (!content) {
    return ''
  }

  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return ''
        }
        if (typeof item.text === 'string') {
          return item.text
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }

  if (typeof content === 'object' && typeof content.text === 'string') {
    return content.text
  }

  return ''
}

function recordMessageText(target, text) {
  const normalizedText = clampText(text, 180)
  if (!normalizedText) {
    return
  }
  if (!target.firstText) {
    target.firstText = normalizedText
  }
  target.lastText = normalizedText
}

function extractSessionIdFromFileName(filePath) {
  const match = path.basename(filePath).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  return match?.[1] || ''
}

async function walkJsonlFiles(rootDir) {
  try {
    const entries = await fsp.readdir(rootDir, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name)
      if (entry.isDirectory()) {
        files.push(...await walkJsonlFiles(fullPath))
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) {
        continue
      }
      files.push(fullPath)
    }

    return files
  } catch {
    return []
  }
}

async function buildSessionFileMap() {
  const filePathList = [
    ...await walkJsonlFiles(CODEX_SESSIONS_DIR),
    ...await walkJsonlFiles(CODEX_ARCHIVED_SESSIONS_DIR)
  ]
  const sessionFileMap = new Map()

  for (const filePath of filePathList) {
    const sessionId = extractSessionIdFromFileName(filePath)
    if (!sessionId) {
      continue
    }
    if (!sessionFileMap.has(sessionId)) {
      sessionFileMap.set(sessionId, filePath)
    }
  }

  return sessionFileMap
}

async function readSessionIndex() {
  const rawText = await fsp.readFile(CODEX_SESSION_INDEX_FILE, 'utf8')
  return rawText
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      return new Date(right.updated_at || 0).getTime() - new Date(left.updated_at || 0).getTime()
    })
}

async function parseSessionFile(filePath, sessionIndexEntry) {
  const input = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity
  })

  const sessionId = sessionIndexEntry.id
  const userMessageState = {
    firstText: '',
    lastText: ''
  }
  const assistantMessageState = {
    firstText: '',
    lastText: ''
  }

  let cwd = ''
  let modelName = 'Codex'
  let createdAt = sessionIndexEntry.updated_at || ''
  let lastActiveAt = sessionIndexEntry.updated_at || ''

  try {
    for await (const line of rl) {
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
        if (!createdAt) {
          createdAt = entry.timestamp
        }
        lastActiveAt = entry.timestamp
      }

      if (entry.type === 'session_meta') {
        if (typeof entry.payload?.cwd === 'string' && entry.payload.cwd) {
          cwd = entry.payload.cwd
        }
        if (typeof entry.payload?.timestamp === 'string' && entry.payload.timestamp) {
          createdAt = entry.payload.timestamp
        }
        continue
      }

      if (entry.type === 'turn_context') {
        if (typeof entry.payload?.cwd === 'string' && entry.payload.cwd) {
          cwd = entry.payload.cwd
        }
        if (typeof entry.payload?.model === 'string' && entry.payload.model) {
          modelName = entry.payload.model
        }
        continue
      }

      if (entry.type === 'event_msg') {
        if (entry.payload?.type === 'user_message' && typeof entry.payload?.message === 'string') {
          recordMessageText(userMessageState, entry.payload.message)
        }
        if (entry.payload?.type === 'agent_message' && typeof entry.payload?.message === 'string') {
          recordMessageText(assistantMessageState, entry.payload.message)
        }
        continue
      }

      if (entry.type === 'response_item' && entry.payload?.type === 'message') {
        const messageText = extractTextFromMessageContent(entry.payload.content)
        if (entry.payload.role === 'user') {
          recordMessageText(userMessageState, messageText)
        }
        if (entry.payload.role === 'assistant') {
          recordMessageText(assistantMessageState, messageText)
        }
      }
    }
  } finally {
    rl.close()
    input.close()
  }

  const titleSource =
    sessionIndexEntry.thread_name ||
    userMessageState.firstText ||
    userMessageState.lastText ||
    assistantMessageState.lastText ||
    sessionId
  const summarySource =
    assistantMessageState.lastText ||
    userMessageState.lastText ||
    userMessageState.firstText ||
    '检测到本地 Codex 会话，但暂时没有抽取到明确摘要。'

  return {
    id: buildNumericId(sessionId),
    titleHint: clampText(titleSource, 48),
    toolType: 'Codex',
    modelName,
    sessionKey: sessionId,
    resumeCommand: `codex resume ${sessionId}`,
    cwd: cwd || '',
    gitBranch: '',
    transcriptPath: filePath,
    currentSummary: summarySource,
    nextAction: '导入后按你的任务语义补充标题、当前进展和下一步。',
    lastActiveAt: lastActiveAt || createdAt,
    createdAt: createdAt || lastActiveAt
  }
}

function buildFallbackDraft(sessionIndexEntry, transcriptPath) {
  const sessionId = sessionIndexEntry.id
  return {
    id: buildNumericId(sessionId),
    titleHint: clampText(sessionIndexEntry.thread_name || sessionId, 48),
    toolType: 'Codex',
    modelName: 'Codex',
    sessionKey: sessionId,
    resumeCommand: `codex resume ${sessionId}`,
    cwd: '',
    gitBranch: '',
    transcriptPath: transcriptPath || '',
    currentSummary: '仅从 Codex 索引中读取到会话元信息，建议导入后手工补充当前进展。',
    nextAction: '导入后按你的任务语义补充标题、当前进展和下一步。',
    lastActiveAt: sessionIndexEntry.updated_at || '',
    createdAt: sessionIndexEntry.updated_at || ''
  }
}

export async function readLocalCodexSessionDrafts(options = {}) {
  const limit = Number.isFinite(options.limit) ? Number(options.limit) : DEFAULT_LIMIT
  const sessionIndexList = await readSessionIndex()
  const sessionFileMap = await buildSessionFileMap()
  const drafts = []

  for (const sessionIndexEntry of sessionIndexList) {
    if (!sessionIndexEntry?.id) {
      continue
    }

    const transcriptPath = sessionFileMap.get(sessionIndexEntry.id)
    if (!transcriptPath) {
      drafts.push(buildFallbackDraft(sessionIndexEntry, ''))
    } else {
      drafts.push(await parseSessionFile(transcriptPath, sessionIndexEntry))
    }

    if (drafts.length >= limit) {
      break
    }
  }

  return drafts.sort((left, right) => {
    return new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime()
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const limitArg = process.argv.find((item) => item.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : DEFAULT_LIMIT
  const drafts = await readLocalCodexSessionDrafts({ limit })
  process.stdout.write(`${JSON.stringify(drafts, null, 2)}\n`)
}
