import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transform } from 'esbuild'

const source = await readFile(new URL('../src/services/zgWorkbenchAgentUpdate.ts', import.meta.url), 'utf8')
const compiled = await transform(source, { loader: 'ts', format: 'esm', platform: 'node' })
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`
const { canStartZgWorkbenchAgentUpdate, shouldCheckZgWorkbenchAgentUpdate } = await import(moduleUrl)

const legacyRunningAgent = { running: true, compatible: false }
assert.equal(shouldCheckZgWorkbenchAgentUpdate(legacyRunningAgent), true)
assert.equal(canStartZgWorkbenchAgentUpdate(legacyRunningAgent, { updateAvailable: true }), true)
assert.equal(canStartZgWorkbenchAgentUpdate(legacyRunningAgent, { updateAvailable: false }), false)
assert.equal(shouldCheckZgWorkbenchAgentUpdate({ running: false, compatible: false }), false)

console.log('zg-workbench-agent update eligibility tests passed')
