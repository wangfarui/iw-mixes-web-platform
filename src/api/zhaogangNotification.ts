import { zhaogangRequest } from './zhaogang'
import type { WorklogNotificationCommand, WorklogNotificationStatus, WorklogNotificationTestResult } from '@/types/zhaogangNotification'
const path = (id: number) => `/teams/${id}/worklog-notification`
export const getWorklogNotification = (id: number) => zhaogangRequest<WorklogNotificationStatus>(path(id))
export const saveWorklogNotification = (id: number, command: WorklogNotificationCommand) =>
  zhaogangRequest<WorklogNotificationStatus>(path(id), { method: 'PUT', body: JSON.stringify(command) })
export const testWorklogNotification = (id: number, revision: number, webhook: string) =>
  zhaogangRequest<WorklogNotificationTestResult>(`${path(id)}/test`, { method: 'POST', body: JSON.stringify({ revision, webhook }) })

export const sendWorklogReportNow = (id: number, revision: number, requestId: string) =>
  zhaogangRequest<WorklogNotificationStatus>(`${path(id)}/send-now`, { method: 'POST', body: JSON.stringify({ revision, requestId }) })
