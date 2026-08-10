<template>
  <div class="task-workspace">
    <div v-if="sidebarOpen" class="workspace-backdrop sidebar-backdrop" @click="sidebarOpen = false" />

    <TaskSidebar
      :smart-groups="smartGroups"
      :custom-groups="customGroups"
      :system-groups="systemGroups"
      :current-group-id="currentGroupId"
      :loading="navigationLoading"
      :open="sidebarOpen"
      @select="selectGroup"
      @close="sidebarOpen = false"
      @add-list="openGroupDialog('add-list')"
      @rename="openRenameList"
      @delete="deleteList"
    />

    <main class="task-list-panel">
      <header class="list-header">
        <div class="list-heading">
          <button type="button" class="header-icon-button sidebar-toggle" aria-label="打开清单导航" @click="sidebarOpen = true">
            <el-icon><Menu /></el-icon>
          </button>
          <div>
            <div class="list-title-line">
              <h1>{{ currentGroup?.name ?? '任务清单' }}</h1>
              <span class="list-count">{{ visibleTaskCount }}</span>
            </div>
            <p>{{ groupDescription }}</p>
          </div>
        </div>

        <div class="header-actions">
          <el-button v-if="isCustomGroup" plain @click="openGroupDialog('add-section')">
            <el-icon><FolderAdd /></el-icon>添加分组
          </el-button>
          <el-button v-if="currentGroupId === 'trash'" type="danger" plain @click="clearTrash">
            <el-icon><Delete /></el-icon>清空垃圾箱
          </el-button>
          <el-button circle plain aria-label="刷新任务" title="刷新任务" :loading="pageLoading" @click="refreshCurrent(true)">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </header>

      <div class="list-toolbar">
        <el-input v-model="searchText" clearable placeholder="搜索任务名称、备注或分组" class="search-input">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="sortMode" class="sort-filter" aria-label="任务排序">
          <el-option label="默认排序" value="default" />
          <el-option label="截止日期" value="deadline" />
          <el-option label="优先级" value="priority" />
          <el-option label="创建时间" value="created" />
        </el-select>
      </div>

      <div v-if="canAddTask" class="quick-add-card">
        <el-input
          ref="quickTaskInput"
          v-model="quickTaskName"
          maxlength="100"
          clearable
          placeholder="输入任务名称，按 Enter 快速创建"
          :disabled="addingTask"
          @keyup.enter="createQuickTask"
        >
          <template #prefix><el-icon><Plus /></el-icon></template>
          <template #suffix>
            <span v-if="isCustomGroup" class="quick-target-indicator" :title="`将添加到 ${quickTargetName}`">→ {{ quickTargetDisplayName }}</span>
          </template>
        </el-input>
        <el-button type="primary" :loading="addingTask" :disabled="!canSubmitQuickTask" @click="createQuickTask">
          创建任务
        </el-button>
      </div>

      <section class="task-list-scroll" aria-live="polite">
        <div v-if="pageError" class="page-error-state">
          <el-result icon="error" title="任务加载失败" :sub-title="pageError">
            <template #extra><el-button type="primary" @click="refreshCurrent(false)">重新加载</el-button></template>
          </el-result>
        </div>

        <div v-else-if="pageLoading" class="page-skeleton">
          <el-skeleton v-for="index in 7" :key="index" animated>
            <template #template>
              <div class="skeleton-row"><el-skeleton-item variant="circle" /><el-skeleton-item variant="text" /></div>
            </template>
          </el-skeleton>
        </div>

        <template v-else>
          <section v-for="section in sections" :key="section.id" class="task-section">
            <header v-if="showSectionHeader" class="section-header" :class="{ 'is-quick-target': quickGroupId === Number(section.id) }">
              <div class="section-heading-main">
                <button
                  type="button"
                  class="section-collapse"
                  :aria-label="`${section.expanded ? '收起' : '展开'}${section.name}`"
                  :aria-expanded="section.expanded"
                  @click="toggleSection(section)"
                >
                  <el-icon :class="{ 'is-expanded': section.expanded }"><ArrowRight /></el-icon>
                </button>
                <button
                  type="button"
                  class="section-target"
                  :aria-pressed="quickGroupId === Number(section.id)"
                  :title="`选中后，新任务将添加到${section.name}`"
                  @click="selectQuickTarget(section)"
                >
                  <span>{{ section.name }}</span>
                  <small>{{ visibleTasks(section).length }}</small>
                </button>
              </div>
              <el-dropdown trigger="click" placement="bottom-end" @command="(command: 'add-task' | 'rename' | 'delete') => handleSectionCommand(command, section)">
                <button type="button" class="section-more" :aria-label="`${section.name}分组操作`">
                  <el-icon><MoreFilled /></el-icon>
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="add-task"><Plus />新增任务</el-dropdown-item>
                    <el-dropdown-item command="rename"><Edit />重命名</el-dropdown-item>
                    <el-dropdown-item command="delete" divided class="danger-item"><Delete />删除分组</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </header>

            <div v-show="section.expanded || !showSectionHeader" class="section-body">
              <div v-if="section.loading" class="section-loading"><el-icon class="is-loading"><Loading /></el-icon>加载中…</div>

              <template v-else-if="visibleTasks(section).length">
                <draggable
                  v-if="canDragTasks"
                  v-model="section.tasks"
                  item-key="id"
                  handle=".task-drag-handle"
                  ghost-class="task-ghost"
                  @end="(event) => handleDragEnd(event, section)"
                >
                  <template #item="{ element: task }">
                    <TaskRow
                      :task="task"
                      :selected="selectedTask?.id === task.id"
                      :busy="busyTaskIds.has(task.id)"
                      :trash="currentGroupId === 'trash'"
                      :show-group="showTaskGroupName"
                      draggable
                      @select="selectTask"
                      @toggle="toggleTask"
                      @action="handleTaskAction"
                      @contextmenu="openContextMenu"
                    />
                  </template>
                </draggable>

                <TaskRow
                  v-for="task in canDragTasks ? [] : visibleTasks(section)"
                  :key="task.id"
                  :task="task"
                  :selected="selectedTask?.id === task.id"
                  :busy="busyTaskIds.has(task.id)"
                  :trash="currentGroupId === 'trash'"
                  :show-group="showTaskGroupName"
                  @select="selectTask"
                  @toggle="toggleTask"
                  @action="handleTaskAction"
                  @contextmenu="openContextMenu"
                />
              </template>

              <div v-else class="section-empty">
                <el-icon><Document /></el-icon>
                <span>{{ section.tasks.length ? emptyStateText : '这个分组还没有任务' }}</span>
              </div>
            </div>
          </section>

          <div v-if="!sections.length" class="workspace-empty">
            <el-empty :description="emptyStateText" :image-size="110">
              <el-button v-if="isCustomGroup" type="primary" plain @click="openGroupDialog('add-section')">添加第一个分组</el-button>
            </el-empty>
          </div>

          <div v-if="currentGroupId === 'completed' && sections[0]?.tasks.length" class="load-more">
            <el-button v-if="hasMoreCompleted" link type="primary" :loading="loadingMore" @click="loadMoreCompleted">加载更多</el-button>
            <span v-else>已显示全部已完成任务</span>
          </div>
        </template>
      </section>
    </main>

    <div v-if="detailOpen" class="workspace-backdrop detail-backdrop" @click="closeDetail" />
    <div class="task-detail-panel" :class="{ 'is-open': detailOpen }">
      <TaskDetailPane
        :task="selectedTask"
        :loading="detailLoading"
        :busy="selectedTask ? busyTaskIds.has(selectedTask.id) : false"
        :uploading="uploadingImage"
        @close="closeDetail"
        @save="saveTaskPatch"
        @toggle="toggleTask"
        @upload="uploadImage"
        @delete-file="removeTaskFile"
      />
    </div>

    <TaskContextMenu
      :visible="contextMenu.visible"
      :task="contextMenu.task"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :trash="currentGroupId === 'trash'"
      @action="handleTaskAction"
      @close="closeContextMenu"
    />

    <el-dialog v-model="groupDialog.visible" :title="groupDialogTitle" width="420px" :close-on-click-modal="false">
      <el-form @submit.prevent="submitGroupDialog">
        <el-form-item :label="groupDialog.mode === 'add-list' ? '清单名称' : '分组名称'" required>
          <el-input
            v-model="groupDialog.name"
            maxlength="20"
            show-word-limit
            autofocus
            :placeholder="groupDialog.mode === 'add-list' ? '例如：工作计划' : '例如：本周重点'"
            @keydown.enter.stop.prevent="submitGroupDialog"
          />
        </el-form-item>
        <div class="group-dialog-actions">
          <el-button native-type="button" @click="groupDialog.visible = false">取消</el-button>
          <el-button native-type="submit" type="primary" :loading="groupDialog.submitting">确定</el-button>
        </div>
      </el-form>
    </el-dialog>

    <el-dialog v-model="deadlineDialog.visible" title="设置截止日期" width="400px" :close-on-click-modal="false">
      <el-date-picker
        v-model="deadlineDialog.date"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="选择截止日期"
        clearable
        style="width: 100%"
      />
      <template #footer>
        <el-button @click="deadlineDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="deadlineDialog.submitting" @click="submitDeadline">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="moveDialog.visible" title="移动任务" width="420px" :close-on-click-modal="false">
      <el-select v-model="moveDialog.targetGroupId" filterable placeholder="选择目标分组" style="width: 100%">
        <el-option label="收集箱" :value="0" />
        <el-option-group v-for="group in detailGroupOptions" :key="group.label" :label="group.label">
          <el-option v-for="option in group.options" :key="option.value" :label="option.label" :value="option.value" />
        </el-option-group>
      </el-select>
      <template #footer>
        <el-button @click="moveDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="moveDialog.submitting" :disabled="moveDialog.targetGroupId === null" @click="submitMove">移动</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="pointsDialog.visible" title="设置任务积分" width="420px" :close-on-click-modal="false">
      <el-skeleton v-if="pointsDialog.loading" :rows="2" animated />
      <el-form v-else label-position="top">
        <div class="points-form-grid">
          <el-form-item label="完成奖励">
            <el-input-number v-model="pointsDialog.rewardPoints" :min="0" :precision="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="未完成处罚">
            <el-input-number v-model="pointsDialog.punishPoints" :min="0" :precision="0" controls-position="right" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="pointsDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="pointsDialog.submitting" :disabled="pointsDialog.loading" @click="savePoints">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  ArrowRight,
  Delete,
  Document,
  Edit,
  FolderAdd,
  Loading,
  Menu,
  MoreFilled,
  Plus,
  Refresh,
  Search
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import {
  addTask,
  addTaskFile,
  addTaskGroup,
  clearDeletedTasks,
  deleteTaskFile,
  deleteTaskGroup,
  getCompletedTasks,
  getDeletedTasks,
  getTaskDetail,
  getTaskGroupList,
  getTaskGroupMoveList,
  getTaskGroupStatistics,
  getTaskList,
  getTaskPoints,
  permanentlyDeleteTask,
  renameTaskGroup,
  saveTaskPoints,
  updateTask,
  updateTaskStatus,
  uploadTaskImage,
  type TaskBasicsVo,
  type TaskFileVo,
  type TaskGroupMoveListVo
} from '@/api/taskList'
import TaskContextMenu from '@/views/task/components/TaskContextMenu.vue'
import TaskDetailPane from '@/views/task/components/TaskDetailPane.vue'
import TaskRow from '@/views/task/components/TaskRow.vue'
import TaskSidebar from '@/views/task/components/TaskSidebar.vue'
import {
  defaultDeadlineForGroup,
  filterAndSortTasks,
  isSpecialGroup,
  offsetDate,
  taskIsCompleted,
  toTaskUpdate,
  withCompletionState,
  type TaskActionCommand,
  type TaskSection,
  type TaskSortMode,
  type TaskStatusFilter,
  type WorkspaceGroup
} from '@/views/task/taskWorkspace'

interface DragEvent {
  oldIndex?: number
  newIndex?: number
}

interface DetailGroupOption {
  label: string
  options: Array<{ label: string; value: number }>
}

type GroupDialogMode = 'add-list' | 'add-section' | 'rename-list' | 'rename-section'

const smartGroups = ref<WorkspaceGroup[]>([
  { id: 'today', name: '今天', icon: 'today', count: 0, kind: 'smart' },
  { id: 'week', name: '最近 7 天', icon: 'last-7day', count: 0, kind: 'smart' },
  { id: 'deadline', name: '截止任务', icon: 'deadline', count: 0, kind: 'smart' },
  { id: 'inbox', name: '收集箱', icon: 'box', count: 0, kind: 'smart' }
])
const customGroups = ref<WorkspaceGroup[]>([])
const systemGroups = ref<WorkspaceGroup[]>([
  { id: 'completed', name: '已完成', icon: 'done', count: 0, kind: 'system' },
  { id: 'trash', name: '垃圾箱', icon: 'deleted', count: 0, kind: 'system' }
])
const moveList = ref<TaskGroupMoveListVo[]>([])
const currentGroupId = ref('today')
const sections = ref<TaskSection[]>([])
const navigationLoading = ref(true)
const pageLoading = ref(false)
const pageError = ref('')
const searchText = ref('')
const statusFilter = ref<TaskStatusFilter>('active')
const sortMode = ref<TaskSortMode>('default')
const sidebarOpen = ref(false)
const detailOpen = ref(false)
const selectedTask = ref<TaskBasicsVo | null>(null)
const detailLoading = ref(false)
const busyTaskIds = ref(new Set<number>())
const uploadingImage = ref(false)
const quickTaskName = ref('')
const quickGroupId = ref<number | null>(null)
const addingTask = ref(false)
const completedPage = ref(1)
const hasMoreCompleted = ref(true)
const loadingMore = ref(false)
const quickTaskInput = ref<{ focus: () => void } | null>(null)
let loadSequence = 0
let detailSequence = 0

const groupDialog = reactive({
  visible: false,
  mode: 'add-list' as GroupDialogMode,
  id: 0,
  name: '',
  submitting: false
})

const deadlineDialog = reactive({
  visible: false,
  task: null as TaskBasicsVo | null,
  date: null as string | null,
  submitting: false
})

const moveDialog = reactive({
  visible: false,
  task: null as TaskBasicsVo | null,
  targetGroupId: null as number | null,
  submitting: false
})

const pointsDialog = reactive({
  visible: false,
  task: null as TaskBasicsVo | null,
  rewardPoints: 0,
  punishPoints: 0,
  loading: false,
  submitting: false
})

const contextMenu = reactive({
  visible: false,
  task: null as TaskBasicsVo | null,
  x: 0,
  y: 0
})

const allGroups = computed(() => [...smartGroups.value, ...customGroups.value, ...systemGroups.value])
const currentGroup = computed(() => allGroups.value.find((group) => group.id === currentGroupId.value) ?? smartGroups.value[0])
const isCustomGroup = computed(() => currentGroup.value?.kind === 'custom')
const canAddTask = computed(() => !['completed', 'trash'].includes(currentGroupId.value))
const showSectionHeader = computed(() => isCustomGroup.value && (sections.value.length > 1 || sections.value[0]?.name !== '未分组'))
const showTaskGroupName = computed(() => ['today', 'week', 'deadline', 'completed', 'trash'].includes(currentGroupId.value))
const canDragTasks = computed(() => (
  statusFilter.value === 'all'
  && !searchText.value.trim()
  && sortMode.value === 'default'
  && !['completed', 'trash'].includes(currentGroupId.value)
))
const visibleTaskCount = computed(() => sections.value.reduce((total, section) => total + visibleTasks(section).length, 0))
const quickTargetName = computed(() => {
  if (!isCustomGroup.value) return ''
  if (!sections.value.length) return '未分组'
  return sections.value.find((section) => Number(section.id) === quickGroupId.value)?.name ?? sections.value[0].name
})
const quickTargetDisplayName = computed(() => {
  const characters = [...quickTargetName.value]
  return characters.length > 5 ? `${characters.slice(0, 5).join('')}...` : quickTargetName.value
})
const canSubmitQuickTask = computed(() => Boolean(quickTaskName.value.trim()))
const detailGroupOptions = computed<DetailGroupOption[]>(() => moveList.value.map((group) => ({
  label: group.groupName,
  options: (group.subGroupList ?? []).map((section) => ({ label: section.groupName, value: section.id }))
})))
const groupDialogTitle = computed(() => ({
  'add-list': '新建清单',
  'add-section': '添加分组',
  'rename-list': '重命名清单',
  'rename-section': '重命名分组'
}[groupDialog.mode]))
const groupDescription = computed(() => ({
  today: '包括今天到期和已经逾期的任务',
  week: '未来 7 天内需要处理的任务',
  deadline: '所有设置了截止日期的任务',
  inbox: '尚未归入自定义清单的任务',
  completed: '最近完成的任务，可继续加载历史记录',
  trash: '删除的任务可以恢复或永久移除'
}[currentGroupId.value] ?? '按分组组织和推进当前清单'))
const emptyStateText = computed(() => {
  if (searchText.value.trim() || statusFilter.value !== 'all') return '没有符合当前筛选条件的任务'
  if (currentGroupId.value === 'completed') return '还没有已完成任务'
  if (currentGroupId.value === 'trash') return '垃圾箱是空的'
  if (isCustomGroup.value && !sections.value.length) return '当前清单还没有任务，新任务将添加到未分组'
  return '当前清单还没有任务'
})

const visibleTasks = (section: TaskSection): TaskBasicsVo[] => {
  return filterAndSortTasks(section.tasks, searchText.value, statusFilter.value, sortMode.value)
}

const normalizeTasks = (tasks: TaskBasicsVo[], completed?: boolean): TaskBasicsVo[] => {
  return tasks.map((task) => withCompletionState(task, completed))
}

const setTaskBusy = (id: number, busy: boolean) => {
  const next = new Set(busyTaskIds.value)
  if (busy) next.add(id)
  else next.delete(id)
  busyTaskIds.value = next
}

const isCancel = (error: unknown) => error === 'cancel' || error === 'close'

const loadNavigation = async () => {
  navigationLoading.value = true
  try {
    const [statisticsResponse, customResponse, moveResponse] = await Promise.all([
      getTaskGroupStatistics(),
      getTaskGroupList(),
      getTaskGroupMoveList()
    ])
    const statistics = statisticsResponse.data
    smartGroups.value = smartGroups.value.map((group) => ({
      ...group,
      count: group.id === 'today' ? statistics.todayNum
        : group.id === 'week' ? statistics.weekNum
          : group.id === 'deadline' ? statistics.withDeadlineNum
            : statistics.noGroupNum
    }))
    customGroups.value = customResponse.data
      .map((group) => ({
        id: String(group.id),
        name: group.groupName,
        icon: 'list',
        count: group.taskNum,
        kind: 'custom' as const,
        sort: group.sort,
        isTop: group.isTop
      }))
      .sort((left, right) => (right.isTop ?? 0) - (left.isTop ?? 0) || (right.sort ?? 0) - (left.sort ?? 0))
    moveList.value = moveResponse.data
  } finally {
    navigationLoading.value = false
  }
}

const loadSmartTasks = async (groupId: string): Promise<TaskBasicsVo[]> => {
  if (groupId === 'completed') {
    completedPage.value = 1
    const response = await getCompletedTasks(1)
    hasMoreCompleted.value = response.data.length >= 10
    return normalizeTasks(response.data, true)
  }
  if (groupId === 'trash') {
    const response = await getDeletedTasks()
    return normalizeTasks(response.data, false)
  }
  if (groupId === 'inbox') return normalizeTasks((await getTaskList('0')).data)
  if (groupId === 'deadline') return normalizeTasks((await getTaskList('', undefined, undefined, true)).data)
  if (groupId === 'week') return normalizeTasks((await getTaskList('', undefined, offsetDate(7))).data)
  return normalizeTasks((await getTaskList('', undefined, offsetDate(0))).data)
}

const loadCurrentGroup = async (keepSelected: boolean) => {
  const sequence = ++loadSequence
  const selectedId = keepSelected ? selectedTask.value?.id : undefined
  if (!keepSelected && selectedTask.value) closeDetail()
  pageLoading.value = true
  pageError.value = ''
  closeContextMenu()

  try {
    let nextSections: TaskSection[]
    if (isSpecialGroup(currentGroupId.value)) {
      const tasks = await loadSmartTasks(currentGroupId.value)
      nextSections = [{ id: currentGroupId.value, name: currentGroup.value.name, taskNum: tasks.length, tasks, loading: false, expanded: true }]
      const target = allGroups.value.find((group) => group.id === currentGroupId.value)
      if (target) target.count = tasks.length
    } else {
      const groupResponse = await getTaskGroupList(currentGroupId.value)
      const expandOnlySection = groupResponse.data.length === 1 && groupResponse.data[0]?.groupName === '未分组'
      nextSections = await Promise.all(groupResponse.data.map(async (group) => {
        const taskResponse = await getTaskList(String(group.id))
        return {
          id: String(group.id),
          name: group.groupName,
          taskNum: group.taskNum,
          tasks: normalizeTasks(taskResponse.data),
          loading: false,
          expanded: expandOnlySection
        }
      }))
    }

    if (sequence !== loadSequence) return
    sections.value = nextSections
    const selectedSectionStillExists = nextSections.some((section) => Number(section.id) === quickGroupId.value)
    if (!selectedSectionStillExists) quickGroupId.value = nextSections[0] ? Number(nextSections[0].id) : null

    if (selectedId) {
      const stillVisible = nextSections.flatMap((section) => section.tasks).find((task) => task.id === selectedId)
      if (stillVisible) await selectTask(stillVisible)
      else closeDetail()
    }
  } catch (error) {
    console.error('加载任务工作台失败:', error)
    if (sequence === loadSequence) {
      sections.value = []
      pageError.value = '请检查网络连接或稍后重试'
    }
  } finally {
    if (sequence === loadSequence) pageLoading.value = false
  }
}

const refreshCurrent = async (keepSelected = true) => {
  await loadCurrentGroup(keepSelected)
}

const selectGroup = async (group: WorkspaceGroup) => {
  currentGroupId.value = group.id
  searchText.value = ''
  statusFilter.value = group.id === 'completed' ? 'completed' : group.id === 'trash' ? 'all' : 'active'
  sortMode.value = 'default'
  quickTaskName.value = ''
  quickGroupId.value = null
  closeDetail()
  await loadCurrentGroup(false)
}

const selectTask = async (task: TaskBasicsVo) => {
  const sequence = ++detailSequence
  selectedTask.value = { ...task }
  detailOpen.value = true
  detailLoading.value = true
  try {
    const response = await getTaskDetail(task.id)
    if (sequence !== detailSequence || selectedTask.value?.id !== task.id) return
    selectedTask.value = withCompletionState({ ...task, ...response.data })
  } catch (error) {
    console.error('加载任务详情失败:', error)
    ElMessage.error('任务详情加载失败')
  } finally {
    if (sequence === detailSequence) detailLoading.value = false
  }
}

const closeDetail = () => {
  detailSequence++
  selectedTask.value = null
  detailOpen.value = false
  detailLoading.value = false
}

const updateTaskInSections = (taskId: number, patch: Partial<TaskBasicsVo>) => {
  for (const section of sections.value) {
    const task = section.tasks.find((item) => item.id === taskId)
    if (task) Object.assign(task, patch)
  }
  if (selectedTask.value?.id === taskId) selectedTask.value = { ...selectedTask.value, ...patch }
}

const saveTaskPatch = async (task: TaskBasicsVo, patch: Partial<TaskBasicsVo>) => {
  if (patch.taskName !== undefined && !patch.taskName.trim()) {
    ElMessage.warning('任务名称不能为空')
    selectedTask.value = { ...task }
    return
  }
  setTaskBusy(task.id, true)
  try {
    await updateTask(toTaskUpdate(task, patch))
    const moved = patch.taskGroupId !== undefined && patch.taskGroupId !== task.taskGroupId
    updateTaskInSections(task.id, patch)
    if (moved) {
      await Promise.all([loadNavigation(), refreshCurrent(true)])
      ElMessage.success('任务已移动')
    }
  } catch (error) {
    console.error('保存任务失败:', error)
    if (selectedTask.value?.id === task.id) selectedTask.value = { ...task }
    ElMessage.error('保存失败，修改未生效')
  } finally {
    setTaskBusy(task.id, false)
  }
}

const toggleTask = async (task: TaskBasicsVo, completed: boolean) => {
  setTaskBusy(task.id, true)
  try {
    await updateTaskStatus(task.id, completed ? 1 : 0)
    updateTaskInSections(task.id, { completed, taskStatus: completed ? 1 : 0 })
    await Promise.all([loadNavigation(), refreshCurrent(false)])
    ElMessage.success(completed ? '任务已完成' : '任务已恢复')
  } catch (error) {
    console.error('更新任务状态失败:', error)
    ElMessage.error('状态更新失败')
  } finally {
    setTaskBusy(task.id, false)
  }
}

const createQuickTask = async () => {
  if (!canSubmitQuickTask.value || addingTask.value) return
  addingTask.value = true
  try {
    let taskGroupId = 0
    if (isCustomGroup.value) {
      if (!sections.value.length) {
        const response = await addTaskGroup({ groupName: '未分组', parentId: currentGroupId.value })
        taskGroupId = Number(response.data)
      } else taskGroupId = quickGroupId.value ?? Number(sections.value[0].id)
    }
    await addTask({
      taskName: quickTaskName.value.trim(),
      taskGroupId,
      deadlineDate: defaultDeadlineForGroup(currentGroupId.value)
    })
    quickTaskName.value = ''
    await Promise.all([loadNavigation(), refreshCurrent(false)])
    ElMessage.success('任务已创建')
  } catch (error) {
    console.error('创建任务失败:', error)
    ElMessage.error('创建任务失败')
  } finally {
    addingTask.value = false
  }
}

const handleTaskAction = async (task: TaskBasicsVo, command: TaskActionCommand) => {
  closeContextMenu()
  const priorityMap: Partial<Record<TaskActionCommand, number>> = {
    'priority-high': 30,
    'priority-medium': 20,
    'priority-low': 10,
    'priority-none': 0
  }
  if (command in priorityMap) {
    await saveTaskPatch(task, { priority: priorityMap[command] })
    return
  }
  if (command === 'deadline-today') return saveTaskPatch(task, { deadlineDate: offsetDate(0) })
  if (command === 'deadline-tomorrow') return saveTaskPatch(task, { deadlineDate: offsetDate(1) })
  if (command === 'deadline-week') return saveTaskPatch(task, { deadlineDate: offsetDate(7) })
  if (command === 'toggle-top') return saveTaskPatch(task, { isTop: task.isTop ? 0 : 1 })
  if (command === 'deadline-custom') {
    deadlineDialog.task = task
    deadlineDialog.date = task.deadlineDate ?? offsetDate(0)
    deadlineDialog.visible = true
    return
  }
  if (command === 'move') {
    moveDialog.task = task
    moveDialog.targetGroupId = task.taskGroupId
    moveDialog.visible = true
    return
  }
  if (command === 'points') return openPointsDialog(task)
  if (command === 'restore') return restoreTask(task)
  if (command === 'delete') return deleteTask(task)
}

const submitDeadline = async () => {
  if (!deadlineDialog.task) return
  deadlineDialog.submitting = true
  try {
    await saveTaskPatch(deadlineDialog.task, { deadlineDate: deadlineDialog.date })
    deadlineDialog.visible = false
  } finally {
    deadlineDialog.submitting = false
  }
}

const submitMove = async () => {
  if (!moveDialog.task || moveDialog.targetGroupId === null) return
  moveDialog.submitting = true
  try {
    await saveTaskPatch(moveDialog.task, { taskGroupId: moveDialog.targetGroupId })
    moveDialog.visible = false
  } finally {
    moveDialog.submitting = false
  }
}

const restoreTask = async (task: TaskBasicsVo) => {
  setTaskBusy(task.id, true)
  try {
    await updateTaskStatus(task.id, 0)
    await Promise.all([loadNavigation(), refreshCurrent(false)])
    ElMessage.success('任务已恢复到原清单')
  } catch (error) {
    console.error('恢复任务失败:', error)
    ElMessage.error('恢复任务失败')
  } finally {
    setTaskBusy(task.id, false)
  }
}

const deleteTask = async (task: TaskBasicsVo) => {
  const permanent = currentGroupId.value === 'trash'
  try {
    await ElMessageBox.confirm(
      permanent ? `永久删除“${task.taskName}”？此操作无法恢复。` : `将“${task.taskName}”移入垃圾箱？`,
      permanent ? '永久删除任务' : '删除任务',
      { confirmButtonText: permanent ? '永久删除' : '移入垃圾箱', cancelButtonText: '取消', type: 'warning' }
    )
    setTaskBusy(task.id, true)
    if (permanent) await permanentlyDeleteTask(task.id)
    else await updateTaskStatus(task.id, 3)
    await Promise.all([loadNavigation(), refreshCurrent(false)])
    ElMessage.success(permanent ? '任务已永久删除' : '任务已移入垃圾箱')
  } catch (error) {
    if (!isCancel(error)) {
      console.error('删除任务失败:', error)
      ElMessage.error('删除任务失败')
    }
  } finally {
    setTaskBusy(task.id, false)
  }
}

const clearTrash = async () => {
  try {
    await ElMessageBox.confirm('永久删除垃圾箱中的所有任务？此操作无法恢复。', '清空垃圾箱', {
      confirmButtonText: '永久清空', cancelButtonText: '取消', type: 'warning'
    })
    await clearDeletedTasks()
    await Promise.all([loadNavigation(), refreshCurrent(false)])
    ElMessage.success('垃圾箱已清空')
  } catch (error) {
    if (!isCancel(error)) {
      console.error('清空垃圾箱失败:', error)
      ElMessage.error('清空垃圾箱失败')
    }
  }
}

const openPointsDialog = async (task: TaskBasicsVo) => {
  pointsDialog.visible = true
  pointsDialog.task = task
  pointsDialog.loading = true
  pointsDialog.rewardPoints = task.rewardPoints ?? 0
  pointsDialog.punishPoints = task.punishPoints ?? 0
  try {
    const response = await getTaskPoints(task.id)
    pointsDialog.rewardPoints = response.data?.rewardPoints ?? 0
    pointsDialog.punishPoints = response.data?.punishPoints ?? 0
  } catch (error) {
    console.error('加载任务积分失败:', error)
    ElMessage.error('任务积分加载失败')
  } finally {
    pointsDialog.loading = false
  }
}

const savePoints = async () => {
  if (!pointsDialog.task) return
  pointsDialog.submitting = true
  try {
    await saveTaskPoints({
      taskId: pointsDialog.task.id,
      rewardPoints: pointsDialog.rewardPoints,
      punishPoints: pointsDialog.punishPoints
    })
    updateTaskInSections(pointsDialog.task.id, {
      rewardPoints: pointsDialog.rewardPoints,
      punishPoints: pointsDialog.punishPoints
    })
    pointsDialog.visible = false
    ElMessage.success('任务积分已保存')
  } catch (error) {
    console.error('保存任务积分失败:', error)
    ElMessage.error('任务积分保存失败')
  } finally {
    pointsDialog.submitting = false
  }
}

const uploadImage = async (file: File) => {
  if (!selectedTask.value) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('只能上传图片文件')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 10MB')
    return
  }
  const taskId = selectedTask.value.id
  uploadingImage.value = true
  try {
    const uploadResponse = await uploadTaskImage(file)
    await addTaskFile({ taskId, fileName: uploadResponse.data.fileName, fileUrl: uploadResponse.data.fileUrl })
    const detailResponse = await getTaskDetail(taskId)
    if (selectedTask.value?.id === taskId) selectedTask.value = withCompletionState(detailResponse.data)
    ElMessage.success('图片已上传')
  } catch (error) {
    console.error('上传任务图片失败:', error)
    ElMessage.error('图片上传失败')
  } finally {
    uploadingImage.value = false
  }
}

const removeTaskFile = async (file: TaskFileVo) => {
  if (!selectedTask.value) return
  const taskId = selectedTask.value.id
  try {
    await ElMessageBox.confirm('删除这张任务图片？', '删除附件', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
    await deleteTaskFile({ taskId, fileUrl: file.fileUrl })
    const detailResponse = await getTaskDetail(taskId)
    if (selectedTask.value?.id === taskId) selectedTask.value = withCompletionState(detailResponse.data)
    ElMessage.success('附件已删除')
  } catch (error) {
    if (!isCancel(error)) {
      console.error('删除任务附件失败:', error)
      ElMessage.error('附件删除失败')
    }
  }
}

const toggleSection = (section: TaskSection) => {
  section.expanded = !section.expanded
}

const selectQuickTarget = (section: TaskSection, focusInput = false) => {
  quickGroupId.value = Number(section.id)
  if (focusInput) void nextTick(() => quickTaskInput.value?.focus())
}

const openGroupDialog = (mode: GroupDialogMode, id = 0, name = '') => {
  groupDialog.mode = mode
  groupDialog.id = id
  groupDialog.name = name
  groupDialog.visible = true
}

const openRenameList = (group: WorkspaceGroup) => openGroupDialog('rename-list', Number(group.id), group.name)

const handleSectionCommand = (command: 'add-task' | 'rename' | 'delete', section: TaskSection) => {
  if (command === 'add-task') selectQuickTarget(section, true)
  else if (command === 'rename') openGroupDialog('rename-section', Number(section.id), section.name)
  else void deleteSection(section)
}

const submitGroupDialog = async () => {
  if (groupDialog.submitting) return
  const name = groupDialog.name.trim()
  if (!name) {
    ElMessage.warning('名称不能为空')
    return
  }
  groupDialog.submitting = true
  try {
    if (groupDialog.mode === 'add-list') {
      const response = await addTaskGroup({ groupName: name })
      await loadNavigation()
      const created = customGroups.value.find((group) => group.id === String(response.data))
      if (created) await selectGroup(created)
    } else if (groupDialog.mode === 'add-section') {
      await addTaskGroup({ groupName: name, parentId: currentGroupId.value })
      await Promise.all([loadNavigation(), refreshCurrent(false)])
    } else {
      await renameTaskGroup({ id: groupDialog.id, groupName: name })
      await Promise.all([loadNavigation(), refreshCurrent(false)])
    }
    groupDialog.visible = false
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('保存清单或分组失败:', error)
    ElMessage.error('保存失败')
  } finally {
    groupDialog.submitting = false
  }
}

const deleteList = async (group: WorkspaceGroup) => {
  try {
    await ElMessageBox.confirm(`删除清单“${group.name}”及其中的所有任务？`, '删除清单', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
    await deleteTaskGroup(Number(group.id))
    await loadNavigation()
    if (currentGroupId.value === group.id) await selectGroup(smartGroups.value[0])
    ElMessage.success('清单已删除')
  } catch (error) {
    if (!isCancel(error)) {
      console.error('删除清单失败:', error)
      ElMessage.error('删除清单失败')
    }
  }
}

const deleteSection = async (section: TaskSection) => {
  try {
    await ElMessageBox.confirm(`删除分组“${section.name}”及其中的所有任务？`, '删除分组', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
    await deleteTaskGroup(Number(section.id))
    await Promise.all([loadNavigation(), refreshCurrent(false)])
    ElMessage.success('分组已删除')
  } catch (error) {
    if (!isCancel(error)) {
      console.error('删除分组失败:', error)
      ElMessage.error('删除分组失败')
    }
  }
}

const handleDragEnd = async (event: DragEvent, section: TaskSection) => {
  if (event.oldIndex === undefined || event.newIndex === undefined || event.oldIndex === event.newIndex) return
  const task = section.tasks[event.newIndex]
  if (!task) return
  const previous = section.tasks[event.newIndex - 1]
  const next = section.tasks[event.newIndex + 1]
  const sort = event.newIndex > event.oldIndex ? (previous?.sort ?? 0) - 1 : (next?.sort ?? 0) + 1
  try {
    await updateTask(toTaskUpdate(task, { sort }))
    task.sort = sort
  } catch (error) {
    console.error('更新任务排序失败:', error)
    ElMessage.error('排序保存失败，已恢复原顺序')
    await refreshCurrent(false)
  }
}

const loadMoreCompleted = async () => {
  if (!sections.value[0] || loadingMore.value) return
  loadingMore.value = true
  try {
    const response = await getCompletedTasks(completedPage.value + 1)
    completedPage.value += 1
    sections.value[0].tasks.push(...normalizeTasks(response.data, true))
    hasMoreCompleted.value = response.data.length >= 10
  } catch (error) {
    console.error('加载更多已完成任务失败:', error)
    ElMessage.error('加载更多失败')
  } finally {
    loadingMore.value = false
  }
}

const openContextMenu = (event: MouseEvent, task: TaskBasicsVo) => {
  const menuWidth = 190
  const menuHeight = 360
  contextMenu.task = task
  contextMenu.x = Math.min(event.clientX, window.innerWidth - menuWidth - 8)
  contextMenu.y = Math.min(event.clientY, window.innerHeight - menuHeight - 8)
  contextMenu.visible = true
}

const closeContextMenu = () => {
  contextMenu.visible = false
  contextMenu.task = null
}

const handleDocumentClick = () => closeContextMenu()

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  try {
    await loadNavigation()
    await loadCurrentGroup(false)
  } catch (error) {
    console.error('初始化任务清单失败:', error)
    pageError.value = '任务工作台初始化失败，请稍后重试'
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.task-workspace {
  position: relative;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(210px, 230px) minmax(380px, 430px) minmax(400px, 1fr);
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.task-list-panel {
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--el-border-color-lighter);
  background: #fff;
}

.list-header {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.list-heading,
.list-title-line,
.header-actions {
  display: flex;
  align-items: center;
}

.list-heading { min-width: 0; gap: 10px; }
.list-heading > div { min-width: 0; }
.list-title-line { gap: 8px; }

.list-title-line h1 {
  overflow: hidden;
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 20px;
  line-height: 26px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-heading p {
  overflow: hidden;
  margin: 3px 0 0;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-count {
  min-width: 24px;
  padding: 1px 7px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  text-align: center;
}

.header-actions { flex: none; gap: 8px; }

.header-icon-button {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}

.header-icon-button:hover { background: var(--el-fill-color); }
.sidebar-toggle { display: none; }

.list-toolbar {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) 108px;
  gap: 6px;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: #fff;
}

.quick-add-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: #fafdff;
}

.quick-add-card > .el-input { min-width: 0; grid-column: 1; }
.quick-add-card > .el-button { grid-column: 2; }

.quick-target-indicator {
  max-width: 94px;
  overflow: hidden;
  color: var(--el-color-primary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-list-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.task-section + .task-section { margin-top: 12px; }

.section-header {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 0 2px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  border-radius: 7px 7px 0 0;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.section-header.is-quick-target {
  border-bottom-color: var(--el-color-primary-light-7);
  background: var(--el-color-primary-light-9);
}

.section-heading-main {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
}

.section-collapse,
.section-target,
.section-more {
  border: 0;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;
}

.section-collapse {
  width: 28px;
  height: 28px;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 6px;
}

.section-collapse:hover,
.section-target:hover { color: var(--el-color-primary); }

.section-target {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 4px 7px 0;
  font-weight: 600;
  text-align: left;
}

.section-collapse .el-icon { transition: transform 0.18s ease; }
.section-collapse .el-icon.is-expanded { transform: rotate(90deg); }
.section-target small { color: var(--el-text-color-placeholder); font-weight: 400; }

.section-more {
  width: 28px;
  height: 28px;
  border-radius: 6px;
}
.section-more:hover { background: var(--el-fill-color); }

.group-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

.section-body { padding-top: 5px; }

.section-empty,
.section-loading {
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.workspace-empty,
.page-error-state { min-height: 320px; }

.page-skeleton { padding: 8px; }
.skeleton-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
.skeleton-row :deep(.el-skeleton__circle) { width: 18px; height: 18px; }

.load-more {
  padding: 18px 0 8px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  text-align: center;
}

.task-detail-panel {
  min-width: 0;
  height: 100%;
  overflow: hidden;
  background: #fff;
}

.workspace-backdrop { display: none; }

:deep(.task-ghost) {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
  opacity: 0.55;
}

.points-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.points-form-grid :deep(.el-input-number) { width: 100%; }

@media (max-width: 1439px) {
  .task-workspace { grid-template-columns: minmax(210px, 230px) minmax(0, 1fr); }

  .task-detail-panel {
    position: fixed;
    z-index: 2300;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(500px, calc(100vw - 64px));
    height: 100vh;
    box-shadow: -10px 0 36px rgb(31 45 61 / 16%);
    transform: translateX(105%);
    transition: transform 0.22s ease;
  }

  .task-detail-panel.is-open { transform: translateX(0); }

  .detail-backdrop {
    position: fixed;
    z-index: 2200;
    inset: 0;
    display: block;
    background: rgb(31 45 61 / 22%);
  }
}

@media (max-width: 1100px) {
  .task-workspace { grid-template-columns: minmax(0, 1fr); }
  .sidebar-toggle { display: inline-flex; }

  .sidebar-backdrop {
    position: fixed;
    z-index: 2000;
    inset: 0;
    display: block;
    background: rgb(31 45 61 / 22%);
  }
}

@media (max-width: 760px) {
  .list-header { align-items: flex-start; }
  .header-actions .el-button:not(:last-child) { display: none; }
  .list-toolbar { grid-template-columns: 1fr 112px; }
  .sort-filter { display: none; }
  .quick-add-card { grid-template-columns: 1fr auto; }
  .task-list-scroll { padding: 8px; }
  .points-form-grid { grid-template-columns: 1fr; gap: 0; }
}
</style>
