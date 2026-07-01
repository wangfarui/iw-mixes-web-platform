export interface GeneralResponse<T> {
    code: number
    message: string
    data?: T
}

export type NetworkDiagnosticsExportFormat = 'json' | 'txt'

export interface NetworkDiagnosticsCheckDto {
    target: string
    latencyEnabled: boolean
    dnsEnabled: boolean
    headersEnabled: boolean
    dnsRecordTypes: string[]
    probeCount: number
    timeoutMs: number
}

export interface NetworkDiagnosticsQuotaVo {
    scope: 'USER' | 'ANONYMOUS' | string
    dailyLimit: number
    dailyUsed: number
    minuteLimit: number
    minuteUsed: number
    totalDailyLimit: number
    totalDailyUsed: number
}

export interface NetworkDiagnosticsLatencyAttemptVo {
    index: number
    success: boolean
    statusCode?: number
    durationMs?: number
    finalUrl?: string
    error?: string
}

export interface NetworkDiagnosticsLatencyVo {
    success: boolean
    probeCount: number
    successCount: number
    failureCount: number
    minMs?: number
    avgMs?: number
    maxMs?: number
    jitterMs?: number
    attempts: NetworkDiagnosticsLatencyAttemptVo[]
    warnings: string[]
}

export interface NetworkDiagnosticsDnsRecordVo {
    type: string
    name: string
    value: string
}

export interface NetworkDiagnosticsDnsVo {
    success: boolean
    durationMs: number
    recordTypes: string[]
    records: NetworkDiagnosticsDnsRecordVo[]
    warnings: string[]
    error?: string
}

export interface NetworkDiagnosticsRedirectVo {
    fromUrl: string
    toUrl: string
    statusCode: number
    durationMs: number
}

export interface NetworkDiagnosticsHeadersVo {
    success: boolean
    statusCode?: number
    durationMs?: number
    finalUrl?: string
    redirects: NetworkDiagnosticsRedirectVo[]
    responseHeaders: Record<string, string[]>
    warnings: string[]
    error?: string
}

export interface NetworkDiagnosticsResultVo {
    input: string
    normalizedTarget: string
    host: string
    scheme: string
    port: number
    targetType: string
    queryPerspective: string
    authenticated: boolean
    checkedAt: string
    durationMs: number
    summary: string
    success: boolean
    quota?: NetworkDiagnosticsQuotaVo
    latency?: NetworkDiagnosticsLatencyVo
    dns?: NetworkDiagnosticsDnsVo
    headers?: NetworkDiagnosticsHeadersVo
    warnings: string[]
}
