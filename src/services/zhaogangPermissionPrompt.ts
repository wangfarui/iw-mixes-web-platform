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
  message?: unknown
  missingPermissions?: unknown
}

const permissionPayloadIn = (value: unknown, depth = 0): PermissionErrorPayload | null => {
  if (depth > 8 || value === null || typeof value !== 'object') return null
  const payload = value as PermissionErrorPayload
  if (payload.type === 'CODING_PERMISSION_DENIED') return payload
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>)
  for (const child of children) {
    const match = permissionPayloadIn(child, depth + 1)
    if (match) return match
  }
  return null
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))]
const explicitErrorSignal = /\b(?:unauthorized|forbidden)\b|(?:无权|没有权限)(?:访问|操作|读取|修改|调用)?|权限不足|缺少[^。；\n]*权限/i
const legacyErrorFields = new Set(['warning', 'reason', 'syncMessage'])

const legacyPermissionMessageIn = (value: unknown, depth = 0): string => {
  if (depth > 8 || value === null || typeof value !== 'object') return ''
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = legacyPermissionMessageIn(item, depth + 1)
      if (message) return message
    }
    return ''
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (legacyErrorFields.has(key) && typeof child === 'string' && explicitErrorSignal.test(child)) return child
    const message = legacyPermissionMessageIn(child, depth + 1)
    if (message) return message
  }
  return ''
}

export const permissionPromptFrom = (value: unknown, fallbackMessage = ''): ZhaogangPermissionPromptDetail | null => {
  const payload = permissionPayloadIn(value)
  const explicit = Array.isArray(payload?.missingPermissions)
    ? payload.missingPermissions.filter((item): item is string => typeof item === 'string')
    : []
  const legacyMessage = fallbackMessage
    ? (explicitErrorSignal.test(fallbackMessage) ? fallbackMessage : '')
    : legacyPermissionMessageIn(value)
  if (!payload && !legacyMessage) return null

  const payloadMessage = typeof payload?.message === 'string' ? payload.message : ''
  const message = payloadMessage || legacyMessage || fallbackMessage || 'CODING 已拒绝本次调用，请检查个人令牌权限'
  const inferred = zhaogangPermissionLabels.filter(label => message.includes(label))
  return { permissions: unique([...explicit, ...inferred]), message }
}

export const dispatchZhaogangPermissionPrompt = (detail: ZhaogangPermissionPromptDetail) => {
  window.dispatchEvent(new CustomEvent<ZhaogangPermissionPromptDetail>(ZHAOGANG_PERMISSION_EVENT, { detail }))
}
