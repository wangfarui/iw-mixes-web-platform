import { recordToolUsage } from '@/api/toolUsage'
import { markToolUsageReported, shouldReportToolUsage } from '@/utils/toolUsage'

export const reportToolUsage = async (toolKey: string): Promise<void> => {
  if (typeof window === 'undefined' || !toolKey) {
    return
  }
  const now = Date.now()
  if (!shouldReportToolUsage(toolKey, window.localStorage, now)) {
    return
  }
  try {
    await recordToolUsage({ toolKey })
    markToolUsageReported(toolKey, window.localStorage, now)
  } catch {
    // 统计是可选能力，失败不能影响工具使用或写入去重时间。
  }
}
