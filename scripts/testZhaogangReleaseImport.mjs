import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transform } from 'esbuild'

const source = await readFile(new URL('../src/services/zhaogangReleaseImportPreferences.ts', import.meta.url), 'utf8')
const compiled = await transform(source, { loader: 'ts', format: 'esm', platform: 'node' })
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`
const preferences = await import(moduleUrl)

const rowsSource = await readFile(new URL('../src/services/zhaogangReleaseImportRows.ts', import.meta.url), 'utf8')
const rowsCompiled = await transform(rowsSource, { loader: 'ts', format: 'esm', platform: 'node' })
const rowsModuleUrl = `data:text/javascript;base64,${Buffer.from(rowsCompiled.code).toString('base64')}`
const rowDisplay = await import(rowsModuleUrl)

const values = new Map()
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
}

assert.deepEqual(preferences.loadReleaseImportColumnNames(storage), {
  projectColumnName: '系统所属OPS',
  planColumnName: '系统名字',
})

const saved = preferences.saveReleaseImportColumnNames({
  projectColumnName: '  应用归属  ',
  planColumnName: '  服务名称  ',
}, storage)
assert.deepEqual(saved, { projectColumnName: '应用归属', planColumnName: '服务名称' })
assert.deepEqual(preferences.loadReleaseImportColumnNames(storage), saved)

preferences.saveReleaseImportColumnNames({ projectColumnName: '', planColumnName: 'x'.repeat(80) }, storage)
assert.deepEqual(preferences.loadReleaseImportColumnNames(storage), {
  projectColumnName: '系统所属OPS',
  planColumnName: 'x'.repeat(50),
})

values.set(preferences.RELEASE_IMPORT_COLUMN_NAMES_KEY, '{broken')
assert.deepEqual(preferences.loadReleaseImportColumnNames(storage), {
  projectColumnName: '系统所属OPS',
  planColumnName: '系统名字',
})

const rows = [
  { rowNo: 1, status: 'READY' },
  { rowNo: 2, status: 'ALREADY_ADDED' },
  { rowNo: 3, status: 'PLAN_AMBIGUOUS' },
  { rowNo: 4, status: 'DUPLICATE_IN_IMAGE' },
  { rowNo: 5, status: 'ALREADY_ADDED' },
]
assert.deepEqual(rowDisplay.summarizeCollapsedReleaseImportRows(rows), {
  total: 3,
  alreadyAdded: 2,
  duplicateInImage: 1,
})
assert.deepEqual(rowDisplay.visibleReleaseImportRows(rows, false).map(row => row.rowNo), [1, 3])
assert.deepEqual(rowDisplay.visibleReleaseImportRows(rows, true).map(row => row.rowNo), [1, 2, 3, 4, 5])
assert.equal(rows.filter(row => row.status === 'READY').length, 1)

console.log('zhaogang release import tests passed')
