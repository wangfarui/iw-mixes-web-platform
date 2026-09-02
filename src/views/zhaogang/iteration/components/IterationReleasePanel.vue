<template>
  <section
    v-if="displayMode === 'bottom'"
    class="release-panel"
    :class="{ 'is-collapsed': collapsed, 'is-resizing': resizing }"
    :style="panelStyle"
  >
    <button
      v-if="!collapsed"
      class="resize-handle"
      type="button"
      aria-label="调整发布面板高度"
      title="上下拖动调整高度"
      @pointerdown="startResize"
    ><span /></button>

    <header class="release-panel-header">
      <div class="release-panel-title">
        <el-button
          text
          circle
          class="collapse-button"
          :aria-label="collapsed ? '展开发布项目' : '收起发布项目'"
          :title="collapsed ? '展开发布项目' : '收起发布项目'"
          @click="toggleCollapsed"
        >
          <el-icon><ArrowUp v-if="collapsed" /><ArrowDown v-else /></el-icon>
        </el-button>
        <div>
          <h3>发布项目</h3>
          <span>{{ releasePlans.length }} 个构建计划</span>
        </div>
        <el-button
          text
          circle
          class="display-mode-button"
          aria-label="切换为右侧抽屉展示"
          title="切换为右侧抽屉展示"
          @click="switchDisplayMode('drawer')"
        ><el-icon><Expand /></el-icon></el-button>
      </div>
      <div v-if="!collapsed" class="release-panel-actions">
        <el-button :icon="Refresh" :loading="refreshingAll" @click="refreshAll">刷新状态</el-button>
        <el-button v-if="canEdit" type="primary" :icon="Plus" @click="openAddDialog">添加发布项目</el-button>
      </div>
    </header>

    <div v-if="!collapsed" class="release-list-viewport">
      <el-table v-if="releasePlans.length" :data="releasePlans" height="100%" border>
        <el-table-column label="构建计划 / 项目" min-width="300">
          <template #default="scope">
            <div class="release-name-cell">
              <el-tooltip :content="scope.row.planName" placement="top" :disabled="!planNameOverflow[scope.row.id]">
                <span :ref="setPlanNameElement(scope.row.id)" class="release-plan-name"><strong>{{ scope.row.planName }}</strong></span>
              </el-tooltip>
              <span class="release-project-name">{{ scope.row.projectDisplayName || scope.row.projectName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="最近构建" min-width="205">
          <template #default="scope">
            <div v-if="runtime[scope.row.id]?.loading" class="status-loading">正在读取 CODING 状态</div>
            <div v-else-if="runtime[scope.row.id]?.error" class="status-error">
              <span>{{ runtime[scope.row.id]?.error }}</span>
              <el-button link type="primary" @click="refreshSinglePlan(scope.row)">重试</el-button>
            </div>
            <div v-else class="build-status-cell">
              <el-tag :type="buildTagType(latestBuild(scope.row)?.status)" effect="light">
                {{ buildStatus(latestBuild(scope.row)?.status) }}
              </el-tag>
              <template v-if="latestBuild(scope.row)">
                <span>{{ latestBuild(scope.row)?.branch || '-' }} · {{ latestBuild(scope.row)?.commit || '-' }}</span>
                <span>{{ latestBuild(scope.row)?.triggerUser || '-' }} · {{ latestBuild(scope.row)?.startedAt || '-' }}</span>
              </template>
              <span v-else>{{ buildCapabilityText(scope.row) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="构建环境" width="90" align="center">
          <template #default="scope">{{ latestBuild(scope.row)?.environment || '—' }}</template>
        </el-table-column>
        <el-table-column label="Pods" width="90" align="center">
          <template #default="scope"><span v-if="runtime[scope.row.id]?.k8sLoading" class="status-loading">查询中</span><span v-else>{{ k8sPodsText(runtime[scope.row.id]?.k8s) }}</span></template>
        </el-table-column>
        <el-table-column label="服务状态" width="125" align="center" class-name="release-status-column">
          <template #default="scope">
            <el-tag :type="k8sStatusTagType(runtime[scope.row.id]?.k8s)" effect="light">{{ k8sStatusText(runtime[scope.row.id]?.k8s) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Pod创建时间" min-width="180" show-overflow-tooltip>
          <template #default="scope">{{ k8sCreatedAt(runtime[scope.row.id]?.k8s) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <div class="release-row-actions">
              <el-button
                link
                type="primary"
                :icon="VideoPlay"
                :disabled="!canBuild(scope.row)"
                @click="openBuildDialog(scope.row)"
              >立即构建</el-button>
              <el-dropdown v-if="canEdit" trigger="click" @command="handleCommand($event, scope.row)">
                <el-button link type="primary">更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :icon="Refresh" command="refresh">刷新状态</el-dropdown-item>
                    <el-dropdown-item :icon="Link" command="open-coding">前往 CODING 发布页</el-dropdown-item>
                    <el-dropdown-item divided :icon="Delete" command="remove">移除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无发布项目" :image-size="66" />
    </div>
  </section>

  <el-drawer
    v-else
    v-model="drawerVisible"
    class="release-drawer"
    size="min(1180px, 100%)"
    :with-header="false"
    destroy-on-close
  >
    <section class="release-panel release-panel-drawer" :class="{ 'is-collapsed': collapsed, 'is-resizing': resizing }">
      <header class="release-panel-header">
        <div class="release-panel-title">
          <el-button
            text
            circle
            class="collapse-button"
            :aria-label="'切换到底部展示'"
            title="切换到底部展示"
            @click="switchDisplayMode('bottom')"
          ><el-icon><Fold /></el-icon></el-button>
          <div>
            <h3>发布项目</h3>
            <span>{{ releasePlans.length }} 个构建计划</span>
          </div>
        </div>
        <div class="release-panel-actions">
          <el-button :icon="Refresh" :loading="refreshingAll" @click="refreshAll">刷新状态</el-button>
          <el-button v-if="canEdit" type="primary" :icon="Plus" @click="openAddDialog">添加发布项目</el-button>
        </div>
      </header>

      <div class="release-list-viewport">
        <el-table v-if="releasePlans.length" :data="releasePlans" height="100%" border>
          <el-table-column label="构建计划 / 项目" min-width="330">
            <template #default="scope">
              <div class="release-name-cell">
                <el-tooltip :content="scope.row.planName" placement="top" :disabled="!planNameOverflow[scope.row.id]">
                  <span :ref="setPlanNameElement(scope.row.id)" class="release-plan-name"><strong>{{ scope.row.planName }}</strong></span>
                </el-tooltip>
                <span class="release-project-name">{{ scope.row.projectDisplayName || scope.row.projectName }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="最近构建" min-width="255">
            <template #default="scope">
              <div v-if="runtime[scope.row.id]?.loading" class="status-loading">正在读取 CODING 状态</div>
              <div v-else-if="runtime[scope.row.id]?.error" class="status-error">
                <span>{{ runtime[scope.row.id]?.error }}</span>
                <el-button link type="primary" @click="refreshSinglePlan(scope.row)">重试</el-button>
              </div>
              <div v-else class="build-status-cell">
                <el-tag :type="buildTagType(latestBuild(scope.row)?.status)" effect="light">
                  {{ buildStatus(latestBuild(scope.row)?.status) }}
                </el-tag>
                <template v-if="latestBuild(scope.row)">
                  <span>{{ latestBuild(scope.row)?.branch || '-' }} · {{ latestBuild(scope.row)?.commit || '-' }}</span>
                  <span>{{ latestBuild(scope.row)?.triggerUser || '-' }} · {{ latestBuild(scope.row)?.startedAt || '-' }}</span>
                </template>
                <span v-else>{{ buildCapabilityText(scope.row) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="构建环境" width="90" align="center">
            <template #default="scope">{{ latestBuild(scope.row)?.environment || '—' }}</template>
          </el-table-column>
          <el-table-column label="Pods" width="90" align="center">
            <template #default="scope"><span v-if="runtime[scope.row.id]?.k8sLoading" class="status-loading">查询中</span><span v-else>{{ k8sPodsText(runtime[scope.row.id]?.k8s) }}</span></template>
          </el-table-column>
          <el-table-column label="服务状态" width="125" align="center" class-name="release-status-column">
            <template #default="scope">
              <el-tag :type="k8sStatusTagType(runtime[scope.row.id]?.k8s)" effect="light">{{ k8sStatusText(runtime[scope.row.id]?.k8s) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Pod创建时间" min-width="180" show-overflow-tooltip>
            <template #default="scope">{{ k8sCreatedAt(runtime[scope.row.id]?.k8s) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <div class="release-row-actions">
                <el-button
                  link
                  type="primary"
                  :icon="VideoPlay"
                  :disabled="!canBuild(scope.row)"
                  @click="openBuildDialog(scope.row)"
                >立即构建</el-button>
                <el-dropdown v-if="canEdit" trigger="click" @command="handleCommand($event, scope.row)">
                  <el-button link type="primary">更多</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :icon="Refresh" command="refresh">刷新状态</el-dropdown-item>
                      <el-dropdown-item :icon="Link" command="open-coding">前往 CODING 发布页</el-dropdown-item>
                      <el-dropdown-item divided :icon="Delete" command="remove">移除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无发布项目" :image-size="66" />
      </div>
    </section>
  </el-drawer>

  <el-dialog v-model="addDialogVisible" title="添加发布项目" width="min(560px, calc(100% - 28px))" :close-on-click-modal="false">
    <el-form label-position="top">
      <el-form-item label="CODING 项目" required>
        <el-select
          v-model="addForm.projectId"
          class="full-control"
          filterable
          :loading="projectsLoading"
          placeholder="选择项目"
          @change="loadPlans"
        >
          <el-option v-for="project in projects" :key="project.id" :label="project.displayName || project.name" :value="project.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="构建计划" required>
        <el-select
          v-model="addForm.planId"
          class="full-control"
          filterable
          :loading="plansLoading"
          :disabled="!addForm.projectId"
          placeholder="选择可构建计划"
          no-data-text="该项目暂无可构建计划"
        >
          <el-option
            v-for="plan in plans"
            :key="plan.id"
            :label="plan.name"
            :value="plan.id"
            :disabled="existingPlanKeys.has(planKey(plan.projectId, plan.id))"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="addDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="adding" :disabled="!addForm.projectId || !addForm.planId" @click="addReleasePlan">添加</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="buildDialogVisible" title="立即构建" width="min(500px, calc(100% - 28px))" :close-on-click-modal="false">
    <p class="dialog-plan-name">
      {{ activeReleasePlan?.projectDisplayName || activeReleasePlan?.projectName }} · {{ activeReleasePlan?.planName }}
    </p>
    <el-form label-position="top">
      <el-form-item label="env" required>
        <el-select v-model="buildForm.environment" class="full-control" @change="changeEnvironment">
          <el-option v-for="environment in activePlanDetail?.plan.environments || []" :key="environment" :label="environment" :value="environment" />
        </el-select>
      </el-form-item>
      <el-form-item label="构建目标（Git 分支）" required>
        <el-select
          v-model="buildForm.branch"
          class="full-control"
          filterable
          remote
          :remote-method="searchBranches"
          :loading="branchLoading"
          placeholder="搜索真实分支"
          @change="branchManuallySelected = true"
        >
          <el-option v-if="buildForm.branch && !branchOptions.some(item => item.name === buildForm.branch)" :label="buildForm.branch" :value="buildForm.branch" />
          <el-option v-for="branch in branchOptions" :key="branch.name" :label="branch.name" :value="branch.name" />
        </el-select>
      </el-form-item>
    </el-form>
    <el-alert type="info" :closable="false" title="分支始终从 CODING 关联仓库搜索；手动选择分支后，切换环境不会覆盖该选择。" />
    <template #footer>
      <el-button @click="buildDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="triggering" :disabled="!buildForm.branch || !buildForm.environment" @click="triggerBuild">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUpdated, reactive, ref, watch, type ComponentPublicInstance, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, ArrowUp, Delete, Expand, Fold, Link, Plus, Refresh, VideoPlay } from '@element-plus/icons-vue'
import {
  getZhaogangPlanDetail, getZhaogangPlans, getZhaogangProjects, searchZhaogangBranches, triggerZhaogangBuild
} from '@/api/zhaogang'
import { addTeamIterationReleasePlan, removeTeamIterationReleasePlan } from '@/api/zhaogangIteration'
import { queryReleaseK8sStatuses, type ReleaseK8sStatus } from '@/services/zhaogangReleaseK8s'
import type {
  ZhaogangBranch, ZhaogangBuild, ZhaogangBuildPlan, ZhaogangPlanDetail, ZhaogangProject, ZhaogangSessionStatus
} from '@/types/zhaogang'
import type { TeamIterationReleasePlan } from '@/types/zhaogangIteration'

const props = defineProps<{
  iterationId: number
  releasePlans: TeamIterationReleasePlan[]
  canEdit: boolean
}>()

const emit = defineEmits<{
  added: [releasePlan: TeamIterationReleasePlan]
  removed: [releasePlanId: number]
  'mode-change': [mode: DisplayMode]
}>()

interface PlanRuntime {
  loading: boolean
  detail?: ZhaogangPlanDetail
  error?: string
  k8s?: ReleaseK8sStatus
  k8sLoading?: boolean
}

const sessionRef = inject<Ref<ZhaogangSessionStatus | null>>('zhaogangSession')
type DisplayMode = 'bottom' | 'drawer'
const collapsed = ref(false)
const displayMode = ref<DisplayMode>('bottom')
const drawerVisible = ref(false)
const panelHeight = ref(300)
const resizing = ref(false)
const refreshingAll = ref(false)
const runtime = reactive<Record<number, PlanRuntime>>({})
const addDialogVisible = ref(false)
const projectsLoading = ref(false)
const plansLoading = ref(false)
const adding = ref(false)
const projects = ref<ZhaogangProject[]>([])
const plans = ref<ZhaogangBuildPlan[]>([])
const addForm = reactive({ projectId: undefined as number | undefined, planId: undefined as number | undefined })
const buildDialogVisible = ref(false)
const activeReleasePlan = ref<TeamIterationReleasePlan>()
const buildForm = reactive({ environment: '', branch: '' })
const branchOptions = ref<ZhaogangBranch[]>([])
const branchLoading = ref(false)
const branchManuallySelected = ref(false)
const triggering = ref(false)
const planNameOverflow = reactive<Record<number, boolean>>({})
const planNameElements = new Map<number, HTMLElement>()
let branchSearchTimer: number | undefined
let resizeStartY = 0
let resizeStartHeight = 0
let stateReady = false
let missingRefreshInFlight: Promise<void> | undefined

const planKey = (projectId: number, planId: number) => `${projectId}:${planId}`
const storageKey = computed(() => `zhaogang:iteration-release-panel:${sessionRef?.value?.userId || 'anonymous'}`)
const panelStyle = computed(() => collapsed.value ? undefined : { height: `${panelHeight.value}px` })
const existingPlanKeys = computed(() => new Set(props.releasePlans.map(item => planKey(item.projectId, item.planId))))
const activePlanDetail = computed(() => activeReleasePlan.value ? runtime[activeReleasePlan.value.id]?.detail : undefined)

const setPlanNameElement = (planId: number) => (element: Element | ComponentPublicInstance | null) => {
  if (element instanceof HTMLElement) {
    planNameElements.set(planId, element)
    void nextTick(updatePlanNameOverflow)
  } else planNameElements.delete(planId)
}

const updatePlanNameOverflow = () => {
  const activeIds = new Set(props.releasePlans.map(item => item.id))
  planNameElements.forEach((element, planId) => {
    if (!activeIds.has(planId)) planNameElements.delete(planId)
  })
  props.releasePlans.forEach(plan => {
    const element = planNameElements.get(plan.id)
    const overflowing = Boolean(element && element.scrollWidth > element.clientWidth)
    if (planNameOverflow[plan.id] !== overflowing) planNameOverflow[plan.id] = overflowing
  })
}
const handlePlanNameResize = () => { void nextTick(updatePlanNameOverflow) }

const maxPanelHeight = () => Math.max(220, Math.min(560, window.innerHeight - 360))
const clampPanelHeight = (height: number) => Math.max(180, Math.min(maxPanelHeight(), height))

const restorePanelState = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey.value) || '{}') as { collapsed?: boolean, height?: number, mode?: DisplayMode }
    displayMode.value = stored.mode === 'bottom' || stored.mode === 'drawer'
      ? stored.mode
      : window.innerWidth <= 700 ? 'drawer' : 'bottom'
    collapsed.value = displayMode.value === 'bottom' && (window.innerWidth <= 700 || Boolean(stored.collapsed))
    if (Number.isFinite(stored.height)) panelHeight.value = clampPanelHeight(Number(stored.height))
  } catch {
    displayMode.value = window.innerWidth <= 700 ? 'drawer' : 'bottom'
    collapsed.value = false
    panelHeight.value = clampPanelHeight(300)
  }
  stateReady = true
  emit('mode-change', displayMode.value)
}

const savePanelState = () => {
  if (!stateReady) return
  localStorage.setItem(storageKey.value, JSON.stringify({ mode: displayMode.value, collapsed: collapsed.value, height: panelHeight.value }))
}

const switchDisplayMode = (mode: DisplayMode) => {
  if (displayMode.value === mode) {
    if (mode === 'drawer') drawerVisible.value = true
    return
  }
  displayMode.value = mode
  drawerVisible.value = mode === 'drawer'
  if (mode === 'drawer') collapsed.value = false
  savePanelState()
  emit('mode-change', mode)
  if (mode === 'drawer') void refreshMissingPlans()
}

const openDrawer = () => {
  if (displayMode.value !== 'drawer') switchDisplayMode('drawer')
  else drawerVisible.value = true
  void refreshMissingPlans()
}

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
  if (!collapsed.value) void refreshMissingPlans()
}

const startResize = (event: PointerEvent) => {
  event.preventDefault()
  resizing.value = true
  resizeStartY = event.clientY
  resizeStartHeight = panelHeight.value
  window.addEventListener('pointermove', resizePanel)
  window.addEventListener('pointerup', stopResize, { once: true })
}

const resizePanel = (event: PointerEvent) => {
  panelHeight.value = clampPanelHeight(resizeStartHeight - (event.clientY - resizeStartY))
}

const stopResize = () => {
  resizing.value = false
  window.removeEventListener('pointermove', resizePanel)
  savePanelState()
}

const refreshPlan = async (releasePlan: TeamIterationReleasePlan) => {
  if (runtime[releasePlan.id]?.loading) return
  runtime[releasePlan.id] = { ...runtime[releasePlan.id], loading: true, error: undefined }
  try {
    runtime[releasePlan.id] = {
      loading: false,
      detail: await getZhaogangPlanDetail(releasePlan.projectId, releasePlan.planId)
    }
  } catch (error) {
    runtime[releasePlan.id] = {
      loading: false,
      error: error instanceof Error ? error.message : 'CODING 构建状态读取失败'
    }
  }
}

const refreshK8sPlans = async (releasePlans: TeamIterationReleasePlan[]) => {
  const targets = releasePlans.map(releasePlan => ({
    id: releasePlan.id,
    planName: releasePlan.planName,
    environment: latestBuild(releasePlan)?.environment
  }))
  releasePlans.forEach(releasePlan => {
    runtime[releasePlan.id] = { ...runtime[releasePlan.id], k8sLoading: true }
  })
  const statuses = await queryReleaseK8sStatuses(targets)
  releasePlans.forEach(releasePlan => {
    runtime[releasePlan.id] = {
      ...runtime[releasePlan.id],
      k8s: statuses[releasePlan.id],
      k8sLoading: false
    }
  })
}

const refreshSinglePlan = async (releasePlan: TeamIterationReleasePlan) => {
  await refreshPlan(releasePlan)
  await refreshK8sPlans([releasePlan])
}

const refreshMissingPlans = () => {
  if (missingRefreshInFlight) return missingRefreshInFlight
  const task = (async () => {
    await Promise.all(props.releasePlans.filter(item => !runtime[item.id]?.detail && !runtime[item.id]?.loading)
      .map(refreshPlan))
    if (props.releasePlans.length) await refreshK8sPlans(props.releasePlans)
  })()
  missingRefreshInFlight = task
  const clearInFlight = () => {
    if (missingRefreshInFlight === task) missingRefreshInFlight = undefined
  }
  void task.then(clearInFlight, clearInFlight)
  return task
}

const refreshAll = async () => {
  refreshingAll.value = true
  try {
    await Promise.all(props.releasePlans.map(refreshPlan))
    await refreshK8sPlans(props.releasePlans)
  }
  finally { refreshingAll.value = false }
}

const latestBuild = (releasePlan: TeamIterationReleasePlan): ZhaogangBuild | undefined => {
  const detail = runtime[releasePlan.id]?.detail
  return detail?.plan.latestBuild || detail?.builds[0]
}

const canBuild = (releasePlan: TeamIterationReleasePlan) => {
  const plan = runtime[releasePlan.id]?.detail?.plan
  return plan ? plan.quickBuildSupported : releasePlan.quickBuildSupported && !runtime[releasePlan.id]?.error
}

const buildCapabilityText = (releasePlan: TeamIterationReleasePlan) => canBuild(releasePlan)
  ? '尚无构建记录'
  : '该计划不支持工作台快捷构建'

const buildStatus = (status?: string) => {
  if (!status) return '暂无记录'
  const normalized = status.toUpperCase()
  if (normalized.includes('SUCCESS') || normalized.includes('SUCCEED')) return '构建成功'
  if (normalized.includes('RUN') || normalized.includes('QUEUE') || normalized.includes('INIT')) return '构建中'
  if (normalized.includes('ABORT') || normalized.includes('CANCEL') || normalized.includes('STOP')) return '已终止'
  if (normalized.includes('FAIL') || normalized.includes('ERROR')) return '构建失败'
  return status
}

const buildTagType = (status?: string): 'success' | 'warning' | 'danger' | 'info' => {
  const text = buildStatus(status)
  if (text === '构建成功') return 'success'
  if (text === '构建失败') return 'danger'
  if (text === '构建中') return 'warning'
  return 'info'
}

const k8sStatusText = (status?: ReleaseK8sStatus) => {
  if (!status) return '正在查询'
  if (status.state === 'READY' && status.deployment) return deploymentStatus(status.deployment)
  return {
    READY: '正常',
    NO_BUILD: '暂无最近构建',
    UNKNOWN_ENVIRONMENT: '无法识别构建环境',
    UNKNOWN_SERVICE: '无法识别服务',
    NOT_FOUND: '未找到对应服务',
    AGENT_OFFLINE: 'Agent 未启动',
    TOKEN_MISSING: '对应环境 Token 未配置',
    QUERYING: '正在查询',
    QUERY_FAILED: 'K8s 查询失败'
  }[status.state] || 'K8s 查询失败'
}

const deploymentStatus = (deployment: { podCount: number; replicas: number }) =>
  deployment.podCount === deployment.replicas ? '正常' : deployment.podCount < deployment.replicas ? '异常' : '启动中'

const k8sStatusTagType = (status?: ReleaseK8sStatus): 'success' | 'warning' | 'danger' | 'info' => {
  if (status?.state === 'READY' && status.deployment) {
    const value = deploymentStatus(status.deployment)
    return value === '正常' ? 'success' : value === '启动中' ? 'warning' : 'danger'
  }
  if (status?.state === 'QUERYING') return 'warning'
  if (status?.state === 'NO_BUILD' || status?.state === 'NOT_FOUND') return 'info'
  return 'danger'
}

const k8sPodsText = (status?: ReleaseK8sStatus) => {
  const deployment = status?.deployment
  return deployment ? `${deployment.podCount} / ${deployment.replicas}` : '—'
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const k8sCreatedAt = (status?: ReleaseK8sStatus) => formatDate(status?.deployment?.lastPodCreatedAt)

const openAddDialog = async () => {
  Object.assign(addForm, { projectId: undefined, planId: undefined })
  plans.value = []
  addDialogVisible.value = true
  if (projects.value.length) return
  projectsLoading.value = true
  try { projects.value = await getZhaogangProjects() }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : 'CODING 项目加载失败') }
  finally { projectsLoading.value = false }
}

const loadPlans = async (projectId: number) => {
  addForm.planId = undefined
  plans.value = []
  if (!projectId) return
  plansLoading.value = true
  try { plans.value = (await getZhaogangPlans(projectId)).filter(plan => plan.quickBuildSupported) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '构建计划加载失败') }
  finally { plansLoading.value = false }
}

const addReleasePlan = async () => {
  if (!addForm.projectId || !addForm.planId) return
  adding.value = true
  try {
    const releasePlan = await addTeamIterationReleasePlan(props.iterationId, addForm.projectId, addForm.planId)
    emit('added', releasePlan)
    addDialogVisible.value = false
    ElMessage.success('发布项目已添加')
    await refreshSinglePlan(releasePlan)
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '发布项目添加失败') }
  finally { adding.value = false }
}

const removeReleasePlan = async (releasePlan: TeamIterationReleasePlan) => {
  try {
    await ElMessageBox.confirm(`确认从迭代中移除“${releasePlan.projectDisplayName || releasePlan.projectName} · ${releasePlan.planName}”？`, '移除发布项目', { type: 'warning' })
    await removeTeamIterationReleasePlan(props.iterationId, releasePlan.id)
    delete runtime[releasePlan.id]
    emit('removed', releasePlan.id)
    ElMessage.success('发布项目已移除')
  } catch (error) { if (error instanceof Error) ElMessage.error(error.message) }
}

const handleCommand = (command: string, releasePlan: TeamIterationReleasePlan) => {
  if (command === 'refresh') void refreshSinglePlan(releasePlan)
  else if (command === 'open-coding') openCodingReleasePage(releasePlan)
  else if (command === 'remove') void removeReleasePlan(releasePlan)
}

const openCodingReleasePage = (releasePlan: TeamIterationReleasePlan) => {
  const projectName = encodeURIComponent(releasePlan.projectName)
  window.open(`https://g-iijw5014.coding.net/p/${projectName}/ci/job?id=${releasePlan.planId}`, '_blank', 'noopener')
}

const defaultBranchFor = (environment: string, plan: ZhaogangBuildPlan) => {
  const mapping: Record<string, string> = { sit: 'test', uat: 'uat', prd: 'master' }
  return mapping[environment.toLowerCase()] || plan.defaultBranch || 'master'
}

const openBuildDialog = async (releasePlan: TeamIterationReleasePlan) => {
  if (!runtime[releasePlan.id]?.detail) await refreshSinglePlan(releasePlan)
  const detail = runtime[releasePlan.id]?.detail
  if (!detail) return
  if (!detail.plan.quickBuildSupported) {
    ElMessage.warning('该计划存在非标准启动参数，请前往 CODING 发起构建')
    return
  }
  activeReleasePlan.value = releasePlan
  const environments = detail.plan.environments
  const environment = environments.find(item => item.toLowerCase() === 'sit') || environments[0] || ''
  Object.assign(buildForm, { environment, branch: defaultBranchFor(environment, detail.plan) })
  branchManuallySelected.value = false
  branchOptions.value = []
  buildDialogVisible.value = true
  await searchBranches(buildForm.branch)
}

const changeEnvironment = async (environment: string) => {
  const detail = activePlanDetail.value
  if (!detail || branchManuallySelected.value) return
  buildForm.branch = defaultBranchFor(environment, detail.plan)
  await searchBranches(buildForm.branch)
}

const searchBranches = async (keyword: string) => {
  const releasePlan = activeReleasePlan.value
  if (!releasePlan) return
  window.clearTimeout(branchSearchTimer)
  await new Promise<void>(resolve => { branchSearchTimer = window.setTimeout(resolve, 220) })
  branchLoading.value = true
  try { branchOptions.value = await searchZhaogangBranches(releasePlan.projectId, releasePlan.planId, keyword) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '分支查询失败') }
  finally { branchLoading.value = false }
}

const triggerBuild = async () => {
  const releasePlan = activeReleasePlan.value
  if (!releasePlan || !buildForm.branch || !buildForm.environment) return
  const environment = buildForm.environment.toLowerCase()
  if (['uat', 'prd', 'prod', 'production'].includes(environment)) {
    try {
      await ElMessageBox.confirm(`即将触发 ${buildForm.environment} 环境构建，请确认环境和分支无误。`, '确认构建环境', { type: 'warning' })
    } catch { return }
  }
  triggering.value = true
  try {
    const build = await triggerZhaogangBuild(releasePlan.projectId, releasePlan.planId, { ...buildForm })
    const current = runtime[releasePlan.id]?.detail
    if (current) {
      current.plan.latestBuild = build
      current.builds = [build, ...current.builds.filter(item => item.id !== build.id)]
    }
    await refreshK8sPlans([releasePlan])
    buildDialogVisible.value = false
    ElMessage.success('已触发 CODING 构建')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '构建触发失败') }
  finally { triggering.value = false }
}

watch([collapsed, panelHeight], savePanelState)
watch(drawerVisible, visible => {
  if (visible && displayMode.value === 'drawer') void refreshMissingPlans()
})
watch(() => props.releasePlans.map(item => item.id).join(','), () => {
  const activeIds = new Set(props.releasePlans.map(item => item.id))
  Object.keys(runtime).forEach(key => { if (!activeIds.has(Number(key))) delete runtime[Number(key)] })
  if (!collapsed.value) void refreshMissingPlans()
})
watch(() => props.releasePlans.map(item => `${item.id}:${item.planName}`).join('|'), () => {
  void nextTick(updatePlanNameOverflow)
})

onMounted(() => {
  restorePanelState()
  if (!collapsed.value) void refreshMissingPlans()
  void nextTick(updatePlanNameOverflow)
  window.addEventListener('resize', handlePlanNameResize)
})

onUpdated(() => {
  void nextTick(updatePlanNameOverflow)
})

onBeforeUnmount(() => {
  window.clearTimeout(branchSearchTimer)
  window.removeEventListener('pointermove', resizePanel)
  window.removeEventListener('resize', handlePlanNameResize)
})

defineExpose({ openDrawer })
</script>

<style scoped>
.release-panel { position: relative; display: flex; box-sizing: border-box; min-height: 180px; flex: 0 0 auto; flex-direction: column; overflow: hidden; background: #fff; border: 1px solid #dfe5ee; border-radius: 6px; box-shadow: 0 -4px 14px rgba(45, 66, 99, .05); }
.release-panel.is-collapsed { min-height: 52px; height: 52px; }
.release-panel.is-resizing { user-select: none; }
.resize-handle { position: absolute; z-index: 3; top: 0; left: 0; display: grid; width: 100%; height: 9px; place-items: start center; padding: 2px 0 0; background: transparent; border: 0; cursor: row-resize; }
.resize-handle span { width: 46px; height: 3px; background: #c7cfdb; border-radius: 2px; }
.resize-handle:hover span, .is-resizing .resize-handle span { background: #5f8edc; }
.release-panel-header { display: flex; min-height: 51px; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 14px; padding: 8px 14px; border-bottom: 1px solid #e8ecf2; }
.is-collapsed .release-panel-header { border-bottom: 0; }
.release-panel-title, .release-panel-actions, .release-row-actions { display: flex; align-items: center; }
.release-panel-title { min-width: 0; gap: 6px; }
.release-panel-title h3 { margin: 0; color: #2b394e; font-size: 16px; }
.release-panel-title span { display: block; margin-top: 3px; color: #8994a5; font-size: 12px; }
.collapse-button { flex: 0 0 auto; margin: 0; color: #68778d; font-size: 17px; }
.display-mode-button { flex: 0 0 auto; margin: 0; color: #68778d; font-size: 17px; }
.release-panel-actions { gap: 8px; }
.release-list-viewport { min-height: 0; flex: 1 1 auto; padding: 0 12px 12px; overflow: hidden; }
.release-list-viewport :deep(.el-empty) { height: 100%; padding: 6px 0; }
.release-name-cell { display: grid; min-width: 0; gap: 4px; }
.release-plan-name { display: block; min-width: 0; overflow: hidden; color: #2c3a4f; text-overflow: ellipsis; white-space: nowrap; }
.release-plan-name strong { color: inherit; }
.release-project-name, .build-status-cell span, .status-loading { color: #8994a5; font-size: 12px; }
.build-status-cell { display: grid; justify-items: start; gap: 5px; }
.build-status-cell > span { line-height: 1.35; white-space: normal; }
.status-error { display: flex; align-items: center; gap: 6px; color: #c45656; font-size: 12px; }
.release-list-viewport :deep(.el-table .cell) { overflow: hidden; text-overflow: ellipsis; }
.release-list-viewport :deep(.release-status-column .cell) { overflow: visible; text-overflow: clip; white-space: nowrap; }
.release-row-actions { justify-content: flex-start; gap: 5px; white-space: nowrap; }
.release-row-actions :deep(.el-button) { margin: 0; }
.full-control { width: 100%; }
.dialog-plan-name { margin: -7px 0 18px; color: #7e8a9d; font-size: 13px; }
.release-drawer :deep(.el-drawer__body) { display: flex; min-height: 0; padding: 0; }
.release-panel-drawer { width: 100%; min-height: 100%; border: 0; border-radius: 0; box-shadow: none; }
.release-panel-drawer .release-list-viewport { padding-bottom: 14px; }
@media (max-width: 700px) {
  .release-panel-header { align-items: flex-start; padding-right: 10px; padding-left: 10px; }
  .release-panel-actions { justify-content: flex-end; flex-wrap: wrap; }
  .release-list-viewport { padding-right: 8px; padding-left: 8px; }
}
</style>
