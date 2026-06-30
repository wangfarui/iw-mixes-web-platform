import type {IdCardOptions} from '@/types/numberGenerator'
import {calculateIdCardCheckCode, isValidIdCardChecksum} from './checksum'

const INVALID_BIRTH_DATES = ['19990230', '20001301', '20190229', '19800010', '20260431']

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

const parseDate = (value: string, fallback: string): Date => {
    const target = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback
    const [year, month, day] = target.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
}

const formatBirthDate = (date: Date): string => {
    const year = String(date.getUTCFullYear())
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}${month}${day}`
}

const randomBirthDate = (range: [string, string]): string => {
    const start = parseDate(range[0], '1980-01-01').getTime()
    const end = parseDate(range[1], '2010-12-31').getTime()
    const safeStart = Math.min(start, end)
    const safeEnd = Math.max(start, end)
    const dayMs = 24 * 60 * 60 * 1000
    const days = Math.floor((safeEnd - safeStart) / dayMs)
    const offset = randomInt(0, Math.max(days, 0))

    return formatBirthDate(new Date(safeStart + offset * dayMs))
}

const normalizeAreaCode = (options: IdCardOptions): string => {
    if (options.areaCodeMode === 'fixed') {
        const digits = options.areaCode.replace(/\D/g, '').slice(0, 6)
        return digits.padEnd(6, '0').replace(/^0/, '1')
    }

    return String(randomInt(100000, 999999))
}

const normalizeSequence = (rawSequence: number, sex: IdCardOptions['sex']): string => {
    let sequence = Math.abs(Math.trunc(rawSequence)) % 1000

    if (sequence === 0) {
        sequence = 1
    }

    if (sex === 'male' && sequence % 2 === 0) {
        sequence = sequence === 998 ? 999 : sequence + 1
    }

    if (sex === 'female' && sequence % 2 === 1) {
        sequence = sequence === 999 ? 998 : sequence + 1
    }

    return String(sequence).padStart(3, '0')
}

const flipCheckCode = (value: string): string => {
    const checkCode = value.slice(17).toUpperCase()
    return `${value.slice(0, 17)}${checkCode === 'X' ? '0' : 'X'}`
}

export const createIdCardNumber = (
    areaCode: string,
    birthDate: string,
    sequenceCode: string
): string => {
    const first17Digits = `${areaCode}${birthDate}${sequenceCode}`
    return `${first17Digits}${calculateIdCardCheckCode(first17Digits)}`
}

export const generateValidIdCardNumber = (options: IdCardOptions, index: number): string => {
    const areaCode = normalizeAreaCode(options)
    const birthDate = randomBirthDate(options.birthDateRange)
    const sequenceCode = normalizeSequence(options.sequenceStart + index, options.sex)

    return createIdCardNumber(areaCode, birthDate, sequenceCode)
}

export const generateInvalidChecksumIdCardNumber = (options: IdCardOptions, index: number): string => {
    return flipCheckCode(generateValidIdCardNumber(options, index))
}

export const generateInvalidDateIdCardNumber = (options: IdCardOptions, index: number): string => {
    const areaCode = normalizeAreaCode(options)
    const birthDate = INVALID_BIRTH_DATES[index % INVALID_BIRTH_DATES.length]
    const sequenceCode = normalizeSequence(options.sequenceStart + index, options.sex)

    return createIdCardNumber(areaCode, birthDate, sequenceCode)
}

export const generateInvalidLengthIdCardNumber = (options: IdCardOptions, index: number): string => {
    const value = generateValidIdCardNumber(options, index)

    if (index % 2 === 0) {
        return value.slice(0, 17)
    }

    return `${value}${randomInt(0, 9)}`
}

export const generateLowercaseXIdCardNumber = (options: IdCardOptions, index: number): string => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        const value = generateValidIdCardNumber(options, index + attempt)

        if (value.endsWith('X')) {
            return `${value.slice(0, 17)}x`
        }
    }

    const first17Digits = `${normalizeAreaCode(options)}${randomBirthDate(options.birthDateRange)}${normalizeSequence(options.sequenceStart + index, options.sex)}`
    const adjustedFirst17Digits = `${first17Digits.slice(0, 16)}${findLastDigitForCheckCode(first17Digits.slice(0, 16), 'X')}`

    return `${adjustedFirst17Digits}x`
}

export const generateIdCardSample = (
    options: IdCardOptions,
    index: number
): { value: string; description: string; status: 'normal' | 'warning' | 'error' } => {
    const mode = options.sampleMode === 'mixed'
        ? (['valid', 'invalid-checksum', 'invalid-date', 'invalid-length', 'lowercase-x'] as const)[index % 5]
        : options.sampleMode

    if (mode === 'invalid-checksum') {
        return {
            value: generateInvalidChecksumIdCardNumber(options, index),
            description: '错误校验位测试号',
            status: 'error'
        }
    }

    if (mode === 'invalid-date') {
        return {
            value: generateInvalidDateIdCardNumber(options, index),
            description: '错误出生日期测试号',
            status: 'error'
        }
    }

    if (mode === 'invalid-length') {
        return {
            value: generateInvalidLengthIdCardNumber(options, index),
            description: '长度异常测试号',
            status: 'error'
        }
    }

    if (mode === 'lowercase-x') {
        return {
            value: generateLowercaseXIdCardNumber(options, index),
            description: '小写 x 末位测试号',
            status: 'warning'
        }
    }

    const value = generateValidIdCardNumber(options, index)

    return {
        value,
        description: isValidIdCardChecksum(value) ? '格式、日期、校验位测试通过' : '校验位异常',
        status: isValidIdCardChecksum(value) ? 'normal' : 'error'
    }
}

const findLastDigitForCheckCode = (first16Digits: string, targetCheckCode: string): string => {
    for (let digit = 0; digit <= 9; digit += 1) {
        const candidate = `${first16Digits}${digit}`

        if (calculateIdCardCheckCode(candidate) === targetCheckCode) {
            return String(digit)
        }
    }

    return '0'
}
