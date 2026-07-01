import type {
    DanmakuLine,
    TextPlaygroundExportFormat,
    TextPlaygroundRecord,
    TextTransformResult
} from '@/types/textPlayground'

const formatRecordText = (record: TextPlaygroundRecord): string => {
    return [`# ${record.title}`, record.content].join('\n')
}

export const formatTextPlaygroundRecords = (
    records: TextPlaygroundRecord[],
    format: TextPlaygroundExportFormat
): string => {
    if (format === 'json') {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            records
        }, null, 2)
    }

    if (format === 'markdown') {
        return records
            .map((record) => [
                `## ${record.title}`,
                '',
                record.content,
                '',
                record.meta.length ? `> ${record.meta.join(' · ')}` : ''
            ].filter(Boolean).join('\n'))
            .join('\n\n')
    }

    return records.map(formatRecordText).join('\n\n')
}

export const formatTransformResult = (
    result: TextTransformResult,
    format: TextPlaygroundExportFormat
): string => {
    if (format === 'json') {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            result
        }, null, 2)
    }

    if (format === 'markdown') {
        return [
            `## ${result.operationLabel}`,
            '',
            '### 输入',
            '',
            result.input,
            '',
            '### 输出',
            '',
            result.output
        ].join('\n')
    }

    return result.output
}

export const formatDanmakuLines = (
    lines: DanmakuLine[],
    format: TextPlaygroundExportFormat
): string => {
    if (format === 'json') {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            lines
        }, null, 2)
    }

    if (format === 'markdown') {
        return lines.map((line) => `- ${line.text}`).join('\n')
    }

    return lines.map((line) => line.text).join('\n')
}

export const downloadTextContent = (
    content: string,
    format: TextPlaygroundExportFormat,
    filenamePrefix = 'text-playground'
): void => {
    const mime = format === 'json'
        ? 'application/json'
        : format === 'markdown'
            ? 'text/markdown'
            : 'text/plain'
    const extension = format === 'markdown' ? 'md' : format
    const blob = new Blob([content], {type: `${mime};charset=utf-8`})
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)

    link.href = url
    link.download = `${filenamePrefix}-${timestamp}.${extension}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}
