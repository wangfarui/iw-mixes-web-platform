import type {
    BusinessNumberDomain,
    NumberGenerationSettings,
    NumberGeneratorKind,
    RandomCharsetPreset
} from '@/types/numberGenerator'

export const MAX_GENERATE_COUNT = 10000

export const DATE_PATTERN_OPTIONS = [
    {label: 'YYYYMMDD', value: 'YYYYMMDD'},
    {label: 'YYYY-MM-DD', value: 'YYYY-MM-DD'},
    {label: 'YYYYMMDDHHmmss', value: 'YYYYMMDDHHmmss'},
    {label: 'YYYYMMDDHHmmssSSS', value: 'YYYYMMDDHHmmssSSS'}
]

export const GENERATOR_KIND_OPTIONS: Array<{ label: string; value: NumberGeneratorKind }> = [
    {label: '自定义规则编号', value: 'custom'},
    {label: '身份证测试编号', value: 'id-card'},
    {label: '时间序列号', value: 'time-sequence'},
    {label: 'UUID v4', value: 'uuid'},
    {label: 'ULID 风格编号', value: 'ulid'},
    {label: 'Snowflake 风格编号', value: 'snowflake'},
    {label: '业务单据号', value: 'business'},
    {label: '批次号', value: 'batch'},
    {label: '短码', value: 'short-code'},
    {label: '数字验证码', value: 'numeric-code'},
    {label: 'Trace ID / Request ID', value: 'trace-id'},
    {label: '带校验位编号', value: 'checksum'}
]

export const RANDOM_CHARSET_OPTIONS: Array<{ label: string; value: RandomCharsetPreset }> = [
    {label: '安全大写字符', value: 'safe-upper'},
    {label: '大写字母 + 数字', value: 'upper-number'},
    {label: '数字', value: 'number'},
    {label: '自定义字符集', value: 'custom'}
]

export const BUSINESS_DOMAIN_OPTIONS: Array<{ label: string; value: BusinessNumberDomain; prefix: string }> = [
    {label: '记账单号', value: 'bookkeeping', prefix: 'BK'},
    {label: '任务编号', value: 'task', prefix: 'TASK'},
    {label: '积分流水号', value: 'points', prefix: 'PTS'},
    {label: '餐食批次', value: 'meal', prefix: 'MEAL'},
    {label: '菜品编号', value: 'dishes', prefix: 'DISH'},
    {label: '网站导航编号', value: 'website', prefix: 'WEB'},
    {label: '通用业务号', value: 'common', prefix: 'IW'}
]

export const BUSINESS_PREFIX_MAP = BUSINESS_DOMAIN_OPTIONS.reduce<Record<BusinessNumberDomain, string>>(
    (map, item) => {
        map[item.value] = item.prefix
        return map
    },
    {} as Record<BusinessNumberDomain, string>
)

export const createDefaultNumberGeneratorSettings = (): NumberGenerationSettings => ({
    kind: 'custom',
    count: 20,
    custom: {
        prefix: 'IW',
        suffix: '',
        separator: '-',
        includeDate: true,
        datePattern: 'YYYYMMDD',
        includeSequence: true,
        sequenceStart: 1,
        sequenceStep: 1,
        sequenceLength: 4,
        includeRandom: false,
        randomLength: 4,
        randomCharsetPreset: 'safe-upper',
        customCharset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
        uppercase: true
    },
    timeSequence: {
        datePattern: 'YYYYMMDDHHmmssSSS',
        separator: '-',
        sequenceStart: 1,
        sequenceStep: 1,
        sequenceLength: 4
    },
    snowflake: {
        epoch: '2024-01-01T00:00:00.000Z',
        nodeId: 1,
        sequenceStart: 0
    },
    business: {
        domain: 'bookkeeping',
        separator: '',
        datePattern: 'YYYYMMDD',
        sequenceStart: 1,
        sequenceStep: 1,
        sequenceLength: 4
    },
    batch: {
        prefix: 'BATCH',
        separator: '-',
        datePattern: 'YYYYMMDD',
        sequenceStart: 1,
        sequenceStep: 1,
        sequenceLength: 3
    },
    shortCode: {
        length: 6,
        randomCharsetPreset: 'safe-upper',
        customCharset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    },
    numericCode: {
        length: 6,
        allowLeadingZero: true
    },
    traceId: {
        format: 'hex32'
    },
    checksum: {
        prefix: 'IW',
        datePattern: 'YYYYMMDD',
        sequenceStart: 1,
        sequenceStep: 1,
        sequenceLength: 4,
        algorithm: 'luhn'
    },
    idCard: {
        sampleMode: 'valid',
        areaCodeMode: 'random',
        areaCode: '110000',
        birthDateRange: ['1980-01-01', '2010-12-31'],
        sex: 'any',
        sequenceStart: 1
    }
})
