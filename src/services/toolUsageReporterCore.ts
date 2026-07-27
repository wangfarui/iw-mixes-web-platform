import type { ToolUsageStorage } from '@/utils/toolUsage'
import { markToolUsageReported, shouldReportToolUsage } from '@/utils/toolUsage'

type RecordToolUsage = (request: { toolKey: string }) => Promise<void>

interface ToolUsageReporterOptions {
  record: RecordToolUsage
  getStorage: () => ToolUsageStorage | undefined
  now: () => number
}

export const createToolUsageReporter = ({ record, getStorage, now }: ToolUsageReporterOptions) => {
  const inFlightToolKeys = new Set<string>()

  return async (toolKey: string): Promise<void> => {
    if (!toolKey || inFlightToolKeys.has(toolKey)) {
      return
    }

    try {
      const storage = getStorage()
      if (!storage) {
        return
      }
      const reportedAt = now()
      if (!shouldReportToolUsage(toolKey, storage, reportedAt)) {
        return
      }
      inFlightToolKeys.add(toolKey)
      await record({ toolKey })
      markToolUsageReported(toolKey, storage, reportedAt)
    } catch {
      // 统计是可选能力，失败不能影响工具使用或写入去重时间。
    } finally {
      inFlightToolKeys.delete(toolKey)
    }
  }
}
