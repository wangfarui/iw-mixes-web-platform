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
const linkedRequirement = {
  id: 1, issueType: 'REQUIREMENT', source: 'CODING', syncStatus: 'SYNCED', issueCode: 7000, children: []
}
assert.equal(hierarchy.childIssueAutoSyncAvailability(linkedRequirement, 'USER_STORY', [linkedRequirement]).enabled, true)
const localRequirement = {
  id: 2, issueType: 'REQUIREMENT', source: 'WORKBENCH', syncStatus: 'NOT_REQUIRED', children: []
}
assert.deepEqual(hierarchy.childIssueAutoSyncAvailability(localRequirement, 'USER_STORY', [localRequirement]), {
  enabled: false,
  reason: '父级需求尚未关联 CODING'
})
const localStory = {
  id: 3, parentId: 1, issueType: 'USER_STORY', source: 'WORKBENCH', syncStatus: 'PENDING', children: []
}
linkedRequirement.children = [localStory]
assert.equal(hierarchy.childIssueAutoSyncAvailability(localStory, 'SUB_TASK', [linkedRequirement]).enabled, true)

const preferencesOutfile = path.join(tempDir, 'zhaogang-preferences.mjs')
await build({
  entryPoints: [path.join(root, 'src/services/zhaogangPreferences.ts')],
  outfile: preferencesOutfile,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  alias: { '@': path.join(root, 'src') },
  logLevel: 'silent'
})
const preferencesModule = await import(pathToFileURL(preferencesOutfile).href)
assert.equal(preferencesModule.defaultZhaogangPreferences().autoSyncCreatedChildIssue, false)
const preferenceStorage = new Map()
globalThis.window = {
  localStorage: {
    getItem: key => preferenceStorage.get(key) ?? null,
    setItem: (key, value) => preferenceStorage.set(key, value)
  }
}
preferenceStorage.set('zhaogang:preferences:100', JSON.stringify({autoSyncCreatedChildIssue: true}))
assert.equal(preferencesModule.loadZhaogangPreferences(100).autoSyncCreatedChildIssue, true)
assert.equal(preferencesModule.loadZhaogangPreferences(101).autoSyncCreatedChildIssue, false)

const statusFilterOutfile = path.join(tempDir, 'iteration-issue-status-filter.mjs')
await build({
  entryPoints: [path.join(root, 'src/views/zhaogang/iteration/iterationIssueStatusFilter.ts')],
  outfile: statusFilterOutfile,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  alias: { '@': path.join(root, 'src') },
  logLevel: 'silent'
})

const statusFilter = await import(pathToFileURL(statusFilterOutfile).href)
const statusIssues = [{
  id: 1, issueType: 'REQUIREMENT', issueTypeName: '需求', statusName: '开发中', children: [{
    id: 2, issueType: 'USER_STORY', issueTypeName: '用户故事', statusName: '开发中', children: [{
      id: 3, issueType: 'SUB_TASK', issueTypeName: '子工作项', statusName: '已完成', children: []
    }, {
      id: 4, issueType: 'SUB_TASK', issueTypeName: '子工作项', statusName: '', children: []
    }]
  }]
}]
const statusGroups = statusFilter.buildIterationIssueStatusFilterGroups(statusIssues)
assert.deepEqual(statusGroups.map(group => [group.label, group.options.map(option => option.label)]), [
  ['需求', ['开发中']],
  ['用户故事', ['开发中']],
  ['子工作项', ['已完成', '无 CODING 状态']]
])
const filteredStatusIssues = statusFilter.filterIterationIssueTree(statusIssues, ['SUB_TASK::已完成'])
assert.equal(filteredStatusIssues.length, 1)
assert.equal(filteredStatusIssues[0].children.length, 1)
assert.deepEqual(filteredStatusIssues[0].children[0].children.map(issue => issue.id), [3])
assert.equal(statusFilter.iterationIssueStatusMatchCount(statusIssues, ['SUB_TASK::已完成']), 1)
const filteredStoryIssues = statusFilter.filterIterationIssueTree(statusIssues, ['USER_STORY::开发中'])
assert.equal(filteredStoryIssues[0].children[0].id, 2)
assert.equal(statusFilter.iterationIssueStatusMatchCount(statusIssues, ['USER_STORY::开发中']), 1)
assert.deepEqual(statusFilter.iterationIssueParentIds(statusIssues), [1, 2])
assert.deepEqual(statusFilter.retainExpandedIterationIssueIds([2, 999, 2], statusIssues), [2])
assert.deepEqual(statusFilter.iterationIssueExpandRowKeys([1, 2, 1]), ['1', '2'])
const refreshedStatusIssues = [...statusIssues, {
  id: 5, issueType: 'TASK', issueTypeName: '任务', statusName: '处理中', children: [{
    id: 6, issueType: 'SUB_TASK', issueTypeName: '子工作项', statusName: '未开始', children: []
  }]
}]
assert.deepEqual(statusFilter.retainExpandedIterationIssueIds([2], refreshedStatusIssues), [2])

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
await iterationApi.addTeamIterationChildIssue(7, 11, {
  issueType: 'SUB_TASK', title: '实现接口', syncToCoding: true
})
assert.equal(capturedRequest.url, '/external-service/api/zhaogang/iterations/7/issues/11/children')
assert.equal(capturedRequest.init.method, 'POST')
assert.deepEqual(JSON.parse(capturedRequest.init.body), {
  issueType: 'SUB_TASK', title: '实现接口', syncToCoding: true
})

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
assert.match(detailSource, /v-model="issueStatusFilters"/)
assert.match(detailSource, /:data="filteredIssues"/)
assert.match(detailSource, /:expand-row-keys="visibleExpandedIssueKeys"/)
assert.match(detailSource, /const visibleExpandedIssueKeys = computed\(\(\) => iterationIssueExpandRowKeys\(/)
assert.match(detailSource, /@expand-change="handleIssueExpandChange"/)
assert.doesNotMatch(detailSource, /default-expand-all/)
assert.match(detailSource, /preserveExpansion[\s\S]*retainExpandedIterationIssueIds\(expandedIssueIds\.value, loadedDetail\.issues\)/)
assert.match(detailSource, /暂无匹配事项/)
assert.doesNotMatch(detailSource, /:model-value="detail\.stage"/)
assert.match(detailSource, /label="迭代状态" required><el-select v-model="editForm\.stage"/)
assert.match(detailSource, /stage: editForm\.stage/)
assert.doesNotMatch(detailSource, /editForm\.version/)
assert.match(detailSource, /v-model="childSyncToCoding"/)
assert.match(detailSource, /:disabled="!childAutoSyncAvailability\.enabled"/)
assert.match(detailSource, /syncToCoding: syncRequested/)
assert.ok(detailSource.indexOf('class="child-entry-row"') < detailSource.indexOf('<template v-if="childMode === \'LINK\'">'))

const workbenchSource = await readFile(
  path.join(root, 'src/views/zhaogang/ZhaogangWorkbench.vue'),
  'utf8'
)
assert.match(workbenchSource, /v-model="preferences\.autoSyncCreatedChildIssue"/)

const iterationEditorSource = await readFile(
  path.join(root, 'src/views/zhaogang/iteration/components/IterationEditorDialog.vue'),
  'utf8'
)
assert.match(iterationEditorSource, /stage: 'NOT_STARTED' as TeamIterationStage/)
assert.match(iterationEditorSource, /label="迭代状态" required><el-select v-model="form\.stage"/)
assert.match(iterationEditorSource, /stage: form\.stage/)
assert.doesNotMatch(iterationEditorSource, /form\.version/)

const releasePanelSource = await readFile(
  path.join(root, 'src/views/zhaogang/iteration/components/IterationReleasePanel.vue'),
  'utf8'
)
assert.match(releasePanelSource, /const autoRefreshEnabled = ref\(true\)/)
assert.match(releasePanelSource, /const refreshInterval = ref\(30\)/)
assert.match(releasePanelSource, /\{ label: '15 秒', value: 15 \}/)
assert.match(releasePanelSource, /\{ label: '30 秒', value: 30 \}/)
assert.match(releasePanelSource, /\{ label: '60 秒', value: 60 \}/)
assert.match(releasePanelSource, /\{ label: '3 分钟', value: 180 \}/)
assert.match(releasePanelSource, /if \(autoRefreshEnabled\.value\) void refreshAllSilently\(\)/)
assert.match(releasePanelSource, /window\.clearInterval\(autoRefreshTimer\)/)
assert.match(releasePanelSource, /const planKeyword = ref\(''\)/)
assert.match(releasePanelSource, /item\.planName\.toLowerCase\(\)\.includes\(keyword\)/)
assert.equal(releasePanelSource.match(/:data="filteredReleasePlans"/g)?.length, 2)
assert.match(releasePanelSource, /const releasePlans = \[\.\.\.props\.releasePlans\]/)
assert.match(releasePanelSource, /const refreshAllSilently = \(\) => refreshAllPlans\(false\)/)
assert.match(releasePanelSource, /loading: !hasDetail/)
assert.match(releasePanelSource, /detailRefreshing: hasDetail/)
assert.equal(releasePanelSource.match(/k8sLoading && !runtime\[scope\.row\.id\]\?\.k8s/g)?.length, 2)
assert.match(releasePanelSource, /k8s: preserveCurrent \? current\.k8s : refreshed/)

console.log('zhaogang iteration tests passed')
