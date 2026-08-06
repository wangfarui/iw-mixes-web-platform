export const VERSION_POLLING_INTERVAL_MS = 30 * 1000

interface VersionPollingServiceOptions {
  hasToken: () => boolean
  getVersion: () => Promise<number>
  refreshCache: () => void
  schedule: (callback: () => void, intervalMs: number) => number
  cancel: (timer: number) => void
  reportError: (error: unknown) => void
}

export interface VersionPollingService {
  startVersionPolling: () => void
  stopVersionPolling: () => void
  isPollingActive: () => boolean
}

export const createVersionPollingService = ({
  hasToken,
  getVersion,
  refreshCache,
  schedule,
  cancel,
  reportError
}: VersionPollingServiceOptions): VersionPollingService => {
  let timer: number | null = null
  let cachedVersion: number | null = null
  let isPolling = false

  const stopVersionPolling = (): void => {
    if (timer !== null) {
      cancel(timer)
    }
    timer = null
    cachedVersion = null
    isPolling = false
  }

  const pollDictVersion = (): void => {
    if (!hasToken()) {
      stopVersionPolling()
      return
    }

    getVersion().then(currentVersion => {
      // 忽略退出登录或登录失效后才返回的旧请求。
      if (!isPolling || !hasToken()) {
        return
      }
      if (cachedVersion !== null && cachedVersion !== currentVersion) {
        refreshCache()
      }
      cachedVersion = currentVersion
    }).catch(error => {
      if (!hasToken()) {
        stopVersionPolling()
        return
      }
      reportError(error)
    })
  }

  const startVersionPolling = (): void => {
    if (isPolling || !hasToken()) {
      return
    }

    isPolling = true
    pollDictVersion()
    timer = schedule(pollDictVersion, VERSION_POLLING_INTERVAL_MS)
  }

  return {
    startVersionPolling,
    stopVersionPolling,
    isPollingActive: () => isPolling
  }
}
