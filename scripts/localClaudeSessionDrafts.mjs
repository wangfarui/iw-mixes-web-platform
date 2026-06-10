import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects')
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

function extractTextContent(content) {
  if (!content) {
    return ''
  }

  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    for (const item of content) {
      if (!item || typeof item !== 'object') {
        continue
      }
      if (item.type === 'text' && typeof item.text === 'string') {
        return item.text
      }
      if (!item.type && typeof item.text === 'string') {
        return item.text
      }
    }
    return ''
  }

  if (typeof content === 'object' && typeof content.text === 'string') {
    return content.text
  }

  return ''
}

function fallbackProjectPathFromFile(filePath) {
  const projectDirName = path.basename(path.dirname(filePath))
  return projectDirName
    .replace(/^-/, '/')
    .replace(/-/g, '/')
}

async function collectJsonlFiles() {
  const projectDirs = await fsp.readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
  const files = []

  for (const entry of projectDirs) {
    if (!entry.isDirectory()) {
      continue
    }
    const projectDir = path.join(CLAUDE_PROJECTS_DIR, entry.name)
    const children = await fsp.readdir(projectDir, { withFileTypes: true })
    for (const child of children) {
      if (!child.isFile() || !child.name.endsWith('.jsonl')) {
        continue
      }
      const fullPath = path.join(projectDir, child.name)
      const stat = await fsp.stat(fullPath)
      files.push({
        fullPath,
        mtimeMs: stat.mtimeMs
      })
    }
  }

  return files.sort((left, right) => right.mtimeMs - left.mtimeMs)
}

async function parseSessionFile(filePath, mtimeMs) {
  const input = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity
  })

  const sessionId = path.basename(filePath, '.jsonl')
  let cwd = ''
  let gitBranch = ''
  let firstPrompt = ''
  let lastUserText = ''
  let lastAssistantText = ''
  let modelName = 'Claude Code'
  let createdAt = ''
  let lastActiveAt = new Date(mtimeMs).toISOString()

  try {
    for await (const line of rl) {
      if (!line.trim()) {
        continue
      }

      let entry
      try {
        entry = JSON.parse(line)
      } catch (error) {
        continue
      }

      if (!cwd && typeof entry.cwd === 'string') {
        cwd = entry.cwd
      }
      if (!gitBranch && typeof entry.gitBranch === 'string') {
        gitBranch = entry.gitBranch
      }
      if (!createdAt && typeof entry.timestamp === 'string') {
        createdAt = entry.timestamp
      }
      if (typeof entry.timestamp === 'string') {
        lastActiveAt = entry.timestamp
      }

      if (entry.type === 'user' && entry.userType === 'external') {
        const userText = clampText(extractTextContent(entry.message?.content), 180)
        if (userText) {
          if (!firstPrompt) {
            firstPrompt = userText
          }
          lastUserText = userText
        }
      }

      if (entry.type === 'assistant') {
        const assistantText = clampText(extractTextContent(entry.message?.content), 180)
        if (assistantText) {
          lastAssistantText = assistantText
        }
        if (typeof entry.message?.model === 'string') {
          modelName = entry.message.model
        }
      }
    }
  } finally {
    rl.close()
    input.close()
  }

  const titleSource = firstPrompt || lastUserText || lastAssistantText || sessionId
  const summarySource =
    lastAssistantText ||
    lastUserText ||
    firstPrompt ||
    '检测到本地 Claude Code 会话，但暂时没有抽取到明确摘要。'
  const resolvedCwd = cwd || fallbackProjectPathFromFile(filePath)

  return {
    id: buildNumericId(sessionId),
    titleHint: clampText(titleSource, 48),
    toolType: 'Claude Code',
    modelName,
    sessionKey: sessionId,
    resumeCommand: `claude --resume ${sessionId}`,
    cwd: resolvedCwd,
    gitBranch: gitBranch || 'unknown',
    transcriptPath: filePath,
    currentSummary: summarySource,
    nextAction: '导入后按你的任务语义补充标题、当前进展和下一步。',
    lastActiveAt,
    createdAt: createdAt || lastActiveAt
  }
}

export async function readLocalClaudeSessionDrafts(options = {}) {
  const limit = Number.isFinite(options.limit) ? Number(options.limit) : DEFAULT_LIMIT
  const files = await collectJsonlFiles()
  const candidateFiles = files.slice(0, Math.max(limit * 3, DEFAULT_LIMIT))
  const drafts = []

  for (const file of candidateFiles) {
    const draft = await parseSessionFile(file.fullPath, file.mtimeMs)
    drafts.push(draft)
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
  const drafts = await readLocalClaudeSessionDrafts({ limit })
  process.stdout.write(`${JSON.stringify(drafts, null, 2)}\n`)
}
