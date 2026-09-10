<template>
  <el-dialog
    v-model="visible"
    title="添加发布项目"
    :width="dialogWidth"
    :close-on-click-modal="false"
    :close-on-press-escape="!recognizing"
    :show-close="!recognizing"
    @closed="reset"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="手动添加" name="manual" :disabled="recognizing">
        <el-form label-position="top" class="manual-form">
          <el-form-item label="CODING 项目" required>
            <el-select
              v-model="manualProjectId"
              class="full-control"
              filterable
              :loading="catalogLoading"
              placeholder="选择项目"
              @change="loadManualPlans"
            >
              <el-option v-for="project in projects" :key="project.id" :label="project.displayName || project.name" :value="project.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="构建计划" required>
            <el-select v-model="manualPlanId" class="full-control" filterable :disabled="!manualProjectId" placeholder="选择可构建计划">
              <el-option v-for="plan in manualPlans" :key="plan.id" :label="plan.name" :value="plan.id" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="截图识别" name="image" :disabled="recognizing">
        <div v-loading="recognizing" element-loading-text="正在识别截图，请稍候" class="image-import-content">
          <div class="column-config">
            <el-form-item label="源项目名称列名">
              <el-input v-model="projectColumnName" maxlength="50" placeholder="系统所属OPS" @change="saveColumnNames" />
            </el-form-item>
            <el-form-item label="源构建计划列名">
              <el-input v-model="planColumnName" maxlength="50" placeholder="系统名字" @change="saveColumnNames" />
            </el-form-item>
          </div>

          <div class="import-toolbar">
            <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="onFileChange">
            <el-button :icon="Upload" :disabled="recognizing" @click="fileInput?.click()">上传图片</el-button>
            <el-button
              type="primary"
              :icon="Search"
              :loading="recognizing"
              :disabled="!selectedFile || recognizing"
              @click="recognizeSelectedImage"
            >开始识别</el-button>
            <span class="muted">支持粘贴截图，PNG/JPEG/WebP，最大 10 MB</span>
          </div>

          <div v-if="previewUrl" class="image-preview-panel">
            <el-image
              class="image-preview"
              :src="previewUrl"
              :preview-src-list="[previewUrl]"
              :initial-index="0"
              fit="contain"
              preview-teleported
              hide-on-click-modal
            />
            <div class="image-meta">
              <strong>{{ selectedFile?.name || '剪贴板截图' }}</strong>
              <span>{{ selectedFile ? formatFileSize(selectedFile.size) : '' }}</span>
              <span>点击图片查看大图</span>
            </div>
          </div>
          <div v-else class="paste-zone" tabindex="0">
            <el-icon :size="28"><Picture /></el-icon>
            <strong>粘贴当前电脑剪贴板中的表格截图</strong>
            <span>也可以使用上方“上传图片”选择本地图片</span>
          </div>

          <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
          <div v-if="collapsedSummary.total" class="collapsed-summary">
            <span>
              {{ nonActionableExpanded ? '已展开' : '已折叠' }} {{ collapsedSummary.total }} 条：
              已添加 {{ collapsedSummary.alreadyAdded }} 条，截图重复 {{ collapsedSummary.duplicateInImage }} 条
            </span>
            <el-button
              link
              type="primary"
              :icon="nonActionableExpanded ? ArrowUp : ArrowDown"
              @click="nonActionableExpanded = !nonActionableExpanded"
            >
              {{ nonActionableExpanded ? '收起' : '展开查看' }}
            </el-button>
          </div>
          <el-table v-if="displayRows.length" :data="displayRows" border class="import-table" max-height="420">
            <el-table-column label="源项目名称" min-width="170">
              <template #default="scope">{{ sourceProjectName(scope.row) || '—' }}</template>
            </el-table-column>
            <el-table-column label="源构建计划" min-width="190">
              <template #default="scope">{{ sourcePlanName(scope.row) || '—' }}</template>
            </el-table-column>
            <el-table-column label="目标项目名称" min-width="210">
              <template #default="scope">
                <el-select v-model="scope.row.projectId" clearable filterable size="small" placeholder="人工选择" @change="changeProject(scope.row)">
                  <el-option v-for="project in projects" :key="project.id" :label="project.displayName || project.name" :value="project.id" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="目标构建计划" min-width="240">
              <template #default="scope">
                <el-select
                  v-model="scope.row.planId"
                  clearable
                  filterable
                  size="small"
                  placeholder="人工选择"
                  :disabled="!scope.row.projectId"
                  @change="updateStatus(scope.row)"
                >
                  <el-option
                    v-for="plan in planOptions(scope.row)"
                    :key="plan.id"
                    :label="plan.name"
                    :value="plan.id"
                    :disabled="!plan.quickBuildSupported"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="150">
              <template #default="scope">
                <el-tag :type="statusType(scope.row.status)" effect="light">{{ statusLabel(scope.row.status) }}</el-tag>
                <small v-if="scope.row.message" class="status-message">{{ scope.row.message }}</small>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else-if="previewUrl && !rows.length" description="图片已就绪，点击“开始识别”获取结果" :image-size="70" />
        </div>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <el-button :disabled="recognizing" @click="visible = false">取消</el-button>
      <el-button
        v-if="activeTab === 'image' && rows.length"
        :loading="adding"
        type="primary"
        :disabled="!readyRows.length || recognizing"
        @click="batchAdd"
      >确认添加 {{ readyRows.length }} 项</el-button>
      <el-button
        v-if="activeTab === 'manual'"
        :loading="adding"
        type="primary"
        :disabled="!manualProjectId || !manualPlanId"
        @click="manualAdd"
      >添加</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, ArrowUp, Picture, Search, Upload } from '@element-plus/icons-vue'
import { addTeamIterationReleasePlan } from '@/api/zhaogangIteration'
import {
  batchAddZhaogangReleasePlans,
  getZhaogangAiConfig,
  getZhaogangPlans,
  getZhaogangProjects,
  issueZhaogangAgentTicket,
  matchZhaogangReleaseRows,
  recognizeZhaogangReleaseImage,
} from '@/api/zhaogang'
import { checkZgWorkbenchAgent, getZgWorkbenchAgentPort, zgWorkbenchAgentClient } from '@/services/zgWorkbenchAgentClient'
import {
  DEFAULT_RELEASE_IMPORT_PLAN_COLUMN,
  DEFAULT_RELEASE_IMPORT_PROJECT_COLUMN,
  loadReleaseImportColumnNames,
  saveReleaseImportColumnNames,
} from '@/services/zhaogangReleaseImportPreferences'
import { summarizeCollapsedReleaseImportRows, visibleReleaseImportRows } from '@/services/zhaogangReleaseImportRows'
import type { ZhaogangBuildPlan, ZhaogangProject } from '@/types/zhaogang'
import type { ZhaogangReleaseImportPreview, ZhaogangReleaseImportRow, ZhaogangReleaseImportStatus } from '@/types/zhaogangReleaseImport'
import type { TeamIterationReleasePlan } from '@/types/zhaogangIteration'

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
type ReleasePlanOption = Pick<ZhaogangBuildPlan, 'id' | 'name' | 'quickBuildSupported'>

const props = defineProps<{ iterationId: number; releasePlans: TeamIterationReleasePlan[] }>()
const emit = defineEmits<{ completed: [] }>()
const visible = defineModel<boolean>({ default: false })
const activeTab = ref('manual')
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File>()
const previewUrl = ref('')
const rows = ref<ZhaogangReleaseImportRow[]>([])
const projects = ref<ZhaogangProject[]>([])
const plansByProject = ref<Record<number, ZhaogangBuildPlan[]>>({})
const nonActionableExpanded = ref(false)
const recognizing = ref(false)
const catalogLoading = ref(false)
const adding = ref(false)
const error = ref('')
const manualProjectId = ref<number>()
const manualPlanId = ref<number>()
const manualPlans = ref<ZhaogangBuildPlan[]>([])
const projectColumnName = ref(DEFAULT_RELEASE_IMPORT_PROJECT_COLUMN)
const planColumnName = ref(DEFAULT_RELEASE_IMPORT_PLAN_COLUMN)
const dialogWidth = computed(() => activeTab.value === 'manual'
  ? 'min(720px, calc(100% - 28px))'
  : 'min(1100px, calc(100% - 28px))')
const readyRows = computed(() => rows.value.filter(row => row.status === 'READY' && row.projectId && row.planId))
const collapsedSummary = computed(() => summarizeCollapsedReleaseImportRows(rows.value))
const displayRows = computed(() => visibleReleaseImportRows(rows.value, nonActionableExpanded.value))
const statusText: Record<ZhaogangReleaseImportStatus, string> = { READY: '可添加', PROJECT_AMBIGUOUS: '项目待确认', PLAN_AMBIGUOUS: '计划待确认', UNMATCHED: '未匹配', DUPLICATE_IN_IMAGE: '截图重复', ALREADY_ADDED: '已添加', UNBUILDABLE: '不可快捷构建', CATALOG_UNAVAILABLE: '目录不可用' }
const statusLabel = (status: ZhaogangReleaseImportStatus) => statusText[status] || status
const statusType = (status: ZhaogangReleaseImportStatus) => status === 'READY' ? 'success' : status === 'UNBUILDABLE' || status === 'ALREADY_ADDED' ? 'info' : 'warning'

const loadColumnNames = () => {
  const stored = loadReleaseImportColumnNames()
  projectColumnName.value = stored.projectColumnName
  planColumnName.value = stored.planColumnName
}
const saveColumnNames = () => {
  const saved = saveReleaseImportColumnNames({
    projectColumnName: projectColumnName.value,
    planColumnName: planColumnName.value,
  })
  projectColumnName.value = saved.projectColumnName
  planColumnName.value = saved.planColumnName
}
const releasePreviewUrl = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}
const reset = () => {
  rows.value = []
  nonActionableExpanded.value = false
  error.value = ''
  activeTab.value = 'manual'
  manualProjectId.value = undefined
  manualPlanId.value = undefined
  manualPlans.value = []
  selectedFile.value = undefined
  releasePreviewUrl()
  if (fileInput.value) fileInput.value.value = ''
}
const ensureCatalog = async () => {
  if (projects.value.length) return
  catalogLoading.value = true
  try { projects.value = await getZhaogangProjects() }
  finally { catalogLoading.value = false }
}
const loadPlans = async (projectId: number) => {
  if (!plansByProject.value[projectId]) plansByProject.value[projectId] = await getZhaogangPlans(projectId)
  return plansByProject.value[projectId]
}
const planOptions = (row: ZhaogangReleaseImportRow): ReleasePlanOption[] => {
  if (!row.projectId) return []
  const plans: ReleasePlanOption[] = plansByProject.value[row.projectId]
    || row.candidates.filter(candidate => candidate.planId > 0).map(candidate => ({
      id: candidate.planId,
      name: candidate.planName,
      quickBuildSupported: candidate.quickBuildSupported,
    }))
  return plans.filter(plan => plan.quickBuildSupported || plan.id === row.planId)
}
const sourceProjectName = (row: ZhaogangReleaseImportRow) => row.recognized.ops || row.recognized.projectHint
const sourcePlanName = (row: ZhaogangReleaseImportRow) => row.recognized.systemName || row.recognized.planHint
const formatFileSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`

const selectImage = (file: File) => {
  if (!IMAGE_TYPES.includes(file.type)) { error.value = '只支持 PNG、JPEG、WebP 截图'; return }
  if (file.size > MAX_IMAGE_BYTES) { error.value = '截图不能超过 10 MB'; return }
  releasePreviewUrl()
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  rows.value = []
  nonActionableExpanded.value = false
  error.value = ''
}
const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) selectImage(file)
  input.value = ''
}
const onPaste = (event: ClipboardEvent) => {
  if (!visible.value || activeTab.value !== 'image' || recognizing.value) return
  const file = Array.from(event.clipboardData?.items || [])
    .find(item => item.kind === 'file' && item.type.startsWith('image/'))
    ?.getAsFile()
    || Array.from(event.clipboardData?.files || []).find(item => item.type.startsWith('image/'))
  if (!file) return
  event.preventDefault()
  selectImage(file)
}
const recognizeSelectedImage = async () => {
  const file = selectedFile.value
  if (!file || recognizing.value) return
  saveColumnNames()
  recognizing.value = true
  error.value = ''
  rows.value = []
  try {
    await ensureCatalog()
    const config = await getZhaogangAiConfig()
    let preview: ZhaogangReleaseImportPreview
    if (config.executionLocation === 'LOCAL_AGENT') {
      preview = await recognizeWithLocalAgent(file)
    } else {
      try {
        preview = await recognizeZhaogangReleaseImage(props.iterationId, file, projectColumnName.value, planColumnName.value)
      } catch (serverError) {
        const message = serverError instanceof Error ? serverError.message : ''
        if (config.executionLocation !== 'AUTO' || !/网络|连接|超时|不可达|请求失败/i.test(message)) throw serverError
        preview = await recognizeWithLocalAgent(file)
      }
    }
    nonActionableExpanded.value = false
    rows.value = preview.items
    for (const row of rows.value) if (row.projectId) await loadPlans(row.projectId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '截图识别失败'
  } finally {
    recognizing.value = false
  }
}
const recognizeWithLocalAgent = async (file: File): Promise<ZhaogangReleaseImportPreview> => {
  const state = await checkZgWorkbenchAgent()
  if (!state.running || !state.compatible || !state.health?.capabilities?.includes('ai-vision')) {
    throw new Error('本机 Agent 未运行、版本过旧或不支持 AI 识别，请前往设置处理')
  }
  const ticket = await issueZhaogangAgentTicket(props.iterationId, projectColumnName.value, planColumnName.value)
  const result = await zgWorkbenchAgentClient(getZgWorkbenchAgentPort()).aiVisionRecognize(ticket.ticket, file)
  const text = result.text || ''
  let parsed: unknown
  try { parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) } catch { throw new Error('本机 Agent 返回的 AI 识别结果不是有效 JSON') }
  const items = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { rows?: unknown[] }).rows) ? (parsed as { rows: unknown[] }).rows : [])
  if (!items.length) throw new Error('AI 未识别到可用的发布项目行')
  return matchZhaogangReleaseRows(props.iterationId, items.map((item) => {
    const row = item as Record<string, unknown>
    return {
      requirement: String(row.requirement || row.project || ''),
      ops: String(row.ops || row.systemOps || row[projectColumnName.value] || row[DEFAULT_RELEASE_IMPORT_PROJECT_COLUMN] || ''),
      systemName: String(row.systemName || row.system || row[planColumnName.value] || row[DEFAULT_RELEASE_IMPORT_PLAN_COLUMN] || ''),
      projectHint: String(row.projectHint || row.codingProject || row.projectName || ''),
      planHint: String(row.planHint || row.buildPlan || row.planName || ''),
    }
  }))
}
const changeProject = async (row: ZhaogangReleaseImportRow) => {
  row.planId = null
  row.planName = ''
  if (!row.projectId) {
    row.projectName = ''
    row.status = 'UNMATCHED'
    row.message = '请选择目标项目'
    recomputeSelectedRows()
    return
  }
  const project = projects.value.find(item => item.id === row.projectId)
  row.projectName = project?.name || ''
  await loadPlans(row.projectId)
  row.status = 'PLAN_AMBIGUOUS'
  row.message = '请选择目标构建计划'
  recomputeSelectedRows()
}
const loadManualPlans = async (projectId: number) => {
  manualPlanId.value = undefined
  manualPlans.value = projectId ? (await loadPlans(projectId)).filter(plan => plan.quickBuildSupported) : []
}
const recomputeSelectedRows = () => {
  const seen = new Set<string>()
  for (const row of rows.value) {
    if (!row.projectId || !row.planId) continue
    const plan = planOptions(row).find(item => item.id === row.planId)
    if (!plan) { row.status = 'UNMATCHED'; row.message = '未匹配到构建计划'; continue }
    const key = `${row.projectId}:${row.planId}`
    const already = props.releasePlans.some(item => `${item.projectId}:${item.planId}` === key)
    row.planName = plan.name
    row.status = !plan.quickBuildSupported ? 'UNBUILDABLE' : already ? 'ALREADY_ADDED' : seen.has(key) ? 'DUPLICATE_IN_IMAGE' : 'READY'
    row.message = row.status === 'READY' ? '' : statusLabel(row.status)
    if (row.status === 'READY') seen.add(key)
  }
}
const updateStatus = (row: ZhaogangReleaseImportRow) => {
  if (!row.projectId || !row.planId) { row.status = 'PLAN_AMBIGUOUS'; row.message = '请选择目标构建计划' }
  recomputeSelectedRows()
}
const batchAdd = async () => {
  adding.value = true
  try {
    const submittedRows = [...readyRows.value]
    const result = await batchAddZhaogangReleasePlans(props.iterationId, submittedRows.map(row => ({ rowNo: row.rowNo, projectId: row.projectId!, planId: row.planId! })))
    const failures = new Map(result.failures.map(item => [item.rowNo, item.reason]))
    for (const row of submittedRows) {
      const reason = failures.get(row.rowNo)
      row.status = reason ? 'READY' : 'ALREADY_ADDED'
      row.message = reason || '已添加'
    }
    if (result.failureCount) ElMessage.warning(`已添加 ${result.successCount} 项，${result.failureCount} 项失败`)
    else ElMessage.success(`已添加 ${result.successCount} 个发布项目`)
    emit('completed')
    if (!result.failureCount) visible.value = false
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '批量添加失败')
  } finally {
    adding.value = false
  }
}
const manualAdd = async () => {
  if (!manualProjectId.value || !manualPlanId.value) return
  adding.value = true
  try {
    await addTeamIterationReleasePlan(props.iterationId, manualProjectId.value, manualPlanId.value)
    emit('completed')
    visible.value = false
    ElMessage.success('发布项目已添加')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '发布项目添加失败')
  } finally {
    adding.value = false
  }
}

watch(visible, (opened) => {
  if (!opened) return
  loadColumnNames()
  ensureCatalog().catch(err => { error.value = err instanceof Error ? err.message : 'CODING 项目目录加载失败' })
})
onMounted(() => document.addEventListener('paste', onPaste))
onBeforeUnmount(() => {
  document.removeEventListener('paste', onPaste)
  releasePreviewUrl()
})
</script>

<style scoped>
.manual-form { max-width: 620px; }
.full-control { width: 100%; }
.image-import-content { min-height: 320px; }
.column-config { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.column-config :deep(.el-form-item) { margin-bottom: 14px; }
.import-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.muted, .status-message, .image-meta span { color: #7b8799; font-size: 13px; }
.paste-zone { display: flex; min-height: 150px; align-items: center; justify-content: center; flex-direction: column; gap: 8px; margin-bottom: 14px; color: #4a5b73; background: #f7f9fc; border: 1px dashed #b8c4d5; }
.image-preview-panel { display: grid; grid-template-columns: minmax(0, 1fr) 180px; gap: 16px; min-height: 180px; margin-bottom: 14px; padding: 12px; border: 1px solid #dcdfe6; background: #f7f9fc; }
.image-preview { width: 100%; height: 230px; cursor: zoom-in; background: #fff; }
.image-meta { display: flex; min-width: 0; flex-direction: column; justify-content: center; gap: 7px; }
.image-meta strong { overflow-wrap: anywhere; }
.collapsed-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; padding: 8px 12px; color: #606266; background: #f5f7fa; border: 1px solid #e4e7ed; }
.collapsed-summary span { min-width: 0; line-height: 1.5; }
.collapsed-summary .el-button { flex: none; }
.import-table { margin-top: 10px; }
.import-table :deep(.el-select) { width: 100%; }
.status-message { display: block; margin-top: 4px; line-height: 1.35; }
@media (max-width: 640px) {
  .column-config { grid-template-columns: 1fr; gap: 0; }
  .import-toolbar { align-items: flex-start; }
  .muted { flex-basis: 100%; }
  .image-preview-panel { grid-template-columns: 1fr; }
  .image-preview { height: 190px; }
  .image-meta { gap: 4px; }
  .collapsed-summary { align-items: flex-start; }
}
</style>
