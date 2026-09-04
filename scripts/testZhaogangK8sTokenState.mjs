import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transform } from 'esbuild'

const source = await readFile(new URL('../src/services/zhaogangK8sTokenState.ts', import.meta.url), 'utf8')
const compiled = await transform(source, { loader: 'ts', format: 'esm', platform: 'node' })
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`
const { mergeZhaogangK8sTokenConfigured } = await import(moduleUrl)

assert.deepEqual(
  mergeZhaogangK8sTokenConfigured(
    { test: false, uat: false, prd: false },
    { test: false, uat: false, prd: true }
  ),
  { test: false, uat: false, prd: true }
)
assert.deepEqual(
  mergeZhaogangK8sTokenConfigured({ uat: true }, { test: true }),
  { test: true, uat: true, prd: false }
)

console.log('zhaogang K8s token state tests passed')
