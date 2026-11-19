import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/services/zhaogangK8sTokenState.ts', import.meta.url))],
  format: 'esm', platform: 'node', bundle: true, write: false,
  plugins: [{
    name: 'mock-k8s-token-api',
    setup(builder) {
      builder.onResolve({ filter: /^@\/api\/zhaogang$/ }, ({ path }) => ({ path, namespace: 'mock' }))
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: 'export const getZhaogangK8sToken = (environment) => globalThis.getTestK8sToken(environment)'
      }))
    }
  }]
})
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`
const { connectZhaogangK8sEnvironment, mergeZhaogangK8sTokenConfigured, validateZhaogangK8sDraft } = await import(moduleUrl)

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

const status = (source, revision) => ({
  configured: { test: source !== 'NONE' },
  credentials: { test: { source, revision } }
})
let authenticated = true
const calls = []
const client = {
  port: 28731,
  session: async () => ({ authenticated }),
  login: async (environment, token) => { calls.push(['login', environment, token]); authenticated = true },
  namespaces: async () => { calls.push(['namespaces']) },
  logout: async () => { calls.push(['logout']); authenticated = false }
}
globalThis.getTestK8sToken = async () => ({ token: 'fake-default', revision: 'default-1' })
assert.equal(await connectZhaogangK8sEnvironment(client, 'test', status('DEFAULT', 'default-1')), true)
assert.equal(await connectZhaogangK8sEnvironment(client, 'test', status('DEFAULT', 'default-1')), true)
assert.deepEqual(calls, [['login', 'test', 'fake-default']])

globalThis.getTestK8sToken = async () => ({ token: 'fake-personal', revision: 'personal-1' })
assert.equal(await connectZhaogangK8sEnvironment(client, 'test', status('PERSONAL', 'personal-1')), true)
assert.deepEqual(calls.at(-1), ['login', 'test', 'fake-personal'])
assert.equal(await connectZhaogangK8sEnvironment(client, 'test', status('NONE', null)), false)
await assert.rejects(connectZhaogangK8sEnvironment(client, 'test', status('DEFAULT', 'default-2')), /配置已更改/)

await validateZhaogangK8sDraft(client, 'test', 'fake-draft')
assert.deepEqual(calls.slice(-3), [['login', 'test', 'fake-draft'], ['namespaces'], ['logout']])
delete globalThis.getTestK8sToken

console.log('zhaogang K8s token state tests passed')
