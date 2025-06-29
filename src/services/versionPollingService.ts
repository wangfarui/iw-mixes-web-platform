import { getDictVersion, refreshDictCache } from '@/api/login'

class VersionPollingService {
  private versionPollingTimer: number | null = null
  private cachedVersion: number | null = null
  private isPolling: boolean = false

  // 版本号轮询函数
  pollDictVersion(): void {
    getDictVersion().then(response => {
      const currentVersion = response.data
      
      // 如果缓存版本号存在且与当前版本号不同，则刷新字典缓存
      if (this.cachedVersion !== null && this.cachedVersion !== currentVersion) {
        console.log('字典版本号发生变化，刷新字典缓存')
        refreshDictCache()
      }
      
      // 更新缓存的版本号
      this.cachedVersion = currentVersion
    }).catch(error => {
      console.error('获取字典版本号失败:', error)
    })
  }

  // 启动版本号轮询
  startVersionPolling(): void {
    if (this.isPolling) {
      console.log('版本号轮询已在运行中')
      return
    }

    console.log('启动版本号轮询')
    this.isPolling = true
    
    // 先获取一次版本号
    this.pollDictVersion()
    
    // 设置定时器，每5分钟轮询一次
    this.versionPollingTimer = setInterval(() => {
      this.pollDictVersion()
    }, 5 * 1000) // 5分钟 = 5 * 60 * 1000毫秒
  }

  // 停止版本号轮询
  stopVersionPolling(): void {
    if (this.versionPollingTimer) {
      console.log('停止版本号轮询')
      clearInterval(this.versionPollingTimer)
      this.versionPollingTimer = null
      this.isPolling = false
    }
    this.cachedVersion = null
  }

  // 检查是否正在轮询
  isPollingActive(): boolean {
    return this.isPolling
  }
}

// 创建单例实例
const versionPollingService = new VersionPollingService()

export default versionPollingService 