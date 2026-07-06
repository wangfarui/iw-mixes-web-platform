import type {
    AddressExportFormat,
    AddressFieldNaming,
    GeneratedAddressProfile
} from '@/types/addressGenerator'

interface ExportField {
    camel: string
    snake: string
    chinese: string
    getValue: (profile: GeneratedAddressProfile) => string | number
}

const EXPORT_FIELDS: ExportField[] = [
    {camel: 'userId', snake: 'user_id', chinese: '用户ID', getValue: (profile) => profile.user.userId},
    {camel: 'username', snake: 'username', chinese: '用户名', getValue: (profile) => profile.user.username},
    {camel: 'fullName', snake: 'full_name', chinese: '姓名', getValue: (profile) => profile.user.fullName},
    {camel: 'gender', snake: 'gender', chinese: '性别', getValue: (profile) => profile.user.gender},
    {camel: 'birthday', snake: 'birthday', chinese: '生日', getValue: (profile) => profile.user.birthday},
    {camel: 'age', snake: 'age', chinese: '年龄', getValue: (profile) => profile.user.age},
    {camel: 'email', snake: 'email', chinese: '邮箱', getValue: (profile) => profile.user.email},
    {camel: 'phone', snake: 'phone', chinese: '测试手机号', getValue: (profile) => profile.user.phone},
    {camel: 'company', snake: 'company', chinese: '公司', getValue: (profile) => profile.user.company},
    {camel: 'jobTitle', snake: 'job_title', chinese: '职位', getValue: (profile) => profile.user.jobTitle},
    {camel: 'avatarUrl', snake: 'avatar_url', chinese: '头像占位URL', getValue: (profile) => profile.user.avatarUrl},
    {camel: 'tags', snake: 'tags', chinese: '标签', getValue: (profile) => profile.user.tags.join('|')},
    {camel: 'country', snake: 'country', chinese: '国家', getValue: (profile) => profile.address.country},
    {camel: 'countryCode', snake: 'country_code', chinese: '国家代码', getValue: (profile) => profile.address.countryCode},
    {camel: 'region', snake: 'region', chinese: '地区', getValue: (profile) => profile.address.region},
    {camel: 'state', snake: 'state', chinese: '省州地区', getValue: (profile) => profile.address.state},
    {camel: 'city', snake: 'city', chinese: '城市', getValue: (profile) => profile.address.city},
    {camel: 'district', snake: 'district', chinese: '区县区域', getValue: (profile) => profile.address.district},
    {camel: 'street', snake: 'street', chinese: '街道', getValue: (profile) => profile.address.street},
    {camel: 'buildingNumber', snake: 'building_number', chinese: '门牌', getValue: (profile) => profile.address.buildingNumber},
    {camel: 'streetAddress', snake: 'street_address', chinese: '街道地址', getValue: (profile) => profile.address.streetAddress},
    {camel: 'postalCode', snake: 'postal_code', chinese: '邮编', getValue: (profile) => profile.address.postalCode},
    {camel: 'fullAddress', snake: 'full_address', chinese: '完整地址', getValue: (profile) => profile.address.fullAddress},
    {camel: 'latitude', snake: 'latitude', chinese: '纬度', getValue: (profile) => profile.address.latitude || ''},
    {camel: 'longitude', snake: 'longitude', chinese: '经度', getValue: (profile) => profile.address.longitude || ''},
    {camel: 'localeCode', snake: 'locale_code', chinese: 'Locale', getValue: (profile) => profile.localeCode},
    {camel: 'generatedAt', snake: 'generated_at', chinese: '生成时间', getValue: (profile) => profile.generatedAt}
]

const getFieldName = (field: ExportField, naming: AddressFieldNaming): string => {
    return field[naming]
}

const escapeCsv = (value: string | number): string => {
    const text = String(value)

    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
    }

    return text
}

export const createAddressProfilePayload = (
    profile: GeneratedAddressProfile,
    naming: AddressFieldNaming
): Record<string, string | number> => {
    return EXPORT_FIELDS.reduce<Record<string, string | number>>((payload, field) => {
        payload[getFieldName(field, naming)] = field.getValue(profile)
        return payload
    }, {})
}

export const formatAddressProfile = (
    profile: GeneratedAddressProfile,
    format: AddressExportFormat,
    naming: AddressFieldNaming
): string => {
    const payload = createAddressProfilePayload(profile, naming)

    if (format === 'json') {
        return JSON.stringify(payload, null, 2)
    }

    if (format === 'csv') {
        const header = Object.keys(payload)
        const row = header.map((key) => payload[key])

        return [
            header.map(escapeCsv).join(','),
            row.map(escapeCsv).join(',')
        ].join('\n')
    }

    return [
        '用户资料',
        `用户ID：${profile.user.userId}`,
        `用户名：${profile.user.username}`,
        `姓名：${profile.user.fullName}`,
        `性别：${profile.user.genderLabel}`,
        `生日：${profile.user.birthday}`,
        `年龄：${profile.user.age}`,
        `邮箱：${profile.user.email}`,
        `测试手机号：${profile.user.phone}`,
        `公司：${profile.user.company}`,
        `职位：${profile.user.jobTitle}`,
        `标签：${profile.user.tags.join('、')}`,
        '',
        '地址信息',
        `国家：${profile.address.countryLocalName} / ${profile.address.country}`,
        `国家代码：${profile.address.countryCode}`,
        `省州地区：${profile.address.state || '-'}`,
        `城市：${profile.address.city || '-'}`,
        `区县区域：${profile.address.district || '-'}`,
        `街道地址：${profile.address.streetAddress || '-'}`,
        `邮编：${profile.address.postalCode || '-'}`,
        `完整地址：${profile.address.fullAddress}`,
        profile.address.latitude && profile.address.longitude
            ? `经纬度：${profile.address.latitude}, ${profile.address.longitude}`
            : '',
        '',
        `Locale：${profile.localeCode}`,
        `生成时间：${profile.generatedAt}`
    ].filter((line) => line !== '').join('\n')
}

export const downloadAddressProfile = (
    profile: GeneratedAddressProfile,
    format: AddressExportFormat,
    naming: AddressFieldNaming,
    filenamePrefix = 'address-generator'
): void => {
    const content = formatAddressProfile(profile, format, naming)
    const mime = format === 'json'
        ? 'application/json'
        : format === 'csv'
            ? 'text/csv'
            : 'text/plain'
    const blob = new Blob([content], {type: `${mime};charset=utf-8`})
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)

    link.href = url
    link.download = `${filenamePrefix}-${timestamp}.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}
