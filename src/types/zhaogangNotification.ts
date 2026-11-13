export interface WorklogNotificationStatus {
  enabled: boolean
  webhookConfigured: boolean
  revision: number
  latest: { state: string; reason: string; accepted: number; total: number; createdAt: number; kind: 'DAILY' | 'MANUAL' | 'TEST' } | null
}
export interface WorklogNotificationCommand {
  enabled: boolean
  revision: number
  webhook?: string
  clearWebhook?: boolean
}
