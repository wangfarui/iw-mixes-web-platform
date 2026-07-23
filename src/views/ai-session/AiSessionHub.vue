<template>
  <div class="ai-session-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="hero-eyebrow">AI 会话任务</span>
        <p>
          用最小结构管理 Codex、Claude Code、Gemini CLI 会话。自动导入只负责生成草稿，最终保存前仍可手工修正。
        </p>
      </div>
      <div class="hero-actions">
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新建记录
        </el-button>
        <el-button @click="openImportDialog('claude')">
          <el-icon><FolderOpened /></el-icon>
          导入 Claude
        </el-button>
        <el-button @click="openImportDialog('codex')">
          <el-icon><FolderOpened /></el-icon>
          导入 Codex
        </el-button>
      </div>
    </section>

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
            placeholder="工作区关键字"
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
        <div class="launcher-summary">
          <el-tag :type="launcherStatusTagType" effect="plain">
            {{ launcherStatusText }}
          </el-tag>
          <el-button :loading="launcherConnectionState === 'checking'" @click="openLauncherDialog">
            <el-icon><Connection /></el-icon>
            本机启动器
          </el-button>
        </div>
      </div>

        <el-table :data="tasks" row-key="id" style="width: 100%">
        <el-table-column label="任务" min-width="260">
          <template #default="{ row }">
            <div class="task-cell">
              <div class="task-title-row">
                <span class="task-title">{{ row.title }}</span>
              </div>
              <div class="task-description">
                {{ displayText(row.description, '未填写描述') }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="任务状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getTaskStatusType(row.taskStatus)" effect="light">
              {{ row.taskStatus }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="工具" width="150">
          <template #default="{ row }">
            <el-tag :type="getToolTagType(row.toolType)" effect="plain">
              {{ row.toolType }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Session" min-width="220">
          <template #default="{ row }">
            <div class="session-cell">
              <span class="session-main">{{ row.sessionKey }}</span>
              <span class="session-sub">{{ displayText(row.modelName, '未填写模型') }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="项目 / 工作区" min-width="240">
          <template #default="{ row }">
            <div class="session-cell">
              <span class="session-main">{{ displayText(row.projectName, '--') }}</span>
              <span class="session-sub">{{ displayText(row.workspacePath, '--') }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="最近活跃" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.lastActiveAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-tooltip :content="getQuickLaunchTip(row)" placement="top">
              <span>
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
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="primary" @click="copyText(row.resumeCommand, '继续命令')">复制命令</el-button>
            <el-button link type="danger" @click="removeTask(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

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
              <el-input v-model="formState.title" maxlength="80" show-word-limit />
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
              <el-input v-model="formState.projectName" maxlength="64" />
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
            <el-form-item label="继续命令">
              <div class="manual-command-field">
                <el-input v-model="formState.resumeCommand" maxlength="255" />
                <el-button @click="prefillResumeCommand">
                  生成命令
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Close, Connection, FolderOpened, Plus, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  addAiTask,
  deleteAiTask,
  queryAiTaskDetail,
  queryAiTaskPage,
  updateAiTask
} from '@/api/aiTask'
import {
  AiLauncherError,
  getAiLauncherToken,
  launchAiSession,
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

interface AiSessionTask {
  id: number
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

const formRef = ref<FormInstance>()
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
const workspaceOptions = ref<string[]>([])
const modelProviderOptions = ref<string[]>([])
const tasks = ref<AiSessionTask[]>([])
const importTool = ref<ImportTool>('claude')
const importSourceLabel = ref('未选择')
const importNotice = ref('')
const importNoticeType = ref<NoticeType>('info')
const importSourceMode = ref<ImportSourceMode>('none')
const selectedImportFiles = ref<File[]>([])
const detectedSessionDrafts = ref<DetectedSessionDraft[]>([])
let importRefreshSeq = 0

const filters = reactive({
  keyword: '',
  toolType: '',
  taskStatus: '',
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

const getTaskStatusType = (status: TaskStatus) => {
  const map: Record<TaskStatus, string> = {
    '进行中': 'success',
    '已完成': 'info',
    '暂停': 'warning'
  }
  return map[status]
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

const prefillResumeCommand = () => {
  if (!formState.sessionKey.trim()) {
    ElMessage.warning('请先输入 sessionKey')
    return
  }
  formState.resumeCommand = buildResumeCommand(
    formState.toolType,
    formState.sessionKey,
    formState.modelProvider
  )
}

const mapTaskVo = (task: AiTaskType.AiTaskPageVo | AiTaskType.AiTaskDetailVo): AiSessionTask => {
  return {
    id: task.id,
    title: task.title || '',
    description: task.description || '',
    toolType: getToolTypeLabel(task.toolType),
    sessionKey: task.sessionKey || '',
    taskStatus: getTaskStatusLabel(task.taskStatus),
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
    description: normalizeOptionalText(formState.description),
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

const removeLocalOption = (type: AiTaskLocalOptionType, value: string) => {
  const nextOptions = removeAiTaskLocalOption(type, value)
  if (type === 'workspace') {
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
  return '在本机 Terminal 中继续会话'
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
    await launchAiSession({
      toolType: getToolTypeCode(task.toolType),
      sessionKey: task.sessionKey,
      workspacePath: task.workspacePath,
      modelProvider: normalizeOptionalText(task.modelProvider)
    })
    workspaceOptions.value = rememberAiTaskLocalOption('workspace', task.workspacePath)
    modelProviderOptions.value = rememberAiTaskLocalOption('modelProvider', task.modelProvider)
    ElMessage.success('已在 Terminal 中打开会话')
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
  workspaceOptions.value = getAiTaskLocalOptions('workspace')
  modelProviderOptions.value = getAiTaskLocalOptions('modelProvider')
  launcherTokenInput.value = getAiLauncherToken()
  void loadTaskPage()
  void refreshLauncherStatus()
})
</script>

<style scoped>
.ai-session-page {
  --panel-bg: #ffffff;
  --panel-border: rgba(198, 210, 224, 0.9);
  --soft-text: #667085;
  --strong-text: #1f2937;
  --accent: #1266d4;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  background:
    radial-gradient(circle at top left, rgba(18, 102, 212, 0.08), transparent 34%),
    linear-gradient(180deg, #f7f9fc 0%, #f2f5f9 100%);
  min-height: 100%;
}

.hero-panel,
.filter-panel,
.table-panel {
  padding: 20px 24px;
  border: 1px solid var(--panel-border);
  border-radius: 18px;
  background: var(--panel-bg);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  background:
    linear-gradient(135deg, rgba(18, 102, 212, 0.12), rgba(255, 255, 255, 0.96)),
    #ffffff;
}

.hero-eyebrow {
  display: inline-flex;
  margin-bottom: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(18, 102, 212, 0.1);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}

.hero-copy h2 {
  margin: 0 0 10px;
  color: #10233b;
  font-size: 28px;
}

.hero-copy p {
  margin: 0;
  color: var(--soft-text);
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.launcher-summary,
.launcher-command {
  display: flex;
  align-items: center;
  gap: 10px;
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

.task-title {
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

.manual-command-field {
  display: flex;
  gap: 10px;
  width: 100%;
}

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
  .hero-panel,
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

  .manual-command-field,
  .import-picker-actions,
  .import-draft-head,
  .import-draft-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
