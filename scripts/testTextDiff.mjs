import assert from 'node:assert/strict'
import { File } from 'node:buffer'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

class MemoryStorage {
  store = new Map()

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }

  setItem(key, value) {
    this.store.set(key, String(value))
  }

  removeItem(key) {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

globalThis.localStorage = new MemoryStorage()

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/text-diff-tests')

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
    target: 'es2020',
    logLevel: 'silent'
  })
  return import(pathToFileURL(outfile).href)
}

const config = await bundleModule('src/utils/textDiff/config.ts', 'config.mjs')
const preprocess = await bundleModule('src/utils/textDiff/preprocess.ts', 'preprocess.mjs')
const diffEngine = await bundleModule('src/utils/textDiff/diffEngine.ts', 'diffEngine.mjs')
const history = await bundleModule('src/utils/textDiff/history.ts', 'history.mjs')
const files = await bundleModule('src/utils/textDiff/files.ts', 'files.mjs')

const defaultIgnore = { ...config.DEFAULT_IGNORE_OPTIONS }

const ignored = preprocess.applyIgnoreOptions('Alpha  \n\n2026-06-30 request\nBeta\n', {
  ...defaultIgnore,
  ignoreCase: true,
  ignoreTrimWhitespace: true,
  ignoreBlankLines: true,
  customIgnoreRegex: '^2026-'
})

assert.equal(ignored.text, 'alpha\nbeta')
assert.ok(ignored.activeRules.includes('忽略大小写'))
assert.ok(ignored.activeRules.some((rule) => rule.startsWith('忽略匹配正则的行')))

const sortedJson = preprocess.applyPreprocessAction(
  '{"b":1,"a":{"d":2,"c":1}}',
  'json-sort-keys'
).text

assert.equal(sortedJson, [
  '{',
  '  "a": {',
  '    "c": 1,',
  '    "d": 2',
  '  },',
  '  "b": 1',
  '}'
].join('\n'))

const whitespaceResult = diffEngine.computeTextDiff('a b\nc\n', 'ab\nc\n', {
  granularity: 'line',
  ignoreOptions: {
    ...defaultIgnore,
    ignoreAllWhitespace: true
  }
})

assert.equal(whitespaceResult.stats.added, 0)
assert.equal(whitespaceResult.stats.deleted, 0)
assert.equal(whitespaceResult.stats.modified, 0)

const result = diffEngine.computeTextDiff('a\nb\nc\n', 'a\nb changed\nc\nd\n', {
  granularity: 'word',
  ignoreOptions: defaultIgnore,
  oldFileName: 'old.txt',
  newFileName: 'new.txt'
})

assert.equal(result.stats.modified, 1)
assert.equal(result.stats.added, 1)
assert.equal(result.stats.deleted, 0)
assert.equal(result.stats.blocks, 2)
assert.match(result.unifiedDiff, /\+d/)
assert.ok(result.rows.some((row) => row.type === 'modified' && row.newSegments.some((segment) => segment.type === 'added')))

const charResult = diffEngine.computeTextDiff('abc', 'adc', {
  granularity: 'char',
  ignoreOptions: defaultIgnore
})

assert.equal(charResult.stats.modified, 1)
assert.ok(charResult.rows[0].oldSegments.some((segment) => segment.type === 'removed' && segment.text === 'b'))
assert.ok(charResult.rows[0].newSegments.some((segment) => segment.type === 'added' && segment.text === 'd'))

history.setHistoryEnabled(true)
assert.equal(history.isHistoryEnabled(), true)
history.saveHistoryRecord({
  id: 'record-1',
  name: 'sample',
  createdAt: '2026-06-30T00:00:00.000Z',
  oldText: 'old',
  newText: 'new',
  settings: { ...config.DEFAULT_DIFF_SETTINGS },
  ignoreOptions: defaultIgnore
})
assert.equal(history.listHistoryRecords().length, 1)
assert.match(history.exportHistoryRecords(), /record-1/)
history.deleteHistoryRecord('record-1')
assert.equal(history.listHistoryRecords().length, 0)
assert.equal(history.importHistoryRecords(JSON.stringify({
  records: [{
    id: 'record-2',
    name: 'imported',
    createdAt: '2026-06-30T00:01:00.000Z',
    oldText: 'left',
    newText: 'right',
    settings: { ...config.DEFAULT_DIFF_SETTINGS },
    ignoreOptions: defaultIgnore
  }]
})), 1)
assert.equal(history.listHistoryRecords()[0].id, 'record-2')
history.clearHistoryRecords()
assert.equal(history.listHistoryRecords().length, 0)

const textFile = new File(['line1\nline2'], 'sample.json', { type: 'application/json' })
const fileResult = await files.readTextFile(textFile)
assert.equal(fileResult.text, 'line1\nline2')
assert.equal(fileResult.info.name, 'sample.json')
assert.equal(fileResult.info.lines, 2)
await assert.rejects(
  () => files.readTextFile(new File(['not supported'], 'image.png', { type: 'image/png' })),
  /仅支持常见文本文件类型/
)

console.log('text diff tests passed')
