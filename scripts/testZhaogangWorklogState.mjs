import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { parse, compileScript } from '@vue/compiler-sfc'
import { createRenderer, nextTick } from 'vue'

// Mount the actual dashboard setup so watchers, request completion order and polling
// are exercised together. Only its API and child views are replaced.
const filename = new URL('../src/views/zhaogang/components/worklog/WorklogDashboard.vue', import.meta.url)
const { descriptor } = parse(readFileSync(filename, 'utf8'))
const script = compileScript(descriptor, { id: 'worklog-state-test' })
const compiled = await build({
  stdin: { contents: script.content, loader: 'ts', resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vue'],
  plugins: [{
    name: 'worklog-test-dependencies',
    setup(builder) {
      builder.onResolve({ filter: /^@\/api\/zhaogang$|\.vue$|^@element-plus\/icons-vue$/ }, ({ path }) => ({ path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents:
        path === '@/api/zhaogang'
          ? ['getZhaogangWorklogSync', 'getZhaogangWorklogEntriesPage', 'getZhaogangWorklogIssueCheck', 'getZhaogangWorklogOptions', 'getZhaogangWorklogReport']
            .map(name => `export const ${name} = (...args) => globalThis.worklogTestApi.${name}(...args)`).join('\n')
          : path.endsWith('.vue') ? 'export default {}'
            : 'export const Refresh = {}, TrendCharts = {}, TrophyBase = {}, WarningFilled = {}'
      }))
    }
  }]
})
const module = { exports: {} }
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports)
const Dashboard = { ...module.exports.default, render: () => null }
const renderer = createRenderer({
  createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
  insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
  parentNode: () => null, nextSibling: () => null
})
const flush = async () => { for (let i = 0; i < 12; i++) { await Promise.resolve(); await nextTick() } }
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const status = { running: false, syncedAt: '', dataVersion: 'one', partial: false, members: [] }
const report = { from: '2026-11-16', toExclusive: '2026-11-23', statistics: {} }
const originalSetTimeout = globalThis.setTimeout
const originalClearTimeout = globalThis.clearTimeout
const timers = new Map()
let timerId = 0
globalThis.setTimeout = fn => { const id = ++timerId; timers.set(id, fn); return id }
globalThis.clearTimeout = id => timers.delete(id)
const instances = []
const mount = async () => {
  const app = renderer.createApp(Dashboard)
  const vm = app.mount({})
  instances.push(app)
  await flush()
  return vm.$.setupState
}
try {
  globalThis.worklogTestApi = {
    getZhaogangWorklogOptions: async () => ({ teams: [{ id: 1, name: '测试一队', members: [] }, { id: 2, name: '测试二队', members: [] }] }),
    getZhaogangWorklogSync: async () => status,
    getZhaogangWorklogReport: async () => report
  }
  const state = await mount()
  const syncFailure = deferred()
  globalThis.worklogTestApi.getZhaogangWorklogSync = () => syncFailure.promise
  state.scope = 'WORKBENCH_TEAM'
  state.workbenchTeamId = 1
  await flush()
  syncFailure.reject(new Error('系统异常'))
  await flush()
  assert.equal(state.statisticsError, '', '同步失败不能污染成功报表的错误状态')
  assert.match(state.syncError, /系统异常/)
  assert.equal(state.report.from, report.from, '同步状态失败仍保留报表')
  globalThis.worklogTestApi.getZhaogangWorklogSync = async () => status
  const poll = [...timers.values()].at(-1)
  timers.clear()
  await poll()
  await flush()
  assert.equal(state.syncError, '', '轮询恢复后自动清除同步错误，无需改日期')

  globalThis.worklogTestApi.getZhaogangWorklogReport = async () => { throw new Error('报表读取失败') }
  state.workbenchTeamId = 2
  await flush()
  assert.equal(state.statisticsError, '报表读取失败', '同步成功不得清除真正的报表错误')
  const stale = deferred()
  globalThis.worklogTestApi.getZhaogangWorklogSync = () => stale.promise
  state.workbenchTeamId = 1
  await flush()
  globalThis.worklogTestApi.getZhaogangWorklogSync = async () => status
  state.workbenchTeamId = 2
  await flush()
  stale.reject(new Error('旧团队请求失败'))
  await flush()
  assert.equal(state.syncError, '', '切换团队后忽略旧请求错误')
  console.log('worklog dashboard: sync/report error isolation, recovery and stale requests passed')
} finally {
  instances.forEach(app => app.unmount())
  globalThis.setTimeout = originalSetTimeout
  globalThis.clearTimeout = originalClearTimeout
  delete globalThis.worklogTestApi
}
