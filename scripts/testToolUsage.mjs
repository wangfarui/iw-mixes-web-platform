import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/tool-usage-tests')
await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const outfile = path.join(tempDir, 'tool-usage.mjs')
await build({
  entryPoints: [path.join(root, 'src/utils/toolUsage.ts')],
  outfile,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  logLevel: 'silent'
})

const toolUsage = await import(pathToFileURL(outfile).href)
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

console.log('tool usage tests passed')
