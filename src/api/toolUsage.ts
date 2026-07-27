import service from '@/api/request'
import type { GeneralResponse, ToolUsageRecordDto, ToolUsageSummary } from '@/types/toolUsage'

export const recordToolUsage = async (dto: ToolUsageRecordDto): Promise<void> => {
  await service.post('/external-service/api/tools/usage/record', dto, { silent: true })
}

export const getToolUsageSummary = async (): Promise<ToolUsageSummary> => {
  const response = await service.get<GeneralResponse<ToolUsageSummary>>(
    '/external-service/api/tools/usage/summary',
    { silent: true }
  )
  return (response as unknown as GeneralResponse<ToolUsageSummary>).data
}
