<template>
  <div class="encoding-page">
    <header class="encoding-topbar">
      <div class="topbar-title">
        <h1>编码转换工具</h1>
        <el-tag type="success" effect="light">本地处理 / 不上传</el-tag>
        <span class="privacy-copy">URL、Base64、Unicode、HTML、Hex、MD5 和 SHA 摘要。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button type="primary" :disabled="!hasInput || status === 'running'" @click="runConvert('manual')">
          <el-icon><MagicStick /></el-icon>
          开始转换
        </el-button>
        <el-button v-if="status === 'running'" type="warning" @click="cancelConvert">
          取消
        </el-button>
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
              <el-dropdown-item command="txt">结果 TXT</el-dropdown-item>
              <el-dropdown-item command="json">JSON 报告</el-dropdown-item>
              <el-dropdown-item command="markdown">Markdown 报告</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="danger" plain @click="clearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </header>

    <main class="encoding-workbench">
      <section class="control-strip" aria-label="编码转换设置">
        <el-tabs v-model="settings.category" class="category-tabs">
          <el-tab-pane
            v-for="category in categoryOptions"
            :key="category.value"
            :label="category.label"
            :name="category.value"
          />
        </el-tabs>

        <el-form label-position="top" class="control-form">
          <el-form-item label="转换">
            <el-select v-model="settings.operation" filterable>
              <el-option
                v-for="operation in currentOperations"
                :key="operation.value"
                :label="operation.label"
                :value="operation.value"
              >
                <div class="operation-option">
                  <strong>{{ operation.label }}</strong>
                  <span>{{ operation.description }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item v-if="settings.category === 'url'" label="空格">
            <el-radio-group v-model="settings.urlSpaceMode">
              <el-radio-button value="percent">%20</el-radio-button>
              <el-radio-button value="plus">+</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="settings.operation === 'url-decode-layers'" label="最大层数">
            <el-input-number
              v-model="settings.urlDecodeLayers"
              :min="1"
              :max="8"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item v-if="settings.category === 'bytes'" label="分隔符">
            <el-select v-model="settings.bytesSeparator">
              <el-option label="空格" value=" " />
              <el-option label="冒号" value=":" />
              <el-option label="逗号" value="," />
              <el-option label="无" value="" />
            </el-select>
          </el-form-item>

          <el-form-item v-if="settings.category === 'bytes'" label="Hex">
            <el-switch v-model="settings.uppercaseHex" active-text="大写" />
          </el-form-item>

          <el-form-item v-if="settings.category === 'hash'" label="算法">
            <el-select v-model="settings.hashAlgorithm">
              <el-option
                v-for="algorithm in hashAlgorithms"
                :key="algorithm.value"
                :label="algorithm.label"
                :value="algorithm.value"
              />
            </el-select>
          </el-form-item>
        </el-form>

        <p class="operation-description">{{ operationDescription }}</p>
      </section>

      <section v-if="detectionHints.length" class="recommend-strip" aria-label="自动识别推荐">
        <div class="recommend-title">
          <el-icon><InfoFilled /></el-icon>
          <span>识别推荐</span>
        </div>
        <button
          v-for="hint in detectionHints"
          :key="hint.id"
          class="recommend-button"
          type="button"
          @click="applyHint(hint)"
        >
          <strong>{{ hint.title }}</strong>
          <span>{{ hint.description }}</span>
          <el-tag size="small" :type="confidenceTagType(hint.confidence)" effect="plain">
            {{ confidenceLabel(hint.confidence) }}
          </el-tag>
        </button>
      </section>

      <section class="editor-layout">
        <article
          class="editor-panel"
          :class="{ dragging }"
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
              <p v-else>{{ inputMetrics.characters }} 字符 · {{ formatBytes(inputMetrics.bytes) }} · {{ inputMetrics.lines }} 行</p>
            </div>
            <div class="panel-actions">
              <el-button @click="triggerFilePick">
                <el-icon><Upload /></el-icon>
                文件
              </el-button>
              <el-button :disabled="!result" @click="replaceInputWithOutput">
                <el-icon><Switch /></el-icon>
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
            placeholder="粘贴需要编码、解码、转义、计算摘要或查看字节的文本"
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
                复制结果
              </el-button>
              <el-button :disabled="!result" @click="replaceInputWithOutput">
                <el-icon><RefreshRight /></el-icon>
                继续转换
              </el-button>
            </div>
          </div>

          <el-alert
            v-if="manualConvertRequired && hasInput && !result"
            class="result-alert"
            type="warning"
            :closable="false"
            show-icon
            title="当前输入较大，已停止自动转换，请点击“开始转换”。"
          />
          <el-alert
            v-if="hugeInputWarning"
            class="result-alert"
            type="warning"
            :closable="false"
            show-icon
            title="文本规模很大，会通过 Web Worker 处理，可随时取消。"
          />
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
            <el-tab-pane label="输出" name="output">
              <div v-if="status === 'running'" class="state-panel">
                <el-icon class="is-loading"><RefreshRight /></el-icon>
                <strong>正在本地转换...</strong>
                <span>大文本和摘要计算在 Web Worker 中执行。</span>
              </div>
              <el-empty v-else-if="!hasInput" description="输入内容后开始处理" class="empty-state" />
              <div v-else-if="status === 'error'" class="state-panel error">
                <el-icon><Close /></el-icon>
                <strong>转换失败</strong>
                <span>{{ errorMessage }}</span>
              </div>
              <div v-else-if="result" class="output-wrap">
                <pre>{{ result.output }}</pre>
              </div>
              <el-empty v-else description="等待转换" class="empty-state" />
            </el-tab-pane>

            <el-tab-pane label="详情" name="details" :disabled="!result">
              <div v-if="result" class="detail-list">
                <div class="metric-grid">
                  <div>
                    <span>输入字符</span>
                    <strong>{{ result.inputMetrics.characters }}</strong>
                  </div>
                  <div>
                    <span>输入字节</span>
                    <strong>{{ formatBytes(result.inputMetrics.bytes) }}</strong>
                  </div>
                  <div>
                    <span>输出字符</span>
                    <strong>{{ result.outputMetrics.characters }}</strong>
                  </div>
                  <div>
                    <span>耗时</span>
                    <strong>{{ result.durationMs }}ms</strong>
                  </div>
                </div>
                <el-table v-if="result.details.length" :data="result.details" size="small">
                  <el-table-column prop="label" label="项目" width="120" />
                  <el-table-column prop="value" label="值" show-overflow-tooltip />
                </el-table>
                <el-empty v-else description="当前转换没有额外详情" class="empty-state compact" />
              </div>
            </el-tab-pane>

            <el-tab-pane label="问题" name="issues" :disabled="!issueRows.length">
              <el-table v-if="issueRows.length" :data="issueRows" size="small">
                <el-table-column prop="level" label="级别" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.level === 'error' ? 'danger' : row.level === 'warning' ? 'warning' : 'info'" size="small">
                      {{ row.level }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="message" label="说明" />
              </el-table>
              <el-empty v-else description="没有问题" class="empty-state compact" />
            </el-tab-pane>
          </el-tabs>
        </article>
      </section>
    </main>

    <input
      ref="fileInputRef"
      class="hidden-input"
      type="file"
      :accept="fileAccept"
      @change="handleFilePick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  ArrowDown,
  Close,
  CopyDocument,
  Delete,
  Download,
  InfoFilled,
  MagicStick,
  RefreshRight,
  Switch,
  Upload
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import EncodingConverterWorker from '@/workers/encodingConverter.worker?worker'
import type {
  EncodingConverterIssue,
  EncodingConverterResult,
  EncodingDetectionHint,
  EncodingExportKind,
  EncodingFileInfo,
  HashAlgorithm
} from '@/types/encodingConverter'
import {
  CATEGORY_LABELS,
  ENCODING_TEXT_FILE_EXTENSIONS,
  HASH_ALGORITHM_LABELS,
  OPERATION_CATEGORY,
  OPERATION_GROUPS,
  createDefaultEncodingSettings
} from '@/utils/encodingConverter/config'
import {
  calculateEncodingMetrics,
  formatBytes,
  isHugeEncodingInput,
  shouldUseManualEncoding
} from '@/utils/encodingConverter/converters'
import { detectEncodingHints } from '@/utils/encodingConverter/detectors'
import { readEncodingTextFile } from '@/utils/encodingConverter/files'
import {
  buildEncodingExport,
  downloadTextFile,
  safeTimestamp
} from '@/utils/encodingConverter/exporters'

type EncodingStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled'
type ResultTab = 'output' | 'details' | 'issues'

const inputText = ref('')
const result = ref<EncodingConverterResult | null>(null)
const status = ref<EncodingStatus>('idle')
const errorMessage = ref('')
const activeResultTab = ref<ResultTab>('output')
const settings = reactive(createDefaultEncodingSettings())
const fileInfo = ref<EncodingFileInfo | null>(null)
const dragging = ref(false)
const fileInputRef = ref<HTMLInputElement>()

let worker: Worker | null = null
let requestId = 0
let autoTimer: number | undefined

const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label
}))

const hashAlgorithms = Object.entries(HASH_ALGORITHM_LABELS).map(([value, label]) => ({
  value: value as HashAlgorithm,
  label
}))

const fileAccept = Array.from(ENCODING_TEXT_FILE_EXTENSIONS).join(',')

const hasInput = computed(() => inputText.value.length > 0)
const inputMetrics = computed(() => calculateEncodingMetrics(inputText.value))
const detectionHints = computed(() => detectEncodingHints(inputText.value))
const currentOperations = computed(() => OPERATION_GROUPS[settings.category])
const operationDescription = computed(() => {
  return currentOperations.value.find((operation) => operation.value === settings.operation)?.description || ''
})
const settingsSignature = computed(() => JSON.stringify(settings))
const manualConvertRequired = computed(() => hasInput.value && shouldUseManualEncoding(inputText.value))
const hugeInputWarning = computed(() => hasInput.value && isHugeEncodingInput(inputText.value))
const activeOutput = computed(() => result.value?.output || '')
const issueRows = computed<EncodingConverterIssue[]>(() => {
  const warnings = (result.value?.warnings || []).map((warning) => ({
    level: 'warning' as const,
    message: warning
  }))
  return [...(result.value?.issues || []), ...warnings]
})
const resultSummary = computed(() => {
  if (status.value === 'running') {
    return '正在浏览器本地处理。'
  }
  if (!result.value) {
    return '结果会在本地浏览器生成。'
  }
  return `${result.value.operationLabel} · ${result.value.outputMetrics.characters} 字符 · ${formatBytes(result.value.outputMetrics.bytes)}`
})

watch(() => settings.category, (category) => {
  const operations = OPERATION_GROUPS[category]
  if (!operations.some((operation) => operation.value === settings.operation)) {
    settings.operation = operations[0].value
  }
})

watch(() => settings.operation, (operation) => {
  const category = OPERATION_CATEGORY[operation]
  if (category && category !== settings.category) {
    settings.category = category
  }
})

watch([inputText, settingsSignature], () => {
  window.clearTimeout(autoTimer)
  terminateWorker()
  result.value = null
  errorMessage.value = ''
  activeResultTab.value = 'output'

  if (!hasInput.value) {
    status.value = 'idle'
    return
  }

  if (manualConvertRequired.value) {
    status.value = 'idle'
    return
  }

  scheduleAutoConvert()
})

const terminateWorker = () => {
  if (worker) {
    worker.terminate()
    worker = null
  }
}

const scheduleAutoConvert = () => {
  autoTimer = window.setTimeout(() => {
    runConvert('auto')
  }, 400)
}

const runConvert = (source: 'auto' | 'manual') => {
  if (!hasInput.value) {
    ElMessage.warning('请先输入或选择文本文件')
    return
  }

  if (source === 'auto' && manualConvertRequired.value) {
    return
  }

  window.clearTimeout(autoTimer)
  terminateWorker()
  status.value = 'running'
  errorMessage.value = ''

  const currentRequestId = requestId + 1
  requestId = currentRequestId
  worker = new EncodingConverterWorker()

  worker.onmessage = (event) => {
    if (event.data.id !== currentRequestId) {
      return
    }

    terminateWorker()

    if (event.data.ok) {
      result.value = event.data.result
      status.value = 'done'
      activeResultTab.value = 'output'
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
    settings: { ...settings }
  })
}

const cancelConvert = () => {
  window.clearTimeout(autoTimer)
  terminateWorker()
  status.value = 'cancelled'
  ElMessage.info('已取消本次转换')
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
    const fileResult = await readEncodingTextFile(file)
    inputText.value = fileResult.text
    fileInfo.value = fileResult.info
    ElMessage.success(`${file.name} 读取完成`)
  } catch (error: any) {
    setFileError(file, error?.message || '文件读取失败')
    ElMessage.error(error?.message || '文件读取失败')
  }
}

const handleFilePick = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (file) {
    readFile(file)
  }
}

const handleDrop = (event: DragEvent) => {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
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
  errorMessage.value = ''
  status.value = 'idle'
  activeResultTab.value = 'output'
}

const replaceInputWithOutput = () => {
  if (!result.value) {
    return
  }
  inputText.value = result.value.output
  fileInfo.value = null
  ElMessage.success('已使用结果作为输入')
}

const copyActiveOutput = async () => {
  if (!activeOutput.value) {
    return
  }
  await navigator.clipboard.writeText(activeOutput.value)
  ElMessage.success('结果已复制')
}

const handleExportCommand = (command: string | number | object) => {
  if (!result.value || typeof command !== 'string') {
    return
  }
  const payload = buildEncodingExport(result.value, command as EncodingExportKind, inputText.value)
  downloadTextFile(
    payload.content,
    `encoding-converter-${safeTimestamp()}.${payload.extension}`,
    payload.mime
  )
}

const applyHint = (hint: EncodingDetectionHint) => {
  settings.category = hint.category
  settings.operation = hint.operation
  if (hint.id === 'url-plus-decode') {
    settings.urlSpaceMode = 'plus'
  }
  runConvert('manual')
}

const confidenceLabel = (confidence: EncodingDetectionHint['confidence']) => {
  const labels = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return labels[confidence]
}

const confidenceTagType = (confidence: EncodingDetectionHint['confidence']) => {
  if (confidence === 'high') {
    return 'success'
  }
  if (confidence === 'medium') {
    return 'warning'
  }
  return 'info'
}

onBeforeUnmount(() => {
  window.clearTimeout(autoTimer)
  terminateWorker()
})
</script>

<style scoped>
.encoding-page {
  min-height: 100vh;
  padding: 22px;
  background: #f6f8fb;
  color: #1f2937;
}

.encoding-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1440px;
  margin: 0 auto 16px;
}

.topbar-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
}

.topbar-title h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.25;
  font-weight: 700;
}

.privacy-copy {
  color: #5f6b7a;
  font-size: 13px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.encoding-workbench {
  max-width: 1440px;
  margin: 0 auto;
}

.control-strip {
  padding: 14px 16px 12px;
  background: #fff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
}

.category-tabs {
  margin-bottom: 8px;
}

.category-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}

.control-form {
  display: grid;
  grid-template-columns: minmax(260px, 1.3fr) repeat(4, minmax(120px, 0.7fr));
  gap: 12px;
  align-items: end;
}

.control-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.operation-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.operation-option span {
  color: #6b7280;
  font-size: 12px;
}

.operation-description {
  margin: 10px 0 0;
  color: #5f6b7a;
  font-size: 13px;
}

.recommend-strip {
  display: flex;
  align-items: stretch;
  gap: 10px;
  margin: 12px 0;
  padding: 12px;
  background: #f8fbff;
  border: 1px solid #d9e7f7;
  border-radius: 8px;
  overflow-x: auto;
}

.recommend-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  color: #2f5f8f;
  font-weight: 700;
  white-space: nowrap;
}

.recommend-button {
  display: grid;
  grid-template-columns: minmax(120px, auto) minmax(180px, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 360px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #c9ddf2;
  border-radius: 8px;
  color: #1f2937;
  text-align: left;
  cursor: pointer;
}

.recommend-button:hover {
  border-color: #79aee6;
  background: #f4f9ff;
}

.recommend-button span {
  color: #607086;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  margin-top: 14px;
}

.editor-panel {
  min-width: 0;
  background: #fff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  overflow: hidden;
}

.editor-panel.dragging {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgb(64 158 255 / 12%);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-height: 68px;
  padding: 14px 16px;
  border-bottom: 1px solid #edf1f7;
}

.panel-head h2 {
  margin: 0;
  font-size: 17px;
  line-height: 1.3;
}

.panel-head p {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.panel-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.code-editor {
  display: block;
}

.code-editor :deep(.el-textarea__inner) {
  min-height: 500px;
  padding: 14px 16px;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  line-height: 1.6;
}

.result-panel {
  display: flex;
  flex-direction: column;
}

.result-tabs {
  min-height: 0;
  flex: 1;
  padding: 0 16px 16px;
}

.result-alert {
  margin: 12px 16px 0;
}

.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 430px;
  color: #607086;
}

.state-panel .el-icon {
  font-size: 28px;
}

.state-panel.error {
  color: #c45656;
}

.output-wrap {
  min-height: 430px;
  max-height: 560px;
  overflow: auto;
  background: #0f172a;
  color: #e5eefb;
  border-radius: 8px;
}

.output-wrap pre {
  margin: 0;
  padding: 14px 16px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  line-height: 1.6;
}

.empty-state {
  min-height: 430px;
}

.empty-state.compact {
  min-height: 220px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric-grid div {
  min-width: 0;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e5ebf3;
  border-radius: 8px;
}

.metric-grid span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.metric-grid strong {
  display: block;
  margin-top: 4px;
  color: #111827;
  font-size: 17px;
  word-break: break-all;
}

.file-error {
  padding: 8px 14px;
  color: #c45656;
  background: #fff2f2;
  border-top: 1px solid #ffd6d6;
  font-size: 13px;
}

.hidden-input {
  display: none;
}

@media (max-width: 1100px) {
  .encoding-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-actions {
    justify-content: flex-start;
  }

  .control-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .encoding-page {
    padding: 12px;
  }

  .control-form,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .panel-head {
    flex-direction: column;
  }

  .panel-actions {
    justify-content: flex-start;
  }

  .recommend-button {
    grid-template-columns: 1fr;
    min-width: 260px;
  }
}
</style>
