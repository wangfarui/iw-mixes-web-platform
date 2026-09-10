import {
  getZhaogangK8sToken,
  getZhaogangK8sTokenStatus
} from '@/api/zhaogang'
import {
  checkZgWorkbenchAgent,
  getZgWorkbenchAgentPort,
  listAllZgWorkbenchDeployments,
  zgWorkbenchAgentClient,
  type ZgWorkbenchAgentClient
} from '@/services/zgWorkbenchAgentClient'
import type {
  ZgK8sAgentHealth,
  ZgK8sDeployment,
  ZgK8sEnvironment
} from '@/types/zhaogangService'
export { deploymentNameFromPlanName, k8sEnvironmentFromBuild } from './zhaogangReleaseK8sNaming'
import { deploymentNameFromPlanName, k8sEnvironmentFromBuild } from './zhaogangReleaseK8sNaming'

export type ReleaseK8sState =
  | 'NO_BUILD'
  | 'UNKNOWN_ENVIRONMENT'
  | 'UNKNOWN_SERVICE'
  | 'NOT_FOUND'
  | 'AGENT_OFFLINE'
  | 'TOKEN_MISSING'
  | 'QUERYING'
  | 'QUERY_FAILED'
  | 'READY'

export interface ReleaseK8sStatus {
  state: ReleaseK8sState
  environment?: ZgK8sEnvironment
  deployment?: ZgK8sDeployment
  message?: string
}

export interface ReleaseK8sTarget {
  id: number
  planName: string
  environment?: string
}

export const releaseK8sEnvironments: ZgK8sEnvironment[] = ['test', 'uat', 'prd']

export const zhaogangK8sDashboardUrl = (
  environment: ZgK8sEnvironment,
  namespace?: string,
  deploymentName?: string
) => {
  const baseUrls: Record<ZgK8sEnvironment, string> = {
    test: 'https://k8sdash.zhaogangrentest.com',
    uat: 'https://k8sdash.zhaogangrenuat.com',
    prd: 'https://k8sdash.zhaogangren.com'
  }
  const query = new URLSearchParams()
  if (namespace) query.set('namespace', namespace)
  if (deploymentName) query.set('q', deploymentName)
  const suffix = query.toString()
  return `${baseUrls[environment]}/#/${suffix ? `search?${suffix}` : 'search'}`
}

export interface PlanK8sStatuses {
  deploymentName: string | null
  statuses: Record<ZgK8sEnvironment, ReleaseK8sStatus>
}

const namespaceCacheKey = 'zhaogang:k8s-namespaces'

const readNamespaceCache = (): Record<string, string> => {
  try {
    return JSON.parse(window.localStorage.getItem(namespaceCacheKey) || '{}') as Record<string, string>
  } catch {
    return {}
  }
}

const writeNamespaceCache = (value: Record<string, string>) => {
  window.localStorage.setItem(namespaceCacheKey, JSON.stringify(value))
}

const namespaceFor = async (client: ZgWorkbenchAgentClient, environment: ZgK8sEnvironment) => {
  const cached = readNamespaceCache()
  const namespaces = await client.namespaces(environment)
  let namespace = cached[environment] || namespaces[0]?.name || 'application'
  if (!namespaces.some(item => item.name === namespace)) namespace = namespaces[0]?.name || 'application'
  cached[environment] = namespace
  writeNamespaceCache(cached)
  return namespace
}

export const queryReleaseK8sStatuses = async (
  targets: ReleaseK8sTarget[],
  options: { port?: number; onHealth?: (health: ZgK8sAgentHealth) => void } = {}
): Promise<Record<number, ReleaseK8sStatus>> => {
  const result: Record<number, ReleaseK8sStatus> = {}
  for (const target of targets) {
    if (!target.environment) result[target.id] = { state: 'NO_BUILD' }
    else {
      const environment = k8sEnvironmentFromBuild(target.environment)
      const deployment = deploymentNameFromPlanName(target.planName)
      if (!environment) result[target.id] = { state: 'UNKNOWN_ENVIRONMENT' }
      else if (!deployment) result[target.id] = { state: 'UNKNOWN_SERVICE', environment }
      else result[target.id] = { state: 'QUERYING', environment }
    }
  }

  const grouped = new Map<ZgK8sEnvironment, ReleaseK8sTarget[]>()
  for (const target of targets) {
    const environment = k8sEnvironmentFromBuild(target.environment)
    if (environment && deploymentNameFromPlanName(target.planName)) {
      const list = grouped.get(environment) || []
      list.push(target)
      grouped.set(environment, list)
    }
  }
  if (!grouped.size) return result

  let client: ZgWorkbenchAgentClient
  try {
    const agentState = await checkZgWorkbenchAgent()
    if (!agentState.compatible) {
      targets.forEach(target => {
        if (result[target.id]?.state === 'QUERYING') result[target.id] = { state: 'AGENT_OFFLINE', message: agentState.message || '本机 Agent 未就绪，请前往设置处理' }
      })
      return result
    }
    client = zgWorkbenchAgentClient(options.port ?? getZgWorkbenchAgentPort())
    let health: ZgK8sAgentHealth
    try {
      health = await client.health()
    } catch (error) {
      const message = error instanceof Error ? error.message : '未检测到工作台 Agent，请确认程序已启动'
      targets.forEach(target => {
        if (result[target.id]?.state === 'QUERYING') result[target.id] = { state: 'AGENT_OFFLINE', message }
      })
      return result
    }
    options.onHealth?.(health)
    if (!health.running) {
      targets.forEach(target => {
        if (result[target.id]?.state === 'QUERYING') result[target.id] = { state: 'AGENT_OFFLINE', message: '未检测到工作台 Agent，请确认程序已启动' }
      })
      return result
    }
    let tokenStatus
    try {
      tokenStatus = await getZhaogangK8sTokenStatus()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'K8s 查询失败'
      targets.forEach(target => {
        if (result[target.id]?.state === 'QUERYING') result[target.id] = { state: 'QUERY_FAILED', message }
      })
      return result
    }
    const healthByEnvironment = new Map<string, boolean>(Object.entries(health.environments || {}))

    await Promise.all([...grouped.entries()].map(async ([environment, environmentTargets]) => {
      try {
        if (!healthByEnvironment.get(environment)) {
          if (!tokenStatus.configured[environment]) {
            environmentTargets.forEach(target => { result[target.id] = { state: 'TOKEN_MISSING', environment } })
            return
          }
          const stored = await getZhaogangK8sToken(environment)
          await client.login(environment, stored.token)
          const refreshed = await client.health()
          options.onHealth?.(refreshed)
          if (!refreshed.environments?.[environment]) throw new Error('对应环境 Token 无法连接 Agent')
        }
        const namespace = await namespaceFor(client, environment)
        const deployments = await listAllZgWorkbenchDeployments(client, environment, namespace)
        const byName = new Map(deployments.map(item => [item.name, item]))
        environmentTargets.forEach(target => {
          const name = deploymentNameFromPlanName(target.planName)!
          const deployment = byName.get(name)
          result[target.id] = deployment
            ? { state: 'READY', environment, deployment }
            : { state: 'NOT_FOUND', environment, message: `未找到服务 ${name}` }
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'K8s 查询失败'
        environmentTargets.forEach(target => {
          result[target.id] = { state: 'QUERY_FAILED', environment, message }
        })
      }
    }))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'K8s 查询失败'
    targets.forEach(target => {
      if (result[target.id]?.state === 'QUERYING') result[target.id] = { state: 'QUERY_FAILED', message }
    })
  }
  return result
}

export const queryPlanK8sStatuses = async (
  planName: string,
  options: { port?: number; onHealth?: (health: ZgK8sAgentHealth) => void } = {}
): Promise<PlanK8sStatuses> => {
  const targets = releaseK8sEnvironments.map((environment, index) => ({
    id: index,
    planName,
    environment
  }))
  const result = await queryReleaseK8sStatuses(targets, options)
  return {
    deploymentName: deploymentNameFromPlanName(planName),
    statuses: Object.fromEntries(
      releaseK8sEnvironments.map((environment, index) => [environment, result[index]])
    ) as Record<ZgK8sEnvironment, ReleaseK8sStatus>
  }
}
