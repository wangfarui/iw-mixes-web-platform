export const ZHAOGANG_PERMISSION_EVENT = 'zhaogang:permission-required'

export const zhaogangPermissionLabels = [
  '用户信息（只读）',
  '团队信息（只读）',
  '团队成员（只读）',
  '项目信息（只读）',
  '项目协同（读写）',
  '代码仓库（只读）',
  '持续集成任务（只读）',
  '持续集成构建（读写）'
] as const

export interface ZhaogangPermissionPromptDetail {
  permissions: string[]
  message: string
}

interface PermissionErrorPayload {
  type?: string
  missingPermissions?: unknown
}

const stringsIn = (value: unknown, depth = 0): string[] => {
  if (depth > 8 || value === null || value === undefined) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(item => stringsIn(item, depth + 1))
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(item => stringsIn(item, depth + 1))
  }
  return []
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))]

export const permissionPromptFrom = (value: unknown, fallbackMessage = ''): ZhaogangPermissionPromptDetail | null => {
  const payload = value && typeof value === 'object' ? value as PermissionErrorPayload : undefined
  const explicit = Array.isArray(payload?.missingPermissions)
    ? payload.missingPermissions.filter((item): item is string => typeof item === 'string')
    : []
  const texts = unique([...stringsIn(value), fallbackMessage])
  const permissionSignal = payload?.type === 'CODING_PERMISSION_DENIED'
    || texts.some(text => /权限|unauthorized|forbidden|无权/i.test(text))
  if (!permissionSignal) return null

  const joined = texts.join('\n')
  const inferred = zhaogangPermissionLabels.filter(label => joined.includes(label))
  const message = (/权限|unauthorized|forbidden|无权/i.test(fallbackMessage) ? fallbackMessage : '')
    || texts.find(text => /权限|无权/i.test(text))
    || texts.find(text => /unauthorized|forbidden/i.test(text))
    || 'CODING 已拒绝本次调用，请检查个人令牌权限'
  return { permissions: unique([...explicit, ...inferred]), message }
}

export const dispatchZhaogangPermissionPrompt = (detail: ZhaogangPermissionPromptDetail) => {
  window.dispatchEvent(new CustomEvent<ZhaogangPermissionPromptDetail>(ZHAOGANG_PERMISSION_EVENT, { detail }))
}
