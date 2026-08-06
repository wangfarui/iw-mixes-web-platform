import type { ToolTypeCode } from '@/types/aiTask'

const LAUNCHER_BASE_URL = 'http://127.0.0.1:17321/v1'
const LAUNCHER_TOKEN_KEY = 'iw.aiSession.launcherToken.v1'

export type AiLauncherStatus = {
  version: string
  paired: boolean
  tools: {
    codex?: boolean
    claude?: boolean
    gemini?: boolean
  }
}

export type AiLauncherRequest = {
  toolType: ToolTypeCode
  sessionKey: string
  sessionName: string
  workspacePath: string
  modelProvider?: string
}

export type AiLauncherSessionDraft = {
  toolType: 'codex'
  title: string
  description: string
  modelName: string
  modelProvider: string
  sessionKey: string
  workspacePath: string
  projectName: string
  gitBranch: string
  transcriptPath: string
  resumeCommand: string
  lastActiveAt: string
  warnings: string[]
}

export type AiLauncherOptimizedMetadata = {
  title: string
  description: string
  metadataSource: 'ai'
}

export class AiLauncherError extends Error {
  code: string
  status?: number

  constructor(message: string, code = 'LAUNCHER_UNAVAILABLE', status?: number) {
    super(message)
    this.name = 'AiLauncherError'
    this.code = code
    this.status = status
  }
}

export const getAiLauncherToken = () => window.localStorage.getItem(LAUNCHER_TOKEN_KEY) || ''

export const setAiLauncherToken = (token: string) => {
  const normalized = token.trim()
  if (normalized) {
    window.localStorage.setItem(LAUNCHER_TOKEN_KEY, normalized)
  } else {
    window.localStorage.removeItem(LAUNCHER_TOKEN_KEY)
  }
}

const requestLauncher = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = getAiLauncherToken()
  const headers = new Headers(init.headers)
  if (token) {
    headers.set('X-IW-Launcher-Token', token)
  }

  let response: Response
  try {
    response = await fetch(`${LAUNCHER_BASE_URL}${path}`, {
      ...init,
      mode: 'cors',
      cache: 'no-store',
      headers
    })
  } catch {
    throw new AiLauncherError('无法连接本机启动器，请确认已安装并运行')
  }

  const body = await response.json().catch(() => ({})) as {
    code?: string
    message?: string
  }
  if (!response.ok) {
    throw new AiLauncherError(
      body.message || '本机启动器请求失败',
      body.code || 'LAUNCHER_REQUEST_FAILED',
      response.status
    )
  }
  return body as T
}

export const queryAiLauncherStatus = () => requestLauncher<AiLauncherStatus>('/status')

export const launchAiSession = (request: AiLauncherRequest) => requestLauncher<{
  message: string
  toolType: string
  terminalName: string
  sessionName: string
  sessionNameApplied: boolean
  commandPreview: string
  workspacePath: string
}>('/launch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(request)
})

export const inspectAiSession = async (resumeCommand: string) => {
  try {
    return await requestLauncher<AiLauncherSessionDraft>('/session/inspect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ resumeCommand })
    })
  } catch (error) {
    if (error instanceof AiLauncherError && error.code === 'NOT_FOUND') {
      throw new AiLauncherError(
        '本机启动器版本过低，请重新执行 npm run ai-launcher:install',
        'LAUNCHER_UPGRADE_REQUIRED',
        error.status
      )
    }
    throw error
  }
}

export const optimizeAiSessionMetadata = async (request: {
  resumeCommand: string
}) => {
  try {
    return await requestLauncher<AiLauncherOptimizedMetadata>('/session/optimize-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
  } catch (error) {
    if (error instanceof AiLauncherError && error.code === 'NOT_FOUND') {
      throw new AiLauncherError(
        '本机启动器版本过低，请重新执行 npm run ai-launcher:install',
        'LAUNCHER_UPGRADE_REQUIRED',
        error.status
      )
    }
    throw error
  }
}
