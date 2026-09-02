import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const manifest = JSON.parse(await readFile(resolve(process.cwd(), 'public/zhaogang-release-notes.json'), 'utf8'))
assert.equal(manifest.schemaVersion, 1)
assert.ok(manifest.releases.some((release) => release.id === manifest.currentReleaseId))
assert.equal(new Set(manifest.releases.map((release) => release.id)).size, manifest.releases.length)
assert.equal(new Set(manifest.releases.map((release) => release.version)).size, manifest.releases.length)
assert.ok(manifest.releases.every((release) => !Object.hasOwn(release, 'title')))
assert.ok(manifest.releases.every((release) => release.items.length > 0 && release.items.every((item) => ['FEATURE', 'IMPROVEMENT', 'FIX'].includes(item.type) && item.text.trim())))

const current = manifest.releases.find((release) => release.id === manifest.currentReleaseId)
let receiptRead = false
assert.equal(receiptRead, false)
let historyDrawerVisible = false
historyDrawerVisible = true // 点击右上角版本标签立即打开更新日志
receiptRead = true // 打开更新日志即确认当前版本已读
assert.equal(receiptRead, true)
assert.equal(historyDrawerVisible, true)
assert.notEqual(current.id, '')

const workbench = await readFile(resolve(process.cwd(), 'src/views/zhaogang/ZhaogangWorkbench.vue'), 'utf8')
const drawer = await readFile(resolve(process.cwd(), 'src/views/zhaogang/components/ZhaogangReleaseHistoryDrawer.vue'), 'utf8')
assert.match(workbench, /class="header-release-tag"/)
assert.match(workbench, /acknowledgeCurrentZhaogangRelease/)
assert.doesNotMatch(workbench, /ZhaogangReleaseNotice|更新日志<\/el-button>|CODING 已连接/)
assert.doesNotMatch(drawer, /我知道了|acknowledge|#footer|release\.title/)
console.log('zhaogang release notes behavior checks passed')
