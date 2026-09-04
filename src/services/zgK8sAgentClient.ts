import type {
  ZgK8sAgentHealth,
  ZgK8sAgentSession,
  ZgK8sAgentUpdateInfo,
  ZgK8sAgentUpdateStatus,
  ZgK8sAgentManifest,
  ZgK8sAgentErrorCode,
  ZgK8sDeploymentPage,
  ZgK8sEnvironment,
  ZgK8sNamespace,
  ZgK8sPodPage
} from '@/types/zhaogangService'
import { ZgK8sAgentError } from '@/types/zhaogangService'

const PORT_KEY = 'zhaogang:zg-k8s-agent-port'
const DEFAULT_PORT = 28731
const DOWNLOAD_PATH = '/downloads/zg-k8s-agent/'
const DOWNLOAD_INDEX = `${DOWNLOAD_PATH}index.html`
const DOWNLOAD_MANIFEST = `${DOWNLOAD_PATH}latest.json`

type AgentPlatform = 'darwin-arm64' | 'darwin-amd64' | 'windows-arm64' | 'windows-amd64'
export type ZgK8sAgentSystem = 'windows' | 'macos'
type UserAgentDataLike = {
  platform?: string
  architecture?: string
  getHighEntropyValues?: (hints: string[]) => Promise<{ platform?: string; architecture?: string }>
}

export const getZgK8sAgentPort = (): number => {
  const value = Number(window.localStorage.getItem(PORT_KEY))
  return Number.isInteger(value) && value > 0 && value < 65536 ? value : DEFAULT_PORT
}

export const saveZgK8sAgentPort = (port: number): number => {
  const normalized = Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_PORT
  window.localStorage.setItem(PORT_KEY, String(normalized))
  return normalized
}

export const zgK8sAgentDownloadPath = DOWNLOAD_INDEX

const compareAgentVersion = (left: string, right: string) => {
  const parse = (value: string) => value.replace(/^v/i, '').split('.').map(part => Number.parseInt(part, 10) || 0)
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) > (b[index] || 0) ? 1 : -1
  }
  return 0
}

const fetchZgK8sAgentManifest = async (): Promise<ZgK8sAgentManifest | null> => {
  try {
    const response = await fetch(DOWNLOAD_MANIFEST, { cache: 'no-store' })
    if (!response.ok) return null
    const manifest = await response.json() as Partial<ZgK8sAgentManifest>
    return typeof manifest.version === 'string' && manifest.version ? manifest as ZgK8sAgentManifest : null
  } catch {
    return null
  }
}

export const checkZgK8sAgentWebUpdate = async (currentVersion: string) => {
  const manifest = await fetchZgK8sAgentManifest()
  if (!manifest || compareAgentVersion(manifest.version, currentVersion) <= 0) return null
  return {
    currentVersion,
    latestVersion: manifest.version,
    updateAvailable: true,
    releaseNotes: manifest.releaseNotes || '建议更新到最新 Agent。'
  }
}

const detectAgentPlatform = async (requestedSystem?: ZgK8sAgentSystem): Promise<AgentPlatform | null> => {
  const navigatorLike = window.navigator as Navigator & { userAgentData?: UserAgentDataLike }
  const userAgentData = navigatorLike.userAgentData
  let platform = userAgentData?.platform || navigatorLike.platform || ''
  let architecture = userAgentData?.architecture || ''
  if (userAgentData?.getHighEntropyValues) {
    const details = await userAgentData.getHighEntropyValues(['platform', 'architecture']).catch(() => ({}) as { platform?: string; architecture?: string })
    platform = details.platform || platform
    architecture = details.architecture || architecture
  }
  const normalizedPlatform = `${platform} ${navigatorLike.userAgent}`.toLowerCase()
  const normalizedArchitecture = architecture.toLowerCase()
  const isArm = normalizedArchitecture.includes('arm') || normalizedArchitecture.includes('aarch')
  const detectedSystem: ZgK8sAgentSystem | null = normalizedPlatform.includes('win')
    ? 'windows'
    : normalizedPlatform.includes('mac') || normalizedPlatform.includes('darwin')
      ? 'macos'
      : null
  if (requestedSystem === 'windows') {
    // When viewing the Windows guide from macOS/Linux, use the broadly compatible x64 installer.
    return detectedSystem === 'windows' ? (isArm ? 'windows-arm64' : 'windows-amd64') : 'windows-amd64'
  }
  if (requestedSystem === 'macos') {
    // When viewing the macOS guide from another OS, use the current default Apple Silicon package.
    return detectedSystem === 'macos' ? (isArm || !normalizedArchitecture ? 'darwin-arm64' : 'darwin-amd64') : 'darwin-arm64'
  }
  if (detectedSystem === 'windows') return isArm ? 'windows-arm64' : 'windows-amd64'
  if (detectedSystem === 'macos') {
    // Safari does not expose CPU architecture; Apple Silicon is the default for current Macs.
    return isArm || !normalizedArchitecture ? 'darwin-arm64' : 'darwin-amd64'
  }
  return null
}

export const resolveZgK8sAgentDownloadUrl = async (requestedSystem?: ZgK8sAgentSystem): Promise<string> => {
  const platform = await detectAgentPlatform(requestedSystem)
  if (!platform) return DOWNLOAD_INDEX
  try {
    const response = await fetch(DOWNLOAD_MANIFEST, { cache: 'no-store' })
    if (!response.ok) return DOWNLOAD_INDEX
    const manifest = await response.json() as { platforms?: Record<string, { url?: string; downloadUrl?: string }> }
    const release = manifest.platforms?.[platform]
    const value = release?.downloadUrl || release?.url
    if (!value) return DOWNLOAD_INDEX
    return /^https?:\/\//i.test(value) ? value : `${DOWNLOAD_PATH}${value.replace(/^\/+/, '')}`
  } catch {
    return DOWNLOAD_INDEX
  }
}

export const zgK8sAgentStartProtocol = () => {
  const link = document.createElement('a')
  link.href = 'zg-k8s-agent://start'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => link.remove(), 1000)
}

export const zgK8sAgentClient = (port = getZgK8sAgentPort()) => {
  const base = `http://127.0.0.1:${port}`
  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    let response: Response
    try {
      response = await fetch(`${base}${path}`, { ...init, credentials: 'omit' })
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError' ? '本机 Agent 请求超时' : '未检测到 zg-k8s-agent，请确认程序已启动'
      const code: ZgK8sAgentErrorCode = error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'AGENT_OFFLINE'
      throw new ZgK8sAgentError(message, code)
    }
    const payload = await response.json().catch(() => undefined) as { message?: string } | undefined
    if (!response.ok) {
      throw new ZgK8sAgentError(payload?.message || `zg-k8s-agent 请求失败（${response.status}）`, 'HTTP_ERROR', response.status)
    }
    return payload as T
  }

  return {
    port,
    health: () => request<ZgK8sAgentHealth>('/v1/health'),
    session: (environment: ZgK8sEnvironment) => request<ZgK8sAgentSession>(`/v1/session?environment=${environment}`),
    login: (environment: ZgK8sEnvironment, token: string) => request<ZgK8sAgentSession>('/v1/session/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, environment })
    }),
    logout: (environment: ZgK8sEnvironment) => request<ZgK8sAgentSession>(`/v1/session?environment=${environment}`, { method: 'DELETE' }),
    namespaces: (environment: ZgK8sEnvironment) => request<{ items: ZgK8sNamespace[] }>(`/v1/namespaces?environment=${environment}`).then(value => value.items || []),
    pods: (environment: ZgK8sEnvironment, namespace: string, deployment?: string) => request<ZgK8sPodPage>(`/v1/pods?environment=${environment}&namespace=${encodeURIComponent(namespace)}${deployment ? `&deployment=${encodeURIComponent(deployment)}` : ''}`),
    deployments: (environment: ZgK8sEnvironment, namespace: string, page = 1, pageSize = 20) => request<ZgK8sDeploymentPage>(`/v1/deployments?environment=${environment}&namespace=${encodeURIComponent(namespace)}&page=${page}&pageSize=${pageSize}`),
    checkUpdate: () => request<ZgK8sAgentUpdateInfo>('/v1/update/check'),
    startUpdate: () => request<{ accepted: boolean; status: string }>('/v1/update', { method: 'POST' }),
    updateStatus: () => request<ZgK8sAgentUpdateStatus>('/v1/update/status'),
    autostart: (enabled: boolean) => request<{ enabled: boolean }>(`/v1/autostart?enabled=${enabled ? 'true' : 'false'}`, { method: 'POST' })
  }
}

export type ZgK8sAgentClient = ReturnType<typeof zgK8sAgentClient>

/** Read every deployment page so release status never depends on the first page ordering. */
export const listAllZgK8sDeployments = async (
  client: ZgK8sAgentClient,
  environment: ZgK8sEnvironment,
  namespace: string,
  pageSize = 100
): Promise<ZgK8sDeploymentPage['items']> => {
  const items: ZgK8sDeploymentPage['items'] = []
  let page = 1
  let total = 0
  do {
    const result = await client.deployments(environment, namespace, page, pageSize)
    items.push(...(result.items || []))
    total = result.total || items.length
    if (!result.items?.length || items.length >= total) break
    page += 1
  } while (page <= 100)
  return items
}
