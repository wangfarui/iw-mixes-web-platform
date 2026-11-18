export interface WorklogNotificationRecord {
  id: string
  state: string
  reason: string
  accepted: number
  total: number
  createdAt: number
  kind: 'DAILY' | 'MANUAL' | 'TEST'
}
export interface WorklogNotificationStatus {
  enabled: boolean
  webhookConfigured: boolean
  summaryMemberId: number | null
  sendTime: string
  revision: number
  latest: WorklogNotificationRecord | null
  recent: WorklogNotificationRecord[]
  webhookHint: string | null
}
export interface WorklogNotificationTestResult {
  status: WorklogNotificationStatus
  state: string
  reason: string
}
export interface WorklogNotificationCommand {
  enabled: boolean
  revision: number
  summaryMemberId: number | null
  sendTime?: string
  webhook?: string
  clearWebhook?: boolean
}
