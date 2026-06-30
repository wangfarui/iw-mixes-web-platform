import type {
    GeneratedNumberRecord,
    NumberExportFormat
} from '@/types/numberGenerator'

const escapeCsv = (value: string | number): string => {
    const text = String(value)

    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
    }

    return text
}

export const formatGeneratedNumbers = (
    records: GeneratedNumberRecord[],
    format: NumberExportFormat
): string => {
    if (format === 'json') {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            records
        }, null, 2)
    }

    if (format === 'csv') {
        const header = ['index', 'value', 'type', 'status', 'description']
        const rows = records.map((record) => [
            record.index,
            record.value,
            record.label,
            record.status,
            record.description
        ])

        return [
            header.map(escapeCsv).join(','),
            ...rows.map((row) => row.map(escapeCsv).join(','))
        ].join('\n')
    }

    return records.map((record) => record.value).join('\n')
}

export const downloadGeneratedNumbers = (
    records: GeneratedNumberRecord[],
    format: NumberExportFormat,
    filenamePrefix = 'number-generator'
): void => {
    const content = formatGeneratedNumbers(records, format)
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
