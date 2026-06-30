export type NumberGeneratorKind =
    | 'custom'
    | 'time-sequence'
    | 'uuid'
    | 'ulid'
    | 'snowflake'
    | 'business'
    | 'batch'
    | 'short-code'
    | 'numeric-code'
    | 'trace-id'
    | 'checksum'
    | 'id-card'

export type RandomCharsetPreset = 'safe-upper' | 'upper-number' | 'number' | 'custom'

export type BusinessNumberDomain =
    | 'bookkeeping'
    | 'task'
    | 'points'
    | 'meal'
    | 'dishes'
    | 'website'
    | 'common'

export type TraceIdFormat = 'hex16' | 'hex32'

export type ChecksumAlgorithm = 'luhn' | 'mod11'

export type IdCardSampleMode =
    | 'valid'
    | 'mixed'
    | 'invalid-checksum'
    | 'invalid-date'
    | 'invalid-length'
    | 'lowercase-x'

export type IdCardSex = 'any' | 'male' | 'female'

export interface CustomNumberOptions {
    prefix: string
    suffix: string
    separator: string
    includeDate: boolean
    datePattern: string
    includeSequence: boolean
    sequenceStart: number
    sequenceStep: number
    sequenceLength: number
    includeRandom: boolean
    randomLength: number
    randomCharsetPreset: RandomCharsetPreset
    customCharset: string
    uppercase: boolean
}

export interface TimeSequenceOptions {
    datePattern: string
    separator: string
    sequenceStart: number
    sequenceStep: number
    sequenceLength: number
}

export interface SnowflakeOptions {
    epoch: string
    nodeId: number
    sequenceStart: number
}

export interface BusinessNumberOptions {
    domain: BusinessNumberDomain
    separator: string
    datePattern: string
    sequenceStart: number
    sequenceStep: number
    sequenceLength: number
}

export interface BatchNumberOptions {
    prefix: string
    separator: string
    datePattern: string
    sequenceStart: number
    sequenceStep: number
    sequenceLength: number
}

export interface ShortCodeOptions {
    length: number
    randomCharsetPreset: RandomCharsetPreset
    customCharset: string
}

export interface NumericCodeOptions {
    length: number
    allowLeadingZero: boolean
}

export interface TraceIdOptions {
    format: TraceIdFormat
}

export interface ChecksumNumberOptions {
    prefix: string
    datePattern: string
    sequenceStart: number
    sequenceStep: number
    sequenceLength: number
    algorithm: ChecksumAlgorithm
}

export interface IdCardOptions {
    sampleMode: IdCardSampleMode
    areaCodeMode: 'random' | 'fixed'
    areaCode: string
    birthDateRange: [string, string]
    sex: IdCardSex
    sequenceStart: number
}

export interface NumberGenerationSettings {
    kind: NumberGeneratorKind
    count: number
    custom: CustomNumberOptions
    timeSequence: TimeSequenceOptions
    snowflake: SnowflakeOptions
    business: BusinessNumberOptions
    batch: BatchNumberOptions
    shortCode: ShortCodeOptions
    numericCode: NumericCodeOptions
    traceId: TraceIdOptions
    checksum: ChecksumNumberOptions
    idCard: IdCardOptions
}

export interface GeneratedNumberRecord {
    index: number
    value: string
    kind: NumberGeneratorKind
    label: string
    status: 'normal' | 'warning' | 'error'
    description: string
}

export interface NumberGenerationResult {
    records: GeneratedNumberRecord[]
    generatedAt: string
    elapsedMs: number
    duplicateCount: number
    warnings: string[]
}

export type NumberExportFormat = 'txt' | 'csv' | 'json'
