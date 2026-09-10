import assert from 'node:assert/strict'
import {mkdir, rm} from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/zhaogang-permission-prompt-tests')
await rm(tempDir, {recursive: true, force: true})
await mkdir(tempDir, {recursive: true})

const outfile = path.join(tempDir, 'zhaogang-api.mjs')
await build({
  entryPoints: [path.join(root, 'src/api/zhaogang.ts')],
  outfile,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  alias: {'@': path.join(root, 'src')},
  define: {'import.meta.env.VITE_BUILD_ENV': '"dev"'},
  logLevel: 'silent'
})

const permissionEvents = []
globalThis.CustomEvent = class {
  constructor(type, init) {
    this.type = type
    this.detail = init?.detail
  }
}
globalThis.window = {
  dispatchEvent: event => {
    permissionEvents.push(event)
    return true
  }
}

let response = null
globalThis.fetch = async () => new Response(JSON.stringify(response.body), {
  status: response.status,
  headers: {'Content-Type': 'application/json'}
})

const api = await import(pathToFileURL(outfile).href)
const issueTitle = '20260904外部租户【湖南新士鑫】修改组织架构导致历史业务单据数据权限变化&单据所属部门为空故障报告复盘会议'

response = {
  status: 200,
  body: {
    code: 200,
    message: 'success',
    data: {
      coverage: {
        scope: 'WORKBENCH_TEAM', workbenchTeamId: 1, memberCount: 9,
        visibleProjectCount: 1, partial: false, failedMemberCount: 0, warning: '', permissionError: null
      },
      from: '2026-09-01', toExclusive: '2026-09-10', syncedAt: '2026-09-09T17:54:19', totalHours: 1,
      items: [{issue: {code: 1, type: 'TASK', typeName: '任务', title: issueTitle}}]
    }
  }
}
await api.getZhaogangWorklogEntries('2026-09-01', '2026-09-09', 'WORKBENCH_TEAM', 1)
assert.equal(permissionEvents.length, 0, '普通事项标题中的“权限”不得触发令牌权限提示')

response.body.data.coverage.permissionError = {
  type: 'CODING_PERMISSION_DENIED',
  message: '当前 CODING 令牌缺少“项目协同（读写）”权限',
  missingPermissions: ['项目协同（读写）'],
  action: 'DescribeAllProjectsIssueWorkLogList',
  codingErrorCode: 'UnauthorizedOperation'
}
await api.getZhaogangWorklogEntries('2026-09-01', '2026-09-09', 'WORKBENCH_TEAM', 1)
assert.deepEqual(permissionEvents.at(-1)?.detail, {
  permissions: ['项目协同（读写）'],
  message: '当前 CODING 令牌缺少“项目协同（读写）”权限'
})

permissionEvents.length = 0
response.body.data = {
  successCount: 1,
  failureCount: 1,
  failures: [{
    issueId: 7,
    title: '普通业务标题',
    reason: '当前 CODING 令牌缺少“项目协同（读写）”权限。请前往 CODING 令牌管理开通后重试'
  }]
}
await api.zhaogangRequest('/legacy-partial-permission-error')
assert.equal(permissionEvents.length, 1, '旧版部分失败响应中的明确权限错误字段仍应兼容提示')

permissionEvents.length = 0
response = {
  status: 200,
  body: {code: 500, message: 'Forbidden', data: null}
}
await assert.rejects(() => api.zhaogangRequest('/legacy-permission-error'), /Forbidden/)
assert.equal(permissionEvents.length, 1, '失败响应中的明确 Forbidden 信号应继续触发提示')

permissionEvents.length = 0
response.body.message = '修改数据权限变化记录失败'
await assert.rejects(() => api.zhaogangRequest('/business-error'), /修改数据权限变化记录失败/)
assert.equal(permissionEvents.length, 0, '业务错误文案仅含“权限”时不得误报')

console.log('zhaogang permission prompt tests passed')
