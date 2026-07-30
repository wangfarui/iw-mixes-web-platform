<template>
  <div class="formatter-page">
    <header class="formatter-topbar">
      <div class="topbar-title">
        <h1>格式化工具</h1>
        <el-tag type="success" effect="light">本地处理 / 不上传</el-tag>
        <span class="privacy-copy">支持 JSON、XML、SQL、Properties、YAML、HTML、CSS、JavaScript、Markdown。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-switch
          :model-value="historyEnabled"
          active-text="历史"
          @change="handleHistoryToggle"
        />
        <el-button @click="openHistoryDialog">
          <el-icon><Clock /></el-icon>
          本地历史
        </el-button>
        <el-button @click="settingsVisible = true">
          <el-icon><Setting /></el-icon>
          设置
        </el-button>
        <el-button type="primary" :disabled="!hasInput || status === 'running'" @click="runFormat('manual')">
          <el-icon><MagicStick /></el-icon>
          开始格式化
        </el-button>
        <el-button v-if="status === 'running'" type="warning" @click="cancelFormat">
          取消
        </el-button>
        <el-button type="danger" plain @click="clearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </header>

    <main class="formatter-workbench">
      <section class="control-strip">
        <el-form label-position="top" class="control-form">
          <el-form-item label="语言">
            <el-select v-model="settings.language" filterable>
              <el-option
                v-for="item in languageOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="模式">
            <el-radio-group v-model="settings.mode">
              <el-radio-button label="format">格式化</el-radio-button>
              <el-radio-button label="compact">压缩</el-radio-button>
              <el-radio-button label="validate">校验</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="缩进">
            <el-input-number
              v-model="settings.indentSize"
              :min="2"
              :max="8"
              :step="2"
              controls-position="right"
            />
          </el-form-item>
          <el-form-item label="排序">
            <el-switch v-model="settings.sortKeys" active-text="Key" />
          </el-form-item>
          <el-form-item label="SQL 关键字">
            <el-select v-model="settings.sqlKeywordCase">
              <el-option label="大写" value="upper" />
              <el-option label="小写" value="lower" />
              <el-option label="保留" value="preserve" />
            </el-select>
          </el-form-item>
          <el-form-item label="转换">
            <div class="convert-row">
              <el-select v-model="conversionTarget">
                <el-option label="JSON" value="json" />
                <el-option label="Properties" value="properties" />
                <el-option label="YAML" value="yaml" />
              </el-select>
              <el-button :disabled="!canConvert" @click="convertCurrentResult">
                <el-icon><Switch /></el-icon>
                转换
              </el-button>
            </div>
          </el-form-item>
        </el-form>
      </section>

      <section class="editor-layout">
        <article
          class="editor-panel"
          :class="{ dragging: dragging }"
          @dragenter.prevent="dragging = true"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="handleDrop"
        >
          <div class="panel-head">
            <div>
              <h2>输入</h2>
              <p v-if="fileInfo">
                {{ fileInfo.name }} · {{ formatBytes(fileInfo.size) }} · {{ fileInfo.lines }} 行 · {{ fileInfo.encoding }}
              </p>
              <p v-else>粘贴文本，或拖拽 JSON / XML / SQL / 配置 / 前端源码文件。</p>
            </div>
            <div class="panel-actions">
              <el-button @click="triggerFilePick">
                <el-icon><Upload /></el-icon>
                文件
              </el-button>
              <el-button :disabled="!inputText" @click="replaceInputWithOutput">
                <el-icon><RefreshRight /></el-icon>
                使用结果
              </el-button>
              <el-button text type="danger" @click="clearInput">清空输入</el-button>
            </div>
          </div>
          <el-input
            v-model="inputText"
            class="code-editor"
            type="textarea"
            resize="none"
            placeholder="粘贴需要格式化、压缩、校验或转换的内容"
          />
          <div v-if="fileInfo?.status === 'error'" class="file-error">{{ fileInfo.message }}</div>
        </article>

        <article class="editor-panel result-panel">
          <div class="panel-head">
            <div>
              <h2>结果</h2>
              <p>{{ resultSummary }}</p>
            </div>
            <div class="panel-actions">
              <el-button :disabled="!activeOutput" @click="copyActiveOutput">
                <el-icon><CopyDocument /></el-icon>
                复制
              </el-button>
              <el-dropdown trigger="click" :disabled="!result" @command="handleExportCommand">
                <el-button :disabled="!result">
                  <el-icon><Download /></el-icon>
                  导出
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="source">结果源码</el-dropdown-item>
                    <el-dropdown-item command="txt">TXT</el-dropdown-item>
                    <el-dropdown-item command="json">JSON 报告</el-dropdown-item>
                    <el-dropdown-item command="markdown">Markdown 报告</el-dropdown-item>
                    <el-dropdown-item command="html">HTML 报告</el-dropdown-item>
                    <el-dropdown-item command="conversion">转换结果</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button :disabled="!result" @click="sendToDiff">
                <el-icon><DocumentCopy /></el-icon>
                Diff
              </el-button>
              <el-button :disabled="!result" @click="saveCurrentHistory">
                保存历史
              </el-button>
            </div>
          </div>

          <el-alert
            v-if="manualFormatRequired && hasInput && !result"
            class="result-alert"
            type="warning"
            :closable="false"
            show-icon
            title="当前输入较大，已停止自动格式化，请点击“开始格式化”。"
          />
          <el-alert
            v-if="hugeInputWarning"
            class="result-alert"
            type="warning"
            :closable="false"
            show-icon
            title="文本规模很大，格式化会在 Web Worker 中执行；建议分段查看输出。"
          />
          <el-alert
            v-if="expandableJsonStringCount > 0"
            class="result-alert json-string-alert"
            type="info"
            :closable="false"
            show-icon
          >
            <template #title>
              <span class="json-string-alert-title">
                检测到 {{ expandableJsonStringCount }} 处可展开的 JSON 字符串
                <el-button link type="primary" @click="expandJsonStrings">递归展开并格式化</el-button>
              </span>
            </template>
          </el-alert>
          <el-alert
            v-for="warning in result?.warnings || []"
            :key="warning"
            class="result-alert"
            type="warning"
            :closable="false"
            show-icon
            :title="warning"
          />

          <el-tabs v-model="activeResultTab" class="result-tabs">
            <el-tab-pane label="格式化结果" name="formatted">
              <div v-if="status === 'running'" class="state-panel">
                <el-icon class="is-loading"><RefreshRight /></el-icon>
                <strong>正在本地格式化...</strong>
                <span>大文本在 Web Worker 中处理，可随时取消。</span>
              </div>
              <el-empty v-else-if="!hasInput" description="输入内容后开始处理" class="empty-state" />
              <div v-else-if="status === 'error'" class="state-panel error">
                <el-icon><Close /></el-icon>
                <strong>处理失败</strong>
                <span>{{ errorMessage }}</span>
              </div>
              <div v-else-if="result" class="output-wrap">
                <pre>{{ result.output }}</pre>
              </div>
              <el-empty v-else description="等待格式化" class="empty-state" />
            </el-tab-pane>
            <el-tab-pane label="转换结果" name="conversion" :disabled="!conversionResult">
              <div v-if="conversionResult" class="output-wrap">
                <pre>{{ conversionResult.output }}</pre>
              </div>
              <el-empty v-else description="JSON / Properties / YAML 可互转" class="empty-state" />
            </el-tab-pane>
            <el-tab-pane label="问题" name="issues">
              <el-table :data="issueRows" height="100%" empty-text="暂无错误或提示">
                <el-table-column prop="level" label="级别" width="90" />
                <el-table-column prop="message" label="说明" min-width="220" />
                <el-table-column label="位置" width="120">
                  <template #default="{ row }">
                    <span v-if="row.line">第 {{ row.line }} 行<span v-if="row.column">:{{ row.column }}</span></span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </article>

        <aside class="info-panel">
          <div class="info-block">
            <h3>当前状态</h3>
            <div class="stat-grid">
              <div>
                <span>语言</span>
                <strong>{{ detectedLanguageLabel }}</strong>
              </div>
              <div>
                <span>耗时</span>
                <strong>{{ result ? `${result.durationMs}ms` : '-' }}</strong>
              </div>
              <div>
                <span>错误</span>
                <strong>{{ errorCount }}</strong>
              </div>
              <div>
                <span>警告</span>
                <strong>{{ warningCount }}</strong>
              </div>
            </div>
          </div>

          <div class="info-block">
            <h3>文本规模</h3>
            <div class="metric-list">
              <div>
                <span>输入</span>
                <strong>{{ inputMetrics.characters }}</strong>
                <small>{{ inputMetrics.lines }} 行 / {{ formatBytes(inputMetrics.bytes) }}</small>
              </div>
              <div>
                <span>输出</span>
                <strong>{{ outputMetrics.characters }}</strong>
                <small>{{ outputMetrics.lines }} 行 / {{ formatBytes(outputMetrics.bytes) }}</small>
              </div>
            </div>
          </div>

          <div class="info-block">
            <h3>本地策略</h3>
            <ul class="privacy-list">
              <li>不上传输入和结果</li>
              <li>不调用在线格式化 API</li>
              <li>默认不保存历史</li>
              <li>历史仅写当前浏览器 localStorage</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>

    <input
      ref="fileInputRef"
      class="hidden-file-input"
      type="file"
      :accept="fileAccept"
      @change="handleFileInput"
    />
    <input
      ref="historyImportInputRef"
      class="hidden-file-input"
      type="file"
      accept=".json,application/json"
      @change="handleHistoryImportInput"
    />

    <el-drawer v-model="settingsVisible" title="格式化设置" size="420px">
      <el-form label-width="150px" label-position="left">
        <el-divider content-position="left">通用</el-divider>
        <el-form-item label="行尾空白">
          <el-switch v-model="settings.trimTrailingWhitespace" active-text="清理" />
        </el-form-item>
        <el-form-item label="换行符">
          <el-switch v-model="settings.normalizeLineEndings" active-text="统一为 LF" />
        </el-form-item>
        <el-form-item label="文件末尾换行">
          <el-switch v-model="settings.ensureFinalNewline" active-text="补齐" />
        </el-form-item>
        <el-divider content-position="left">格式</el-divider>
        <el-form-item label="JSON 字符串">
          <div class="drawer-field">
            <el-select v-model="settings.jsonStringHandling">
              <el-option label="保留字符串" value="preserve" />
              <el-option label="仅展开最外层" value="outer" />
              <el-option label="递归展开对象/数组" value="recursive" />
            </el-select>
            <small>仅处理完整、合法且结果为对象或数组的 JSON 字符串。</small>
          </div>
        </el-form-item>
        <el-form-item label="JSON / Properties">
          <el-switch v-model="settings.sortKeys" active-text="Key 排序" />
        </el-form-item>
        <el-form-item label="SQL 关键字">
          <el-radio-group v-model="settings.sqlKeywordCase">
            <el-radio-button label="upper">大写</el-radio-button>
            <el-radio-button label="lower">小写</el-radio-button>
            <el-radio-button label="preserve">保留</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </el-drawer>

    <el-dialog v-model="historyVisible" title="格式化本地历史" width="920px" :close-on-click-modal="false">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="本地历史默认关闭；开启后，只有点击“保存历史”才会把内容写入当前浏览器 localStorage。"
      />
      <div class="history-toolbar">
        <el-switch
          :model-value="historyEnabled"
          active-text="开启本地历史"
          @change="handleHistoryToggle"
        />
        <div>
          <el-button @click="saveCurrentHistory">保存当前结果</el-button>
          <el-button @click="exportHistory">导出历史 JSON</el-button>
          <el-button @click="triggerHistoryImport">导入历史 JSON</el-button>
          <el-button type="danger" plain @click="clearHistory">清空历史</el-button>
        </div>
      </div>
      <el-table :data="historyRecords" max-height="420" empty-text="暂无本地历史">
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column label="语言" width="120">
          <template #default="{ row }">{{ getHistoryLanguageLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="summary" label="摘要" min-width="220" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="restoreHistory(row)">恢复</el-button>
            <el-button link type="danger" @click="removeHistory(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowDown,
  Clock,
  Close,
  CopyDocument,
  Delete,
  DocumentCopy,
  Download,
  MagicStick,
  RefreshRight,
  Setting,
  Switch,
  Upload
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import FormatterWorker from '@/workers/formatter.worker?worker'
import type {
  FormatterConversionResult,
  FormatterConversionTarget,
  FormatterExportKind,
  FormatterFileInfo,
  FormatterHistoryRecord,
  FormatterIssue,
  FormatterLanguage,
  FormatterResult
} from '@/types/formatter'
import {
  FORMATTER_DIFF_PAYLOAD_KEY,
  FORMATTER_TEXT_FILE_EXTENSIONS,
  LANGUAGE_LABELS,
  createDefaultFormatterSettings
} from '@/utils/formatter/config'
import {
  calculateFormatterMetrics,
  formatBytes,
  isHugeFormatterInput,
  shouldUseManualFormat
} from '@/utils/formatter/metrics'
import { readFormatterTextFile } from '@/utils/formatter/files'
import {
  buildFormatterExport,
  downloadTextFile,
  getFormatterSourceExtension,
  safeTimestamp
} from '@/utils/formatter/exporters'
import {
  clearFormatterHistoryRecords,
  deleteFormatterHistoryRecord,
  exportFormatterHistoryRecords,
  importFormatterHistoryRecords,
  isFormatterHistoryEnabled,
  listFormatterHistoryRecords,
  saveFormatterHistoryRecord,
  setFormatterHistoryEnabled
} from '@/utils/formatter/history'
import { convertFormatterText } from '@/utils/formatter/converters'

type FormatterStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled'
type ResultTab = 'formatted' | 'conversion' | 'issues'

const router = useRouter()
const inputText = ref('')
const fileInfo = ref<FormatterFileInfo | null>(null)
const result = ref<FormatterResult | null>(null)
const conversionResult = ref<FormatterConversionResult | null>(null)
const status = ref<FormatterStatus>('idle')
const errorMessage = ref('')
const activeResultTab = ref<ResultTab>('formatted')
const settings = reactive(createDefaultFormatterSettings())
const conversionTarget = ref<FormatterConversionTarget>('properties')
const settingsVisible = ref(false)
const historyVisible = ref(false)
const historyEnabled = ref(isFormatterHistoryEnabled())
const historyRecords = ref<FormatterHistoryRecord[]>(listFormatterHistoryRecords())
const dragging = ref(false)
const fileInputRef = ref<HTMLInputElement>()
const historyImportInputRef = ref<HTMLInputElement>()

let worker: Worker | null = null
let requestId = 0
let autoTimer: number | undefined

const languageOptions = Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({
  value: value as FormatterLanguage,
  label
}))
const fileAccept = Array.from(FORMATTER_TEXT_FILE_EXTENSIONS).join(',')

const hasInput = computed(() => Boolean(inputText.value.trim()))
const inputMetrics = computed(() => calculateFormatterMetrics(inputText.value))
const outputMetrics = computed(() => calculateFormatterMetrics(result.value?.output || ''))
const manualFormatRequired = computed(() => hasInput.value && shouldUseManualFormat(inputText.value))
const hugeInputWarning = computed(() => hasInput.value && isHugeFormatterInput(inputText.value))
const issueRows = computed<FormatterIssue[]>(() => {
  const issues = result.value?.issues || []
  const warningRows: FormatterIssue[] = (result.value?.warnings || []).map((warning) => ({
    level: 'warning',
    message: warning
  }))
  return [...issues, ...warningRows]
})
const errorCount = computed(() => issueRows.value.filter((issue) => issue.level === 'error').length)
const warningCount = computed(() => issueRows.value.filter((issue) => issue.level === 'warning').length)
const detectedLanguageLabel = computed(() => result.value ? LANGUAGE_LABELS[result.value.language] : LANGUAGE_LABELS[settings.language])
const resultSummary = computed(() => {
  if (!result.value) {
    return '结果会在本地浏览器生成。'
  }
  return `${LANGUAGE_LABELS[result.value.language]} · ${result.value.outputMetrics.characters} 字符 · ${result.value.outputMetrics.lines} 行`
})
const activeOutput = computed(() => {
  if (activeResultTab.value === 'conversion') {
    return conversionResult.value?.output || ''
  }
  return result.value?.output || ''
})
const canConvert = computed(() => {
  return Boolean(result.value)
    && ['json', 'properties', 'yaml'].includes(result.value!.language)
    && result.value!.language !== conversionTarget.value
    && !errorCount.value
})
const expandableJsonStringCount = computed(() => {
  if (result.value?.language !== 'json' || result.value.mode === 'validate') {
    return 0
  }
  const info = result.value.jsonStringInfo
  return info ? Math.max(0, info.detectedCount - info.expandedCount) : 0
})
const settingsSignature = computed(() => JSON.stringify(settings))

watch([inputText, settingsSignature], () => {
  conversionResult.value = null
  if (!hasInput.value) {
    result.value = null
    status.value = 'idle'
    errorMessage.value = ''
    return
  }

  result.value = null
  activeResultTab.value = 'formatted'

  if (manualFormatRequired.value) {
    status.value = 'idle'
    return
  }

  scheduleAutoFormat()
})

const terminateWorker = () => {
  if (worker) {
    worker.terminate()
    worker = null
  }
}

const scheduleAutoFormat = () => {
  window.clearTimeout(autoTimer)
  autoTimer = window.setTimeout(() => {
    runFormat('auto')
  }, 450)
}

const runFormat = (source: 'auto' | 'manual') => {
  if (!hasInput.value) {
    ElMessage.warning('请先输入或选择文本文件')
    return
  }

  if (source === 'auto' && manualFormatRequired.value) {
    return
  }

  window.clearTimeout(autoTimer)
  terminateWorker()
  status.value = 'running'
  errorMessage.value = ''
  conversionResult.value = null

  const currentRequestId = requestId + 1
  requestId = currentRequestId
  worker = new FormatterWorker()

  worker.onmessage = (event) => {
    if (event.data.id !== currentRequestId) {
      return
    }

    terminateWorker()

    if (event.data.ok) {
      result.value = event.data.result
      const firstError = result.value?.issues.find((issue) => issue.level === 'error')
      if (firstError) {
        status.value = 'error'
        errorMessage.value = firstError.line
          ? `${firstError.message}（第 ${firstError.line} 行${firstError.column ? `:${firstError.column}` : ''}）`
          : firstError.message
        activeResultTab.value = 'issues'
        return
      }
      status.value = 'done'
      activeResultTab.value = 'formatted'
      return
    }

    status.value = 'error'
    errorMessage.value = event.data.error
    activeResultTab.value = 'issues'
  }

  worker.onerror = (event) => {
    terminateWorker()
    status.value = 'error'
    errorMessage.value = event.message || 'Worker 执行失败'
    activeResultTab.value = 'issues'
  }

  worker.postMessage({
    id: currentRequestId,
    input: inputText.value,
    fileName: fileInfo.value?.name,
    settings: { ...settings }
  })
}

const cancelFormat = () => {
  window.clearTimeout(autoTimer)
  terminateWorker()
  status.value = 'cancelled'
  ElMessage.info('已取消本次格式化')
}

const expandJsonStrings = async () => {
  settings.jsonStringHandling = 'recursive'
  await nextTick()
  runFormat('manual')
}

const triggerFilePick = () => {
  fileInputRef.value?.click()
}

const setFileError = (file: File, message: string) => {
  fileInfo.value = {
    name: file.name,
    size: file.size,
    lines: 0,
    encoding: '-',
    status: 'error',
    message
  }
}

const readFile = async (file: File) => {
  try {
    const fileResult = await readFormatterTextFile(file)
    inputText.value = fileResult.text
    fileInfo.value = fileResult.info
    ElMessage.success(`${file.name} 读取完成`)
  } catch (error: any) {
    setFileError(file, error?.message || '文件读取失败')
    ElMessage.error(error?.message || '文件读取失败')
  }
}

const handleDrop = (event: DragEvent) => {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    readFile(file)
  }
}

const handleFileInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) {
    readFile(file)
  }
}

const clearInput = () => {
  inputText.value = ''
  fileInfo.value = null
}

const clearAll = () => {
  window.clearTimeout(autoTimer)
  terminateWorker()
  inputText.value = ''
  fileInfo.value = null
  result.value = null
  conversionResult.value = null
  status.value = 'idle'
  errorMessage.value = ''
  activeResultTab.value = 'formatted'
}

const replaceInputWithOutput = () => {
  if (!result.value?.output) {
    ElMessage.warning('暂无可替换的结果')
    return
  }
  inputText.value = result.value.output
  fileInfo.value = null
  ElMessage.success('已将结果放回输入区')
}

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

const copyActiveOutput = async () => {
  if (!activeOutput.value) {
    return
  }
  await copyText(activeOutput.value)
  ElMessage.success('结果已复制')
}

const handleExportCommand = (command: string | number | object) => {
  if (!result.value) {
    return
  }

  const action = String(command) as FormatterExportKind | 'conversion'
  const filenameBase = `formatter-${safeTimestamp()}`

  if (action === 'conversion') {
    if (!conversionResult.value) {
      ElMessage.warning('暂无转换结果')
      return
    }
    downloadTextFile(
      `${filenameBase}.${conversionResult.value.targetLanguage}`,
      conversionResult.value.output,
      'text/plain'
    )
    return
  }

  const payload = buildFormatterExport(result.value, action, inputText.value)
  downloadTextFile(`${filenameBase}.${payload.extension}`, payload.content, payload.mimeType)
}

const convertCurrentResult = () => {
  if (!result.value || !canConvert.value) {
    ElMessage.warning('当前结果不支持该转换')
    return
  }

  try {
    conversionResult.value = convertFormatterText(
      result.value.output,
      result.value.language,
      conversionTarget.value,
      { ...settings }
    )
    activeResultTab.value = 'conversion'
    if (conversionResult.value.warnings.length) {
      ElMessage.warning(conversionResult.value.warnings[0])
    } else {
      ElMessage.success('转换完成')
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '转换失败')
  }
}

const sendToDiff = () => {
  if (!result.value) {
    return
  }

  sessionStorage.setItem(FORMATTER_DIFF_PAYLOAD_KEY, JSON.stringify({
    oldText: inputText.value,
    newText: result.value.output,
    oldFileName: fileInfo.value?.name || 'formatter-input.txt',
    newFileName: `formatted.${getFormatterSourceExtension(result.value)}`
  }))
  router.push('/tools/text-diff')
}

const refreshHistoryRecords = () => {
  historyRecords.value = listFormatterHistoryRecords()
}

const handleHistoryToggle = async (value: string | number | boolean) => {
  const enabled = Boolean(value)

  if (enabled && !historyEnabled.value) {
    try {
      await ElMessageBox.confirm(
        '开启后，只有你手动保存的格式化内容会保存在当前浏览器 localStorage。不会上传到服务器。',
        '开启本地历史',
        {
          confirmButtonText: '开启',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      setFormatterHistoryEnabled(true)
      historyEnabled.value = true
      ElMessage.success('本地历史已开启')
    } catch {
      historyEnabled.value = false
    }
    return
  }

  if (!enabled) {
    setFormatterHistoryEnabled(false)
    historyEnabled.value = false
    ElMessage.info('本地历史已关闭，已有记录不会自动删除')
  }
}

const createHistoryId = () => {
  return crypto.randomUUID?.() || `formatter-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const saveCurrentHistory = async () => {
  if (!historyEnabled.value) {
    ElMessage.warning('本地历史默认关闭，请先开启后再手动保存')
    return
  }

  if (!result.value) {
    ElMessage.warning('暂无可保存的结果')
    return
  }

  try {
    const promptResult: any = await ElMessageBox.prompt(
      '请输入这条格式化记录的名称',
      '保存到本地历史',
      {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputValue: `格式化 ${LANGUAGE_LABELS[result.value.language]} ${new Date().toLocaleString()}`
      }
    )

    const record: FormatterHistoryRecord = {
      id: createHistoryId(),
      name: promptResult.value || '未命名格式化',
      createdAt: new Date().toISOString(),
      input: inputText.value,
      output: result.value.output,
      fileName: fileInfo.value?.name,
      language: result.value.language,
      settings: { ...settings },
      summary: `${result.value.inputMetrics.characters} -> ${result.value.outputMetrics.characters} 字符`
    }

    saveFormatterHistoryRecord(record)
    refreshHistoryRecords()
    ElMessage.success('已保存到浏览器本地历史')
  } catch {
    // 用户取消保存
  }
}

const openHistoryDialog = () => {
  refreshHistoryRecords()
  historyVisible.value = true
}

const restoreHistory = (record: FormatterHistoryRecord) => {
  inputText.value = record.input
  result.value = {
    language: record.language,
    mode: record.settings.mode,
    output: record.output,
    inputMetrics: calculateFormatterMetrics(record.input),
    outputMetrics: calculateFormatterMetrics(record.output),
    issues: [],
    warnings: [],
    durationMs: 0,
    formattedAt: record.createdAt
  }
  Object.assign(settings, createDefaultFormatterSettings(), record.settings)
  fileInfo.value = record.fileName
    ? {
      name: record.fileName,
      size: calculateFormatterMetrics(record.input).bytes,
      lines: calculateFormatterMetrics(record.input).lines,
      encoding: 'localStorage',
      status: 'ready',
      message: '从本地历史恢复'
    }
    : null
  conversionResult.value = null
  status.value = 'done'
  activeResultTab.value = 'formatted'
  historyVisible.value = false
  ElMessage.success('已恢复历史记录')
}

const removeHistory = (id: string) => {
  deleteFormatterHistoryRecord(id)
  refreshHistoryRecords()
  ElMessage.success('已删除历史记录')
}

const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确认清空当前浏览器中的所有格式化历史？', '清空本地历史', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
    clearFormatterHistoryRecords()
    refreshHistoryRecords()
    ElMessage.success('本地历史已清空')
  } catch {
    // 用户取消
  }
}

const exportHistory = () => {
  downloadTextFile(`formatter-history-${safeTimestamp()}.json`, exportFormatterHistoryRecords(), 'application/json')
}

const triggerHistoryImport = () => {
  historyImportInputRef.value?.click()
}

const handleHistoryImportInput = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }

  try {
    const count = importFormatterHistoryRecords(await file.text())
    refreshHistoryRecords()
    ElMessage.success(`已导入 ${count} 条历史记录`)
  } catch (error: any) {
    ElMessage.error(error?.message || '历史导入失败')
  }
}

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const getHistoryLanguageLabel = (record: FormatterHistoryRecord) => LANGUAGE_LABELS[record.language]

onBeforeUnmount(() => {
  window.clearTimeout(autoTimer)
  terminateWorker()
})
</script>

<style scoped>
.formatter-page {
  min-height: 100vh;
  background: #f3f6fb;
  color: #172033;
  display: flex;
  flex-direction: column;
}

.formatter-topbar {
  min-height: 64px;
  padding: 12px 18px;
  border-bottom: 1px solid #d9e2ef;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.topbar-title,
.topbar-actions,
.panel-actions,
.convert-row,
.history-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.topbar-title h1 {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
  font-weight: 700;
}

.privacy-copy,
.panel-head p,
.metric-list small {
  color: #667085;
  font-size: 12px;
}

.formatter-workbench {
  flex: 1;
  min-height: 0;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-strip,
.editor-panel,
.info-panel {
  background: #ffffff;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
}

.control-strip {
  padding: 12px;
}

.control-form {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(230px, 1.3fr) 120px 120px minmax(150px, 1fr) minmax(250px, 1.5fr);
  gap: 12px;
}

.control-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.convert-row {
  width: 100%;
}

.drawer-field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-field small {
  color: #667085;
  line-height: 1.45;
}

.json-string-alert-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.convert-row .el-select {
  flex: 1;
  min-width: 128px;
}

.editor-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 280px;
  gap: 12px;
}

.editor-panel {
  min-width: 0;
  min-height: 560px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-panel.dragging {
  outline: 2px dashed #409eff;
  outline-offset: -4px;
}

.panel-head {
  min-height: 62px;
  padding: 10px 12px;
  border-bottom: 1px solid #d9e2ef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-head h2 {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 700;
}

.panel-head p {
  margin: 4px 0 0;
}

.file-error {
  padding: 8px 10px;
  color: #f56c6c;
  font-size: 12px;
}

:deep(.code-editor) {
  flex: 1;
  min-height: 0;
}

:deep(.code-editor .el-textarea__inner) {
  height: 100%;
  min-height: 480px !important;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  resize: none;
  background: #f8fafc;
  color: #172033;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 13px;
  line-height: 1.55;
}

.result-panel {
  position: relative;
}

.result-alert {
  margin: 10px 12px 0;
}

.result-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.result-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 12px;
}

.result-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
}

.result-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.output-wrap {
  height: 100%;
  overflow: auto;
  background: #f8fafc;
}

.output-wrap pre {
  min-height: 100%;
  margin: 0;
  padding: 12px;
  color: #172033;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 13px;
  line-height: 1.55;
}

.empty-state,
.state-panel {
  min-height: 360px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: #667085;
}

.state-panel strong {
  color: #172033;
  font-weight: 700;
}

.state-panel .el-icon {
  font-size: 28px;
}

.state-panel.error .el-icon {
  color: #f56c6c;
}

.info-panel {
  min-width: 0;
  padding: 12px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-block {
  padding-bottom: 12px;
  border-bottom: 1px solid #e5ebf3;
}

.info-block:last-child {
  border-bottom: 0;
}

.info-block h3 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.stat-grid div,
.metric-list div {
  min-width: 0;
  padding: 10px;
  border: 1px solid #e5ebf3;
  border-radius: 8px;
  background: #f8fafc;
}

.stat-grid span,
.metric-list span {
  display: block;
  color: #667085;
  font-size: 12px;
}

.stat-grid strong,
.metric-list strong {
  display: block;
  margin-top: 4px;
  color: #172033;
  font-size: 18px;
  line-height: 1.2;
  word-break: break-word;
}

.metric-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.privacy-list {
  margin: 0;
  padding-left: 18px;
  color: #667085;
  font-size: 13px;
  line-height: 1.8;
}

.hidden-file-input {
  display: none;
}

.history-toolbar {
  justify-content: space-between;
  margin: 12px 0;
}

@media (max-width: 1180px) {
  .control-form {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .editor-layout {
    grid-template-columns: 1fr;
  }

  .info-panel {
    order: 3;
  }
}

@media (max-width: 720px) {
  .formatter-topbar,
  .panel-head,
  .history-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .formatter-workbench {
    padding: 10px;
  }

  .control-form {
    grid-template-columns: 1fr;
  }

  .topbar-actions,
  .panel-actions {
    width: 100%;
  }

  .topbar-actions .el-button,
  .panel-actions .el-button {
    flex: 1;
  }

  .editor-panel {
    min-height: 480px;
  }
}
</style>
