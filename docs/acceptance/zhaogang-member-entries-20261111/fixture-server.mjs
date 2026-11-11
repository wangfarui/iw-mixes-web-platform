// UI fixtures only. No real credentials, CODING calls, database access, or production forwarding.
import http from 'node:http'
import { appendFileSync } from 'node:fs'
const users = [
  { id: 91001, name: '验收成员甲', avatar: '' },
  { id: 91002, name: '验收成员乙', avatar: '' },
  { id: 91003, name: '验收零提交成员', avatar: '' }
]
const repos = [
  { depotId: 92001, depotName: 'inventory-service', projectName: 'fixture', projectDisplayName: '验收项目' },
  { depotId: 92002, depotName: 'order-service', projectName: 'fixture', projectDisplayName: '验收项目' }
]
const all = users.flatMap((user, memberIndex) => Array.from({ length: [25, 3, 0][memberIndex] }, (_, i) => ({
  memberUserId: user.id, ...repos[i % 2], sha: `fixture-${user.id}-${String(i).padStart(2, '0')}`,
  shortSha: `f${memberIndex}${String(i).padStart(4, '0')}`,
  commitAt: `2026-11-${String(i % 11 + 1).padStart(2, '0')}T10:${String(i).padStart(2, '0')}:00+08:00`,
  branches: ['dev_fixture', 'test', 'feature/验收'], branchCount: 3, branchTruncated: false,
  message: `${i % 3 ? 'feat' : 'fix'}: ${memberIndex ? '成员乙' : '成员甲'}${i % 2 ? '订单' : '库存'}提交 ${i}`,
  additions: i === 9 ? null : (i * 37) % 103,
  deletions: i === 9 ? null : (i * 13) % 67,
  filesChanged: i === 9 ? null : i % 8 + 1,
  diffStatus: i === 9 ? 'FAILED' : 'OK', commitUrl: ''
})))
const summary = rows => ({ commitCount: rows.length, additions: rows.reduce((n, r) => n + (r.additions || 0), 0),
  deletions: rows.reduce((n, r) => n + (r.deletions || 0), 0),
  netLines: rows.reduce((n, r) => n + (r.additions || 0) - (r.deletions || 0), 0),
  activeDays: new Set(rows.map(r => r.commitAt.slice(0, 10))).size,
  repoCount: new Set(rows.map(r => r.depotId)).size, branchCount: rows.length ? 3 : 0 })
const logFile = process.env.FIXTURE_AUDIT || '/private/tmp/iw-member-entries-ui-requests.jsonl'
let failurePending = true
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const params = Object.fromEntries(url.searchParams)
  const path = url.pathname.replace('/external-service/api/zhaogang', '')
  // Only fixture query parameters are logged. Never log cookies, headers or request bodies.
  appendFileSync(logFile, JSON.stringify({ method: req.method, path, ...params }) + '\n')
  const send = (data, code = 200, message = '') => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ code, message, data }))
  }
  if (req.method !== 'GET') return send(null, 405, 'UI 夹具禁止写入')
  if (path === '/session') return send({ connected: true, userId: users[0].id, userName: '本地 UI 验收', avatar: '',
    team: 'fixture', tokenHint: '', tokenRotationRequired: false, warnings: [],
    rolePreference: { codingRole: 'BACKEND', roleConfigured: true } })
  if (path === '/build-plan-catalog') return send({ projects: [], plans: [], failedProjectIds: [], lastSyncedAt: null, refreshing: false })
  if (/^\/release-notes\/.+\/receipt$/.test(path)) return send({ read: true, readAt: '2026-11-11T10:00:00+08:00' })
  if (path === '/code-stats/options') return send({ teams: [
    { id: 93001, name: '验收团队一', memberCount: 3, administrator: false },
    { id: 93002, name: '验收团队二', memberCount: 3, administrator: false }
  ], identityCount: 1, serverTime: '2026-11-11T10:00:00+08:00', rescanPolicy: {} })
  const range = { from: params.from || '2026-11-01', to: params.to || '2026-11-11' }
  const rows = all.filter(r => r.commitAt.slice(0, 10) >= range.from && r.commitAt.slice(0, 10) <= range.to)
  const memberRows = rows.filter(r => r.memberUserId === Number(params.memberUserId || users[0].id))
  const scan = { scope: params.scope || 'WORKBENCH_TEAM', workbenchTeamId: Number(params.workbenchTeamId || 93001), range,
    aggregateStatus: 'COMPLETED', months: [], retryAfterSeconds: 0 }
  const daily = data => Array.from({ length: 11 }, (_, i) => {
    const date = `2026-11-${String(i + 1).padStart(2, '0')}`
    return { date, dayType: [0, 6, 7].includes(i) ? 'REST_DAY' : 'WORKDAY', ...summary(data.filter(r => r.commitAt.startsWith(date))) }
  }).filter(r => r.date >= range.from && r.date <= range.to)
  if (path === '/code-stats/statistics') {
    const coverage = { scope: scan.scope, workbenchTeamId: scan.workbenchTeamId, memberCount: 3, patMemberCount: 3,
      repoCount: 2, branchCount: 3, partial: false, truncated: false, identityConflictCount: 0,
      unmatchedCommitCount: 0, failedDiffCount: 0, diffCoverage: 1, excludedMergeCommitCount: 0, memberIssues: [], repoIssues: [] }
    if (params.scope === 'SELF') return send({ dataReady: true, refreshing: false, range, scan, coverage,
      summary: summary(memberRows), daily: daily(memberRows), hourly: [], repositories: [], branches: [] })
    return send({ dataReady: true, refreshing: false, range, scan, coverage,
      members: users.map(user => ({ user, ...summary(rows.filter(r => r.memberUserId === user.id)), lastCommitAt: null })) })
  }
  if (path === '/code-stats/member-statistics') return send({ member: users.find(u => u.id === Number(params.memberUserId)),
    summary: summary(memberRows), daily: daily(memberRows) })
  if (path === '/code-stats/scan') return send(scan)
  if (path === '/code-stats/entries') {
    if (params.keyword === '请求失败' && failurePending) { failurePending = false; return send(null, 500, '夹具：提交明细加载失败') }
    if (params.keyword === '慢请求') await new Promise(resolve => setTimeout(resolve, 1800))
    const repositories = repos.filter(repo => memberRows.some(row => row.depotId === repo.depotId))
    const filtered = memberRows.filter(row => (!params.depotId || row.depotId === Number(params.depotId)) &&
      (!params.keyword || row.message.toLowerCase().includes(params.keyword.toLowerCase())))
    const field = { COMMIT_AT: 'commitAt', ADDITIONS: 'additions', DELETIONS: 'deletions', FILES_CHANGED: 'filesChanged' }[params.sortBy || 'COMMIT_AT']
    const direction = params.sortOrder === 'ASC' ? 1 : -1
    filtered.sort((a, b) => a[field] == null ? b[field] == null ? 0 : 1 : b[field] == null ? -1 :
      (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0) * direction)
    const pageNumber = Number(params.pageNumber || 1), pageSize = Number(params.pageSize || 20)
    return send({ range, repositories, page: { pageNumber, pageSize, totalRow: filtered.length, totalPage: Math.ceil(filtered.length / pageSize) },
      items: filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize) })
  }
  send(null, 404, `未覆盖夹具路径 ${path}`)
}).listen(18028, '127.0.0.1', () => console.log('UI-only fixtures listening on 18028'))
