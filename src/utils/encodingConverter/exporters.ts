import type {
  EncodingConverterResult,
  EncodingExportKind
} from '@/types/encodingConverter'
import { CATEGORY_LABELS } from './config'

export interface EncodingExportPayload {
  content: string
  mime: string
  extension: string
}

export const safeTimestamp = () => new Date()
  .toISOString()
  .replace(/[:.]/g, '-')
  .replace('T', '_')
  .slice(0, 19)

export const buildEncodingExport = (
  result: EncodingConverterResult,
  kind: EncodingExportKind,
  input: string
): EncodingExportPayload => {
  if (kind === 'txt') {
    return {
      content: result.output,
      mime: 'text/plain',
      extension: 'txt'
    }
  }

  if (kind === 'json') {
    return {
      content: JSON.stringify({
        tool: 'encoding-converter',
        category: result.category,
        categoryLabel: CATEGORY_LABELS[result.category],
        operation: result.operation,
        operationLabel: result.operationLabel,
        convertedAt: result.convertedAt,
        durationMs: result.durationMs,
        inputMetrics: result.inputMetrics,
        outputMetrics: result.outputMetrics,
        details: result.details,
        warnings: result.warnings,
        issues: result.issues,
        input,
        output: result.output
      }, null, 2),
      mime: 'application/json',
      extension: 'json'
    }
  }

  return {
    content: [
      '# 编码转换报告',
      '',
      `- 分类：${CATEGORY_LABELS[result.category]}`,
      `- 操作：${result.operationLabel}`,
      `- 时间：${result.convertedAt}`,
      `- 耗时：${result.durationMs}ms`,
      `- 输入：${result.inputMetrics.characters} 字符 / ${result.inputMetrics.bytes} 字节`,
      `- 输出：${result.outputMetrics.characters} 字符 / ${result.outputMetrics.bytes} 字节`,
      '',
      '## 结果',
      '',
      '```text',
      result.output,
      '```',
      '',
      result.details.length ? '## 详情' : '',
      ...result.details.map((detail) => `- ${detail.label}：${detail.value}`),
      result.warnings.length ? '\n## 提示' : '',
      ...result.warnings.map((warning) => `- ${warning}`)
    ].filter(Boolean).join('\n'),
    mime: 'text/markdown',
    extension: 'md'
  }
}

export const downloadTextFile = (content: string, fileName: string, mime: string) => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
