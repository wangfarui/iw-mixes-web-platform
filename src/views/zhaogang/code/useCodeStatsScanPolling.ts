import { onBeforeUnmount, onMounted, ref } from 'vue'
import { activeScanMonth } from './codeStatsPresentation'
import type { ZhaogangCodeStatsScan } from '@/types/zhaogangCodeStats'

export const useCodeStatsScanPolling = (options: {
  fetchScan: () => Promise<ZhaogangCodeStatsScan>
  onScan: (scan: ZhaogangCodeStatsScan) => void
  scopeKey: () => string
  onLocalRefresh: () => Promise<void>
  onProgress?: () => Promise<void>
  onFinished: (scan: ZhaogangCodeStatsScan) => void
}) => {
  const polling = ref(false)
  let timer: number | undefined
  let inFlight = false
  let progressTicks = 0
  let localTimer: number | undefined
  let disposed = false
  let refreshingLocal = false

  const stop = () => {
    polling.value = false
    if (timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }

  const isActive = (scan: ZhaogangCodeStatsScan) => Boolean(activeScanMonth(scan.months))

  const begin = (scan: ZhaogangCodeStatsScan) => {
    options.onScan(scan)
    if (!isActive(scan)) {
      stop()
      return
    }
    if (polling.value) return
    polling.value = true
    timer = window.setInterval(() => { void poll() }, 3000)
  }

  const poll = async () => {
    if (document.visibilityState !== 'visible' || inFlight) return
    inFlight = true
    const scope = options.scopeKey()
    try {
      const scan = await options.fetchScan()
      if (disposed || scope !== options.scopeKey()) return
      options.onScan(scan)
      if (!isActive(scan)) {
        stop()
        options.onFinished(scan)
      } else if (++progressTicks % 3 === 0) {
        await options.onProgress?.()
      }
    } catch {
      // 轮询失败不阻塞页面；下一轮继续。
    } finally {
      inFlight = false
    }
  }

  const refreshLocal = async (regainedFocus = false) => {
    if (disposed || refreshingLocal || !options.scopeKey() || document.visibilityState !== 'visible'
      || (!regainedFocus && polling.value)) return
    refreshingLocal = true
    try {
      await options.onLocalRefresh()
    } finally {
      refreshingLocal = false
    }
  }
  const onVisibility = () => { void refreshLocal(true) }
  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    localTimer = window.setInterval(() => { void refreshLocal() }, 15_000)
  })
  onBeforeUnmount(() => {
    disposed = true
    stop()
    window.clearInterval(localTimer)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return { polling, begin, stop }
}
