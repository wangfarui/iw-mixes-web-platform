import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/tool-usage-tests')
await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const bundle = async (entry, filename) => {
  const outfile = path.join(tempDir, filename)
  await build({
    entryPoints: [path.join(root, entry)],
    outfile,
    bundle: true,
    alias: { '@': path.join(root, 'src') },
    platform: 'browser',
    format: 'esm',
    target: 'es2020',
    logLevel: 'silent'
  })
  return import(pathToFileURL(outfile).href)
}

const toolUsage = await bundle('src/utils/toolUsage.ts', 'tool-usage.mjs')
const reporterModule = await bundle('src/services/toolUsageReporterCore.ts', 'tool-usage-reporter.mjs')

const storage = new Map()
const localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key)
}

assert.equal(toolUsage.shouldReportToolUsage('formatter', localStorage, 1_000), true)
toolUsage.markToolUsageReported('formatter', localStorage, 1_000)
assert.equal(toolUsage.shouldReportToolUsage('formatter', localStorage, 1_000 + 29 * 60 * 1000), false)
assert.equal(toolUsage.shouldReportToolUsage('formatter', localStorage, 1_000 + 30 * 60 * 1000), true)
assert.equal(toolUsage.shouldReportToolUsage('calculator', localStorage, 1_000 + 5 * 60 * 1000), true)

storage.set(toolUsage.TOOL_USAGE_STORAGE_KEY, JSON.stringify({ formatter: 0, calculator: 'invalid' }))
assert.equal(toolUsage.shouldReportToolUsage('text-diff', localStorage, 31 * 60 * 1000), true)
assert.deepEqual(JSON.parse(storage.get(toolUsage.TOOL_USAGE_STORAGE_KEY)), {})

const reporterStorage = new Map()
const reporterLocalStorage = {
  getItem: (key) => reporterStorage.get(key) ?? null,
  setItem: (key, value) => reporterStorage.set(key, value),
  removeItem: (key) => reporterStorage.delete(key)
}
let resolveRecord
let recordedTools = []
const reporter = reporterModule.createToolUsageReporter({
  record: ({ toolKey }) => new Promise((resolve) => {
    recordedTools.push(toolKey)
    resolveRecord = resolve
  }),
  getStorage: () => reporterLocalStorage,
  now: () => 1_000
})
const firstReport = reporter('formatter')
const duplicateReport = reporter('formatter')
assert.deepEqual(recordedTools, ['formatter'])
resolveRecord()
await Promise.all([firstReport, duplicateReport])
assert.equal(toolUsage.shouldReportToolUsage('formatter', reporterLocalStorage, 2_000), false)

const failedReporter = reporterModule.createToolUsageReporter({
  record: async () => { throw new Error('network unavailable') },
  getStorage: () => reporterLocalStorage,
  now: () => 2_000
})
await failedReporter('calculator')
assert.equal(toolUsage.shouldReportToolUsage('calculator', reporterLocalStorage, 2_000), true)

const storageFailureReporter = reporterModule.createToolUsageReporter({
  record: async () => undefined,
  getStorage: () => ({
    getItem: () => { throw new Error('storage disabled') },
    setItem: () => { throw new Error('storage disabled') },
    removeItem: () => undefined
  }),
  now: () => 2_000
})
await storageFailureReporter('text-diff')

console.log('tool usage tests passed')
