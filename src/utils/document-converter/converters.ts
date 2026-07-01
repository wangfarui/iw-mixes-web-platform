import * as mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import { PDFDocument } from 'pdf-lib'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type {
  DocumentConversionResult,
  DocumentConversionResultItem,
  DocumentConversionSettings,
  DocumentSourceKind,
  DocumentTarget,
  DocumentWorkerFile
} from '@/types/documentConverter'
import {
  createOutputName,
  getBaseName,
  getTargetOption,
  sanitizeFileName
} from './config'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder('utf-8')

const XML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

const MIME_BY_EXTENSION: Record<string, string> = {
  txt: 'text/plain;charset=utf-8',
  html: 'text/html;charset=utf-8',
  md: 'text/markdown;charset=utf-8',
  json: 'application/json;charset=utf-8',
  csv: 'text/csv;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  zip: 'application/zip'
}

interface ParsedPresentation {
  slideCount: number
  slides: Array<{
    index: number
    texts: string[]
  }>
}

interface TextPdfPage {
  lines: string[]
}

const getExactArrayBuffer = (input: Uint8Array | ArrayBuffer): ArrayBuffer => {
  if (input instanceof ArrayBuffer) {
    return input.slice(0)
  }

  return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
}

const getTextBytes = (text: string): ArrayBuffer => {
  return getExactArrayBuffer(textEncoder.encode(text))
}

const getOutputSize = (text?: string, data?: ArrayBuffer): number => {
  if (data) {
    return data.byteLength
  }
  return text ? textEncoder.encode(text).byteLength : 0
}

const escapeHtml = (value: string): string => {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char)
}

const decodeXmlEntities = (value: string): string => {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&([a-z]+);/gi, (_, entity) => XML_ENTITY_MAP[entity] || `&${entity};`)
}

const stripHtml = (html: string): string => {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const htmlToMarkdown = (html: string): string => {
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `# ${stripHtml(text).trim()}\n\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `## ${stripHtml(text).trim()}\n\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `### ${stripHtml(text).trim()}\n\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, text) => `#### ${stripHtml(text).trim()}\n\n`)
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, text) => `##### ${stripHtml(text).trim()}\n\n`)
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, text) => `###### ${stripHtml(text).trim()}\n\n`)
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `- ${stripHtml(text).trim()}\n`)
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, text) => `${stripHtml(text).trim()}\n\n`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const buildHtmlDocument = (title: string, body: string, rawBody = false): string => {
  const content = rawBody ? body : `<pre>${escapeHtml(body)}</pre>`
  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    '<style>',
    'body{margin:0;padding:28px;background:#f7f8fb;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7;}',
    'main{max-width:980px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:28px;box-shadow:0 12px 30px rgba(15,23,42,.08);}',
    'h1,h2,h3{line-height:1.25;}',
    'table{border-collapse:collapse;width:100%;font-size:14px;}',
    'th,td{border:1px solid #d8dee8;padding:8px;vertical-align:top;}',
    'th{background:#f2f5f9;}',
    'pre{white-space:pre-wrap;word-break:break-word;font-family:"SFMono-Regular",Consolas,monospace;}',
    'img{max-width:100%;height:auto;}',
    '</style>',
    '</head>',
    '<body>',
    '<main>',
    content,
    '</main>',
    '</body>',
    '</html>'
  ].join('')
}

const buildResultItem = (params: {
  source: DocumentWorkerFile
  target: DocumentTarget
  outputName: string
  text?: string
  data?: ArrayBuffer
  previewHtml?: string
  summary: string
  warnings?: string[]
  metadata?: Record<string, string | number | boolean>
}): DocumentConversionResultItem => {
  const extension = params.outputName.split('.').pop() || getTargetOption(params.target).outputExtension
  return {
    id: `${params.source.id}-${params.target}-${Math.random().toString(36).slice(2, 8)}`,
    sourceId: params.source.id,
    sourceName: params.source.name,
    outputName: params.outputName,
    target: params.target,
    mime: MIME_BY_EXTENSION[extension] || 'application/octet-stream',
    extension,
    size: getOutputSize(params.text, params.data),
    text: params.text,
    data: params.data,
    previewHtml: params.previewHtml,
    summary: params.summary,
    warnings: params.warnings || [],
    metadata: params.metadata || {}
  }
}

const mapMammothWarnings = (messages: Array<{ message: string }>): string[] => {
  return messages.map((message) => message.message).filter(Boolean)
}

const convertDocx = async (
  file: DocumentWorkerFile,
  settings: DocumentConversionSettings
): Promise<DocumentConversionResultItem> => {
  if (settings.target === 'assets-zip') {
    return extractOfficeAssets(file, 'word/media/')
  }

  if (settings.target === 'txt' || settings.target === 'pdf') {
    const raw = await mammoth.extractRawText({ arrayBuffer: file.data })
    const warnings = mapMammothWarnings(raw.messages)

    if (settings.target === 'pdf') {
      const data = await createPdfFromText(file.name, raw.value, settings)
      return buildResultItem({
        source: file,
        target: settings.target,
        outputName: createOutputName(file.name, 'text', 'pdf'),
        data,
        summary: '已生成文本重排 PDF',
        warnings: ['DOCX 到 PDF 为文本重排版本，不保证原始 Word 排版。', ...warnings],
        metadata: {
          characters: raw.value.length
        }
      })
    }

    const text = raw.value.trim()
    return buildResultItem({
      source: file,
      target: settings.target,
      outputName: createOutputName(file.name, 'text', 'txt'),
      text,
      previewHtml: buildHtmlDocument(file.name, text),
      summary: '已提取 Word 纯文本',
      warnings,
      metadata: {
        characters: text.length
      }
    })
  }

  const htmlResult = await mammoth.convertToHtml({ arrayBuffer: file.data })
  const body = htmlResult.value || ''
  const fullHtml = buildHtmlDocument(file.name, body, true)
  const warnings = mapMammothWarnings(htmlResult.messages)

  if (settings.target === 'markdown') {
    const markdown = htmlToMarkdown(body)
    return buildResultItem({
      source: file,
      target: settings.target,
      outputName: createOutputName(file.name, 'content', 'md'),
      text: markdown,
      previewHtml: buildHtmlDocument(file.name, markdown),
      summary: '已转换为 Markdown',
      warnings,
      metadata: {
        characters: markdown.length
      }
    })
  }

  return buildResultItem({
    source: file,
    target: settings.target,
    outputName: createOutputName(file.name, 'content', 'html'),
    text: fullHtml,
    previewHtml: fullHtml,
    summary: '已转换为 HTML',
    warnings,
    metadata: {
      characters: stripHtml(body).length
    }
  })
}

const getWorkbook = (file: DocumentWorkerFile): XLSX.WorkBook => {
  if (file.kind === 'csv') {
    return XLSX.read(textDecoder.decode(file.data), { type: 'string' })
  }

  return XLSX.read(file.data, { type: 'array' })
}

const getWorksheetNames = (workbook: XLSX.WorkBook, selectedSheet: string): string[] => {
  if (selectedSheet && selectedSheet !== '__all__' && workbook.SheetNames.includes(selectedSheet)) {
    return [selectedSheet]
  }
  if (selectedSheet === '__all__') {
    return workbook.SheetNames
  }
  return workbook.SheetNames.slice(0, 1)
}

const workbookToText = (
  fileName: string,
  workbook: XLSX.WorkBook,
  settings: DocumentConversionSettings
): string => {
  const sheetNames = getWorksheetNames(workbook, settings.selectedSheet)
  return sheetNames
    .map((sheetName) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], { blankrows: false })
      const header = settings.includeSheetName ? `# ${fileName} / ${sheetName}\n` : ''
      return `${header}${csv}`.trim()
    })
    .join('\n\n')
}

const convertWorkbook = async (
  file: DocumentWorkerFile,
  settings: DocumentConversionSettings
): Promise<DocumentConversionResultItem> => {
  const workbook = getWorkbook(file)
  const sheetNames = getWorksheetNames(workbook, settings.selectedSheet)
  const firstSheetName = sheetNames[0] || workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('工作簿中没有可读取的 Sheet')
  }

  if (settings.target === 'xlsx') {
    const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    return buildResultItem({
      source: file,
      target: settings.target,
      outputName: createOutputName(file.name, 'converted', 'xlsx'),
      data: getExactArrayBuffer(data),
      summary: '已导出为 XLSX 工作簿',
      metadata: {
        sheets: workbook.SheetNames.length
      }
    })
  }

  if (settings.target === 'json') {
    const payload = sheetNames.map((sheetName) => ({
      sheetName,
      rows: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null })
    }))
    const text = JSON.stringify(sheetNames.length === 1 ? payload[0] : payload, null, 2)
    return buildResultItem({
      source: file,
      target: settings.target,
      outputName: createOutputName(file.name, 'rows', 'json'),
      text,
      previewHtml: buildHtmlDocument(file.name, text),
      summary: '已转换为 JSON',
      metadata: {
        sheets: sheetNames.length
      }
    })
  }

  if (settings.target === 'html') {
    const tables = sheetNames.map((sheetName) => {
      const html = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName])
      return `<section><h2>${escapeHtml(sheetName)}</h2>${html}</section>`
    })
    const fullHtml = buildHtmlDocument(file.name, tables.join('\n'), true)
    return buildResultItem({
      source: file,
      target: settings.target,
      outputName: createOutputName(file.name, 'table', 'html'),
      text: fullHtml,
      previewHtml: fullHtml,
      summary: '已转换为 HTML 表格',
      metadata: {
        sheets: sheetNames.length
      }
    })
  }

  const text = workbookToText(file.name, workbook, settings)

  if (settings.target === 'pdf') {
    const data = await createPdfFromText(file.name, text, settings)
    return buildResultItem({
      source: file,
      target: settings.target,
      outputName: createOutputName(file.name, 'table', 'pdf'),
      data,
      summary: '已生成表格文本 PDF',
      warnings: ['Excel 到 PDF 为文本表格重排版本，不保证原始单元格样式和分页。'],
      metadata: {
        sheets: sheetNames.length
      }
    })
  }

  return buildResultItem({
    source: file,
    target: 'csv',
    outputName: createOutputName(file.name, firstSheetName, 'csv'),
    text,
    previewHtml: buildHtmlDocument(file.name, text),
    summary: '已导出为 CSV 文本',
    metadata: {
      sheets: sheetNames.length
    }
  })
}

const parsePresentation = (file: DocumentWorkerFile): ParsedPresentation => {
  const entries = unzipSync(new Uint8Array(file.data))
  const slideEntries = Object.keys(entries)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const aIndex = Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0)
      const bIndex = Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0)
      return aIndex - bIndex
    })

  const slides = slideEntries.map((entryName, index) => {
    const xml = strFromU8(entries[entryName])
    const texts = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi))
      .map((match) => decodeXmlEntities(match[1]).trim())
      .filter(Boolean)
    return {
      index: index + 1,
      texts
    }
  })

  return {
    slideCount: slides.length,
    slides
  }
}

const presentationToMarkdown = (fileName: string, presentation: ParsedPresentation): string => {
  const lines = [`# ${getBaseName(fileName)}`, '']
  for (const slide of presentation.slides) {
    lines.push(`## Slide ${slide.index}`, '')
    if (slide.texts.length) {
      lines.push(...slide.texts.map((text) => `- ${text}`), '')
    } else {
      lines.push('- 该页未提取到文本', '')
    }
  }

  return lines.join('\n').trim()
}

const convertPresentation = async (
  file: DocumentWorkerFile,
  settings: DocumentConversionSettings
): Promise<DocumentConversionResultItem> => {
  if (settings.target === 'assets-zip') {
    return extractOfficeAssets(file, 'ppt/media/')
  }

  const presentation = parsePresentation(file)
  const markdown = presentationToMarkdown(file.name, presentation)

  if (settings.target === 'json') {
    const text = JSON.stringify(presentation, null, 2)
    return buildResultItem({
      source: file,
      target: settings.target,
      outputName: createOutputName(file.name, 'slides', 'json'),
      text,
      previewHtml: buildHtmlDocument(file.name, text),
      summary: '已提取幻灯片文本 JSON',
      metadata: {
        slides: presentation.slideCount
      }
    })
  }

  if (settings.target === 'html') {
    const body = presentation.slides
      .map((slide) => [
        `<section>`,
        `<h2>Slide ${slide.index}</h2>`,
        slide.texts.length
          ? `<ul>${slide.texts.map((text) => `<li>${escapeHtml(text)}</li>`).join('')}</ul>`
          : '<p>该页未提取到文本</p>',
        `</section>`
      ].join(''))
      .join('')
    const html = buildHtmlDocument(file.name, body, true)
    return buildResultItem({
      source: file,
      target: settings.target,
      outputName: createOutputName(file.name, 'slides', 'html'),
      text: html,
      previewHtml: html,
      summary: '已转换为 HTML 大纲',
      warnings: ['PPTX 转换仅提取幻灯片文本，不保留动画、版式和图形排版。'],
      metadata: {
        slides: presentation.slideCount
      }
    })
  }

  const target = settings.target === 'txt' ? 'txt' : 'markdown'
  const text = target === 'txt'
    ? presentation.slides
      .map((slide) => [`Slide ${slide.index}`, ...slide.texts].join('\n'))
      .join('\n\n')
    : markdown

  return buildResultItem({
    source: file,
    target,
    outputName: createOutputName(file.name, 'slides', target === 'txt' ? 'txt' : 'md'),
    text,
    previewHtml: buildHtmlDocument(file.name, text),
    summary: target === 'txt' ? '已提取幻灯片纯文本' : '已转换为 Markdown 大纲',
    warnings: ['PPTX 转换仅提取幻灯片文本，不保留动画、版式和图形排版。'],
    metadata: {
      slides: presentation.slideCount
    }
  })
}

const convertTextDocument = async (
  file: DocumentWorkerFile,
  settings: DocumentConversionSettings
): Promise<DocumentConversionResultItem> => {
  const originalText = textDecoder.decode(file.data)
  const isMarkdown = file.kind === 'markdown'

  if (settings.target === 'pdf') {
    const data = await createPdfFromText(file.name, originalText, settings)
    return buildResultItem({
      source: file,
      target: settings.target,
      outputName: createOutputName(file.name, 'document', 'pdf'),
      data,
      summary: '已生成文本 PDF',
      metadata: {
        characters: originalText.length
      }
    })
  }

  if (settings.target === 'html') {
    const body = isMarkdown
      ? markdownToSimpleHtml(originalText)
      : `<pre>${escapeHtml(originalText)}</pre>`
    const html = buildHtmlDocument(file.name, body, true)
    return buildResultItem({
      source: file,
      target: settings.target,
      outputName: createOutputName(file.name, 'document', 'html'),
      text: html,
      previewHtml: html,
      summary: '已转换为 HTML',
      metadata: {
        characters: originalText.length
      }
    })
  }

  const text = settings.target === 'markdown' && !isMarkdown
    ? `# ${getBaseName(file.name)}\n\n${originalText}`
    : originalText

  return buildResultItem({
    source: file,
    target: settings.target,
    outputName: createOutputName(file.name, isMarkdown ? 'text' : 'markdown', settings.target === 'txt' ? 'txt' : 'md'),
    text,
    previewHtml: buildHtmlDocument(file.name, text),
    summary: settings.target === 'txt' ? '已导出为纯文本' : '已转换为 Markdown',
    metadata: {
      characters: text.length
    }
  })
}

const markdownToSimpleHtml = (markdown: string): string => {
  return markdown
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) {
        return ''
      }
      if (trimmed.startsWith('# ')) {
        return `<h1>${escapeHtml(trimmed.slice(2).trim())}</h1>`
      }
      if (trimmed.startsWith('## ')) {
        return `<h2>${escapeHtml(trimmed.slice(3).trim())}</h2>`
      }
      if (trimmed.startsWith('### ')) {
        return `<h3>${escapeHtml(trimmed.slice(4).trim())}</h3>`
      }
      if (/^[-*]\s/m.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .filter((line) => /^[-*]\s/.test(line.trim()))
          .map((line) => `<li>${escapeHtml(line.replace(/^[-*]\s*/, '').trim())}</li>`)
          .join('')
        return `<ul>${items}</ul>`
      }
      return `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`
    })
    .join('\n')
}

const extractPdfText = async (file: DocumentWorkerFile): Promise<string> => {
  const task = pdfjsLib.getDocument({
    data: new Uint8Array(file.data),
    disableWorker: true
  } as any)
  const pdf = await task.promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item: any) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    pages.push(`--- Page ${pageNumber} ---\n${text}`)
  }

  return pages.join('\n\n').trim()
}

const convertPdf = async (
  file: DocumentWorkerFile,
  settings: DocumentConversionSettings
): Promise<DocumentConversionResultItem> => {
  if (settings.target === 'pdf-split') {
    return splitPdfToZip(file)
  }

  if (settings.target === 'pdf-images') {
    return renderPdfImagesToZip(file, settings)
  }

  const text = await extractPdfText(file)
  return buildResultItem({
    source: file,
    target: 'txt',
    outputName: createOutputName(file.name, 'text', 'txt'),
    text,
    previewHtml: buildHtmlDocument(file.name, text || '未提取到文本'),
    summary: text ? '已提取 PDF 文本' : 'PDF 中没有可提取文本',
    warnings: text ? [] : ['如果这是扫描件 PDF，需要 OCR 才能识别图片中的文字。'],
    metadata: {
      characters: text.length
    }
  })
}

const splitPdfToZip = async (file: DocumentWorkerFile): Promise<DocumentConversionResultItem> => {
  const sourcePdf = await PDFDocument.load(file.data)
  const zipEntries: Record<string, Uint8Array> = {}

  for (let index = 0; index < sourcePdf.getPageCount(); index += 1) {
    const outputPdf = await PDFDocument.create()
    const [page] = await outputPdf.copyPages(sourcePdf, [index])
    outputPdf.addPage(page)
    const bytes = await outputPdf.save()
    zipEntries[`${sanitizeFileName(getBaseName(file.name))}-page-${String(index + 1).padStart(3, '0')}.pdf`] = bytes
  }

  const zipBytes = zipSync(zipEntries, { level: 6 })
  return buildResultItem({
    source: file,
    target: 'pdf-split',
    outputName: createOutputName(file.name, 'pages', 'zip'),
    data: getExactArrayBuffer(zipBytes),
    summary: `已拆分为 ${sourcePdf.getPageCount()} 个 PDF`,
    metadata: {
      pages: sourcePdf.getPageCount()
    }
  })
}

const renderPdfImagesToZip = async (
  file: DocumentWorkerFile,
  settings: DocumentConversionSettings
): Promise<DocumentConversionResultItem> => {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('当前浏览器不支持 OffscreenCanvas，无法在本地导出 PDF 页面图片')
  }

  const task = pdfjsLib.getDocument({
    data: new Uint8Array(file.data),
    disableWorker: true
  } as any)
  const pdf = await task.promise
  const zipEntries: Record<string, Uint8Array> = {}

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: settings.pdfImageScale })
    const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    const canvasContext = canvas.getContext('2d')
    if (!canvasContext) {
      throw new Error('无法创建页面图片画布')
    }

    await page.render({
      canvasContext: canvasContext as any,
      viewport
    }).promise

    const blob = await canvas.convertToBlob({ type: 'image/png' })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    zipEntries[`${sanitizeFileName(getBaseName(file.name))}-page-${String(pageNumber).padStart(3, '0')}.png`] = bytes
  }

  const zipBytes = zipSync(zipEntries, { level: 6 })
  return buildResultItem({
    source: file,
    target: 'pdf-images',
    outputName: createOutputName(file.name, 'images', 'zip'),
    data: getExactArrayBuffer(zipBytes),
    summary: `已导出 ${pdf.numPages} 张页面图片`,
    metadata: {
      pages: pdf.numPages,
      scale: settings.pdfImageScale
    }
  })
}

const mergePdfFiles = async (
  files: DocumentWorkerFile[],
  settings: DocumentConversionSettings
): Promise<DocumentConversionResultItem> => {
  const outputPdf = await PDFDocument.create()
  let pageCount = 0

  for (const file of files) {
    const sourcePdf = await PDFDocument.load(file.data)
    const pages = await outputPdf.copyPages(sourcePdf, sourcePdf.getPageIndices())
    pages.forEach((page) => outputPdf.addPage(page))
    pageCount += pages.length
  }

  const bytes = await outputPdf.save()
  return buildResultItem({
    source: files[0],
    target: settings.target,
    outputName: 'merged-pdf.pdf',
    data: getExactArrayBuffer(bytes),
    summary: `已合并 ${files.length} 个 PDF，共 ${pageCount} 页`,
    metadata: {
      files: files.length,
      pages: pageCount
    }
  })
}

const convertImagesToPdf = async (
  files: DocumentWorkerFile[],
  settings: DocumentConversionSettings
): Promise<DocumentConversionResultItem> => {
  const outputPdf = await PDFDocument.create()
  const warnings: string[] = []

  for (const file of files) {
    const normalized = await normalizeImageForPdf(file)
    const image = normalized.mime === 'image/png'
      ? await outputPdf.embedPng(normalized.data)
      : await outputPdf.embedJpg(normalized.data)

    const page = outputPdf.addPage([image.width, image.height])
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    })

    warnings.push(...normalized.warnings)
  }

  const bytes = await outputPdf.save()
  return buildResultItem({
    source: files[0],
    target: settings.target,
    outputName: files.length === 1 ? createOutputName(files[0].name, 'image', 'pdf') : 'images.pdf',
    data: getExactArrayBuffer(bytes),
    summary: files.length === 1 ? '已将图片转为 PDF' : `已将 ${files.length} 张图片合成为 PDF`,
    warnings,
    metadata: {
      images: files.length
    }
  })
}

const normalizeImageForPdf = async (
  file: DocumentWorkerFile
): Promise<{ data: ArrayBuffer, mime: 'image/png' | 'image/jpeg', warnings: string[] }> => {
  const lowerName = file.name.toLowerCase()
  if (file.type === 'image/png' || lowerName.endsWith('.png')) {
    return {
      data: file.data,
      mime: 'image/png',
      warnings: []
    }
  }

  if (file.type === 'image/jpeg' || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
    return {
      data: file.data,
      mime: 'image/jpeg',
      warnings: []
    }
  }

  if (typeof createImageBitmap === 'function' && typeof OffscreenCanvas !== 'undefined') {
    const bitmap = await createImageBitmap(new Blob([file.data], { type: file.type || 'image/webp' }))
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error(`无法转换图片：${file.name}`)
    }
    context.drawImage(bitmap, 0, 0)
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    return {
      data: await blob.arrayBuffer(),
      mime: 'image/png',
      warnings: [`${file.name} 已先转为 PNG 再写入 PDF。`]
    }
  }

  throw new Error(`暂不支持该图片格式写入 PDF：${file.name}`)
}

const extractOfficeAssets = (
  file: DocumentWorkerFile,
  prefix: 'word/media/' | 'ppt/media/'
): DocumentConversionResultItem => {
  const entries = unzipSync(new Uint8Array(file.data))
  const outputEntries: Record<string, Uint8Array> = {}

  for (const [name, bytes] of Object.entries(entries)) {
    if (name.startsWith(prefix) && bytes.byteLength > 0) {
      outputEntries[name.replace(prefix, '')] = bytes
    }
  }

  if (!Object.keys(outputEntries).length) {
    throw new Error('文档中没有找到可提取的内嵌资源')
  }

  const zipBytes = zipSync(outputEntries, { level: 6 })
  return buildResultItem({
    source: file,
    target: 'assets-zip',
    outputName: createOutputName(file.name, 'assets', 'zip'),
    data: getExactArrayBuffer(zipBytes),
    summary: `已提取 ${Object.keys(outputEntries).length} 个资源文件`,
    metadata: {
      assets: Object.keys(outputEntries).length
    }
  })
}

const createPdfFromText = async (
  title: string,
  text: string,
  settings: DocumentConversionSettings
): Promise<ArrayBuffer> => {
  if (typeof OffscreenCanvas === 'undefined') {
    return createSimplePdfFromAsciiText(title, text)
  }

  const pdf = await PDFDocument.create()
  const scale = 2
  const pageWidth = 794
  const pageHeight = 1123
  const margin = 58
  const fontSize = settings.textPdfFontSize
  const lineHeight = Math.round(fontSize * 1.55)
  const contentWidth = pageWidth - margin * 2
  const lines = wrapTextForCanvas(text || ' ', contentWidth, `${fontSize * scale}px Arial`, scale)
  const linesPerPage = Math.max(1, Math.floor((pageHeight - margin * 2 - 42) / lineHeight))
  const pages: TextPdfPage[] = []

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push({
      lines: lines.slice(index, index + linesPerPage)
    })
  }

  if (!pages.length) {
    pages.push({ lines: [''] })
  }

  for (let index = 0; index < pages.length; index += 1) {
    const canvas = new OffscreenCanvas(pageWidth * scale, pageHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('无法创建 PDF 页面画布')
    }

    context.scale(scale, scale)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, pageWidth, pageHeight)
    context.fillStyle = '#111827'
    context.font = `${fontSize}px Arial, sans-serif`
    context.textBaseline = 'top'

    let y = margin
    if (index === 0) {
      context.font = `700 ${fontSize + 5}px Arial, sans-serif`
      context.fillText(title, margin, y)
      y += lineHeight + 16
      context.font = `${fontSize}px Arial, sans-serif`
    }

    for (const line of pages[index].lines) {
      context.fillText(line || ' ', margin, y)
      y += lineHeight
    }

    context.font = '12px Arial, sans-serif'
    context.fillStyle = '#6b7280'
    context.fillText(`${index + 1} / ${pages.length}`, pageWidth - margin - 40, pageHeight - margin + 12)

    const blob = await canvas.convertToBlob({ type: 'image/png' })
    const png = await pdf.embedPng(await blob.arrayBuffer())
    const page = pdf.addPage([pageWidth, pageHeight])
    page.drawImage(png, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight
    })
  }

  const bytes = await pdf.save()
  return getExactArrayBuffer(bytes)
}

const createSimplePdfFromAsciiText = async (title: string, text: string): Promise<ArrayBuffer> => {
  const { StandardFonts } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const pageWidth = 595
  const pageHeight = 842
  const margin = 48
  const fontSize = 11
  const lineHeight = 16
  const normalized = `${title}\n\n${text}`.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '?')
  const rawLines = normalized.split(/\r?\n/)
  let page = pdf.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  for (const rawLine of rawLines) {
    const chunks = rawLine.match(/.{1,88}/g) || ['']
    for (const chunk of chunks) {
      if (y < margin) {
        page = pdf.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      page.drawText(chunk, {
        x: margin,
        y,
        size: fontSize,
        font
      })
      y -= lineHeight
    }
  }

  const bytes = await pdf.save()
  return getExactArrayBuffer(bytes)
}

const wrapTextForCanvas = (
  text: string,
  maxWidth: number,
  font: string,
  scale: number
): string[] => {
  const canvas = new OffscreenCanvas(10, 10)
  const context = canvas.getContext('2d')
  if (!context) {
    return text.split(/\r?\n/)
  }

  context.font = font
  const lines: string[] = []
  const paragraphs = text.replace(/\t/g, '    ').split(/\r?\n/)

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push('')
      continue
    }

    let line = ''
    for (const char of Array.from(paragraph)) {
      const nextLine = `${line}${char}`
      if (context.measureText(nextLine).width / scale > maxWidth && line) {
        lines.push(line)
        line = char
      } else {
        line = nextLine
      }
    }
    lines.push(line)
  }

  return lines
}

const assertTargetSupported = (kind: DocumentSourceKind, target: DocumentTarget) => {
  const unsupportedMessages: Partial<Record<DocumentSourceKind, string>> = {
    unsupported: '旧版 .doc/.xls/.ppt、加密文档或未知格式暂不支持，请先另存为 .docx/.xlsx/.pptx。',
    image: '图片仅支持转换为 PDF。'
  }

  if (kind === 'unsupported') {
    throw new Error(unsupportedMessages.unsupported)
  }

  if (kind === 'image' && target !== 'pdf') {
    throw new Error(unsupportedMessages.image)
  }
}

const convertSingleDocument = async (
  file: DocumentWorkerFile,
  settings: DocumentConversionSettings
): Promise<DocumentConversionResultItem> => {
  assertTargetSupported(file.kind, settings.target)

  switch (file.kind) {
    case 'docx':
      return convertDocx(file, settings)
    case 'xlsx':
    case 'csv':
      return convertWorkbook(file, settings)
    case 'pptx':
      return convertPresentation(file, settings)
    case 'pdf':
      return convertPdf(file, settings)
    case 'text':
    case 'markdown':
      return convertTextDocument(file, settings)
    case 'image':
      return convertImagesToPdf([file], settings)
    default:
      throw new Error('暂不支持该文件格式')
  }
}

export const convertDocuments = async (
  files: DocumentWorkerFile[],
  settings: DocumentConversionSettings
): Promise<DocumentConversionResult> => {
  const startedAt = performance.now()
  const startedAtIso = new Date().toISOString()

  if (!files.length) {
    throw new Error('请先选择需要处理的文档')
  }

  let items: DocumentConversionResultItem[]

  if (settings.target === 'pdf-merge') {
    if (!files.every((file) => file.kind === 'pdf')) {
      throw new Error('合并 PDF 只支持 PDF 文件')
    }
    items = [await mergePdfFiles(files, settings)]
  } else if (settings.target === 'pdf' && files.every((file) => file.kind === 'image')) {
    items = [await convertImagesToPdf(files, settings)]
  } else {
    items = []
    for (const file of files) {
      items.push(await convertSingleDocument(file, settings))
    }
  }

  const warnings = items.flatMap((item) => item.warnings)

  return {
    id: `document-result-${Date.now()}`,
    target: settings.target,
    startedAt: startedAtIso,
    durationMs: Math.round(performance.now() - startedAt),
    items,
    warnings
  }
}

export const buildCombinedTextReport = (result: DocumentConversionResult): string => {
  return result.items
    .map((item) => {
      const body = item.text || `${item.outputName} (${item.mime}, ${item.size} bytes)`
      return [`# ${item.outputName}`, '', item.summary, '', body].join('\n')
    })
    .join('\n\n---\n\n')
}

export const createZipFromResultItems = (items: DocumentConversionResultItem[]): ArrayBuffer => {
  const entries: Record<string, Uint8Array> = {}

  for (const item of items) {
    if (item.data) {
      entries[item.outputName] = new Uint8Array(item.data)
    } else if (item.text) {
      entries[item.outputName] = strToU8(item.text)
    }
  }

  return getExactArrayBuffer(zipSync(entries, { level: 6 }))
}
