import { recordToolUsage } from '@/api/toolUsage'
import { createToolUsageReporter } from '@/services/toolUsageReporterCore'

export { createToolUsageReporter } from '@/services/toolUsageReporterCore'

export const reportToolUsage = createToolUsageReporter({
  record: recordToolUsage,
  getStorage: () => typeof window === 'undefined' ? undefined : window.localStorage,
  now: () => Date.now()
})
