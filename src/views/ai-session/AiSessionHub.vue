<template>
  <div class="ai-session-page">
    <section class="filter-panel">
      <el-row :gutter="12">
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-input
            v-model="filters.keyword"
            clearable
            placeholder="搜索任务名、描述、sessionKey"
          />
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="4">
          <el-select
            v-model="filters.toolType"
            clearable
            placeholder="工具"
            style="width: 100%"
          >
            <el-option
              v-for="tool in toolOptions"
              :key="tool"
              :label="tool"
              :value="tool"
            />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="4">
          <el-select
            v-model="filters.taskStatus"
            clearable
            placeholder="状态"
            style="width: 100%"
          >
            <el-option
              v-for="status in taskStatusOptions"
              :key="status"
              :label="status"
              :value="status"
            />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="5">
          <el-input
            v-model="filters.projectName"
            clearable
            placeholder="项目名"
          />
        </el-col>
        <el-col :xs="24" :sm="24" :md="8" :lg="5">
          <el-input
            v-model="filters.workspaceKeyword"
            clearable
            placeholder="搜索工作区"
          />
        </el-col>
      </el-row>
    </section>

    <section v-loading="listLoading" class="table-panel">
      <div class="panel-head">
        <div>
          <div class="panel-title">会话任务列表</div>
          <div class="panel-subtitle">共 {{ tasks.length }} 条记录。</div>
        </div>
        <div class="panel-actions">
          <el-tag :type="launcherStatusTagType" effect="plain">
            {{ launcherStatusText }}
          </el-tag>
          <el-button :loading="launcherConnectionState === 'checking'" @click="openLauncherDialog">
            <el-icon><Connection /></el-icon>
            本机启动器
          </el-button>
          <el-dropdown @command="handleImportCommand">
            <el-button>
              <el-icon><FolderOpened /></el-icon>
              导入会话
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="codex">导入 Codex</el-dropdown-item>
                <el-dropdown-item command="claude">导入 Claude</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>
            新建记录
          </el-button>
        </div>
      </div>

      <el-table
        :data="tasks"
        row-key="id"
        border
        style="width: 100%"
        @header-dragend="handleColumnResize"
      >
        <el-table-column
          column-key="task"
          label="任务"
          :width="tableColumnWidths.task"
          :min-width="TABLE_COLUMN_MIN_WIDTHS.task"
          resizable
        >
          <template #default="{ row }">
            <div class="task-cell">
              <div class="task-title-row">
                <span class="task-title">{{ row.title }}</span>
                <el-tag
                  v-if="row.isTop === 1"
                  class="task-top-tag"
                  type="warning"
                  effect="plain"
                  size="small"
                >
                  置顶
                </el-tag>
              </div>
              <div v-if="row.description.trim()" class="task-description">
                {{ row.description }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          column-key="project"
          label="项目"
          :width="tableColumnWidths.project"
          :min-width="TABLE_COLUMN_MIN_WIDTHS.project"
          resizable
        >
          <template #default="{ row }">
            {{ displayText(row.projectName, '--') }}
          </template>
        </el-table-column>

        <el-table-column
          column-key="taskStatus"
          label="任务状态"
          :width="tableColumnWidths.taskStatus"
          :min-width="TABLE_COLUMN_MIN_WIDTHS.taskStatus"
          resizable
        >
          <template #default="{ row }">
            <el-select
              class="status-select"
              :model-value="row.taskStatus"
              :loading="updatingStatusTaskIds.includes(row.id)"
              :disabled="updatingStatusTaskIds.includes(row.id)"
              @change="updateTaskStatus(row, $event)"
            >
              <el-option
                v-for="item in taskStatusOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column
          column-key="tool"
          label="工具"
          :width="tableColumnWidths.tool"
          :min-width="TABLE_COLUMN_MIN_WIDTHS.tool"
          resizable
        >
          <template #default="{ row }">
            <el-tag :type="getToolTagType(row.toolType)" effect="plain">
              {{ row.toolType }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          column-key="lastActive"
          label="最近活跃"
          :width="tableColumnWidths.lastActive"
          :min-width="TABLE_COLUMN_MIN_WIDTHS.lastActive"
          resizable
        >
          <template #default="{ row }">
            {{ formatDateTime(row.lastActiveAt) }}
          </template>
        </el-table-column>

        <el-table-column
          column-key="workspace"
          label="工作区"
          :width="tableColumnWidths.workspace"
          :min-width="TABLE_COLUMN_MIN_WIDTHS.workspace"
          resizable
        >
          <template #default="{ row }">
            {{ displayText(row.workspacePath, '--') }}
          </template>
        </el-table-column>

        <el-table-column
          column-key="session"
          label="Session"
          :width="tableColumnWidths.session"
          :min-width="TABLE_COLUMN_MIN_WIDTHS.session"
          resizable
        >
          <template #default="{ row }">
            <div class="session-cell">
              <span class="session-main">{{ row.sessionKey }}</span>
              <span v-if="row.modelName.trim()" class="session-sub">{{ row.modelName }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          column-key="actions"
          label="操作"
          :width="tableColumnWidths.actions"
          :min-width="TABLE_COLUMN_MIN_WIDTHS.actions"
          fixed="right"
          align="right"
          header-align="right"
          resizable
        >
          <template #default="{ row }">
            <div class="row-actions">
              <el-tooltip :content="getQuickLaunchTip(row)" placement="top">
                <span class="row-action-item">
                  <el-button
                    link
                    type="success"
                    :loading="launchingTaskId === row.id"
                    :disabled="!canQuickLaunch(row)"
                    @click="quickLaunchTask(row)"
                  >
                    <el-icon><VideoPlay /></el-icon>
                    开启
                  </el-button>
                </span>
              </el-tooltip>
              <span class="row-action-item">
                <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
              </span>
              <span class="row-action-item">
                <el-dropdown
                  trigger="click"
                  placement="bottom-end"
                  @command="handleTaskMoreCommand($event, row)"
                >
                  <el-button link type="primary">
                    更多
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        command="toggleTop"
                        :disabled="updatingTopTaskIds.includes(row.id)"
                      >
                        <el-icon><Top /></el-icon>
                        {{ row.isTop === 1 ? '取消置顶' : '置顶' }}
                      </el-dropdown-item>
                      <el-dropdown-item command="copyCommand">
                        <el-icon><CopyDocument /></el-icon>
                        复制命令
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided class="task-more-danger">
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <div ref="actionColumnProbeRef" class="action-column-probe" aria-hidden="true">
      <el-button link type="success">
        <el-icon><VideoPlay /></el-icon>
        开启
      </el-button>
      <el-button link type="primary">编辑</el-button>
      <el-button link type="primary">更多</el-button>
    </div>

    <el-dialog
      v-model="formDialogVisible"
      :title="formDialogTitle"
      width="720px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formState"
        :rules="formRules"
        label-width="92px"
      >
        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="任务名称" prop="title">
              <div class="task-name-field">
                <el-input v-model="formState.title" maxlength="80" show-word-limit />
                <el-button
                  type="primary"
                  plain
                  :loading="optimizingMetadata"
                  :disabled="formState.toolType !== 'Codex' || (!formState.resumeCommand.trim() && !formState.sessionKey.trim())"
                  @click="optimizeTaskMetadata"
                >
                  <el-icon><MagicStick /></el-icon>
                  AI优化
                </el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="描述">
              <el-input
                v-model="formState.description"
                type="textarea"
                :rows="3"
                maxlength="255"
                show-word-limit
                placeholder="记录这个会话任务大致是做什么的"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="工具" prop="toolType">
              <el-select v-model="formState.toolType" style="width: 100%">
                <el-option v-for="tool in toolOptions" :key="tool" :label="tool" :value="tool" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="任务状态" prop="taskStatus">
              <el-select v-model="formState.taskStatus" style="width: 100%">
                <el-option v-for="status in taskStatusOptions" :key="status" :label="status" :value="status" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="模型">
              <el-input v-model="formState.modelName" maxlength="64" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="模型提供方">
              <el-select
                v-model="formState.modelProvider"
                filterable
                allow-create
                default-first-option
                clearable
                placeholder="输入或选择模型提供方"
                style="width: 100%"
              >
                <el-option
                  v-for="item in modelProviderOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                >
                  <div class="local-option">
                    <span>{{ item }}</span>
                    <el-icon
                      class="local-option-remove"
                      @mousedown.stop.prevent
                      @click.stop="removeLocalOption('modelProvider', item)"
                    >
                      <Close />
                    </el-icon>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="Session" prop="sessionKey">
              <el-input v-model="formState.sessionKey" maxlength="128" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="项目">
              <el-select
                v-model="formState.projectName"
                filterable
                allow-create
                default-first-option
                clearable
                placeholder="输入或选择项目"
                style="width: 100%"
              >
                <el-option
                  v-for="item in projectOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                >
                  <div class="local-option">
                    <span>{{ item }}</span>
                    <el-icon
                      class="local-option-remove"
                      @mousedown.stop.prevent
                      @click.stop="removeLocalOption('project', item)"
                    >
                      <Close />
                    </el-icon>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="分支">
              <el-input v-model="formState.gitBranch" maxlength="128" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="工作区" prop="workspacePath">
              <el-select
                v-model="formState.workspacePath"
                filterable
                allow-create
                default-first-option
                placeholder="输入或选择本机工作区绝对路径"
                style="width: 100%"
              >
                <el-option
                  v-for="item in workspaceOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                >
                  <div class="local-option">
                    <span>{{ item }}</span>
                    <el-icon
                      class="local-option-remove"
                      @mousedown.stop.prevent
                      @click.stop="removeLocalOption('workspace', item)"
                    >
                      <Close />
                    </el-icon>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="记录文件">
              <el-input v-model="formState.transcriptPath" maxlength="512" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="会话命令">
              <div class="manual-command-field">
                <el-input
                  v-model="formState.resumeCommand"
                  maxlength="255"
                  placeholder="例如 codex resume <session-id>"
                />
                <el-button
                  type="primary"
                  plain
                  :loading="inspectingSession"
                  :disabled="!formState.resumeCommand.trim()"
                  @click="inspectResumeCommand"
                >
                  <el-icon><Search /></el-icon>
                  识别命令
                </el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="launcherDialogVisible"
      title="本机启动器"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="连接状态">
          <el-tag :type="launcherStatusTagType" effect="plain">
            {{ launcherStatusText }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="安装命令">
          <div class="launcher-command">
            <code>npm run ai-launcher:install</code>
            <el-button link type="primary" @click="copyText('npm run ai-launcher:install', '安装命令')">
              复制
            </el-button>
          </div>
        </el-descriptions-item>
      </el-descriptions>

      <el-form label-width="92px" class="launcher-pair-form">
        <el-form-item label="配对令牌">
          <el-input
            v-model="launcherTokenInput"
            type="password"
            show-password
            maxlength="128"
            autocomplete="off"
            placeholder="输入安装时生成的配对令牌"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :loading="launcherConnectionState === 'checking'" @click="refreshLauncherStatus(true)">
          检测状态
        </el-button>
        <el-button type="primary" :loading="launcherConnectionState === 'checking'" @click="saveLauncherPairing">
          保存并连接
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="importDialogVisible"
      :title="importDialogTitle"
      width="820px"
      :close-on-click-modal="false"
    >
      <el-alert
        :title="importDialogAlertTitle"
        type="info"
        :closable="false"
        show-icon
      />

      <div class="import-toolbar">
        <div class="import-toolbar-left">
          <span>{{ importToolbarText }}</span>
          <el-tag size="small" :type="importSourceTagType" effect="plain">
            {{ importSourceLabel }}
          </el-tag>
        </div>
        <div class="import-picker-actions">
          <el-button @click="triggerImportDirectoryPicker">选择目录</el-button>
          <el-button @click="triggerImportFilePicker">选择文件</el-button>
          <el-button link type="primary" :loading="importLoading" @click="refreshDetectedDrafts">重新解析</el-button>
        </div>
      </div>

      <el-alert
        v-if="importNotice"
        :title="importNotice"
        :type="importNoticeType"
        :closable="false"
        show-icon
        class="import-notice"
      />

      <div v-loading="importLoading" class="import-draft-container">
        <el-empty
          v-if="!importLoading && !detectedSessionDrafts.length"
          :description="importEmptyDescription"
        />
        <div v-else class="import-draft-list">
          <article
            v-for="draft in detectedSessionDrafts"
            :key="draft.id"
            class="import-draft-card"
          >
            <div class="import-draft-head">
              <div class="import-draft-title">
                <strong>{{ draft.titleHint }}</strong>
                <el-tag :type="getToolTagType(draft.toolType)" effect="plain">
                  {{ draft.toolType }}
                </el-tag>
              </div>
              <span>{{ formatDateTime(draft.lastActiveAt) }}</span>
            </div>
            <div class="import-draft-meta">
              <span>{{ draft.sessionKey }}</span>
              <span>{{ displayText(draft.gitBranch, 'unknown') }}</span>
              <span>{{ displayText(draft.cwd, '--') }}</span>
            </div>
            <p class="import-draft-summary">
              {{ displayText(draft.description, '未从本地文件中抽取到明确描述。') }}
            </p>
            <div class="import-draft-footer">
              <code>{{ draft.resumeCommand }}</code>
              <div class="import-draft-actions">
                <el-button link @click="copyText(draft.resumeCommand, '继续命令')">复制命令</el-button>
                <el-button link type="primary" @click="importDraftToForm(draft)">导入到表单</el-button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </el-dialog>

    <input
      ref="importFileInputRef"
      class="import-hidden-input"
      type="file"
      multiple
      accept=".jsonl"
      @change="handleImportFileSelection"
    />
    <input
      ref="importDirectoryInputRef"
      class="import-hidden-input"
      type="file"
      multiple
      webkitdirectory
      directory
      @change="handleImportDirectorySelection"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ArrowDown, Close, Connection, CopyDocument, Delete, FolderOpened, MagicStick, Plus, Search, Top, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  addAiTask,
  deleteAiTask,
  queryAiTaskDetail,
  queryAiTaskPage,
  updateAiTask,
  updateAiTaskActive,
  updateAiTaskTop
} from '@/api/aiTask'
import {
  AiLauncherError,
  getAiLauncherToken,
  inspectAiSession,
  launchAiSession,
  optimizeAiSessionMetadata,
  queryAiLauncherStatus,
  setAiLauncherToken,
  type AiLauncherStatus
} from '@/services/aiLauncherClient'
import {
  getAiTaskLocalOptions,
  rememberAiTaskLocalOption,
  removeAiTaskLocalOption,
  type AiTaskLocalOptionType
} from '@/services/aiTaskLocalOptions'
import type * as AiTaskType from '@/types/aiTask'

type ToolType = 'Codex' | 'Claude Code' | 'Gemini CLI'
type TaskStatus = '进行中' | '已完成' | '暂停'
type ImportTool = 'claude' | 'codex'
type ImportSourceMode = 'none' | 'files' | 'directory'
type NoticeType = 'success' | 'warning' | 'info' | 'error'
type LauncherConnectionState = 'checking' | 'offline' | 'unpaired' | 'ready'
type TaskMoreCommand = 'toggleTop' | 'copyCommand' | 'delete'

interface AiSessionTask {
  id: number
  title: string
  description: string
  toolType: ToolType
  sessionKey: string
  taskStatus: TaskStatus
  isTop: AiTaskType.TopState
  topTime: string
  projectName: string
  workspacePath: string
  modelName: string
  modelProvider: string
  gitBranch: string
  transcriptPath: string
  resumeCommand: string
  lastActiveAt: string
  createTime: string
  updateTime: string
}

interface FormState {
  id?: number
  title: string
  description: string
  toolType: ToolType
  sessionKey: string
  taskStatus: TaskStatus
  projectName: string
  workspacePath: string
  modelName: string
  modelProvider: string
  gitBranch: string
  transcriptPath: string
  resumeCommand: string
}

interface DetectedSessionDraft {
  id: number
  titleHint: string
  description: string
  toolType: ToolType
  modelName: string
  sessionKey: string
  resumeCommand: string
  cwd: string
  gitBranch: string
  transcriptPath: string
  lastActiveAt: string
  createdAt?: string
}

interface ImportContext {
  toolLabel: string
  recommendedPath: string
  parser: (files: File[], limit: number) => Promise<DetectedSessionDraft[]>
}

const TOOL_CODE_MAP: Record<ToolType, AiTaskType.ToolTypeCode> = {
  Codex: 1,
  'Claude Code': 2,
  'Gemini CLI': 3
}

const TOOL_LABEL_MAP: Record<AiTaskType.ToolTypeCode, ToolType> = {
  1: 'Codex',
  2: 'Claude Code',
  3: 'Gemini CLI'
}

const TASK_STATUS_CODE_MAP: Record<TaskStatus, AiTaskType.TaskStatusCode> = {
  '进行中': 1,
  '已完成': 2,
  '暂停': 3
}

const TASK_STATUS_LABEL_MAP: Record<AiTaskType.TaskStatusCode, TaskStatus> = {
  1: '进行中',
  2: '已完成',
  3: '暂停'
}

const toolOptions: ToolType[] = ['Codex', 'Claude Code', 'Gemini CLI']
const taskStatusOptions: TaskStatus[] = ['进行中', '已完成', '暂停']

const TABLE_COLUMN_WIDTH_STORAGE_KEY = 'iw.aiSession.tableColumnWidths.v1'
const TABLE_COLUMN_KEYS = [
  'task',
  'project',
  'taskStatus',
  'tool',
  'workspace',
  'session',
  'lastActive',
  'actions'
] as const
type TableColumnKey = typeof TABLE_COLUMN_KEYS[number]
type TableColumnWidths = Record<TableColumnKey, number>

const TABLE_COLUMN_DEFAULT_WIDTHS: TableColumnWidths = {
  task: 280,
  project: 130,
  taskStatus: 108,
  tool: 128,
  workspace: 280,
  session: 240,
  lastActive: 160,
  actions: 156
}

const TABLE_COLUMN_MIN_WIDTHS: TableColumnWidths = {
  task: 180,
  project: 90,
  taskStatus: 92,
  tool: 100,
  workspace: 180,
  session: 180,
  lastActive: 140,
  actions: 152
}

const ACTION_COLUMN_CELL_HORIZONTAL_SPACE = 25

const readTableColumnWidths = (): TableColumnWidths => {
  try {
    const storedWidths = JSON.parse(
      window.localStorage.getItem(TABLE_COLUMN_WIDTH_STORAGE_KEY) || '{}'
    ) as Partial<Record<TableColumnKey, unknown>>
    return TABLE_COLUMN_KEYS.reduce<TableColumnWidths>((widths, key) => {
      if (key === 'actions') {
        widths[key] = TABLE_COLUMN_DEFAULT_WIDTHS[key]
        return widths
      }
      const storedWidth = Number(storedWidths[key])
      widths[key] = Number.isFinite(storedWidth)
        ? Math.max(TABLE_COLUMN_MIN_WIDTHS[key], Math.round(storedWidth))
        : TABLE_COLUMN_DEFAULT_WIDTHS[key]
      return widths
    }, { ...TABLE_COLUMN_DEFAULT_WIDTHS })
  } catch {
    return { ...TABLE_COLUMN_DEFAULT_WIDTHS }
  }
}

const persistTableColumnWidths = (widths: TableColumnWidths) => {
  try {
    window.localStorage.setItem(TABLE_COLUMN_WIDTH_STORAGE_KEY, JSON.stringify(widths))
  } catch {
    // 浏览器禁用本地存储时，当前页面内的列宽调整仍然有效。
  }
}

const formRef = ref<FormInstance>()
const actionColumnProbeRef = ref<HTMLElement>()
const importFileInputRef = ref<HTMLInputElement>()
const importDirectoryInputRef = ref<HTMLInputElement>()
const listLoading = ref(false)
const formDialogVisible = ref(false)
const formDialogMode = ref<'create' | 'edit'>('create')
const importDialogVisible = ref(false)
const importLoading = ref(false)
const launcherDialogVisible = ref(false)
const launcherTokenInput = ref('')
const launcherConnectionState = ref<LauncherConnectionState>('checking')
const launcherStatus = ref<AiLauncherStatus>()
const launchingTaskId = ref<number>()
const updatingTopTaskIds = ref<number[]>([])
const updatingStatusTaskIds = ref<number[]>([])
const inspectingSession = ref(false)
const optimizingMetadata = ref(false)
const projectOptions = ref<string[]>([])
const workspaceOptions = ref<string[]>([])
const modelProviderOptions = ref<string[]>([])
const tasks = ref<AiSessionTask[]>([])
const tableColumnWidths = reactive<TableColumnWidths>(readTableColumnWidths())
const importTool = ref<ImportTool>('claude')
const importSourceLabel = ref('未选择')
const importNotice = ref('')
const importNoticeType = ref<NoticeType>('info')
const importSourceMode = ref<ImportSourceMode>('none')
const selectedImportFiles = ref<File[]>([])
const detectedSessionDrafts = ref<DetectedSessionDraft[]>([])
let importRefreshSeq = 0
let actionColumnResizeObserver: ResizeObserver | undefined

const filters = reactive({
  keyword: '',
  toolType: '',
  taskStatus: '进行中',
  projectName: '',
  workspaceKeyword: ''
})

const formState = reactive<FormState>({
  title: '',
  description: '',
  toolType: 'Codex',
  sessionKey: '',
  taskStatus: '进行中',
  projectName: '',
  workspacePath: '',
  modelName: '',
  modelProvider: '',
  gitBranch: '',
  transcriptPath: '',
  resumeCommand: ''
})

const formRules: FormRules = {
  title: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  toolType: [{ required: true, message: '请选择工具', trigger: 'change' }],
  sessionKey: [{ required: true, message: '请输入 sessionKey', trigger: 'blur' }],
  taskStatus: [{ required: true, message: '请选择任务状态', trigger: 'change' }],
  workspacePath: [{ required: true, message: '请输入工作区绝对路径', trigger: 'change' }]
}

const formDialogTitle = computed(() => formDialogMode.value === 'create' ? '新建 AI 会话任务' : '编辑 AI 会话任务')

const importDialogTitle = computed(() => importTool.value === 'claude' ? '导入 Claude 本地草稿' : '导入 Codex 本地草稿')

const importDialogAlertTitle = computed(() => {
  if (importTool.value === 'claude') {
    return '推荐直接选择 ~/.claude/projects 整个目录，也支持单独选择一个或多个 .jsonl 文件。'
  }
  return '推荐直接选择 ~/.codex 整个目录；若只选文件，最好同时选择 session_index.jsonl 与 sessions 下的 .jsonl。'
})

const importToolbarText = computed(() => {
  if (importLoading.value) {
    return `正在解析浏览器本地${importTool.value === 'claude' ? 'Claude Code' : 'Codex'}文件...`
  }
  if (!selectedImportFiles.value.length) {
    return '尚未选择本地文件或目录'
  }
  return `已解析 ${detectedSessionDrafts.value.length} 条可导入草稿`
})

const importEmptyDescription = computed(() => '当前未检测到可导入的会话，请先选择目录或文件')

const importSourceTagType = computed(() => {
  return importSourceMode.value === 'directory' || importSourceMode.value === 'files' ? 'success' : 'info'
})

const handleColumnResize = (
  newWidth: number,
  _oldWidth: number,
  column: { columnKey?: string }
) => {
  const columnKey = column.columnKey as TableColumnKey | undefined
  if (!columnKey || !TABLE_COLUMN_KEYS.includes(columnKey)) {
    return
  }
  tableColumnWidths[columnKey] = Math.max(
    TABLE_COLUMN_MIN_WIDTHS[columnKey],
    Math.round(newWidth)
  )
  persistTableColumnWidths(tableColumnWidths)
}

const syncActionColumnWidth = () => {
  const probe = actionColumnProbeRef.value
  if (!probe) {
    return
  }
  tableColumnWidths.actions = Math.max(
    TABLE_COLUMN_MIN_WIDTHS.actions,
    Math.ceil(probe.getBoundingClientRect().width) + ACTION_COLUMN_CELL_HORIZONTAL_SPACE
  )
}

const launcherStatusText = computed(() => {
  const statusTextMap: Record<LauncherConnectionState, string> = {
    checking: '正在检测',
    offline: '未检测到启动器',
    unpaired: '等待配对',
    ready: '启动器已连接'
  }
  return statusTextMap[launcherConnectionState.value]
})

const launcherStatusTagType = computed(() => {
  const typeMap: Record<LauncherConnectionState, 'success' | 'warning' | 'info'> = {
    checking: 'info',
    offline: 'info',
    unpaired: 'warning',
    ready: 'success'
  }
  return typeMap[launcherConnectionState.value]
})

const resetForm = () => {
  formState.id = undefined
  formState.title = ''
  formState.description = ''
  formState.toolType = 'Codex'
  formState.sessionKey = ''
  formState.taskStatus = '进行中'
  formState.projectName = ''
  formState.workspacePath = ''
  formState.modelName = ''
  formState.modelProvider = ''
  formState.gitBranch = ''
  formState.transcriptPath = ''
  formState.resumeCommand = ''
}

const getToolTagType = (tool: ToolType) => {
  const map: Record<ToolType, string> = {
    Codex: 'success',
    'Claude Code': 'warning',
    'Gemini CLI': 'info'
  }
  return map[tool]
}

const displayText = (value: string, fallback = '--') => {
  return value?.trim() ? value : fallback
}

const formatDateTime = (value: string) => {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const getToolTypeCode = (toolType: ToolType) => TOOL_CODE_MAP[toolType]
const getToolTypeLabel = (toolType?: number | null): ToolType => TOOL_LABEL_MAP[(toolType ?? 2) as AiTaskType.ToolTypeCode] || 'Claude Code'
const getTaskStatusCode = (taskStatus: TaskStatus) => TASK_STATUS_CODE_MAP[taskStatus]
const getTaskStatusLabel = (taskStatus?: number | null): TaskStatus => TASK_STATUS_LABEL_MAP[(taskStatus ?? 1) as AiTaskType.TaskStatusCode] || '进行中'

const normalizeOptionalText = (value: string) => {
  const normalized = value.trim()
  return normalized || undefined
}

const buildResumeCommand = (toolType: ToolType, sessionKey: string, modelProvider = '') => {
  if (!sessionKey.trim()) {
    return ''
  }
  if (toolType === 'Claude Code') {
    return `claude --resume ${sessionKey}`
  }
  if (toolType === 'Gemini CLI') {
    return `gemini session resume ${sessionKey}`
  }
  const providerConfig = modelProvider.trim() ? ` -c model_provider=${modelProvider.trim()}` : ''
  return `codex resume ${sessionKey}${providerConfig}`
}

const shellQuote = (value: string) => `'${value.split("'").join("'\"'\"'")}'`

const buildRunnableCommand = (task: AiSessionTask) => {
  const workspacePath = task.workspacePath.trim()
  const sessionKey = task.sessionKey.trim()
  if (!workspacePath || !sessionKey) {
    return ''
  }

  let resumeCommand: string
  if (task.toolType === 'Claude Code') {
    resumeCommand = `claude --resume ${shellQuote(sessionKey)}`
  } else if (task.toolType === 'Gemini CLI') {
    resumeCommand = `gemini session resume ${shellQuote(sessionKey)}`
  } else {
    const providerConfig = task.modelProvider.trim()
      ? ` -c model_provider=${shellQuote(task.modelProvider.trim())}`
      : ''
    resumeCommand = `codex resume ${shellQuote(sessionKey)}${providerConfig}`
  }
  return `cd -- ${shellQuote(workspacePath)} && ${resumeCommand}`
}

const mapTaskVo = (task: AiTaskType.AiTaskPageVo | AiTaskType.AiTaskDetailVo): AiSessionTask => {
  return {
    id: task.id,
    title: task.title || '',
    description: task.description || '',
    toolType: getToolTypeLabel(task.toolType),
    sessionKey: task.sessionKey || '',
    taskStatus: getTaskStatusLabel(task.taskStatus),
    isTop: task.isTop === 1 ? 1 : 0,
    topTime: task.topTime || '',
    projectName: task.projectName || '',
    workspacePath: task.workspacePath || '',
    modelName: task.modelName || '',
    modelProvider: task.modelProvider || '',
    gitBranch: task.gitBranch || '',
    transcriptPath: task.transcriptPath || '',
    resumeCommand: task.resumeCommand || '',
    lastActiveAt: task.lastActiveAt || '',
    createTime: task.createTime || '',
    updateTime: task.updateTime || ''
  }
}

const buildPageDto = (): AiTaskType.AiTaskPageDto => {
  return {
    currentPage: 1,
    pageSize: 200,
    keyword: normalizeOptionalText(filters.keyword),
    toolType: filters.toolType ? getToolTypeCode(filters.toolType as ToolType) : undefined,
    taskStatus: filters.taskStatus ? getTaskStatusCode(filters.taskStatus as TaskStatus) : undefined,
    projectName: normalizeOptionalText(filters.projectName),
    workspaceKeyword: normalizeOptionalText(filters.workspaceKeyword)
  }
}

const buildSaveDto = (): AiTaskType.AiTaskAddDto => {
  const resumeCommand = formState.resumeCommand.trim() || buildResumeCommand(
    formState.toolType,
    formState.sessionKey,
    formState.modelProvider
  )
  return {
    title: formState.title.trim(),
    description: formState.description.trim(),
    toolType: getToolTypeCode(formState.toolType),
    sessionKey: formState.sessionKey.trim(),
    taskStatus: getTaskStatusCode(formState.taskStatus),
    projectName: normalizeOptionalText(formState.projectName),
    workspacePath: formState.workspacePath.trim(),
    modelName: normalizeOptionalText(formState.modelName),
    modelProvider: normalizeOptionalText(formState.modelProvider),
    gitBranch: normalizeOptionalText(formState.gitBranch),
    transcriptPath: normalizeOptionalText(formState.transcriptPath),
    resumeCommand: normalizeOptionalText(resumeCommand)
  }
}

const buildTaskUpdateDto = (
  task: AiSessionTask,
  taskStatus: TaskStatus
): AiTaskType.AiTaskUpdateDto => {
  const resumeCommand = task.resumeCommand.trim() || buildResumeCommand(
    task.toolType,
    task.sessionKey,
    task.modelProvider
  )
  return {
    id: task.id,
    title: task.title.trim(),
    description: task.description.trim(),
    toolType: getToolTypeCode(task.toolType),
    sessionKey: task.sessionKey.trim(),
    taskStatus: getTaskStatusCode(taskStatus),
    projectName: normalizeOptionalText(task.projectName),
    workspacePath: task.workspacePath.trim(),
    modelName: normalizeOptionalText(task.modelName),
    modelProvider: normalizeOptionalText(task.modelProvider),
    gitBranch: normalizeOptionalText(task.gitBranch),
    transcriptPath: normalizeOptionalText(task.transcriptPath),
    resumeCommand: normalizeOptionalText(resumeCommand)
  }
}

const loadTaskPage = async () => {
  listLoading.value = true
  try {
    const response = await queryAiTaskPage(buildPageDto())
    const pageData = response.data as { records?: Array<AiTaskType.AiTaskPageVo> }
    tasks.value = (pageData.records || []).map(mapTaskVo)
  } finally {
    listLoading.value = false
  }
}

const updateTaskStatus = async (task: AiSessionTask, nextStatus: TaskStatus) => {
  if (
    task.taskStatus === nextStatus
    || updatingStatusTaskIds.value.includes(task.id)
  ) {
    return
  }

  updatingStatusTaskIds.value = [...updatingStatusTaskIds.value, task.id]
  try {
    await updateAiTask(buildTaskUpdateDto(task, nextStatus))
    task.taskStatus = nextStatus
    ElMessage.success('任务状态已更新')
    await loadTaskPage()
  } finally {
    updatingStatusTaskIds.value = updatingStatusTaskIds.value.filter((id) => id !== task.id)
  }
}

const toggleTaskTop = async (task: AiSessionTask) => {
  if (updatingTopTaskIds.value.includes(task.id)) {
    return
  }

  const nextIsTop: AiTaskType.TopState = task.isTop === 1 ? 0 : 1
  updatingTopTaskIds.value = [...updatingTopTaskIds.value, task.id]
  try {
    await updateAiTaskTop({ id: task.id, isTop: nextIsTop })
    task.isTop = nextIsTop
    ElMessage.success(nextIsTop === 1 ? '任务已置顶' : '已取消置顶')
    await loadTaskPage()
  } finally {
    updatingTopTaskIds.value = updatingTopTaskIds.value.filter((id) => id !== task.id)
  }
}

const openCreateDialog = () => {
  formDialogMode.value = 'create'
  resetForm()
  formDialogVisible.value = true
}

const openEditDialog = async (task: AiSessionTask) => {
  formDialogMode.value = 'edit'
  const response = await queryAiTaskDetail(task.id)
  const detail = mapTaskVo(response.data as AiTaskType.AiTaskDetailVo)
  formState.id = detail.id
  formState.title = detail.title
  formState.description = detail.description
  formState.toolType = detail.toolType
  formState.sessionKey = detail.sessionKey
  formState.taskStatus = detail.taskStatus
  formState.projectName = detail.projectName
  formState.workspacePath = detail.workspacePath
  formState.modelName = detail.modelName
  formState.modelProvider = detail.modelProvider
  formState.gitBranch = detail.gitBranch
  formState.transcriptPath = detail.transcriptPath
  formState.resumeCommand = detail.resumeCommand
  formDialogVisible.value = true
}

const submitForm = async () => {
  const form = formRef.value
  if (!form) {
    return
  }
  try {
    await form.validate()
  } catch {
    return
  }

  const saveDto = buildSaveDto()
  if (formDialogMode.value === 'create') {
    await addAiTask(saveDto)
    ElMessage.success('会话任务已创建')
  } else if (formState.id) {
    await updateAiTask({
      id: formState.id,
      ...saveDto
    })
    ElMessage.success('会话任务已更新')
  }

  projectOptions.value = rememberAiTaskLocalOption('project', formState.projectName)
  workspaceOptions.value = rememberAiTaskLocalOption('workspace', formState.workspacePath)
  modelProviderOptions.value = rememberAiTaskLocalOption('modelProvider', formState.modelProvider)
  formDialogVisible.value = false
  await loadTaskPage()
}

const copyText = async (text: string, label: string) => {
  if (!text) {
    ElMessage.warning(`当前没有可复制的${label}`)
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}已复制`)
  } catch {
    ElMessage.warning(`无法直接复制${label}，请手动复制`)
  }
}

const copyTaskCommand = (task: AiSessionTask) => {
  return copyText(buildRunnableCommand(task), '会话命令')
}

const handleTaskMoreCommand = (command: TaskMoreCommand, task: AiSessionTask) => {
  if (command === 'toggleTop') {
    void toggleTaskTop(task)
    return
  }
  if (command === 'copyCommand') {
    void copyTaskCommand(task)
    return
  }
  void removeTask(task)
}

const removeLocalOption = (type: AiTaskLocalOptionType, value: string) => {
  const nextOptions = removeAiTaskLocalOption(type, value)
  if (type === 'project') {
    projectOptions.value = nextOptions
  } else if (type === 'workspace') {
    workspaceOptions.value = nextOptions
  } else {
    modelProviderOptions.value = nextOptions
  }
}

const getToolLauncherKey = (toolType: ToolType) => {
  if (toolType === 'Claude Code') {
    return 'claude'
  }
  if (toolType === 'Gemini CLI') {
    return 'gemini'
  }
  return 'codex'
}

const canQuickLaunch = (task: AiSessionTask) => {
  if (!task.workspacePath.trim() || !task.sessionKey.trim() || launchingTaskId.value === task.id) {
    return false
  }
  if (launcherConnectionState.value !== 'ready') {
    return true
  }
  return launcherStatus.value?.tools[getToolLauncherKey(task.toolType)] !== false
}

const getQuickLaunchTip = (task: AiSessionTask) => {
  if (!task.workspacePath.trim()) {
    return '请先编辑并补充工作区'
  }
  if (!task.sessionKey.trim()) {
    return '当前任务缺少 Session'
  }
  if (
    launcherConnectionState.value === 'ready' &&
    launcherStatus.value?.tools[getToolLauncherKey(task.toolType)] === false
  ) {
    return `本机未检测到 ${task.toolType}`
  }
  if (launcherConnectionState.value !== 'ready') {
    return '点击连接本机启动器'
  }
  return '在本机 iTerm2 中继续会话'
}

const refreshLauncherStatus = async (notify = false) => {
  launcherConnectionState.value = 'checking'
  try {
    const status = await queryAiLauncherStatus()
    launcherStatus.value = status
    launcherConnectionState.value = status.paired ? 'ready' : 'unpaired'
    if (notify) {
      ElMessage.success(status.paired ? '本机启动器连接成功' : '已检测到启动器，请完成配对')
    }
    return status.paired
  } catch (error) {
    launcherStatus.value = undefined
    launcherConnectionState.value = error instanceof AiLauncherError && error.status === 401
      ? 'unpaired'
      : 'offline'
    if (notify) {
      ElMessage.warning(error instanceof Error ? error.message : '无法连接本机启动器')
    }
    return false
  }
}

const openLauncherDialog = () => {
  launcherTokenInput.value = getAiLauncherToken()
  launcherDialogVisible.value = true
  void refreshLauncherStatus()
}

const saveLauncherPairing = async () => {
  if (!launcherTokenInput.value.trim()) {
    ElMessage.warning('请输入配对令牌')
    return
  }
  setAiLauncherToken(launcherTokenInput.value)
  const connected = await refreshLauncherStatus(true)
  if (connected) {
    launcherDialogVisible.value = false
  }
}

const inspectResumeCommand = async () => {
  const resumeCommand = formState.resumeCommand.trim()
  if (!resumeCommand) {
    ElMessage.warning('请先输入会话命令')
    return
  }
  if (launcherConnectionState.value !== 'ready') {
    const connected = await refreshLauncherStatus()
    if (!connected) {
      openLauncherDialog()
      return
    }
  }

  inspectingSession.value = true
  try {
    const draft = await inspectAiSession(resumeCommand)
    if (!formState.title.trim() && draft.titleHint?.trim()) {
      formState.title = draft.titleHint.trim()
    }
    if (!formState.projectName.trim()) {
      formState.projectName = draft.projectName
    }
    formState.toolType = 'Codex'
    formState.sessionKey = draft.sessionKey
    formState.modelName = draft.modelName
    formState.modelProvider = draft.modelProvider
    formState.workspacePath = draft.workspacePath
    formState.gitBranch = draft.gitBranch
    formState.transcriptPath = draft.transcriptPath
    formState.resumeCommand = draft.resumeCommand
    formRef.value?.clearValidate(['title', 'toolType', 'sessionKey', 'workspacePath'])

    if (draft.warnings.length) {
      ElMessage.warning(`已识别本地会话；${draft.warnings.join('；')}`)
    } else {
      ElMessage.success('已从本机 Codex 会话填充连接信息')
    }
  } catch (error) {
    if (error instanceof AiLauncherError && error.status === 401) {
      launcherConnectionState.value = 'unpaired'
      openLauncherDialog()
    }
    ElMessage.error(error instanceof Error ? error.message : '识别本地会话失败')
  } finally {
    inspectingSession.value = false
  }
}

const optimizeTaskMetadata = async () => {
  const resumeCommand = formState.resumeCommand.trim() || buildResumeCommand(
    formState.toolType,
    formState.sessionKey,
    formState.modelProvider
  )
  if (!resumeCommand) {
    ElMessage.warning('请先输入会话命令')
    return
  }
  if (launcherConnectionState.value !== 'ready') {
    const connected = await refreshLauncherStatus()
    if (!connected) {
      openLauncherDialog()
      return
    }
  }

  optimizingMetadata.value = true
  try {
    const result = await optimizeAiSessionMetadata({
      resumeCommand
    })
    formState.title = result.title
    formState.description = result.description
    formRef.value?.clearValidate('title')
    ElMessage.success('任务名称和描述已优化')
  } catch (error) {
    if (error instanceof AiLauncherError && error.status === 401) {
      launcherConnectionState.value = 'unpaired'
      openLauncherDialog()
    }
    ElMessage.error(error instanceof Error ? error.message : 'AI 优化失败')
  } finally {
    optimizingMetadata.value = false
  }
}

const quickLaunchTask = async (task: AiSessionTask) => {
  if (!task.workspacePath.trim()) {
    ElMessage.warning('请先编辑并补充工作区')
    return
  }
  if (launcherConnectionState.value !== 'ready') {
    const connected = await refreshLauncherStatus()
    if (!connected) {
      openLauncherDialog()
      return
    }
  }

  launchingTaskId.value = task.id
  try {
    const launchResult = await launchAiSession({
      toolType: getToolTypeCode(task.toolType),
      sessionKey: task.sessionKey,
      sessionName: task.title,
      workspacePath: task.workspacePath,
      modelProvider: normalizeOptionalText(task.modelProvider)
    })
    const terminalName = launchResult.terminalName || 'iTerm2'
    const sessionNameApplied = launchResult.sessionNameApplied === true
    workspaceOptions.value = rememberAiTaskLocalOption('workspace', task.workspacePath)
    modelProviderOptions.value = rememberAiTaskLocalOption('modelProvider', task.modelProvider)
    try {
      await updateAiTaskActive({ id: task.id })
      await loadTaskPage()
      if (sessionNameApplied) {
        ElMessage.success(`已在 ${terminalName} 中打开会话`)
      } else {
        ElMessage.warning(`${terminalName} 已打开，但 Session Name 设置失败，请重新安装本机启动器`)
      }
    } catch {
      const nameWarning = sessionNameApplied ? '' : 'Session Name 设置失败；'
      ElMessage.warning(`${terminalName} 已打开，但${nameWarning}最近活跃时间更新失败`)
    }
  } catch (error) {
    if (error instanceof AiLauncherError && error.status === 401) {
      launcherConnectionState.value = 'unpaired'
      openLauncherDialog()
    }
    ElMessage.error(error instanceof Error ? error.message : '快捷开启失败')
  } finally {
    launchingTaskId.value = undefined
  }
}

const removeTask = async (task: AiSessionTask) => {
  try {
    await ElMessageBox.confirm(`确认删除任务 ${task.title} 吗？`, '删除会话任务', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }

  await deleteAiTask(task.id)
  ElMessage.success('会话任务已删除')
  await loadTaskPage()
}

const openImportDialog = (tool: ImportTool) => {
  importTool.value = tool
  importSourceMode.value = 'none'
  importSourceLabel.value = '未选择'
  importNotice.value = ''
  importNoticeType.value = 'info'
  selectedImportFiles.value = []
  detectedSessionDrafts.value = []
  importDialogVisible.value = true
}

const handleImportCommand = (command: ImportTool) => {
  openImportDialog(command)
}

const getImportContext = (tool: ImportTool): ImportContext => {
  if (tool === 'claude') {
    return {
      toolLabel: 'Claude Code',
      recommendedPath: '~/.claude/projects',
      parser: parseClaudeDetectedDraftsFromFiles
    }
  }
  return {
    toolLabel: 'Codex',
    recommendedPath: '~/.codex',
    parser: parseCodexDetectedDraftsFromFiles
  }
}

const isJsonlFile = (file: File) => file.name.toLowerCase().endsWith('.jsonl')

const getBrowserFilePath = (file: File) => file.webkitRelativePath || file.name

const removeFileExtension = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf('.')
  return lastDotIndex < 0 ? fileName : fileName.slice(0, lastDotIndex)
}

const clampText = (text: string, maxLength = 72) => {
  if (!text) {
    return ''
  }
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength - 1)}...`
}

const extractSessionIdFromFileName = (fileName: string) => {
  const match = fileName.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  return match?.[1] || ''
}

const fallbackProjectPathFromBrowserFile = (filePath: string) => {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const segments = normalizedPath.split('/').filter(Boolean)
  const parentDir = segments.length > 1 ? segments[segments.length - 2] : ''
  if (!parentDir) {
    return ''
  }
  return parentDir.replace(/^-/, '/').replace(/-/g, '/')
}

const parseJsonlText = (rawText: string) => {
  return rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean) as Array<Record<string, any>>
}

const extractTextContent = (content: unknown) => {
  if (!content) {
    return ''
  }
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return ''
        }
        if (typeof (item as { text?: unknown }).text === 'string') {
          return (item as { text: string }).text
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }
  if (typeof content === 'object' && typeof (content as { text?: unknown }).text === 'string') {
    return (content as { text: string }).text
  }
  return ''
}

const createImportDraftId = (key: string) => {
  let hash = 0
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647
  }
  return hash
}

const normalizeDetectedDraft = (draft: Partial<DetectedSessionDraft>, toolType: ToolType): DetectedSessionDraft => {
  const sessionKey = draft.sessionKey?.trim() || ''
  return {
    id: draft.id || createImportDraftId(sessionKey || draft.transcriptPath || Date.now().toString()),
    titleHint: draft.titleHint?.trim() || `${toolType} 会话草稿`,
    description: draft.description?.trim() || '',
    toolType,
    modelName: draft.modelName?.trim() || toolType,
    sessionKey,
    resumeCommand: draft.resumeCommand?.trim() || buildResumeCommand(toolType, sessionKey),
    cwd: draft.cwd?.trim() || '',
    gitBranch: draft.gitBranch?.trim() || '',
    transcriptPath: draft.transcriptPath?.trim() || '',
    lastActiveAt: draft.lastActiveAt || new Date().toISOString(),
    createdAt: draft.createdAt
  }
}

const buildClaudeDraftFromFile = async (file: File) => {
  const rawText = await file.text()
  const lineList = parseJsonlText(rawText)
  const filePath = getBrowserFilePath(file)
  const sessionId = removeFileExtension(file.name)

  let cwd = ''
  let gitBranch = ''
  let firstPrompt = ''
  let lastUserText = ''
  let lastAssistantText = ''
  let modelName = 'Claude Code'
  let createdAt = ''
  let lastActiveAt = file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString()

  lineList.forEach((entry) => {
    if (!cwd && typeof entry.cwd === 'string') {
      cwd = entry.cwd
    }
    if (!gitBranch && typeof entry.gitBranch === 'string') {
      gitBranch = entry.gitBranch
    }
    if (!createdAt && typeof entry.timestamp === 'string') {
      createdAt = entry.timestamp
    }
    if (typeof entry.timestamp === 'string') {
      lastActiveAt = entry.timestamp
    }
    if (entry.type === 'user' && entry.userType === 'external') {
      const userText = clampText(extractTextContent(entry.message?.content), 180)
      if (userText) {
        if (!firstPrompt) {
          firstPrompt = userText
        }
        lastUserText = userText
      }
    }
    if (entry.type === 'assistant') {
      const assistantText = clampText(extractTextContent(entry.message?.content), 180)
      if (assistantText) {
        lastAssistantText = assistantText
      }
      if (typeof entry.message?.model === 'string') {
        modelName = entry.message.model
      }
    }
  })

  const titleSource = firstPrompt || lastUserText || lastAssistantText || sessionId
  const descriptionSource = lastAssistantText || lastUserText || firstPrompt

  return normalizeDetectedDraft({
    id: createImportDraftId(filePath),
    titleHint: clampText(titleSource, 48),
    description: descriptionSource,
    toolType: 'Claude Code',
    modelName,
    sessionKey: sessionId,
    resumeCommand: `claude --resume ${sessionId}`,
    cwd: cwd || fallbackProjectPathFromBrowserFile(filePath),
    gitBranch: gitBranch || 'unknown',
    transcriptPath: filePath,
    lastActiveAt,
    createdAt: createdAt || lastActiveAt
  }, 'Claude Code')
}

const parseClaudeDetectedDraftsFromFiles = async (files: File[], limit: number) => {
  const jsonlFiles = files.filter(isJsonlFile).sort((left, right) => right.lastModified - left.lastModified)
  const drafts: DetectedSessionDraft[] = []
  for (const file of jsonlFiles) {
    try {
      drafts.push(await buildClaudeDraftFromFile(file))
    } catch {
      continue
    }
    if (drafts.length >= limit) {
      break
    }
  }
  return drafts.sort((left, right) => new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime())
}

const buildCodexFallbackDraft = (sessionIndexEntry: { id: string; threadName?: string; updatedAt?: string }, file?: File) => {
  const filePath = file ? getBrowserFilePath(file) : ''
  return normalizeDetectedDraft({
    id: createImportDraftId(filePath || sessionIndexEntry.id),
    titleHint: clampText(sessionIndexEntry.threadName || sessionIndexEntry.id, 48),
    description: '仅从 Codex 索引中读取到会话元信息，建议导入后手工补充描述。',
    toolType: 'Codex',
    modelName: 'Codex',
    sessionKey: sessionIndexEntry.id,
    resumeCommand: `codex resume ${sessionIndexEntry.id}`,
    transcriptPath: filePath,
    lastActiveAt: sessionIndexEntry.updatedAt || '',
    createdAt: sessionIndexEntry.updatedAt || ''
  }, 'Codex')
}

const buildCodexDraftFromFile = async (file: File, sessionIndexEntry: { id: string; threadName?: string; updatedAt?: string }) => {
  const rawText = await file.text()
  const lineList = parseJsonlText(rawText)
  const filePath = getBrowserFilePath(file)

  const userMessageState = {
    firstText: '',
    lastText: ''
  }
  const assistantMessageState = {
    firstText: '',
    lastText: ''
  }

  const recordMessageText = (target: typeof userMessageState, text: string) => {
    const normalizedText = clampText(text, 180)
    if (!normalizedText) {
      return
    }
    if (!target.firstText) {
      target.firstText = normalizedText
    }
    target.lastText = normalizedText
  }

  let cwd = ''
  let modelName = 'Codex'
  let createdAt = sessionIndexEntry.updatedAt || ''
  let lastActiveAt = sessionIndexEntry.updatedAt || (file.lastModified ? new Date(file.lastModified).toISOString() : '')

  lineList.forEach((entry) => {
    if (typeof entry.timestamp === 'string') {
      if (!createdAt) {
        createdAt = entry.timestamp
      }
      lastActiveAt = entry.timestamp
    }
    if (entry.type === 'session_meta') {
      if (typeof entry.payload?.cwd === 'string' && entry.payload.cwd) {
        cwd = entry.payload.cwd
      }
      if (typeof entry.payload?.timestamp === 'string' && entry.payload.timestamp) {
        createdAt = entry.payload.timestamp
      }
      return
    }
    if (entry.type === 'turn_context') {
      if (typeof entry.payload?.cwd === 'string' && entry.payload.cwd) {
        cwd = entry.payload.cwd
      }
      if (typeof entry.payload?.model === 'string' && entry.payload.model) {
        modelName = entry.payload.model
      }
      return
    }
    if (entry.type === 'event_msg') {
      if (entry.payload?.type === 'user_message' && typeof entry.payload?.message === 'string') {
        recordMessageText(userMessageState, entry.payload.message)
      }
      if (entry.payload?.type === 'agent_message' && typeof entry.payload?.message === 'string') {
        recordMessageText(assistantMessageState, entry.payload.message)
      }
      return
    }
    if (entry.type === 'response_item' && entry.payload?.type === 'message') {
      const messageText = extractTextContent(entry.payload.content)
      if (entry.payload.role === 'user') {
        recordMessageText(userMessageState, messageText)
      }
      if (entry.payload.role === 'assistant') {
        recordMessageText(assistantMessageState, messageText)
      }
    }
  })

  const titleSource =
    sessionIndexEntry.threadName ||
    userMessageState.firstText ||
    userMessageState.lastText ||
    assistantMessageState.lastText ||
    sessionIndexEntry.id
  const descriptionSource =
    assistantMessageState.lastText ||
    userMessageState.lastText ||
    userMessageState.firstText

  return normalizeDetectedDraft({
    id: createImportDraftId(filePath),
    titleHint: clampText(titleSource, 48),
    description: descriptionSource,
    toolType: 'Codex',
    modelName,
    sessionKey: sessionIndexEntry.id,
    resumeCommand: `codex resume ${sessionIndexEntry.id}`,
    cwd,
    transcriptPath: filePath,
    lastActiveAt: lastActiveAt || createdAt,
    createdAt: createdAt || lastActiveAt
  }, 'Codex')
}

const parseCodexDetectedDraftsFromFiles = async (files: File[], limit: number) => {
  const jsonlFiles = files.filter(isJsonlFile)
  const sessionIndexFile = jsonlFiles.find((file) => file.name === 'session_index.jsonl')
  const transcriptFiles = jsonlFiles.filter((file) => file !== sessionIndexFile)
  const sessionFileMap = new Map<string, File>()
  transcriptFiles.forEach((file) => {
    const sessionId = extractSessionIdFromFileName(getBrowserFilePath(file))
    if (sessionId && !sessionFileMap.has(sessionId)) {
      sessionFileMap.set(sessionId, file)
    }
  })

  const indexList: Array<{ id: string; threadName?: string; updatedAt?: string }> = []
  if (sessionIndexFile) {
    const rawText = await sessionIndexFile.text()
    parseJsonlText(rawText).forEach((entry) => {
      if (!entry?.id) {
        return
      }
      indexList.push({
        id: String(entry.id),
        threadName: typeof entry.thread_name === 'string' ? entry.thread_name : '',
        updatedAt: typeof entry.updated_at === 'string' ? entry.updated_at : ''
      })
    })
  }

  if (!indexList.length) {
    transcriptFiles
      .map((file) => ({
        id: extractSessionIdFromFileName(getBrowserFilePath(file)),
        threadName: '',
        updatedAt: file.lastModified ? new Date(file.lastModified).toISOString() : ''
      }))
      .filter((item) => item.id)
      .forEach((item) => indexList.push(item))
  }

  indexList.sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())

  const drafts: DetectedSessionDraft[] = []
  for (const indexEntry of indexList) {
    const transcriptFile = sessionFileMap.get(indexEntry.id)
    if (!transcriptFile) {
      drafts.push(buildCodexFallbackDraft(indexEntry))
    } else {
      try {
        drafts.push(await buildCodexDraftFromFile(transcriptFile, indexEntry))
      } catch {
        drafts.push(buildCodexFallbackDraft(indexEntry, transcriptFile))
      }
    }
    if (drafts.length >= limit) {
      break
    }
  }

  return drafts.sort((left, right) => new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime())
}

const triggerImportFilePicker = () => {
  const input = importFileInputRef.value
  if (!input) {
    return
  }
  input.value = ''
  input.click()
}

const triggerImportDirectoryPicker = () => {
  const input = importDirectoryInputRef.value
  if (!input) {
    return
  }
  input.value = ''
  input.click()
}

const parseSelectedImportFiles = async (files: File[], sourceMode: ImportSourceMode) => {
  const currentImportTool = importTool.value
  const importContext = getImportContext(currentImportTool)
  const currentRefreshSeq = ++importRefreshSeq
  const jsonlFiles = files.filter(isJsonlFile)

  if (!jsonlFiles.length) {
    detectedSessionDrafts.value = []
    selectedImportFiles.value = []
    importSourceMode.value = 'none'
    importSourceLabel.value = '未选择'
    importNotice.value = `未检测到可解析的 .jsonl 文件。推荐路径：${importContext.recommendedPath}`
    importNoticeType.value = 'warning'
    return
  }

  importLoading.value = true
  selectedImportFiles.value = [...jsonlFiles]
  importSourceMode.value = sourceMode
  importSourceLabel.value = sourceMode === 'directory' ? '浏览器本地目录' : '浏览器本地文件'
  importNotice.value = ''
  importNoticeType.value = 'info'
  detectedSessionDrafts.value = []

  try {
    const drafts = await importContext.parser(jsonlFiles, 12)
    if (currentRefreshSeq !== importRefreshSeq || currentImportTool !== importTool.value) {
      return
    }
    detectedSessionDrafts.value = drafts
    importNotice.value = drafts.length
      ? `已解析 ${drafts.length} 条${importContext.toolLabel}草稿。`
      : `未解析出可导入草稿，建议优先选择 ${importContext.recommendedPath} 对应目录。`
    importNoticeType.value = drafts.length ? 'success' : 'warning'
  } catch (error: any) {
    if (currentRefreshSeq !== importRefreshSeq || currentImportTool !== importTool.value) {
      return
    }
    detectedSessionDrafts.value = []
    importNotice.value = `解析本地${importContext.toolLabel}文件失败。${error?.message ? `原因：${error.message}` : ''}`
    importNoticeType.value = 'error'
  } finally {
    if (currentRefreshSeq === importRefreshSeq && currentImportTool === importTool.value) {
      importLoading.value = false
    }
  }
}

const handleImportFileSelection = (event: Event) => {
  const input = event.target as HTMLInputElement
  void parseSelectedImportFiles(Array.from(input.files || []), 'files')
}

const handleImportDirectorySelection = (event: Event) => {
  const input = event.target as HTMLInputElement
  void parseSelectedImportFiles(Array.from(input.files || []), 'directory')
}

const refreshDetectedDrafts = async () => {
  if (!selectedImportFiles.value.length || importSourceMode.value === 'none') {
    const importContext = getImportContext(importTool.value)
    importNotice.value = `请先选择目录或文件。推荐路径：${importContext.recommendedPath}`
    importNoticeType.value = 'warning'
    return
  }
  await parseSelectedImportFiles(selectedImportFiles.value, importSourceMode.value)
}

const inferProjectNameFromPath = (cwd: string) => {
  if (!cwd) {
    return ''
  }
  const normalized = cwd.replace(/\/+$/, '')
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

const importDraftToForm = (draft: DetectedSessionDraft) => {
  formDialogMode.value = 'create'
  resetForm()
  formState.title = draft.titleHint
  formState.description = draft.description
  formState.toolType = draft.toolType
  formState.sessionKey = draft.sessionKey
  formState.taskStatus = '暂停'
  formState.projectName = draft.cwd ? inferProjectNameFromPath(draft.cwd) : ''
  formState.workspacePath = draft.cwd
  formState.modelName = draft.modelName
  formState.modelProvider = ''
  formState.gitBranch = draft.gitBranch
  formState.transcriptPath = draft.transcriptPath
  formState.resumeCommand = draft.resumeCommand
  importDialogVisible.value = false
  formDialogVisible.value = true
  ElMessage.success('已导入到表单，请确认后保存')
}

let filterTimer = 0

watch(
  () => [
    filters.keyword,
    filters.toolType,
    filters.taskStatus,
    filters.projectName,
    filters.workspaceKeyword
  ],
  () => {
    window.clearTimeout(filterTimer)
    filterTimer = window.setTimeout(() => {
      void loadTaskPage()
    }, 200)
  }
)

onMounted(() => {
  projectOptions.value = getAiTaskLocalOptions('project')
  workspaceOptions.value = getAiTaskLocalOptions('workspace')
  modelProviderOptions.value = getAiTaskLocalOptions('modelProvider')
  launcherTokenInput.value = getAiLauncherToken()
  void loadTaskPage()
  void refreshLauncherStatus()
  void nextTick(() => {
    syncActionColumnWidth()
    actionColumnResizeObserver = new ResizeObserver(syncActionColumnWidth)
    if (actionColumnProbeRef.value) {
      actionColumnResizeObserver.observe(actionColumnProbeRef.value)
    }
  })
})

onBeforeUnmount(() => {
  actionColumnResizeObserver?.disconnect()
})
</script>

<style scoped>
.ai-session-page {
  --panel-bg: #ffffff;
  --panel-border: rgba(198, 210, 224, 0.9);
  --soft-text: #667085;
  --strong-text: #1f2937;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  background:
    radial-gradient(circle at top left, rgba(18, 102, 212, 0.08), transparent 34%),
    linear-gradient(180deg, #f7f9fc 0%, #f2f5f9 100%);
  min-height: 100%;
}

.filter-panel,
.table-panel {
  padding: 20px 24px;
  border: 1px solid var(--panel-border);
  border-radius: 18px;
  background: var(--panel-bg);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-actions,
.launcher-command {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
  white-space: nowrap;
}

.row-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.action-column-probe {
  position: fixed;
  top: 0;
  left: -10000px;
  z-index: -1;
  display: inline-flex;
  gap: 12px;
  width: max-content;
  visibility: hidden;
  pointer-events: none;
}

.action-column-probe :deep(.el-button + .el-button) {
  margin-left: 0;
}

.row-action-item {
  display: inline-flex;
  align-items: center;
  height: 32px;
}

.row-action-item :deep(.el-button) {
  margin: 0;
}

.status-select {
  width: 100%;
}

.launcher-pair-form {
  margin-top: 18px;
}

.launcher-command {
  justify-content: space-between;
  width: 100%;
}

.launcher-command code {
  word-break: break-all;
}

.panel-title {
  color: var(--strong-text);
  font-size: 18px;
  font-weight: 700;
}

.panel-subtitle {
  margin-top: 6px;
  color: var(--soft-text);
  font-size: 13px;
}

.task-cell,
.session-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-top-tag {
  flex: 0 0 auto;
}

.task-title {
  min-width: 0;
  color: var(--strong-text);
  font-weight: 700;
}

.task-description,
.session-sub {
  color: var(--soft-text);
  font-size: 12px;
  line-height: 1.6;
}

.session-main {
  color: var(--strong-text);
  font-size: 13px;
  font-weight: 600;
}

:global(.task-more-danger) {
  color: var(--el-color-danger);
}

.task-name-field,
.manual-command-field {
  display: flex;
  gap: 10px;
  width: 100%;
}

.task-name-field :deep(.el-input),
.manual-command-field :deep(.el-input) {
  flex: 1;
}

.local-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.local-option span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.local-option-remove {
  flex: 0 0 auto;
  color: #98a2b3;
}

.import-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 18px 0 14px;
  color: var(--soft-text);
  font-size: 13px;
}

.import-toolbar-left,
.import-picker-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.import-notice {
  margin-bottom: 14px;
}

.import-draft-container {
  min-height: 180px;
}

.import-draft-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-draft-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: #fff;
}

.import-draft-head,
.import-draft-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.import-draft-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.import-draft-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  color: var(--soft-text);
  font-size: 13px;
}

.import-draft-summary {
  margin: 0;
  color: #475467;
  line-height: 1.7;
}

.import-draft-footer code {
  display: inline-block;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f4f7fb;
  color: #0f172a;
  word-break: break-all;
}

.import-draft-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.import-hidden-input {
  display: none;
}

:deep(.el-table th.el-table__cell) {
  background: #f8fafc;
}

:deep(.el-table .el-table__cell) {
  padding: 14px 0;
}

@media (max-width: 900px) {
  .panel-head,
  .import-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .ai-session-page {
    padding: 12px;
  }

  .task-name-field,
  .manual-command-field,
  .import-picker-actions,
  .import-draft-head,
  .import-draft-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
