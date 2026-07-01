import type {
    CalculatorExportFormat,
    CalculatorSnapshot,
    LoanScheduleRow
} from '@/types/calculator'

const escapeCsv = (value: string | number): string => {
    const text = String(value)

    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
    }

    return text
}

const formatSummaryText = (snapshot: CalculatorSnapshot): string => {
    const lines = [
        snapshot.title,
        `模块：${snapshot.module}`,
        `生成时间：${snapshot.generatedAt}`,
        ''
    ]

    Object.entries(snapshot.summary).forEach(([key, value]) => {
        lines.push(`${key}：${value}`)
    })

    return lines.join('\n')
}

const formatLoanScheduleCsv = (rows: LoanScheduleRow[]): string => {
    const header = ['period', 'payment', 'principal', 'interest', 'remainingPrincipal']
    const dataRows = rows.map((row) => [
        row.period,
        row.payment,
        row.principal,
        row.interest,
        row.remainingPrincipal
    ])

    return [
        header.map(escapeCsv).join(','),
        ...dataRows.map((row) => row.map(escapeCsv).join(','))
    ].join('\n')
}

export const formatCalculatorSnapshot = (
    snapshot: CalculatorSnapshot,
    format: CalculatorExportFormat
): string => {
    if (format === 'json') {
        return JSON.stringify(snapshot, null, 2)
    }

    if (format === 'csv') {
        const details = snapshot.details as {schedule?: LoanScheduleRow[]} | undefined

        if (details?.schedule?.length) {
            return formatLoanScheduleCsv(details.schedule)
        }

        const header = ['key', 'value']
        const rows = Object.entries(snapshot.summary)

        return [
            header.join(','),
            ...rows.map((row) => row.map(escapeCsv).join(','))
        ].join('\n')
    }

    return formatSummaryText(snapshot)
}

export const downloadCalculatorSnapshot = (
    snapshot: CalculatorSnapshot,
    format: CalculatorExportFormat,
    filenamePrefix = 'calculator'
): void => {
    const content = formatCalculatorSnapshot(snapshot, format)
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
