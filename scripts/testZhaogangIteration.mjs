import assert from 'node:assert/strict'
import {mkdir, readFile, rm} from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/zhaogang-iteration-tests')
await rm(tempDir, {recursive: true, force: true})
await mkdir(tempDir, {recursive: true})

const outfile = path.join(tempDir, 'coding-issue-association-feedback.mjs')
await build({
  entryPoints: [path.join(root, 'src/views/zhaogang/iteration/codingIssueAssociationFeedback.ts')],
  outfile,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  logLevel: 'silent'
})

const {formatCodingIssueAssociationResult} = await import(pathToFileURL(outfile).href)
const url = 'https://g-iijw5014.coding.net/p/yuncunzheng/requirements/issues/4783/detail'
const result = formatCodingIssueAssociationResult([{
  url,
  message: '#4783 事项类型为“史诗”，暂不支持关联。'
}])

assert.equal(result, '#4783 事项类型为“史诗”，暂不支持关联。')
assert.equal(formatCodingIssueAssociationResult([
  {url, message: '#4783 事项类型为“史诗”，暂不支持关联。'},
  {url: 'https://g-iijw5014.coding.net/p/yuncunzheng/requirements/issues/4784/detail', message: '关联失败'}
]), '· #4783 事项类型为“史诗”，暂不支持关联。\n· #4784 关联失败')

const hierarchyOutfile = path.join(tempDir, 'iteration-issue-hierarchy.mjs')
await build({
  entryPoints: [path.join(root, 'src/views/zhaogang/iteration/iterationIssueHierarchy.ts')],
  outfile: hierarchyOutfile,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  logLevel: 'silent'
})

const hierarchy = await import(pathToFileURL(hierarchyOutfile).href)
assert.deepEqual(hierarchy.manualChildIssueTypes('REQUIREMENT'), ['USER_STORY', 'SUB_TASK'])
assert.deepEqual(hierarchy.manualChildIssueTypes('TASK'), ['SUB_TASK'])
assert.deepEqual(hierarchy.manualChildIssueTypes('USER_STORY'), ['SUB_TASK'])
assert.equal(hierarchy.canAddChildIssues('TASK'), true)
assert.equal(hierarchy.canAddChildIssues('SUB_TASK'), false)
assert.equal(hierarchy.defaultManualChildIssueType('TASK'), 'SUB_TASK')
assert.equal(hierarchy.canSyncWorkbenchIssueType('TASK'), false)

const apiOutfile = path.join(tempDir, 'zhaogang-iteration-api.mjs')
await build({
  entryPoints: [path.join(root, 'src/api/zhaogangIteration.ts')],
  outfile: apiOutfile,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  alias: { '@': path.join(root, 'src') },
  define: { 'import.meta.env.VITE_BUILD_ENV': '"dev"' },
  logLevel: 'silent'
})

let capturedRequest
globalThis.fetch = async (url, init) => {
  capturedRequest = {url: String(url), init}
  return new Response(JSON.stringify({code: 200, message: 'success', data: null}), {
    status: 200,
    headers: {'Content-Type': 'application/json'}
  })
}
const iterationApi = await import(pathToFileURL(apiOutfile).href)
await iterationApi.removeTeamIterationIssues(7, [11, 12])
assert.equal(capturedRequest.url, '/external-service/api/zhaogang/iterations/7/issues/batch-delete')
assert.equal(capturedRequest.init.method, 'POST')
assert.deepEqual(JSON.parse(capturedRequest.init.body), {issueIds: [11, 12]})

const detailSource = await readFile(
  path.join(root, 'src/views/zhaogang/iteration/ZhaogangIterationDetailView.vue'),
  'utf8'
)
const selectionColumnIndex = detailSource.indexOf('type="selection"')
const firstBusinessColumnIndex = detailSource.indexOf('label="类型"')
const batchDeleteButtonIndex = detailSource.indexOf('@click="removeSelectedIssues"')
const syncCodingButtonIndex = detailSource.indexOf('@click="syncCodingIssues"')
assert.ok(selectionColumnIndex >= 0 && selectionColumnIndex < firstBusinessColumnIndex)
assert.ok(batchDeleteButtonIndex >= 0 && batchDeleteButtonIndex < syncCodingButtonIndex)
assert.match(detailSource, /:disabled="!selectedIssueIds\.length"/)

console.log('zhaogang iteration tests passed')
