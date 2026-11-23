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
globalThis.setTimeout = (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id }
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
  await poll.fn()
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
  instances.forEach(app => app.unmount())
  instances.length = 0
  timers.clear()
  let currentStatus = { ...status }
  let reads = 0
  const page = (id, revision = 0) => ({
    from: report.from, toExclusive: report.toExclusive, totalHours: 4,
    coverage: { memberCount: 1, failedMemberCount: 0 },
    issueCheck: { deletionRevision: revision }, items: [{ workLogId: id, hours: 2 }]
  })
  let readEntries = async ({ cursor }) => ({ entries: page(cursor ? 2 : 1), nextCursor: cursor ? undefined : 'second' })
  globalThis.worklogTestApi = {
    getZhaogangWorklogOptions: async () => ({ teams: [] }),
    getZhaogangWorklogSync: async () => currentStatus,
    getZhaogangWorklogReport: async () => { reads++; return report },
    getZhaogangWorklogEntriesPage: (...args) => readEntries(...args)
  }
  const dashboard = await mount()
  dashboard.entriesCard = { $el: {} }
  await flush()
  dashboard.loadMoreEntries()
  await flush()
  assert.equal(dashboard.entries.items.length, 2)
  const pendingEntries = deferred()
  const pendingSecondPage = deferred()
  readEntries = ({ cursor }) => cursor
    ? pendingSecondPage.promise : pendingEntries.promise
  const refreshing = dashboard.loadEntries(false)
  await flush()
  assert.equal(dashboard.entries?.items.length, 2, '后台刷新期间保留已展示明细，不能切为骨架屏')
  pendingEntries.resolve({ entries: page(10), nextCursor: 'new-second' })
  await flush()
  assert.deepEqual(dashboard.entries.items.map(item => item.workLogId), [1, 2], '后续分页尚未返回时不能混入新版本第一页')
  pendingSecondPage.resolve({ entries: page(20) })
  await refreshing
  await flush()
  assert.deepEqual(dashboard.entries.items.map(item => item.workLogId), [10, 20], '从新游标重读全部已展示分页后一次替换')
  readEntries = async () => { throw new Error('明细暂时不可用') }
  await dashboard.loadEntries(false)
  assert.deepEqual(dashboard.entries.items.map(item => item.workLogId), [10, 20], '刷新失败保留原结果')
  assert.equal(dashboard.entriesError, '明细暂时不可用')
  readEntries = async ({ cursor }) => ({ entries: page(cursor ? 99 : 10, cursor ? 2 : 1), nextCursor: cursor ? undefined : 'changed-revision' })
  await dashboard.loadEntries(false)
  assert.deepEqual(dashboard.entries.items.map(item => item.workLogId), [10, 20], '刷新跨页发生版本变化时保留旧快照，不能发布混合结果')
  assert.match(dashboard.entriesError, /工时数据已更新/)

  const fireReload = async () => {
    const timer = [...timers.entries()].find(([, timer]) => timer.delay <= 3000)
    assert.ok(timer, '应存在待执行的合并刷新任务')
    timers.delete(timer[0])
    await timer[1].fn()
    await flush()
  }
  readEntries = async ({ cursor }) => ({ entries: page(cursor ? 20 : 10), nextCursor: cursor ? undefined : 'second' })
  const before = reads
  currentStatus = { ...status, running: true, dataVersion: 'two' }
  await dashboard.pollSync()
  await flush()
  currentStatus = { ...currentStatus, dataVersion: 'three' }
  await dashboard.pollSync()
  await flush()
  assert.equal(reads, before, '连续版本通知应先合并，不逐次重读报表')
  await fireReload()
  assert.equal(reads, before + 1)
  assert.deepEqual(dashboard.entries.items.map(item => item.workLogId), [10, 20])
  currentStatus = { ...currentStatus, running: false }
  await dashboard.pollSync()
  await fireReload()
  assert.equal(reads, before + 2, '同步结束后刷新最终结果')
  await dashboard.pollSync()
  await flush()
  assert.equal(reads, before + 2, '状态不变不触发额外刷新')

  const pendingReport = deferred()
  globalThis.worklogTestApi.getZhaogangWorklogReport = () => { reads++; return pendingReport.promise }
  currentStatus = { ...currentStatus, running: true, dataVersion: 'four' }
  await dashboard.pollSync()
  const activeTimer = [...timers.entries()].find(([, timer]) => timer.delay === 3000)
  timers.delete(activeTimer[0])
  const activeReload = activeTimer[1].fn()
  await flush()
  currentStatus = { ...currentStatus, dataVersion: 'five' }
  await dashboard.pollSync()
  currentStatus = { ...currentStatus, running: false, dataVersion: 'six' }
  await dashboard.pollSync()
  assert.equal(reads, before + 3, '前一轮未完成时不能并发启动另一轮刷新')
  pendingReport.resolve(report)
  await activeReload
  globalThis.worklogTestApi.getZhaogangWorklogReport = async () => { reads++; return report }
  await fireReload()
  assert.equal(reads, before + 4, '刷新中的多次通知只补跑一轮最终刷新')

  const staleEntries = deferred()
  readEntries = ({ from }) => from === '2026-11-01'
    ? Promise.resolve({ entries: page(30) }) : staleEntries.promise
  const staleRefresh = dashboard.loadEntries(false)
  dashboard.entryRange = ['2026-11-01', '2026-11-02']
  await flush()
  staleEntries.resolve({ entries: page(99) })
  await staleRefresh
  await flush()
  assert.ok(!dashboard.entries || !dashboard.entries.items.some(item => item.workLogId === 99), '切换范围后不能写入旧刷新结果')
  currentStatus = { ...currentStatus, running: true, dataVersion: 'seven' }
  await dashboard.pollSync()
  assert.ok([...timers.values()].some(timer => timer.delay === 3000))
  instances.forEach(app => app.unmount())
  instances.length = 0
  assert.equal(timers.size, 0, '卸载时必须取消轮询和待执行刷新')
  console.log('worklog dashboard: retained pages, atomic refresh, failure recovery, coalescing and scope cancellation passed')

} finally {
  instances.forEach(app => app.unmount())
  globalThis.setTimeout = originalSetTimeout
  globalThis.clearTimeout = originalClearTimeout
  delete globalThis.worklogTestApi
}
