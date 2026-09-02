import type { ZgK8sEnvironment } from '@/types/zhaogangService'

export const deploymentNameFromPlanName = (planName?: string | null): string | null => {
  const value = planName?.trim() || ''
  const markerMatch = /\.(service|ui)/i.exec(value)
  if (!markerMatch || markerMatch.index < 0) return null
  return value.slice(0, markerMatch.index + markerMatch[0].length).replace(/\./g, '-')
}

export const k8sEnvironmentFromBuild = (environment?: string | null): ZgK8sEnvironment | null => {
  const normalized = environment?.trim().toLowerCase()
  if (normalized === 'test') return 'test'
  if (normalized === 'sit') return 'test'
  if (normalized === 'uat') return 'uat'
  if (normalized === 'prd') return 'prd'
  return null
}
