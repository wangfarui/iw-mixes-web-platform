import type { ColorExportFormat, ColorSnapshot } from '@/types/colorPicker'
import { formatColorSummary } from '@/utils/color-picker/color'

export interface ColorExportPayload {
    content: string
    extension: ColorExportFormat
    mimeType: string
}

export const buildColorExport = (
    snapshot: ColorSnapshot,
    format: ColorExportFormat
): ColorExportPayload => {
    if (format === 'json') {
        return {
            content: JSON.stringify(snapshot, null, 2),
            extension: 'json',
            mimeType: 'application/json'
        }
    }

    const pixelLines = snapshot.pickedPixel
        ? [
            '',
            '图片像素',
            `坐标：x ${snapshot.pickedPixel.x}px / y ${snapshot.pickedPixel.y}px`,
            `图片尺寸：${snapshot.pickedPixel.width} x ${snapshot.pickedPixel.height}px`,
            `像素颜色：${formatColorSummary(snapshot.pickedPixel.color)}`
        ]
        : []

    return {
        content: [
            '颜色选择结果',
            `生成时间：${snapshot.generatedAt}`,
            '',
            '颜色格式',
            ...snapshot.formats.map((item) => `${item.label}：${item.value}`),
            '',
            'CSS 片段',
            ...snapshot.cssSnippets.map((item) => `${item.label}：${item.value}`),
            '',
            '可读性',
            `白底对比度：${snapshot.contrast.contrastOnWhite}`,
            `黑底对比度：${snapshot.contrast.contrastOnBlack}`,
            `推荐文字颜色：${snapshot.contrast.recommendedTextColor}`,
            ...pixelLines
        ].join('\n'),
        extension: 'txt',
        mimeType: 'text/plain'
    }
}

export const downloadColorExport = (
    snapshot: ColorSnapshot,
    format: ColorExportFormat,
    filenamePrefix = 'color-picker'
) => {
    const payload = buildColorExport(snapshot, format)
    const blob = new Blob([payload.content], { type: `${payload.mimeType};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    link.href = url
    link.download = `${filenamePrefix}-${timestamp}.${payload.extension}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}
