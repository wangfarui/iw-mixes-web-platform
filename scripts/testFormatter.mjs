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

const json = await formatters.formatText('{"b":1,"a":{"d":2,"c":1}}', {
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

const invalidJson = await formatters.formatText('{"a":}', { ...settings, language: 'json' })
assert.equal(invalidJson.issues[0].level, 'error')
assert.match(invalidJson.issues[0].message, /JSON|Expected|Unexpected/i)

const escapedContainerJson = String.raw`[{\"itemId\":1977142,\"itemTitle\":\"中厚板\",\"empty\":\"\",\"nullable\":null}]`
const recoveredEscapedContainerJson = await formatters.formatText(escapedContainerJson, {
  ...settings,
  language: 'auto'
})
assert.equal(recoveredEscapedContainerJson.language, 'json')
assert.deepEqual(JSON.parse(recoveredEscapedContainerJson.output), [{
  itemId: 1977142,
  itemTitle: '中厚板',
  empty: '',
  nullable: null
}])
assert.ok(recoveredEscapedContainerJson.warnings.some((warning) => warning.includes('转义 JSON')))

const escapedContainerWithStringEscapes = String.raw`[{\"text\":\"line\\nquote: \\\"ok\\\"\",\"path\":\"C:\\\\temp\",\"payload\":\"{\\\"a\\\":1}\"}]`
const recoveredContainerWithStringEscapes = await formatters.formatText(escapedContainerWithStringEscapes, {
  ...settings,
  language: 'json',
  jsonStringHandling: 'recursive'
})
assert.deepEqual(JSON.parse(recoveredContainerWithStringEscapes.output), [{
  text: 'line\nquote: "ok"',
  path: 'C:\\temp',
  payload: { a: 1 }
}])

const encodedJsonObject = JSON.stringify(JSON.stringify({ name: 'Tom', profile: { age: 18 } }))
assert.equal(formatters.detectFormatterLanguage(encodedJsonObject), 'json')

const preservedEncodedJson = await formatters.formatText(encodedJsonObject, {
  ...settings,
  language: 'auto'
})
assert.equal(preservedEncodedJson.language, 'json')
assert.equal(preservedEncodedJson.output, encodedJsonObject)
assert.equal(preservedEncodedJson.jsonStringInfo.detectedCount, 1)
assert.equal(preservedEncodedJson.jsonStringInfo.expandedCount, 0)

const expandedEncodedJson = await formatters.formatText(encodedJsonObject, {
  ...settings,
  language: 'auto',
  jsonStringHandling: 'outer'
})
assert.deepEqual(JSON.parse(expandedEncodedJson.output), {
  name: 'Tom',
  profile: { age: 18 }
})
assert.equal(expandedEncodedJson.jsonStringInfo.expandedCount, 1)
assert.ok(expandedEncodedJson.warnings.some((warning) => warning.includes('已展开 1 处')))

const nestedJsonStringInput = JSON.stringify({
  payload: JSON.stringify({ b: 2, a: 1 }),
  items: [JSON.stringify([{ id: 1 }])],
  count: '123',
  enabled: 'true',
  invalid: '{"missing":'
})
const expandedNestedJson = await formatters.formatText(nestedJsonStringInput, {
  ...settings,
  language: 'json',
  sortKeys: true,
  jsonStringHandling: 'recursive'
})
assert.deepEqual(JSON.parse(expandedNestedJson.output), {
  count: '123',
  enabled: 'true',
  invalid: '{"missing":',
  items: [[{ id: 1 }]],
  payload: { a: 1, b: 2 }
})
assert.equal(expandedNestedJson.jsonStringInfo.detectedCount, 2)
assert.equal(expandedNestedJson.jsonStringInfo.expandedCount, 2)
assert.deepEqual(expandedNestedJson.jsonStringInfo.samplePaths, ['$.payload', '$.items[0]'])

const multiplyEncodedJson = JSON.stringify(JSON.stringify(JSON.stringify({ deep: true })))
const expandedMultiplyEncodedJson = await formatters.formatText(multiplyEncodedJson, {
  ...settings,
  language: 'auto',
  jsonStringHandling: 'outer'
})
assert.deepEqual(JSON.parse(expandedMultiplyEncodedJson.output), { deep: true })

const outerOnlyNestedJson = await formatters.formatText(nestedJsonStringInput, {
  ...settings,
  language: 'json',
  jsonStringHandling: 'outer'
})
assert.equal(typeof JSON.parse(outerOnlyNestedJson.output).payload, 'string')
assert.equal(outerOnlyNestedJson.jsonStringInfo.detectedCount, 2)
assert.equal(outerOnlyNestedJson.jsonStringInfo.expandedCount, 0)

const validatedNestedJson = await formatters.formatText(nestedJsonStringInput, {
  ...settings,
  language: 'json',
  mode: 'validate',
  jsonStringHandling: 'recursive'
})
assert.equal(validatedNestedJson.output, nestedJsonStringInput)
assert.equal(validatedNestedJson.jsonStringInfo.expandedCount, 0)
assert.ok(validatedNestedJson.warnings.some((warning) => warning.includes('校验模式不会改变输入')))

const explicitMarkdown = await formatters.formatText(encodedJsonObject, {
  ...settings,
  language: 'markdown'
})
assert.equal(explicitMarkdown.language, 'markdown')
assert.equal(explicitMarkdown.jsonStringInfo, undefined)
assert.equal(formatters.detectFormatterLanguage('<html><body>demo</body></html>'), 'html')

const xml = await formatters.formatText('<root><item id="1">A</item><empty/></root>', {
  ...settings,
  language: 'xml'
})
assert.equal(xml.output, '<root>\n  <item id="1">A</item>\n  <empty/>\n</root>')

const sql = await formatters.formatText('select id,name from users where age>18 and status=\'A\' order by name', {
  ...settings,
  language: 'sql'
})
assert.match(sql.output, /^SELECT\n\s+id,/)
assert.match(sql.output, /\nFROM\n\s+users/)
assert.match(sql.output, /\n\s+AND status/)

const complexSqlInput = [
  'select a.id,b.name,count(*) cnt from account a',
  'left join bill b on a.id=b.account_id',
  'where a.age>=18 and b.status<>\'deleted\' and b.owner_id!=:ownerId',
  'and b.payload->>\'name\'=\'O\'\'Reilly\'',
  'group by a.id,b.name order by b.name desc'
].join(' ')
const complexSqlExpected = [
  'SELECT',
  '  a.id,',
  '  b.name,',
  '  count(*) cnt',
  'FROM',
  '  account a',
  '  LEFT JOIN bill b ON a.id = b.account_id',
  'WHERE',
  '  a.age >= 18',
  '  AND b.status <> \'deleted\'',
  '  AND b.owner_id != :ownerId',
  '  AND b.payload->>\'name\' = \'O\'\'Reilly\'',
  'GROUP BY',
  '  a.id,',
  '  b.name',
  'ORDER BY',
  '  b.name DESC'
].join('\n')
const complexSql = await formatters.formatText(complexSqlInput, {
  ...settings,
  language: 'sql'
})
assert.equal(complexSql.output, complexSqlExpected)
const repeatedComplexSql = await formatters.formatText(complexSql.output, {
  ...settings,
  language: 'sql'
})
assert.equal(repeatedComplexSql.output, complexSqlExpected)

const compactSql = await formatters.formatText(complexSqlExpected, {
  ...settings,
  language: 'sql',
  mode: 'compact'
})
assert.equal(
  compactSql.output,
  'SELECT a.id, b.name, count(*) cnt FROM account a LEFT JOIN bill b ON a.id = b.account_id WHERE a.age >= 18 AND b.status <> \'deleted\' AND b.owner_id != :ownerId AND b.payload->>\'name\' = \'O\'\'Reilly\' GROUP BY a.id, b.name ORDER BY b.name DESC'
)

const createTableInput = 'create table if not exists `demo_table` (`id` bigint(20) not null auto_increment comment \'主键\', `amount` decimal(19,4) default null comment \'金额\', primary key (`id`), key `idx_amount` (`amount`)) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment=\'示例表\';'
const createTableExpected = [
  'CREATE TABLE IF NOT EXISTS `demo_table` (',
  '  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT \'主键\',',
  '  `amount` decimal(19,4) DEFAULT NULL COMMENT \'金额\',',
  '  PRIMARY KEY (`id`),',
  '  KEY `idx_amount` (`amount`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=\'示例表\';'
].join('\n')
const createTableSql = await formatters.formatText(createTableInput, {
  ...settings,
  language: 'sql'
})
assert.equal(createTableSql.output, createTableExpected)
const repeatedCreateTableSql = await formatters.formatText(createTableSql.output, {
  ...settings,
  language: 'sql'
})
assert.equal(repeatedCreateTableSql.output, createTableExpected)

const insertSelectInput = [
  'INSERT INTO msg_push_config (domain_id, org_id, message_type, root_biz_type, message_type_name, status, created_by, created_by_name, updated_by, updated_by_name, gmt_created, gmt_modified)',
  'SELECT r.domain_id, r.org_id, r.message_type, IFNULL((SELECT MIN(b.root_biz_type) FROM msg_biz_type b WHERE b.domain_id = r.domain_id AND b.biz_type = r.message_type), 0), MAX(IFNULL(r.message_type_name, \'\')), 1, 0, \'\', 0, \'\', MIN(r.gmt_created), MAX(r.gmt_modified)',
  'FROM msg_recipient_config r WHERE r.delete_status = 1 GROUP BY r.domain_id, r.org_id, r.message_type;'
].join(' ')
const insertSelectExpected = [
  'INSERT INTO',
  '  msg_push_config (',
  '    domain_id,',
  '    org_id,',
  '    message_type,',
  '    root_biz_type,',
  '    message_type_name,',
  '    status,',
  '    created_by,',
  '    created_by_name,',
  '    updated_by,',
  '    updated_by_name,',
  '    gmt_created,',
  '    gmt_modified',
  '  )',
  'SELECT',
  '  r.domain_id,',
  '  r.org_id,',
  '  r.message_type,',
  '  IFNULL(',
  '    (',
  '      SELECT',
  '        MIN(b.root_biz_type)',
  '      FROM',
  '        msg_biz_type b',
  '      WHERE',
  '        b.domain_id = r.domain_id',
  '        AND b.biz_type = r.message_type',
  '    ),',
  '    0',
  '  ),',
  '  MAX(IFNULL(r.message_type_name, \'\')),',
  '  1,',
  '  0,',
  '  \'\',',
  '  0,',
  '  \'\',',
  '  MIN(r.gmt_created),',
  '  MAX(r.gmt_modified)',
  'FROM',
  '  msg_recipient_config r',
  'WHERE',
  '  r.delete_status = 1',
  'GROUP BY',
  '  r.domain_id,',
  '  r.org_id,',
  '  r.message_type;'
].join('\n')
const insertSelectSql = await formatters.formatText(insertSelectInput, {
  ...settings,
  language: 'sql'
})
assert.equal(insertSelectSql.output, insertSelectExpected)
const repeatedInsertSelectSql = await formatters.formatText(insertSelectSql.output, {
  ...settings,
  language: 'sql'
})
assert.equal(repeatedInsertSelectSql.output, insertSelectExpected)

const props = await formatters.formatText('b=2\n# comment\na : 1\nb=3', {
  ...settings,
  language: 'properties',
  sortKeys: true
})
assert.equal(props.output, 'a = 1\nb = 2\nb = 3')
assert.ok(props.warnings.some((warning) => warning.includes('重复 key')))

const yaml = await formatters.formatText('root:\n\tname:test\n\n', {
  ...settings,
  language: 'yaml'
})
assert.match(yaml.output, /root:\n  name: test/)
assert.ok(yaml.warnings.some((warning) => warning.includes('Tab')))

const css = await formatters.formatText('.a{color:red;margin:0}.b{display:block}', {
  ...settings,
  language: 'css'
})
assert.match(css.output, /\.a \{/)
assert.match(css.output, /color: red;/)

const markdown = await formatters.formatText('# A\n\n\ntext  ', {
  ...settings,
  language: 'markdown'
})
assert.equal(markdown.output, '# A\n\ntext')

const detected = formatters.detectFormatterLanguage('select * from t')
assert.equal(detected, 'sql')

const detectedJavascript = formatters.detectFormatterLanguage('const demo=(name)=>{return {name,ok:true}}')
assert.equal(detectedJavascript, 'javascript')

const detectedProperties = formatters.detectFormatterLanguage([
  '# datasource',
  'spring.datasource.workflow.url=jdbc:mysql://10.0.34.104:3306/online_workflow?allowMultiQueries=true',
  'createStartDate=2019-09-09',
  'pagehelper.params=count=countSql',
  'processKey=baseBpmn'
].join('\n'))
assert.equal(detectedProperties, 'properties')

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
