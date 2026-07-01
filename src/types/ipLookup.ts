export interface GeneralResponse<T> {
    code: number
    message: string
    data: T
}

export type IpLookupMode = 'auto' | 'ip' | 'domain'

export type IpLookupTargetType = 'CURRENT_IP' | 'IP' | 'DOMAIN'

export type IpLookupExportFormat = 'json' | 'csv' | 'txt'

export interface IpLookupQueryDto {
    input: string
    mode: IpLookupMode
}

export interface IpLocationVo {
    provider?: string
    status?: string
    info?: string
    country?: string
    province?: string
    city?: string
    adcode?: string
    rectangle?: string
    raw?: Record<string, unknown>
}

export interface IpLookupRecordVo {
    host?: string
    ip: string
    family: 'IPv4' | 'IPv6' | string
    publicIp: boolean
    addressType: string
    location?: IpLocationVo
    message?: string
}

export interface IpLookupResultVo {
    input: string
    normalizedInput: string
    targetType: IpLookupTargetType | string
    queryPerspective: string
    clientIp?: string
    queriedAt: string
    records: IpLookupRecordVo[]
    warnings: string[]
}

export interface IpLookupHistoryRecord {
    id: string
    createdAt: string
    input: string
    mode: IpLookupMode
    result: IpLookupResultVo
}
