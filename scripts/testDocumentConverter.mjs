import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/document-converter-tests')

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const bundleModule = async (entry, outfileName) => {
  const outfile = path.join(tempDir, outfileName)
  await build({
    entryPoints: [path.join(root, entry)],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    logLevel: 'silent',
    alias: {
      '@': path.join(root, 'src')
    }
  })
  return import(pathToFileURL(outfile).href)
}

const config = await bundleModule('src/utils/document-converter/config.ts', 'config.mjs')
const converters = await bundleModule('src/utils/document-converter/converters.ts', 'converters.mjs')

assert.equal(config.detectDocumentKind('demo.docx', ''), 'docx')
assert.equal(config.detectDocumentKind('demo.xlsx', ''), 'xlsx')
assert.equal(config.detectDocumentKind('demo.pptx', ''), 'pptx')
assert.equal(config.detectDocumentKind('demo.pdf', ''), 'pdf')
assert.equal(config.detectDocumentKind('demo.doc', ''), 'unsupported')
assert.deepEqual(config.getBatchTargets(['pdf', 'pdf'])[0], 'pdf-merge')

const markdown = converters.htmlToMarkdown('<h1>标题</h1><p>正文</p><ul><li>A</li><li>B</li></ul>')
assert.match(markdown, /# 标题/)
assert.match(markdown, /正文/)
assert.match(markdown, /- A/)

const settings = config.createDefaultDocumentSettings()

const csvFile = {
  id: 'csv-1',
  name: 'sample.csv',
  size: 17,
  type: 'text/csv',
  extension: '.csv',
  kind: 'csv',
  data: new TextEncoder().encode('name,amount\nA,1\nB,2').buffer
}

const csvJson = await converters.convertDocuments([csvFile], {
  ...settings,
  target: 'json'
})
assert.equal(csvJson.items.length, 1)
assert.equal(csvJson.items[0].extension, 'json')
assert.match(csvJson.items[0].text, /"name": "A"/)

const pptxEntries = {
  'ppt/slides/slide1.xml': new TextEncoder().encode('<p:sld><a:t>Hello</a:t><a:t>World</a:t></p:sld>'),
  'ppt/slides/slide2.xml': new TextEncoder().encode('<p:sld><a:t>第二页</a:t></p:sld>')
}
const { zipSync } = await import('fflate')
const pptxFile = {
  id: 'pptx-1',
  name: 'deck.pptx',
  size: 100,
  type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  extension: '.pptx',
  kind: 'pptx',
  data: zipSync(pptxEntries).buffer
}

const pptxMarkdown = await converters.convertDocuments([pptxFile], {
  ...settings,
  target: 'markdown'
})
assert.match(pptxMarkdown.items[0].text, /Slide 1/)
assert.match(pptxMarkdown.items[0].text, /Hello/)
assert.match(pptxMarkdown.items[0].text, /第二页/)

console.log('document converter tests passed')
