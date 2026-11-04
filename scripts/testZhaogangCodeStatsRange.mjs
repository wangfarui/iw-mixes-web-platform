import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transform } from 'esbuild'

const source = await readFile(new URL('../src/services/zhaogangCodeStatsRange.ts', import.meta.url), 'utf8')
const compiled = await transform(source, { loader: 'ts', format: 'esm', platform: 'node' })
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`
const range = await import(moduleUrl)

const now = new Date(2026, 9, 30, 12)
const week = range.resolveCodeStatsRange('week', '2026-10', null, now)
assert.equal(week.from, '2026-10-26')
assert.equal(week.to, '2026-10-30')
assert.equal(week.days, 5)
assert.equal(week.valid, true)

const month = range.resolveCodeStatsRange('month', '2026-10', null, now)
assert.equal(month.from, '2026-10-01')
assert.equal(month.to, '2026-10-30')
assert.equal(month.valid, true)

const specific = range.resolveCodeStatsRange('specific', '2026-09', null, now)
assert.equal(specific.from, '2026-09-01')
assert.equal(specific.to, '2026-09-30')
assert.equal(specific.valid, true)

const thirtyOne = range.resolveCodeStatsRange('custom', '2026-10', ['2026-09-30', '2026-10-30'], now)
assert.equal(thirtyOne.days, 31)
assert.equal(thirtyOne.valid, true)

const thirtyTwo = range.resolveCodeStatsRange('custom', '2026-10', ['2026-09-29', '2026-10-30'], now)
assert.equal(thirtyTwo.valid, false)
assert.match(thirtyTwo.error, /31 天/)

const future = range.resolveCodeStatsRange('custom', '2026-10', ['2026-10-01', '2026-11-01'], now)
assert.equal(future.valid, false)
assert.match(future.error, /未来/)

const reversed = range.resolveCodeStatsRange('custom', '2026-10', ['2026-10-20', '2026-10-10'], now)
assert.equal(reversed.valid, false)

const tooOld = range.resolveCodeStatsRange('specific', '2024-10', null, now)
assert.equal(tooOld.valid, false)

assert.equal(range.disableCodeStatsDate(new Date(2026, 10, 1), now), true)
assert.equal(range.disableCodeStatsDate(new Date(2024, 9, 31), now), true)
assert.equal(range.disableCodeStatsDate(new Date(2026, 9, 30), now), false)

console.log('zhaogang code stats range tests passed')
