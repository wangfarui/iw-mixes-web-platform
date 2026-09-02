export interface ZgK8sAgentHealth {
  agentName: string
  version: string
  apiVersion: string
  running: boolean
  authenticated: boolean
  autostartEnabled: boolean
  host: string
  port: number
  environments?: Record<string, boolean>
}

export interface ZgK8sAgentSession {
  authenticated: boolean
}

export interface ZgK8sNamespace {
  name: string
}

export interface ZgK8sContainer {
  name: string
  image: string
  ready: boolean
  restartCount: number
}

export interface ZgK8sPod {
  namespace: string
  name: string
  status: string
  ready: string
  restarts: number
  node: string
  podIp: string
  createdAt: string
  containers: ZgK8sContainer[]
  cpuUsage?: string
  memoryUsage?: string
}

export interface ZgK8sPodPage {
  namespace: string
  items: ZgK8sPod[]
  updatedAt: string
}

export type ZgK8sEnvironment = 'test' | 'uat' | 'prd'

export interface ZgK8sDeployment {
  namespace: string
  name: string
  replicas: number
  podCount: number
  podNames?: string[]
  pods?: ZgK8sPod[]
  lastPodCreatedAt: string
}

export interface ZgK8sDeploymentPage {
  environment: ZgK8sEnvironment
  namespace: string
  items: ZgK8sDeployment[]
  total: number
  page: number
  pageSize: number
  updatedAt: string
}

export interface ZgK8sAgentUpdateInfo {
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
  releaseNotes: string
}

export interface ZgK8sAgentUpdateStatus {
  state: string
  message?: string
}

const statusCodes = ['AGENT_OFFLINE', 'NETWORK_ERROR', 'TIMEOUT', 'HTTP_ERROR'] as const
export type ZgK8sAgentErrorCode = typeof statusCodes[number]

export class ZgK8sAgentError extends Error {
  constructor(message: string, readonly code: ZgK8sAgentErrorCode = 'HTTP_ERROR', readonly status = 0) {
    super(message)
  }
}
