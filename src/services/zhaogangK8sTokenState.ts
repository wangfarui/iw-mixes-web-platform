import { getZhaogangK8sToken, type ZhaogangK8sTokenStatus } from '@/api/zhaogang'
import type { ZgK8sEnvironment } from '@/types/zhaogangService'
import type { ZgWorkbenchAgentClient } from './zgWorkbenchAgentClient'

const environments: ZgK8sEnvironment[] = ['test', 'uat', 'prd']
const connectedRevisions = new Map<string, string>()
const sessionKey = (port: number, environment: ZgK8sEnvironment) => `${port}:${environment}`
const sessionChanges = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('zhaogang:k8s-session-changes')
  : undefined
sessionChanges?.addEventListener('message', ({ data }) => connectedRevisions.delete(data))

const invalidateConnection = (key: string) => {
  connectedRevisions.delete(key)
  sessionChanges?.postMessage(key)
}

/** Agent auth is current browser state; persisted status restores disconnected environments. */
export const mergeZhaogangK8sTokenConfigured = (
  configured?: Partial<Record<ZgK8sEnvironment, boolean>>,
  authenticated?: Partial<Record<ZgK8sEnvironment, boolean>>
): Record<ZgK8sEnvironment, boolean> => Object.fromEntries(
  environments.map(environment => [
    environment,
    Boolean(configured?.[environment] || authenticated?.[environment])
  ])
) as Record<ZgK8sEnvironment, boolean>

export const logoutZhaogangK8sEnvironment = (client: ZgWorkbenchAgentClient, environment: ZgK8sEnvironment) => {
  invalidateConnection(sessionKey(client.port, environment))
  return client.logout(environment)
}

export const validateZhaogangK8sDraft = async (
  client: ZgWorkbenchAgentClient,
  environment: ZgK8sEnvironment,
  token: string
) => {
  invalidateConnection(sessionKey(client.port, environment))
  await client.login(environment, token)
  try {
    await client.namespaces(environment)
  } finally {
    await logoutZhaogangK8sEnvironment(client, environment).catch(() => undefined)
  }
}

export const connectZhaogangK8sEnvironment = async (
  client: ZgWorkbenchAgentClient,
  environment: ZgK8sEnvironment,
  status: ZhaogangK8sTokenStatus,
  force = false
): Promise<boolean> => {
  const credential = status.credentials?.[environment]
  const key = sessionKey(client.port, environment)
  if (credential?.source === 'NONE') {
    connectedRevisions.delete(key)
    return false
  }
  if (!force && (!credential || credential.revision === connectedRevisions.get(key))) {
    if ((await client.session(environment)).authenticated) return true
  }
  if (!status.configured[environment]) return false

  const { token, revision } = await getZhaogangK8sToken(environment)
  if (credential && revision !== credential.revision) {
    throw new Error('K8s Token 配置已更改，请刷新后重试')
  }
  invalidateConnection(key)
  await client.login(environment, token)
  if (revision) connectedRevisions.set(key, revision)
  return true
}
