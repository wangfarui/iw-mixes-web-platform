import type { DiffResult, DiffRow } from '../../types/textDiff'

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const buildStatsText = (result: DiffResult) => {
  const { stats } = result
  return [
    `新增行数：${stats.added}`,
    `删除行数：${stats.deleted}`,
    `修改行数：${stats.modified}`,
    `未变化行数：${stats.unchanged}`,
    `变更块数量：${stats.blocks}`,
    `原文本：${stats.oldMetrics.characters} 字符 / ${stats.oldMetrics.words} 词 / ${stats.oldMetrics.lines} 行`,
    `新文本：${stats.newMetrics.characters} 字符 / ${stats.newMetrics.words} 词 / ${stats.newMetrics.lines} 行`
  ].join('\n')
}

export const buildMarkdownReport = (result: DiffResult) => {
  return [
    '# 文本比对报告',
    '',
    `- 原文件：${result.oldFileName}`,
    `- 新文件：${result.newFileName}`,
    `- 比对时间：${formatDateTime(result.comparedAt)}`,
    `- 本地处理：是`,
    '',
    '## 统计',
    '',
    buildStatsText(result)
      .split('\n')
      .map((line) => `- ${line}`)
      .join('\n'),
    '',
    '## Unified Diff',
    '',
    '```diff',
    result.unifiedDiff.trimEnd(),
    '```',
    ''
  ].join('\n')
}

export const buildPlainTextReport = (result: DiffResult) => {
  return [
    '文本比对报告',
    `原文件：${result.oldFileName}`,
    `新文件：${result.newFileName}`,
    `比对时间：${formatDateTime(result.comparedAt)}`,
    '本地处理：是',
    '',
    buildStatsText(result),
    '',
    result.unifiedDiff
  ].join('\n')
}

export const buildHtmlReport = (result: DiffResult, rows: DiffRow[] = result.rows) => {
  const stats = buildStatsText(result)
    .split('\n')
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('')

  const body = rows.map((row) => {
    if (row.type === 'fold') {
      return `<tr class="fold"><td colspan="4">已折叠 ${row.hiddenCount || 0} 行未变更内容</td></tr>`
    }

    const className = `row-${row.type}`
    const oldNumber = row.oldLineNumber ?? ''
    const newNumber = row.newLineNumber ?? ''
    const oldText = escapeHtml(row.oldText)
    const newText = escapeHtml(row.newText)

    return [
      `<tr class="${className}">`,
      `<td class="line-number">${oldNumber}</td>`,
      `<td><pre>${oldText}</pre></td>`,
      `<td class="line-number">${newNumber}</td>`,
      `<td><pre>${newText}</pre></td>`,
      '</tr>'
    ].join('')
  }).join('')

  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8" />',
    '<title>文本比对报告</title>',
    '<style>',
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:24px;color:#1f2937;background:#fff;}',
    'h1{font-size:22px;margin:0 0 12px;}',
    'p,li{font-size:13px;}',
    'table{width:100%;border-collapse:collapse;font-family:"SFMono-Regular",Consolas,monospace;font-size:12px;}',
    'td{border:1px solid #d8dee4;vertical-align:top;padding:0;}',
    'pre{margin:0;padding:4px 8px;white-space:pre-wrap;word-break:break-word;}',
    '.line-number{width:56px;text-align:right;color:#667085;background:#f6f8fa;padding:4px 8px;}',
    '.row-added td{background:#dafbe1;}',
    '.row-removed td{background:#ffebe9;}',
    '.row-modified td{background:#fff8c5;}',
    '.fold td{text-align:center;color:#667085;background:#f6f8fa;padding:8px;}',
    '@media print{body{margin:0;} .no-print{display:none;}}',
    '</style>',
    '</head>',
    '<body>',
    '<h1>文本比对报告</h1>',
    `<p>原文件：${escapeHtml(result.oldFileName)}；新文件：${escapeHtml(result.newFileName)}；比对时间：${escapeHtml(formatDateTime(result.comparedAt))}</p>`,
    `<ul>${stats}</ul>`,
    '<table>',
    body,
    '</table>',
    '</body>',
    '</html>'
  ].join('')
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
