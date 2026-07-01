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
const tempDir = path.join(root, 'node_modules/.cache/formatter-tests')

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

const config = await bundleModule('src/utils/formatter/config.ts', 'config.mjs')
const formatters = await bundleModule('src/utils/formatter/formatters.ts', 'formatters.mjs')
const converters = await bundleModule('src/utils/formatter/converters.ts', 'converters.mjs')
const history = await bundleModule('src/utils/formatter/history.ts', 'history.mjs')
const exporters = await bundleModule('src/utils/formatter/exporters.ts', 'exporters.mjs')
const files = await bundleModule('src/utils/formatter/files.ts', 'files.mjs')

const settings = config.createDefaultFormatterSettings()

const json = formatters.formatText('{"b":1,"a":{"d":2,"c":1}}', {
  ...settings,
  language: 'json',
  sortKeys: true
})
assert.equal(json.language, 'json')
assert.equal(json.output, [
  '{',
  '  "a": {',
  '    "c": 1,',
  '    "d": 2',
  '  },',
  '  "b": 1',
  '}'
].join('\n'))

const invalidJson = formatters.formatText('{"a":}', { ...settings, language: 'json' })
assert.equal(invalidJson.issues[0].level, 'error')
assert.match(invalidJson.issues[0].message, /JSON|Expected|Unexpected/i)

const xml = formatters.formatText('<root><item id="1">A</item><empty/></root>', {
  ...settings,
  language: 'xml'
})
assert.match(xml.output, /<root>\n  <item id="1">\n    A\n  <\/item>\n  <empty\/>\n<\/root>/)

const sql = formatters.formatText('select id,name from users where age>18 and status=\'A\' order by name', {
  ...settings,
  language: 'sql'
})
assert.match(sql.output, /^SELECT\n\s+id,/)
assert.match(sql.output, /\nFROM users/)
assert.match(sql.output, /\n\s+AND status/)

const props = formatters.formatText('b=2\n# comment\na : 1\nb=3', {
  ...settings,
  language: 'properties',
  sortKeys: true
})
assert.equal(props.output, 'a = 1\nb = 2\nb = 3')
assert.ok(props.warnings.some((warning) => warning.includes('重复 key')))

const yaml = formatters.formatText('root:\n\tname:test\n\n', {
  ...settings,
  language: 'yaml'
})
assert.match(yaml.output, /root:\n  name: test/)
assert.ok(yaml.warnings.some((warning) => warning.includes('Tab')))

const css = formatters.formatText('.a{color:red;margin:0}.b{display:block}', {
  ...settings,
  language: 'css'
})
assert.match(css.output, /\.a \{/)
assert.match(css.output, /color: red;/)

const markdown = formatters.formatText('# A\n\n\ntext  ', {
  ...settings,
  language: 'markdown'
})
assert.equal(markdown.output, '# A\n\ntext')

const detected = formatters.detectFormatterLanguage('select * from t')
assert.equal(detected, 'sql')

const jsonToProperties = converters.convertFormatterText(
  '{"db":{"host":"localhost","port":3306},"enabled":true}',
  'json',
  'properties',
  { ...settings, sortKeys: true }
)
assert.equal(jsonToProperties.output, 'db.host = localhost\ndb.port = 3306\nenabled = true')

const propertiesToJson = converters.convertFormatterText('a=1\nb=true', 'properties', 'json', settings)
const parsedPropertiesJson = JSON.parse(propertiesToJson.output)
assert.equal(parsedPropertiesJson.a, 1)
assert.equal(parsedPropertiesJson.b, true)

history.setFormatterHistoryEnabled(true)
assert.equal(history.isFormatterHistoryEnabled(), true)
history.saveFormatterHistoryRecord({
  id: 'record-1',
  name: 'sample',
  createdAt: '2026-06-30T00:00:00.000Z',
  input: '{"a":1}',
  output: '{\n  "a": 1\n}',
  language: 'json',
  settings,
  summary: 'JSON'
})
assert.equal(history.listFormatterHistoryRecords().length, 1)
assert.match(history.exportFormatterHistoryRecords(), /record-1/)
history.deleteFormatterHistoryRecord('record-1')
assert.equal(history.listFormatterHistoryRecords().length, 0)
assert.equal(history.importFormatterHistoryRecords(JSON.stringify({
  records: [{
    id: 'record-2',
    name: 'imported',
    createdAt: '2026-06-30T00:01:00.000Z',
    input: 'a=1',
    output: 'a = 1',
    language: 'properties',
    settings,
    summary: 'Properties'
  }]
})), 1)
history.clearFormatterHistoryRecords()
assert.equal(history.listFormatterHistoryRecords().length, 0)

const exportPayload = exporters.buildFormatterExport(json, 'markdown', '{"a":1}')
assert.equal(exportPayload.extension, 'md')
assert.match(exportPayload.content, /格式化报告/)

const textFile = new File(['{"a":1}'], 'sample.json', { type: 'application/json' })
const fileResult = await files.readFormatterTextFile(textFile)
assert.equal(fileResult.text, '{"a":1}')
assert.equal(fileResult.info.name, 'sample.json')
await assert.rejects(
  () => files.readFormatterTextFile(new File(['nope'], 'image.png', { type: 'image/png' })),
  /仅支持常见文本/
)

console.log('formatter tests passed')
