import { getDictVersion, refreshDictCache } from '@/api/login'
import { createVersionPollingService } from '@/services/versionPollingServiceCore'

const versionPollingService = createVersionPollingService({
  hasToken: () => Boolean(window.sessionStorage.getItem('iwtoken')),
  getVersion: async () => {
    const response = await getDictVersion()
    return response.data
  },
  refreshCache: () => {
    console.log('字典版本号发生变化，刷新字典缓存')
    refreshDictCache()
  },
  schedule: (callback, intervalMs) => window.setInterval(callback, intervalMs),
  cancel: timer => window.clearInterval(timer),
  reportError: error => console.error('获取字典版本号失败:', error)
})

export default versionPollingService
