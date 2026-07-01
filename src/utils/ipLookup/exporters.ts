import type { IpLookupExportFormat, IpLookupRecordVo, IpLookupResultVo } from '@/types/ipLookup'

const escapeCsv = (value: unknown): string => {
    const text = value == null ? '' : String(value)

    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
    }

    return text
}

const formatLocation = (record: IpLookupRecordVo): string => {
    const location = record.location
    if (!location) {
        return ''
    }

    return [
        location.country,
        location.province,
        location.city
    ].filter(Boolean).join(' ')
}

const formatTextReport = (result: IpLookupResultVo): string => {
    const lines = [
        'IP地址解析结果',
        `查询目标：${result.input}`,
        `规范目标：${result.normalizedInput}`,
        `目标类型：${result.targetType}`,
        `查询视角：${result.queryPerspective}`,
        `查询时间：${result.queriedAt}`,
        ''
    ]

    if (result.warnings.length) {
        lines.push('提示：')
        result.warnings.forEach((warning) => lines.push(`- ${warning}`))
        lines.push('')
    }

    lines.push('记录：')
    result.records.forEach((record, index) => {
        lines.push(`${index + 1}. ${record.ip} (${record.family})`)
        lines.push(`   Host：${record.host || '-'}`)
        lines.push(`   地址类型：${record.addressType}`)
        lines.push(`   公网地址：${record.publicIp ? '是' : '否'}`)
        lines.push(`   位置：${formatLocation(record) || '-'}`)
        lines.push(`   行政区划：${record.location?.adcode || '-'}`)
        if (record.message) {
            lines.push(`   提示：${record.message}`)
        }
    })

    return lines.join('\n')
}

const formatCsvReport = (result: IpLookupResultVo): string => {
    const header = [
        'input',
        'normalizedInput',
        'targetType',
        'host',
        'ip',
        'family',
        'publicIp',
        'addressType',
        'country',
        'province',
        'city',
        'adcode',
        'provider',
        'message'
    ]

    const rows = result.records.map((record) => [
        result.input,
        result.normalizedInput,
        result.targetType,
        record.host || '',
        record.ip,
        record.family,
        record.publicIp ? 'true' : 'false',
        record.addressType,
        record.location?.country || '',
        record.location?.province || '',
        record.location?.city || '',
        record.location?.adcode || '',
        record.location?.provider || '',
        record.message || ''
    ])

    return [
        header.map(escapeCsv).join(','),
        ...rows.map((row) => row.map(escapeCsv).join(','))
    ].join('\n')
}

export const formatIpLookupResult = (
    result: IpLookupResultVo,
    format: IpLookupExportFormat
): string => {
    if (format === 'json') {
        return JSON.stringify(result, null, 2)
    }

    if (format === 'csv') {
        return formatCsvReport(result)
    }

    return formatTextReport(result)
}

export const downloadIpLookupResult = (
    result: IpLookupResultVo,
    format: IpLookupExportFormat
): void => {
    const content = formatIpLookupResult(result, format)
    const mime = format === 'json'
        ? 'application/json'
        : format === 'csv'
            ? 'text/csv'
            : 'text/plain'
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)

    link.href = url
    link.download = `ip-lookup-${timestamp}.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}
