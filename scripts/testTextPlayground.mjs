import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true
})

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/text-playground-tests')

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

const config = await bundleModule('src/utils/textPlayground/config.ts', 'config.mjs')
const acrostic = await bundleModule('src/utils/textPlayground/acrostic.ts', 'acrostic.mjs')
const quotes = await bundleModule('src/utils/textPlayground/quotes.ts', 'quotes.mjs')
const creative = await bundleModule('src/utils/textPlayground/creative.ts', 'creative.mjs')
const transforms = await bundleModule('src/utils/textPlayground/transforms.ts', 'transforms.mjs')
const danmaku = await bundleModule('src/utils/textPlayground/danmaku.ts', 'danmaku.mjs')
const exporters = await bundleModule('src/utils/textPlayground/exporters.ts', 'exporters.mjs')

const acrosticSettings = config.createDefaultAcrosticSettings()
acrosticSettings.heads = '快乐'
acrosticSettings.topic = '下班'
acrosticSettings.count = 2
acrosticSettings.lineLength = 5
const poems = acrostic.generateAcrosticRecords(acrosticSettings)
assert.equal(poems.length, 2)
assert.deepEqual(poems[0].content.split('\n').map((line) => line[0]), ['快', '乐'])
assert.equal(acrostic.getAcrosticHeadPreview(' 快 乐 '), '快乐')

const quoteSettings = config.createDefaultQuoteSettings()
quoteSettings.kind = 'dark'
quoteSettings.count = 5
quoteSettings.emoji = false
const quoteRecords = quotes.generateQuoteRecords(quoteSettings)
assert.equal(quoteRecords.length, 5)
assert.ok(quoteRecords.every((record) => record.content.length > 8))
assert.equal(quotes.getQuoteKindLabel('dark'), '毒鸡汤')

const homophoneSettings = config.createDefaultHomophoneSettings()
homophoneSettings.keyword = '快乐'
homophoneSettings.count = 3
const homophoneRecords = creative.generateHomophoneRecords(homophoneSettings)
assert.equal(homophoneRecords.length, 3)
assert.equal(homophoneRecords[0].mode, 'homophone')
assert.ok(homophoneRecords.some((record) => record.meta.join(' ').includes('筷勒')))

const socialCopySettings = config.createDefaultSocialCopySettings()
socialCopySettings.topic = '下班路上的晚霞'
socialCopySettings.length = 'medium'
socialCopySettings.emoji = false
const socialCopyRecords = creative.generateSocialCopyRecords(socialCopySettings)
assert.equal(socialCopyRecords.length, 6)
assert.equal(socialCopyRecords[0].mode, 'social-copy')
assert.ok(socialCopyRecords[0].content.includes('下班路上的晚霞'))

const toneRewriteSettings = config.createDefaultToneRewriteSettings()
toneRewriteSettings.sourceText = '今天做得不错'
toneRewriteSettings.mode = 'sarcasm'
const toneRewriteRecords = creative.generateToneRewriteRecords(toneRewriteSettings)
assert.equal(toneRewriteRecords.length, 5)
assert.equal(toneRewriteRecords[0].mode, 'tone-rewrite')
assert.ok(toneRewriteRecords[0].content.includes('今天做得不错'))

const mars = transforms.transformText('我是abc123', {
  operation: 'mars',
  symbolLevel: 3,
  keepLineBreaks: true
})
assert.notEqual(mars.output, '我是abc123')
assert.ok(mars.output.includes('偶'))
assert.ok(mars.output.includes('①'))

const antiDog = transforms.transformText('你好', {
  operation: 'anti-dog',
  symbolLevel: 1,
  keepLineBreaks: false
})
assert.notEqual(antiDog.output, '你好')
assert.match(antiDog.output, /泥|吼/)

const reversedLines = transforms.transformText('第一行\n第二行', {
  operation: 'reverse-lines',
  symbolLevel: 0,
  keepLineBreaks: true
})
assert.equal(reversedLines.output, '第二行\n第一行')

const danmakuSettings = config.createDefaultDanmakuSettings()
danmakuSettings.sourceText = '第一条\n\n第二条\n第三条'
danmakuSettings.density = 2
const lines = danmaku.buildDanmakuLines(danmakuSettings)
assert.equal(lines.length, 3)
assert.deepEqual(lines.map((line) => line.lane), [0, 1, 0])
assert.equal(danmaku.normalizeDanmakuSource(' A \n\n B ').join(','), 'A,B')

const exportedPoems = exporters.formatTextPlaygroundRecords(poems, 'markdown')
assert.match(exportedPoems, /## 藏头诗 1/)
const exportedTransform = exporters.formatTransformResult(mars, 'json')
assert.equal(JSON.parse(exportedTransform).result.operation, 'mars')
const exportedDanmaku = exporters.formatDanmakuLines(lines, 'txt')
assert.equal(exportedDanmaku.split('\n').length, 3)

console.log('text playground tests passed')
