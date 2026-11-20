import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const alice = { id: 100, name: '成员甲', avatar: '' }
const bob = { id: 200, name: '成员乙', avatar: '' }
const today = '2026-11-20'
const syncedAt = today + 'T12:00:00+08:00'
const plus = (value, days) => new Date(Date.parse(value) + days * 86400000).toISOString().slice(0, 10)
const range = (from, to) => Array.from({ length: (Date.parse(to) - Date.parse(from)) / 86400000 }, (_, i) => plus(from, i))
const browser = process.env.WORKLOG_CDP_URL ? await chromium.connectOverCDP(process.env.WORKLOG_CDP_URL) : await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
const context = await browser.newContext({ timezoneId: 'Asia/Shanghai', viewport: { width: 1440, height: 1050 } })
const page = await context.newPage()
page.setDefaultTimeout(10000)
const requests = []
const errors = []
let heldReport
let holdFrom
let failReport = false
let utilizationFixture
page.on('pageerror', error => errors.push(error.message))
await page.clock.setFixedTime(new Date(syncedAt))
try {
  await page.route('**/external-service/api/zhaogang/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/external-service/api/zhaogang', '')
    const p = Object.fromEntries(url.searchParams)
    const team = p.scope === 'WORKBENCH_TEAM'
    const coverage = { scope: p.scope || 'SELF', workbenchTeamId: team ? 1 : null,
      memberCount: team ? 2 : 1, visibleProjectCount: 1, partial: false, failedMemberCount: 0, warning: '' }
    const from = p.from
    const toExclusive = p.to ? plus(p.to, 1) : null
    let data
    if (path === '/session') data = { team: 'local-fixture', userId: alice.id, userName: alice.name,
      tokenRotationRequired: false, rolePreference: { roleConfigured: true } }
    else if (path === '/build-plan-catalog') data = { projects: [], plans: [], failedProjectIds: [] }
    else if (path === '/worklog-options') data = { teams: [{ id: 1, name: '日期联动验收团队', memberCount: 2, members: [alice, bob] }] }
    else if (path === '/worklogs/report') {
      requests.push({ path, ...p })
      if (p.from === holdFrom) await new Promise(resolve => { heldReport = resolve })
      if (failReport) {
        failReport = false
        return route.fulfill({ json: { code: 500, message: '模拟统计失败' } })
      }
      const completedEnd = from >= today ? from : toExclusive > today ? today : toExclusive
      const stats = end => {
        const dates = range(from, end)
        const workdayCount = dates.filter(date => date < today && ![0, 6].includes(new Date(date).getUTCDay())).length
        const summary = factor => ({ overtimeDays: 0, overtimeHours: dates.length * factor, averageHours: factor,
          workdayCount, utilizationRate: workdayCount ? Number((dates.length * factor / (workdayCount * 8) * 100).toFixed(2)) : null })
        const daily = factor => dates.map(date => ({ date, hours: factor,
          dayType: [0, 6].includes(new Date(date).getUTCDay()) ? 'REST_DAY' : 'WORKDAY' }))
        return { coverage, month: from.slice(0, 7), calendarVersion: 1, syncedAt,
          summary: summary(team ? 3 : 1),
          dailyTotals: daily(team ? 3 : 1), memberDailyTotals: team ? [alice, bob].map((user, i) => ({
            user, dailyTotals: daily(i + 1), summary: summary(i + 1)
          })) : [] }
      }
      data = { from, toExclusive, rankingToExclusive: completedEnd, statistics: stats(toExclusive), ranking: stats(completedEnd),
        absences: { coverage, month: from.slice(0, 7), from, toExclusive: completedEnd, syncedAt, members: [] } }
      if (team && utilizationFixture) {
        data.ranking.memberDailyTotals.forEach((member, index) => {
          member.summary.utilizationRate = utilizationFixture === 'tie' ? 100
            : utilizationFixture === 'above100' ? (index ? 100 : 105)
            : utilizationFixture === 'noWorkdays' ? null : index ? null : 0
          member.summary.workdayCount = member.summary.utilizationRate === null ? 0 : 4
          if (member.summary.utilizationRate === 0) member.dailyTotals.forEach(day => { day.hours = 0 })
        })
      }
    } else if (path === '/worklogs/entries/page') {
      requests.push({ path, ...p })
      const total = team ? p.memberUserId ? 14 : 21 : range(from, toExclusive).length
      const offset = Number(p.cursor || 0)
      const items = Array.from({ length: Math.min(10, total - offset) }, (_, index) => ({
        workLogId: offset + index + 1, user: Number(p.memberUserId) === bob.id ? bob : alice,
        hours: 1, startAt: from + 'T09:00:00+08:00', workingDesc: '验收工时',
        project: { name: 'fixture', displayName: '验收项目' },
        issue: { code: offset + index + 1, type: 'TASK', typeName: '任务', title: '测试事项' },
        issueUrl: 'https://example.invalid/issues/' + (offset + index + 1)
      }))
      data = { entries: { coverage, from, toExclusive, syncedAt, totalHours: total, items },
        nextCursor: offset + 10 < total ? String(offset + 10) : null }
    } else return route.fulfill({ json: { code: 404, message: '未配置的隔离夹具请求：' + path } })
    await route.fulfill({ json: { code: 200, message: '', data } }).catch(error => { if (!route.request().failure()) throw error })
  })
  const card = page.locator('.trend-card')
  const entries = page.locator('.week-card')
  const chartRange = () => card.locator('.trend-chart').getAttribute('aria-label')
  const checkRange = async (from, to) => {
    await page.waitForFunction(([from, to]) => document.querySelector('.trend-chart')?.getAttribute('aria-label')?.includes(`${from} 至 ${to}`) &&
      document.querySelectorAll('.trend-chart .hover-target').length === (Date.parse(to) - Date.parse(from)) / 86400000 + 1, [from, to])
    assert.ok(requests.some(item => item.path === '/worklogs/report' && item.from === from && item.to === to))
  }
  const setDates = async (from, to) => {
    const inputs = entries.locator('.el-range-input')
    // Commit a valid intermediate pair when keyboard editing disjoint ranges.
    const oldEnd = await inputs.nth(1).inputValue()
    const order = from > oldEnd ? [1, 0] : [0, 1]
    for (const index of order) {
      await inputs.nth(index).fill(index === 0 ? from : to)
      await inputs.nth(index).press('Enter')
    }
    await entries.getByRole('heading', { name: '工时记录' }).click()
  }
  await page.goto(process.env.WORKLOG_BASE_URL || 'http://127.0.0.1:5198/zhaogang/worklogs')
  await checkRange('2026-11-01', '2026-11-30')
  assert.equal(await card.locator('.range-label').count(), 0)
  assert.deepEqual(await page.locator('.trend-chart .axis-label--x').allTextContents().then(xs => xs.map(x => x.trim())),
    Array.from({ length: 30 }, (_, i) => String(i + 1)))
  assert.equal(await page.getByRole('button', { name: '上一月', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: '下一月', exact: true }).count(), 0)
  await entries.scrollIntoViewIfNeeded()
  await entries.getByText('我的工时 · 30h', { exact: true }).waitFor()
  assert.equal(await entries.locator('.week-row').count(), 10)
  console.log('PASS AC-01 personal defaults to this month; no month navigation; totals independent of paging')

  await page.getByText('团队工时', { exact: true }).click()
  await checkRange('2026-11-16', '2026-11-22')
  await entries.scrollIntoViewIfNeeded()
  await entries.getByText('日期联动验收团队 · 21h', { exact: true }).waitFor()
  console.log('PASS AC-02 team defaults to this week')

  await page.getByRole('button', { name: '谁是卷王', exact: true }).click()
  await card.locator('.ranking-range').getByText('2026-11-16 至 2026-11-19', { exact: true }).waitFor()
  assert.equal(await card.getByRole('radio', { name: '工时利用率', exact: true }).isChecked(), true)
  await card.locator('.champion-hours strong').getByText('25.00', { exact: true }).waitFor()
  assert.equal(await card.locator('.champion-hours > span').textContent(), '%')
  await card.getByText('工时利用率 12.50%', { exact: true }).waitFor()
  console.log('PASS UR-01 utilization is the default and percentages keep two decimal places')
  for (const name of ['总工时', '加班工时', '加班天数', '工时利用率']) {
    await card.locator('.ranking-controls').getByText(name, { exact: true }).click()
    await card.getByText(`按${name}排序 · 统计 2 人`, { exact: true }).waitFor()
  }
  console.log('PASS UR-02 all four ranking dimensions can be selected')
  const refresh = async () => {
    const next = page.waitForResponse(response => response.url().includes('/worklogs/report?') && response.url().includes('refresh=true'))
    await page.getByRole('button', { name: '刷新当前工时数据', exact: true }).click()
    await next
  }
  utilizationFixture = 'tie'
  await refresh()
  await card.getByText('所选范围内并列工时利用率第一', { exact: true }).waitFor()
  assert.ok((await card.locator('.champion-copy strong').textContent()).includes(alice.name))
  assert.ok((await card.locator('.champion-copy strong').textContent()).includes(bob.name))
  assert.equal(await card.locator('.champion-hours strong').textContent(), '100.00')
  console.log('PASS UR-03 equal rounded percentages share first place')
  utilizationFixture = 'above100'
  await refresh()
  await card.locator('.champion-hours strong').getByText('105.00', { exact: true }).waitFor()
  utilizationFixture = 'zero'
  await refresh()
  await card.getByText('工时利用率 0.00%', { exact: true }).waitFor()
  await card.getByText('工时利用率 —', { exact: true }).waitFor()
  const unranked = card.locator('.ranking-row').filter({ hasText: bob.name })
  assert.equal(await unranked.locator('.rank-number').textContent(), '—')
  await unranked.getByText('无工作日，不参与排名', { exact: true }).waitFor()
  assert.equal(await card.locator('.champion-card').count(), 0)
  utilizationFixture = 'noWorkdays'
  await refresh()
  await page.waitForFunction(() => [...document.querySelectorAll('.ranking-row .rank-number')].length === 2 &&
    [...document.querySelectorAll('.ranking-row .rank-number')].every(el => el.textContent === '—'))
  console.log('PASS UR-04 percentages can exceed 100%; zero hours and zero workdays remain distinct')
  utilizationFixture = undefined
  await refresh()
  await card.locator('.champion-hours strong').getByText('25.00', { exact: true }).waitFor()
  assert.equal(await card.locator('.ranking-note').count(), 0)
  await card.getByRole('img', { name: '统计范围说明' }).hover()
  await page.getByRole('tooltip', { name: '按所选日期范围统计，排除当天及未来日期', exact: true }).waitFor()
  await page.mouse.move(4, 4)
  await page.getByRole('button', { name: '缺勤统计', exact: true }).click()
  await page.getByRole('dialog').getByText('统计范围：2026-11-16 至 2026-11-19', { exact: true }).waitFor()
  await page.getByRole('dialog').locator('.el-dialog__headerbtn').click()
  console.log('PASS AC-03 ranking and absence share the range ending yesterday')

  await page.getByRole('button', { name: '工时趋势', exact: true }).click()
  await entries.getByRole('combobox', { name: '筛选团队成员' }).click()
  await page.getByRole('option', { name: bob.name, exact: true }).click()
  await card.getByRole('heading', { name: bob.name + ' · 工时统计', exact: true }).waitFor()
  await entries.getByText('成员乙 · 14h', { exact: true }).waitFor()
  await page.getByRole('button', { name: '谁是卷王', exact: true }).click()
  await card.getByText('按工时利用率排序 · 统计 2 人', { exact: true }).waitFor()
  console.log('PASS AC-04 member filters chart and entries; ranking retains all team members')

  await entries.getByRole('button', { name: '上周', exact: true }).click()
  await card.locator('.ranking-range').getByText('2026-11-09 至 2026-11-15', { exact: true }).waitFor()
  await page.getByRole('button', { name: '工时趋势', exact: true }).click()
  await setDates('2026-10-28', '2026-11-03')
  await checkRange('2026-10-28', '2026-11-03')
  assert.deepEqual(await page.locator('.trend-chart .axis-label--x').allTextContents().then(xs => xs.map(x => x.trim())),
    ['10-28', '10-29', '10-30', '10-31', '11-01', '11-02', '11-03'])
  console.log('PASS AC-05 historical shortcut and custom cross-month chart dates')

  await setDates('2026-11-20', '2026-11-22')
  await checkRange('2026-11-20', '2026-11-22')
  await page.getByRole('button', { name: '谁是卷王', exact: true }).click()
  await card.getByText('所选范围内暂无可统计日期，仅统计截至昨天的工时', { exact: true }).waitFor()
  await page.getByRole('button', { name: '缺勤统计', exact: true }).click()
  await page.getByRole('dialog').getByText('所选范围内暂无可统计日期，仅统计截至昨天的工时', { exact: true }).waitFor()
  await page.getByRole('dialog').locator('.el-dialog__headerbtn').click()
  console.log('PASS AC-06 today/future-only ranges show no eligible ranking or absence data')

  await page.getByRole('button', { name: '工时趋势', exact: true }).click()
  await setDates('2026-11-20', '2026-12-22')
  await card.getByText('工时统计范围不能超过一个月（31 天）', { exact: true }).waitFor()
  assert.ok((await chartRange()).includes('2026-11-20 至 2026-11-22'))
  assert.equal(requests.filter(x => x.from === '2026-11-20' && x.to === '2026-12-22').length, 0)
  console.log('PASS AC-07 invalid ranges pause both chart/entries queries and label previous results')

  await page.getByText('我的工时', { exact: true }).click()
  await checkRange('2026-11-01', '2026-11-30')
  await page.getByText('团队工时', { exact: true }).click()
  await checkRange('2026-11-16', '2026-11-22')
  holdFrom = '2026-11-09'
  await entries.getByRole('button', { name: '上周', exact: true }).click()
  await page.waitForFunction(() => !!document.querySelector('.el-skeleton'))
  await page.getByText('我的工时', { exact: true }).click()
  await checkRange('2026-11-01', '2026-11-30')
  assert.ok(heldReport)
  heldReport()
  holdFrom = undefined
  await page.waitForTimeout(150)
  assert.ok((await chartRange()).includes('2026-11-01 至 2026-11-30'))
  console.log('PASS AC-08 mode switches reset defaults and late reports cannot replace the current scope')

  failReport = true
  await entries.getByRole('button', { name: '上月', exact: true }).click()
  await card.getByText('模拟统计失败', { exact: true }).waitFor()
  await page.getByRole('button', { name: '刷新当前工时数据', exact: true }).click()
  await checkRange('2026-10-01', '2026-10-31')
  assert.deepEqual(await page.locator('.trend-chart .axis-label--x').allTextContents().then(xs => xs.map(x => x.trim())),
    Array.from({ length: 31 }, (_, i) => String(i + 1)))
  console.log('PASS AC-09 report failures recover after refresh')
  await page.screenshot({ path: fileURLToPath(new URL('./personal-range.png', import.meta.url)), fullPage: true })
  await page.getByText('团队工时', { exact: true }).click()
  await checkRange('2026-11-16', '2026-11-22')
  await page.getByRole('button', { name: '谁是卷王', exact: true }).click()
  await page.screenshot({ path: fileURLToPath(new URL('./team-ranking.png', import.meta.url)), fullPage: true })
  await page.mouse.move(4, 4)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: fileURLToPath(new URL('./narrow-ranking.png', import.meta.url)), fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  assert.deepEqual(errors, [])
  console.log('PASS AC-10 desktop/narrow layouts and no browser runtime errors')
} catch (error) {
  console.error('Last fixture requests:', requests.slice(-8))
  console.error('Current UI:', (await page.locator('.worklog-dashboard').innerText()).slice(0, 2400))
  await page.screenshot({ path: fileURLToPath(new URL('./failure.png', import.meta.url)), fullPage: true })
  throw error
} finally { await context.close(); await browser.close() }
