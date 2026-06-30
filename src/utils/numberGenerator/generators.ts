import type {
    CustomNumberOptions,
    GeneratedNumberRecord,
    NumberGenerationResult,
    NumberGenerationSettings,
    NumberGeneratorKind,
    RandomCharsetPreset
} from '@/types/numberGenerator'
import {
    BUSINESS_PREFIX_MAP,
    GENERATOR_KIND_OPTIONS,
    MAX_GENERATE_COUNT
} from './config'
import {
    calculateLuhnCheckDigit,
    calculateMod11CheckDigit
} from './checksum'
import {generateIdCardSample} from './idCard'

const SAFE_UPPER_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const UPPER_NUMBER_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const NUMBER_CHARSET = '0123456789'
const HEX_CHARSET = '0123456789abcdef'
const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

const KIND_LABEL_MAP = GENERATOR_KIND_OPTIONS.reduce<Record<NumberGeneratorKind, string>>(
    (map, item) => {
        map[item.value] = item.label
        return map
    },
    {} as Record<NumberGeneratorKind, string>
)

export const getNumberGeneratorKindLabel = (kind: NumberGeneratorKind): string => {
    return KIND_LABEL_MAP[kind] || kind
}

const randomInt = (min: number, max: number): number => {
    const lower = Math.ceil(min)
    const upper = Math.floor(max)

    if (upper <= lower) {
        return lower
    }

    const range = upper - lower + 1
    const cryptoApi = globalThis.crypto

    if (cryptoApi?.getRandomValues) {
        const values = new Uint32Array(1)
        cryptoApi.getRandomValues(values)
        return lower + (values[0] % range)
    }

    return lower + Math.floor(Math.random() * range)
}

const getCharset = (preset: RandomCharsetPreset, customCharset: string): string => {
    const source = preset === 'safe-upper'
        ? SAFE_UPPER_CHARSET
        : preset === 'upper-number'
            ? UPPER_NUMBER_CHARSET
            : preset === 'number'
                ? NUMBER_CHARSET
                : customCharset

    return Array.from(new Set(source.split(''))).join('') || SAFE_UPPER_CHARSET
}

const randomText = (length: number, charset: string): string => {
    const size = Math.max(0, Math.trunc(length))
    let value = ''

    for (let index = 0; index < size; index += 1) {
        value += charset[randomInt(0, charset.length - 1)]
    }

    return value
}

const randomHex = (length: number): string => randomText(length, HEX_CHARSET)

const padNumber = (value: number, length: number): string => {
    return String(Math.trunc(Math.abs(value))).padStart(Math.max(1, Math.trunc(length)), '0')
}

const formatDate = (date: Date, pattern: string): string => {
    const values: Record<string, string> = {
        YYYY: String(date.getFullYear()),
        YY: String(date.getFullYear()).slice(-2),
        MM: String(date.getMonth() + 1).padStart(2, '0'),
        DD: String(date.getDate()).padStart(2, '0'),
        HH: String(date.getHours()).padStart(2, '0'),
        mm: String(date.getMinutes()).padStart(2, '0'),
        ss: String(date.getSeconds()).padStart(2, '0'),
        SSS: String(date.getMilliseconds()).padStart(3, '0')
    }

    return pattern.replace(/YYYY|YY|MM|DD|HH|mm|ss|SSS/g, (token) => values[token] || token)
}

const normalizeCount = (count: number): number => {
    return Math.min(MAX_GENERATE_COUNT, Math.max(1, Math.trunc(Number(count) || 1)))
}

const sequenceValue = (start: number, step: number, index: number): number => {
    return Math.trunc(Number(start) || 0) + Math.trunc(Number(step) || 1) * index
}

const generateUuid = (): string => {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID()
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const value = randomInt(0, 15)
        const finalValue = char === 'x' ? value : (value & 0x3) | 0x8
        return finalValue.toString(16)
    })
}

const encodeUlidTimestamp = (timestamp: number): string => {
    let value = BigInt(Math.max(0, Math.trunc(timestamp)))
    let output = ''

    for (let index = 0; index < 10; index += 1) {
        output = CROCKFORD_BASE32[Number(value % 32n)] + output
        value /= 32n
    }

    return output
}

const generateUlid = (timestamp: number): string => {
    return `${encodeUlidTimestamp(timestamp)}${randomText(16, CROCKFORD_BASE32)}`
}

const generateCustomNumber = (options: CustomNumberOptions, date: Date, index: number): string => {
    const parts = [
        options.prefix,
        options.includeDate ? formatDate(date, options.datePattern) : '',
        options.includeSequence ? padNumber(sequenceValue(options.sequenceStart, options.sequenceStep, index), options.sequenceLength) : '',
        options.includeRandom ? randomText(options.randomLength, getCharset(options.randomCharsetPreset, options.customCharset)) : '',
        options.suffix
    ].filter(Boolean)

    const value = parts.join(options.separator)

    return options.uppercase ? value.toUpperCase() : value
}

const generateSnowflakeNumber = (settings: NumberGenerationSettings, index: number, now: number): string => {
    const epochMs = Number.isFinite(Date.parse(settings.snowflake.epoch))
        ? Date.parse(settings.snowflake.epoch)
        : Date.UTC(2024, 0, 1)
    const timestamp = BigInt(Math.max(0, now + Math.floor(index / 4096) - epochMs))
    const nodeId = BigInt(Math.max(0, Math.min(1023, Math.trunc(settings.snowflake.nodeId || 0))))
    const sequence = BigInt((Math.trunc(settings.snowflake.sequenceStart || 0) + index) & 0xfff)

    return String((timestamp << 22n) | (nodeId << 12n) | sequence)
}

const generateChecksumNumber = (settings: NumberGenerationSettings, baseDate: Date, index: number): string => {
    const body = `${formatDate(baseDate, settings.checksum.datePattern)}${padNumber(
        sequenceValue(settings.checksum.sequenceStart, settings.checksum.sequenceStep, index),
        settings.checksum.sequenceLength
    )}`
    const checkDigit = settings.checksum.algorithm === 'luhn'
        ? calculateLuhnCheckDigit(body)
        : calculateMod11CheckDigit(body)

    return `${settings.checksum.prefix}${body}${checkDigit}`
}

const generateRecordValue = (
    settings: NumberGenerationSettings,
    index: number,
    baseDate: Date
): Pick<GeneratedNumberRecord, 'value' | 'description' | 'status'> => {
    const now = baseDate.getTime()

    if (settings.kind === 'custom') {
        return {
            value: generateCustomNumber(settings.custom, baseDate, index),
            description: '自定义规则生成',
            status: 'normal'
        }
    }

    if (settings.kind === 'time-sequence') {
        const value = `${formatDate(new Date(now + index), settings.timeSequence.datePattern)}${settings.timeSequence.separator}${padNumber(
            sequenceValue(settings.timeSequence.sequenceStart, settings.timeSequence.sequenceStep, index),
            settings.timeSequence.sequenceLength
        )}`

        return {
            value,
            description: '时间 + 递增序号',
            status: 'normal'
        }
    }

    if (settings.kind === 'uuid') {
        return {
            value: generateUuid(),
            description: 'UUID v4',
            status: 'normal'
        }
    }

    if (settings.kind === 'ulid') {
        return {
            value: generateUlid(now + index),
            description: '时间有序 26 位编号',
            status: 'normal'
        }
    }

    if (settings.kind === 'snowflake') {
        return {
            value: generateSnowflakeNumber(settings, index, now),
            description: '前端模拟 Snowflake',
            status: 'warning'
        }
    }

    if (settings.kind === 'business') {
        const prefix = BUSINESS_PREFIX_MAP[settings.business.domain]
        const value = `${prefix}${settings.business.separator}${formatDate(baseDate, settings.business.datePattern)}${settings.business.separator}${padNumber(
            sequenceValue(settings.business.sequenceStart, settings.business.sequenceStep, index),
            settings.business.sequenceLength
        )}`

        return {
            value,
            description: '业务单据草稿号',
            status: 'normal'
        }
    }

    if (settings.kind === 'batch') {
        const value = `${settings.batch.prefix}${settings.batch.separator}${formatDate(baseDate, settings.batch.datePattern)}${settings.batch.separator}${padNumber(
            sequenceValue(settings.batch.sequenceStart, settings.batch.sequenceStep, index),
            settings.batch.sequenceLength
        )}`

        return {
            value,
            description: '批次号',
            status: 'normal'
        }
    }

    if (settings.kind === 'short-code') {
        return {
            value: randomText(settings.shortCode.length, getCharset(settings.shortCode.randomCharsetPreset, settings.shortCode.customCharset)),
            description: '短码测试值',
            status: 'normal'
        }
    }

    if (settings.kind === 'numeric-code') {
        const first = settings.numericCode.allowLeadingZero ? randomInt(0, 9) : randomInt(1, 9)
        const restLength = Math.max(0, settings.numericCode.length - 1)

        return {
            value: `${first}${randomText(restLength, NUMBER_CHARSET)}`,
            description: '数字验证码测试值',
            status: 'normal'
        }
    }

    if (settings.kind === 'trace-id') {
        const length = settings.traceId.format === 'hex16' ? 16 : 32

        return {
            value: randomHex(length),
            description: `${length} 位 hex 链路 ID`,
            status: 'normal'
        }
    }

    if (settings.kind === 'checksum') {
        return {
            value: generateChecksumNumber(settings, baseDate, index),
            description: `${settings.checksum.algorithm.toUpperCase()} 校验位`,
            status: 'normal'
        }
    }

    const idCardSample = generateIdCardSample(settings.idCard, index)

    return {
        value: idCardSample.value,
        description: idCardSample.description,
        status: idCardSample.status
    }
}

export const generateNumberRecords = (settings: NumberGenerationSettings): NumberGenerationResult => {
    const startedAt = performance.now()
    const count = normalizeCount(settings.count)
    const baseDate = new Date()
    const seen = new Set<string>()
    let duplicateCount = 0
    const warnings: string[] = []
    const records: GeneratedNumberRecord[] = []

    for (let index = 0; index < count; index += 1) {
        const generated = generateRecordValue(settings, index, baseDate)

        if (seen.has(generated.value)) {
            duplicateCount += 1
        }

        seen.add(generated.value)
        records.push({
            index: index + 1,
            value: generated.value,
            kind: settings.kind,
            label: getNumberGeneratorKindLabel(settings.kind),
            status: generated.status,
            description: generated.description
        })
    }

    if (settings.count > MAX_GENERATE_COUNT) {
        warnings.push(`生成数量已限制为 ${MAX_GENERATE_COUNT} 条`)
    }

    if (settings.kind === 'snowflake') {
        warnings.push('Snowflake 风格编号为前端模拟值，不应作为正式分布式 ID 服务。')
    }

    if (settings.kind === 'id-card') {
        warnings.push('身份证编号仅用于正则、日期和校验位测试，不表示真实身份。')
    }

    return {
        records,
        generatedAt: new Date().toISOString(),
        elapsedMs: Math.round((performance.now() - startedAt) * 100) / 100,
        duplicateCount,
        warnings
    }
}

export const isDatePatternSupported = (pattern: string): boolean => {
    return /Y|M|D|H|m|s|S/.test(pattern)
}
