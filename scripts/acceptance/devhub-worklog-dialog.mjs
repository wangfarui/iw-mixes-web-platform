// Run on an isolated local Vite page; all API responses below are synthetic.
// Browser console / evaluate_script:
// const test = await import('/scripts/acceptance/devhub-worklog-dialog.mjs')
// const state = await test.mountScenario()
// test.assertRegression(await test.inspectRefresh(state))
// await test.verifyFailureRecovery(state)
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import Detail from '../../src/views/zhaogang/iteration/ZhaogangIterationDetailView.vue'

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const assert = (condition, message) => { if (!condition) throw new Error(message) }

export async function mountScenario() {
  assert(import.meta.env.DEV && ['127.0.0.1', 'localhost'].includes(location.hostname), 'Use an isolated local Vite page only')
  document.getElementById('app')?.replaceChildren()
  const host = document.createElement('div')
  host.style.cssText = 'width:1400px;height:900px;padding:24px;box-sizing:border-box;background:#f7f9fc'
  document.body.append(host)
  const user = { userId: 101, userName: '验收成员' }
  const entry = { id: 11, spendHours: 4, registeredAt: '2026-11-25T10:30:00', creator: user, source: 'CODING', syncStatus: 'SYNCED', codingWorklogId: 9011, canDelete: true }
  const issue = { id: 2, title: '工时明细刷新验收', projectName: 'fixture', issueCode: 22, issueType: 'SUB_TASK', issueTypeName: '子工作项', source: 'CODING', available: true, syncStatus: 'SYNCED', statusName: '已完成', estimatedHours: 8, taskType: '开发任务', worklogs: [], recordedHours: 4, recordedWorklogCount: 1, children: [] }
  const detail = { id: 1, name: '工时界面验收', stage: 'DEVELOPING', creator: user, members: [{ id: 1, team: { id: 1, name: '测试团队' }, user, roles: [] }], issues: [issue], releasePlans: [], permissions: { canEdit: true, canManageMembers: true, canDelete: true }, versionNo: 1 }
  const state = { calls: [], entries: [entry], delay: false, fail: false, release: undefined }
  window.fetch = async (url, init = {}) => {
    const path = String(url)
    const method = init.method || 'GET'
    state.calls.push({ path, method })
    assert(method === 'GET', 'Readonly regression must not mutate a backend')
    let data
    if (path.endsWith('/iterations/1/issues/2/worklogs')) {
      if (state.delay) await new Promise(resolve => { state.release = resolve })
      if (state.fail) return new Response(JSON.stringify({ code: 500, message: '模拟刷新失败', data: null }))
      data = state.entries
    } else if (path.endsWith('/iterations/1')) data = detail
    else if (path.includes('/iterations?')) data = { items: [], total: 0, pageNumber: 1, pageSize: 50 }
    else data = []
    return new Response(JSON.stringify({ code: 200, data }), { headers: { 'Content-Type': 'application/json' } })
  }
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/zhaogang/iterations/:iterationId', component: Detail }] })
  const app = createApp(Detail)
  app.use(ElementPlus).use(router)
  await router.push('/zhaogang/iterations/1')
  await router.isReady()
  app.mount(host)
  await pause(350)
  state.link = [...host.querySelectorAll('button')].find(button => button.textContent.includes('已登记：'))
  assert(state.link, 'Missing recorded-worklog entry')
  state.cell = state.link.closest('.cell')
  const text = document.createRange()
  text.selectNodeContents(state.link.querySelector('span') || state.link)
  state.leftOffset = text.getBoundingClientRect().left - state.cell.getBoundingClientRect().left
  state.link.click()
  await pause(250)
  state.dialog = [...document.querySelectorAll('.el-dialog')].find(dialog => dialog.textContent.includes('已登记工时'))
  assert(state.dialog, 'Missing worklog dialog')
  state.refresh = [...state.dialog.querySelectorAll('button')].find(button => button.textContent.trim() === '刷新')
  assert(state.refresh, 'Missing refresh button')
  state.app = app
  return state
}

export async function inspectRefresh(state) {
  state.delay = true
  const count = state.calls.length
  state.refresh.click()
  await nextTick()
  await pause(30)
  const result = { leftOffset: state.leftOffset, requestSent: state.calls.length === count + 1,
    refreshing: state.refresh.classList.contains('is-loading') || state.refresh.textContent.includes('刷新中'),
    oldRowsPreserved: state.dialog.textContent.includes('4 h'), disabled: state.refresh.disabled }
  state.release()
  await pause(100)
  result.completedFeedback = [...document.querySelectorAll('.el-message')].some(message => message.textContent.includes('刷新'))
  state.delay = false
  return result
}

export function assertRegression(result) {
  assert(result.leftOffset < 18, `已登记文本未左对齐，偏移 ${result.leftOffset.toFixed(1)}px`)
  assert(result.requestSent, '刷新未重新查询本地明细')
  assert(result.refreshing, '刷新请求期间缺少按钮加载反馈')
  assert(result.completedFeedback, '刷新完成后缺少可见结果反馈')
  return result
}

export async function verifyFailureRecovery(state) {
  state.fail = true
  state.delay = true
  const messages = document.querySelectorAll('.el-message--success').length
  state.refresh.click()
  await nextTick()
  await pause(30)
  const pendingCount = state.calls.length
  state.refresh.click()
  assert(state.calls.length === pendingCount, '重复点击产生并发刷新')
  state.release()
  await pause(100)
  assert(state.dialog.textContent.includes('模拟刷新失败'), '刷新失败没有显示错误')
  assert(state.dialog.textContent.includes('4 h'), '刷新失败丢失原记录')
  assert(document.querySelectorAll('.el-message--success').length === messages, '失败被提示为成功')
  state.fail = false
  state.delay = false
  state.entries = [{ ...state.entries[0], spendHours: 5 }]
  state.refresh.click()
  await pause(100)
  assert(state.dialog.textContent.includes('5 h'), '重试后没有展示新本地记录')
  assert(!state.dialog.textContent.includes('模拟刷新失败'), '重试成功后错误未清除')
  state.delay = true
  state.refresh.click()
  await nextTick()
  await pause(30)
  const beforeClose = document.querySelectorAll('.el-message--success').length
  ;[...state.dialog.querySelectorAll('button')].find(button => button.textContent === '关闭').click()
  await nextTick()
  state.release()
  await pause(100)
  assert(document.querySelectorAll('.el-message--success').length === beforeClose, '关闭弹框后的迟到请求仍显示成功提示')
  return { duplicateClickBlocked: true, failedRefreshPreservedRows: true, retryUpdatedLocalRows: true, closedDialogIgnoredLateResponse: true,
    onlyLocalGet: state.calls.every(call => call.method === 'GET') }
}
