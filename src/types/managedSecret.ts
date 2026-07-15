export type ManagedSecretField = {
  code: string
  label: string
  inputType: 'TEXT' | 'TEXTAREA'
  value?: string
  hasValue?: boolean
}

export type ManagedSecretType = 'API_KEY' | 'ACCESS_KEY_PAIR' | 'TOKEN' | 'SSH_KEY' | 'CERTIFICATE' | 'CUSTOM'

export type ManagedSecretEnvironment = 'PROD' | 'TEST' | 'DEV' | 'OTHER'

export type ManagedSecretPageDto = {
  currentPage: number
  pageSize: number
  keyword?: string
  secretType?: ManagedSecretType
  environment?: ManagedSecretEnvironment
  expiryStatus?: 1 | 2 | 3
}

export type ManagedSecretPageRecord = {
  id: number
  name: string
  serviceName: string
  secretType: ManagedSecretType
  environment: ManagedSecretEnvironment
  fieldSummary: string
  expireTime?: string
  tags?: string
  lastAccessTime?: string
  updateTime?: string
}

export type ManagedSecretForm = {
  id?: number
  name: string
  serviceName: string
  secretType: ManagedSecretType
  environment: ManagedSecretEnvironment
  address?: string
  fields: ManagedSecretField[]
  expireTime?: string
  tags: string[]
  remark?: string
}

export type ManagedSecretDetail = Omit<ManagedSecretForm, 'tags'> & {
  id: number
  tags?: string
  lastAccessTime?: string
  createTime?: string
  updateTime?: string
}

export type ManagedSecretPayload = Omit<ManagedSecretForm, 'tags'> & {
  tags?: string
}

export type ManagedSecretRevealDto = {
  id: number
  fieldCode: string
}

export type ManagedSecretRevealResult = {
  value: string
}
