import type { ZgK8sEnvironment } from '@/types/zhaogangService'

const environments: ZgK8sEnvironment[] = ['test', 'uat', 'prd']

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
