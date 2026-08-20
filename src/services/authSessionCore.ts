export type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type LoginSession = {
  token: string
  userName?: string | null
}

export type AuthSession = {
  getToken: () => string | null
  getUserName: () => string | null
  saveLoginSession: (session: LoginSession) => void
  clearLoginSession: () => void
  rememberReturnPath: (fullPath: string) => void
  takeReturnPath: () => string | null
  clearReturnPath: () => void
}

type AuthSessionDependencies = {
  sharedStorage: StorageAdapter
  tabStorage: StorageAdapter
}

const STORAGE_KEYS = {
  token: 'iw.auth.token',
  userName: 'iw.auth.userName',
  returnPath: 'iw.auth.returnPath',
  legacyInvalidated: 'iw.auth.legacyInvalidated'
} as const

const LEGACY_STORAGE_KEYS = {
  token: 'iwtoken',
  userName: 'name'
} as const

const safeGet = (storage: StorageAdapter, key: string): string | null => {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

const safeSet = (storage: StorageAdapter, key: string, value: string): boolean => {
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

const safeRemove = (storage: StorageAdapter, key: string): void => {
  try {
    storage.removeItem(key)
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

const normalizeReturnPath = (fullPath: string): string | null => {
  const candidate = fullPath.trim()
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return null
  }

  try {
    const parsed = new URL(candidate, 'https://iw.local')
    if (parsed.origin !== 'https://iw.local' || parsed.pathname === '/login') {
      return null
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

export const createAuthSession = ({sharedStorage, tabStorage}: AuthSessionDependencies): AuthSession => {
  const migrateLegacyValue = (sharedKey: string, legacyKey: string): string | null => {
    const sharedValue = safeGet(sharedStorage, sharedKey)
    if (sharedValue !== null) {
      return sharedValue || null
    }

    if (safeGet(sharedStorage, STORAGE_KEYS.legacyInvalidated) === '1') {
      safeRemove(tabStorage, legacyKey)
      return null
    }

    const legacyValue = safeGet(tabStorage, legacyKey)
    if (!legacyValue) {
      return null
    }

    if (safeSet(sharedStorage, sharedKey, legacyValue)) {
      safeRemove(tabStorage, legacyKey)
    }
    return legacyValue
  }

  const getToken = (): string | null => migrateLegacyValue(STORAGE_KEYS.token, LEGACY_STORAGE_KEYS.token)

  const getUserName = (): string | null =>
    migrateLegacyValue(STORAGE_KEYS.userName, LEGACY_STORAGE_KEYS.userName)

  const saveLoginSession = ({token, userName}: LoginSession): void => {
    const normalizedToken = token.trim()
    if (!normalizedToken) {
      return
    }

    if (safeSet(sharedStorage, STORAGE_KEYS.token, normalizedToken)) {
      safeRemove(tabStorage, LEGACY_STORAGE_KEYS.token)
    } else {
      safeSet(tabStorage, LEGACY_STORAGE_KEYS.token, normalizedToken)
    }

    const normalizedUserName = userName?.trim()
    if (normalizedUserName) {
      if (safeSet(sharedStorage, STORAGE_KEYS.userName, normalizedUserName)) {
        safeRemove(tabStorage, LEGACY_STORAGE_KEYS.userName)
      } else {
        safeSet(tabStorage, LEGACY_STORAGE_KEYS.userName, normalizedUserName)
      }
    } else {
      safeSet(sharedStorage, STORAGE_KEYS.userName, '')
      safeRemove(tabStorage, LEGACY_STORAGE_KEYS.userName)
    }
    safeRemove(sharedStorage, STORAGE_KEYS.legacyInvalidated)
  }

  const clearLoginSession = (): void => {
    safeRemove(sharedStorage, STORAGE_KEYS.token)
    safeRemove(sharedStorage, STORAGE_KEYS.userName)
    safeSet(sharedStorage, STORAGE_KEYS.legacyInvalidated, '1')
    safeRemove(tabStorage, LEGACY_STORAGE_KEYS.token)
    safeRemove(tabStorage, LEGACY_STORAGE_KEYS.userName)
  }

  const rememberReturnPath = (fullPath: string): void => {
    const normalizedPath = normalizeReturnPath(fullPath)
    if (normalizedPath) {
      safeSet(tabStorage, STORAGE_KEYS.returnPath, normalizedPath)
    }
  }

  const takeReturnPath = (): string | null => {
    const returnPath = safeGet(tabStorage, STORAGE_KEYS.returnPath)
    safeRemove(tabStorage, STORAGE_KEYS.returnPath)
    return returnPath ? normalizeReturnPath(returnPath) : null
  }

  const clearReturnPath = (): void => {
    safeRemove(tabStorage, STORAGE_KEYS.returnPath)
  }

  return {
    getToken,
    getUserName,
    saveLoginSession,
    clearLoginSession,
    rememberReturnPath,
    takeReturnPath,
    clearReturnPath
  }
}
