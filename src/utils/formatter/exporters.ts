import type { FormatterExportKind, FormatterResult } from '../../types/formatter'
import { LANGUAGE_LABELS } from './config'

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const extensionByLanguage = {
  json: 'json',
  xml: 'xml',
  sql: 'sql',
  properties: 'properties',
  yaml: 'yaml',
  html: 'html',
  css: 'css',
  javascript: 'js',
  markdown: 'md'
} as const

const mimeByLanguage = {
  json: 'application/json',
  xml: 'application/xml',
  sql: 'application/sql',
  properties: 'text/plain',
  yaml: 'application/yaml',
  html: 'text/html',
  css: 'text/css',
  javascript: 'text/javascript',
  markdown: 'text/markdown'
} as const

export const getFormatterSourceExtension = (result: FormatterResult) => extensionByLanguage[result.language]

export const getFormatterSourceMime = (result: FormatterResult) => mimeByLanguage[result.language]

export const safeTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-')

export const buildFormatterMarkdownReport = (result: FormatterResult, inputPreview = '') => {
  return [
    '# 格式化报告',
    '',
    `- 语言：${LANGUAGE_LABELS[result.language]}`,
    `- 模式：${result.mode}`,
    `- 时间：${new Date(result.formattedAt).toLocaleString()}`,
    `- 耗时：${result.durationMs}ms`,
    `- 输入：${result.inputMetrics.characters} 字符 / ${result.inputMetrics.lines} 行`,
    `- 输出：${result.outputMetrics.characters} 字符 / ${result.outputMetrics.lines} 行`,
    '',
    '## 状态',
    '',
    result.issues.length
      ? result.issues.map((issue) => `- ${issue.level}: ${issue.message}`).join('\n')
      : '- 无错误',
    result.warnings.length ? result.warnings.map((warning) => `- warning: ${warning}`).join('\n') : '',
    '',
    '## 输入预览',
    '',
    '```text',
    inputPreview.slice(0, 4000),
    '```',
    '',
    '## 输出',
    '',
    `\`\`\`${result.language}`,
    result.output,
    '```',
    ''
  ].filter((line) => line !== '').join('\n')
}

export const buildFormatterHtmlReport = (result: FormatterResult, inputPreview = '') => {
  const issues = result.issues.length
    ? result.issues.map((issue) => `<li>${escapeHtml(issue.level)}：${escapeHtml(issue.message)}</li>`).join('')
    : '<li>无错误</li>'
  const warnings = result.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')

  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8" />',
    '<title>格式化报告</title>',
    '<style>',
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:24px;color:#1f2937;background:#fff;}',
    'h1{font-size:22px;margin:0 0 12px;}',
    'p,li{font-size:13px;line-height:1.7;}',
    'pre{padding:12px;border:1px solid #d8dee4;border-radius:6px;background:#f6f8fa;white-space:pre-wrap;word-break:break-word;font-family:"SFMono-Regular",Consolas,monospace;font-size:12px;}',
    '</style>',
    '</head>',
    '<body>',
    '<h1>格式化报告</h1>',
    `<p>语言：${escapeHtml(LANGUAGE_LABELS[result.language])}；模式：${escapeHtml(result.mode)}；耗时：${result.durationMs}ms</p>`,
    `<ul>${issues}${warnings}</ul>`,
    '<h2>输入预览</h2>',
    `<pre>${escapeHtml(inputPreview.slice(0, 4000))}</pre>`,
    '<h2>输出</h2>',
    `<pre>${escapeHtml(result.output)}</pre>`,
    '</body>',
    '</html>'
  ].join('')
}

export const buildFormatterExport = (
  result: FormatterResult,
  kind: FormatterExportKind,
  inputPreview = ''
) => {
  if (kind === 'json') {
    return {
      content: JSON.stringify({ result, inputPreview }, null, 2),
      extension: 'json',
      mimeType: 'application/json'
    }
  }

  if (kind === 'markdown') {
    return {
      content: buildFormatterMarkdownReport(result, inputPreview),
      extension: 'md',
      mimeType: 'text/markdown'
    }
  }

  if (kind === 'html') {
    return {
      content: buildFormatterHtmlReport(result, inputPreview),
      extension: 'html',
      mimeType: 'text/html'
    }
  }

  if (kind === 'txt') {
    return {
      content: result.output,
      extension: 'txt',
      mimeType: 'text/plain'
    }
  }

  return {
    content: result.output,
    extension: getFormatterSourceExtension(result),
    mimeType: getFormatterSourceMime(result)
  }
}

export const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
