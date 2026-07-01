<template>
  <div class="document-page">
    <header class="document-topbar">
      <div class="topbar-title">
        <h1>文档转换工具</h1>
        <el-tag type="success" effect="light">本地处理 / 不上传</el-tag>
        <span class="privacy-copy">Word、Excel、PPT、PDF、文本和图片都在当前浏览器内处理。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button type="primary" :disabled="!canRun || status === 'running'" @click="runConversion">
          <el-icon><MagicStick /></el-icon>
          开始转换
        </el-button>
        <el-button v-if="status === 'running'" type="warning" @click="cancelConversion">
          取消
        </el-button>
        <el-button :disabled="!activeResult || !activeResult.text" @click="copyActiveResult">
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
              <el-dropdown-item command="active" :disabled="!activeResult">当前结果</el-dropdown-item>
              <el-dropdown-item command="zip" :disabled="!result">全部结果 ZIP</el-dropdown-item>
              <el-dropdown-item command="report" :disabled="!result">Markdown 报告</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button :disabled="!activeResult" @click="printActiveResult">
          <el-icon><Printer /></el-icon>
          打印
        </el-button>
        <el-button type="danger" plain @click="clearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </header>

    <main class="document-workbench">
      <aside class="file-panel">
        <div
          class="drop-zone"
          :class="{ dragging }"
          @dragenter.prevent="dragging = true"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="handleDrop"
          @click="triggerFilePick"
        >
          <el-icon><Upload /></el-icon>
          <strong>拖入或选择文档</strong>
          <span>支持 DOCX、XLSX、CSV、PPTX、PDF、TXT、MD、PNG、JPG、WebP。</span>
        </div>
        <input
          ref="fileInputRef"
          class="hidden-input"
          type="file"
          :accept="DOCUMENT_ACCEPT"
          multiple
          @change="handleFileInput"
        >

        <div class="file-list-head">
          <span>文件队列</span>
          <el-tag size="small" effect="plain">{{ fileRecords.length }} 个</el-tag>
        </div>
        <div v-if="fileRecords.length" class="file-list">
          <button
            v-for="entry in sourceEntries"
            :key="entry.record.id"
            class="file-item"
            :class="{ active: entry.record.id === activeFileId, error: entry.record.status === 'error' }"
            type="button"
            @click="activeFileId = entry.record.id"
          >
            <span class="file-kind">{{ getDocumentKindLabel(entry.record.kind) }}</span>
            <span class="file-copy">
              <strong>{{ entry.record.name }}</strong>
              <small>{{ formatBytes(entry.record.size) }} · {{ entry.record.message }}</small>
            </span>
            <el-button text type="danger" @click.stop="removeFile(entry.record.id)">移除</el-button>
          </button>
        </div>
        <el-empty v-else description="还没有导入文档" class="small-empty" />
      </aside>

      <section class="center-panel">
        <div class="panel-head">
          <div>
            <h2>转换设置</h2>
            <p>{{ settingsSummary }}</p>
          </div>
          <el-tag v-if="readyFileCount" effect="plain">{{ readyFileCount }} 个可处理</el-tag>
        </div>

        <el-alert
          v-if="largeFileWarning"
          class="result-alert"
          type="warning"
          :closable="false"
          show-icon
          title="队列包含较大文件，转换会手动触发并在 Web Worker 中执行。"
        />
        <el-alert
          v-if="errorMessage"
          class="result-alert"
          type="error"
          :closable="false"
          show-icon
          :title="errorMessage"
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

        <el-form label-position="top" class="settings-form">
          <el-form-item label="目标格式">
            <el-input
              v-if="!availableTargetOptions.length"
              model-value="导入文件后选择目标"
              disabled
            />
            <el-select
              v-else
              v-model="settings.target"
              class="target-select"
              :disabled="status === 'running'"
            >
              <el-option
                v-for="option in availableTargetOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              >
                <div class="target-option">
                  <strong>{{ option.label }}</strong>
                  <span>{{ option.description }}</span>
                </div>
              </el-option>
            </el-select>
            <p class="form-help">{{ activeTargetDescription }}</p>
          </el-form-item>

          <div class="option-grid">
            <el-form-item v-if="showsSheetOptions" label="Sheet 范围">
              <el-radio-group v-model="settings.selectedSheet">
                <el-radio-button label="">首个 Sheet</el-radio-button>
                <el-radio-button label="__all__">全部 Sheet</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="showsSheetOptions" label="Sheet 标题">
              <el-switch v-model="settings.includeSheetName" active-text="包含" />
            </el-form-item>
            <el-form-item v-if="settings.target === 'pdf-images'" label="图片缩放">
              <el-slider v-model="settings.pdfImageScale" :min="0.75" :max="3" :step="0.25" show-input />
            </el-form-item>
            <el-form-item v-if="settings.target === 'pdf'" label="PDF 字号">
              <el-slider v-model="settings.textPdfFontSize" :min="12" :max="28" :step="1" show-input />
            </el-form-item>
          </div>
        </el-form>

        <div class="capability-grid">
          <div>
            <span>Word</span>
            <strong>HTML / Markdown / 文本 / 近似 PDF / 资源包</strong>
          </div>
          <div>
            <span>Excel</span>
            <strong>CSV / JSON / HTML / XLSX / 近似 PDF</strong>
          </div>
          <div>
            <span>PDF</span>
            <strong>文本 / 拆分 / 合并 / 页面图片</strong>
          </div>
          <div>
            <span>PPT</span>
            <strong>文本大纲 / Markdown / HTML / JSON / 资源包</strong>
          </div>
        </div>
      </section>

      <section class="result-panel">
        <div class="panel-head">
          <div>
            <h2>结果</h2>
            <p>{{ resultSummary }}</p>
          </div>
          <div class="panel-actions">
            <el-button :disabled="!activeResult" @click="downloadActiveResult">
              <el-icon><Download /></el-icon>
              下载当前
            </el-button>
          </div>
        </div>

        <div v-if="status === 'running'" class="state-panel">
          <el-icon class="is-loading"><RefreshRight /></el-icon>
          <strong>正在本地转换...</strong>
          <span>文件内容不会上传，较大文档可能需要等待一会儿。</span>
        </div>
        <div v-else-if="status === 'error'" class="state-panel error">
          <el-icon><Close /></el-icon>
          <strong>处理失败</strong>
          <span>{{ errorMessage }}</span>
        </div>
        <el-empty v-else-if="!result" description="导入文件并点击开始转换" class="empty-state" />
        <div v-else class="result-layout">
          <div class="result-list">
            <button
              v-for="item in result.items"
              :key="item.id"
              class="result-item"
              :class="{ active: item.id === activeResultId }"
              type="button"
              @click="activeResultId = item.id"
            >
              <strong>{{ item.outputName }}</strong>
              <span>{{ item.summary }} · {{ formatBytes(item.size) }}</span>
            </button>
          </div>
          <article class="preview-panel">
            <div v-if="activeResult?.previewHtml" class="html-preview-wrap">
              <iframe :srcdoc="activeResult.previewHtml" sandbox="" />
            </div>
            <pre v-else-if="activeResult?.text" class="text-preview">{{ activeResult.text }}</pre>
            <div v-else-if="activeResult" class="binary-preview">
              <el-icon><DocumentCopy /></el-icon>
              <strong>{{ activeResult.outputName }}</strong>
              <span>{{ activeResult.mime }} · {{ formatBytes(activeResult.size) }}</span>
              <el-button type="primary" @click="downloadActiveResult">下载文件</el-button>
            </div>
            <el-empty v-else description="选择一个结果查看预览" />
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  Close,
  CopyDocument,
  Delete,
  DocumentCopy,
  Download,
  MagicStick,
  Printer,
  RefreshRight,
  Upload
} from '@element-plus/icons-vue'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import type {
  DocumentConversionResult,
  DocumentConversionResultItem,
  DocumentConversionSettings,
  DocumentWorkerRequest,
  DocumentWorkerResponse
} from '@/types/documentConverter'
import {
  createDefaultDocumentSettings,
  DOCUMENT_ACCEPT,
  formatBytes,
  getBatchTargets,
  getDocumentKindLabel,
  getTargetOption,
  getTargetOptions
} from '@/utils/document-converter/config'
import {
  createDocumentFileRecord,
  prepareDocumentWorkerFiles,
  shouldWarnLargeFiles
} from '@/utils/document-converter/files'
import {
  buildDocumentReportDownload,
  buildDocumentResultDownload,
  buildDocumentZipDownload,
  copyDocumentResultText,
  downloadBlob
} from '@/utils/document-converter/exporters'

interface SourceEntry {
  record: ReturnType<typeof createDocumentFileRecord>
  file: File
}

const fileInputRef = ref<HTMLInputElement>()
const sourceEntries = ref<SourceEntry[]>([])
const activeFileId = ref('')
const activeResultId = ref('')
const dragging = ref(false)
const status = ref<'idle' | 'running' | 'success' | 'error'>('idle')
const errorMessage = ref('')
const result = ref<DocumentConversionResult | null>(null)
const settings = reactive<DocumentConversionSettings>(createDefaultDocumentSettings())

let worker: Worker | null = null
let requestId = ''

const fileRecords = computed(() => sourceEntries.value.map((entry) => entry.record))
const readyEntries = computed(() => sourceEntries.value.filter((entry) => entry.record.status !== 'error'))
const readyFileCount = computed(() => readyEntries.value.length)
const largeFileWarning = computed(() => shouldWarnLargeFiles(fileRecords.value))
const activeFile = computed(() => sourceEntries.value.find((entry) => entry.record.id === activeFileId.value)?.record)
const availableTargets = computed(() => getBatchTargets(readyEntries.value.map((entry) => entry.record.kind)))
const availableTargetOptions = computed(() => getTargetOptions(availableTargets.value))
const canRun = computed(() => readyFileCount.value > 0 && availableTargets.value.includes(settings.target))
const activeTargetDescription = computed(() => {
  if (!availableTargetOptions.value.length) {
    return '当前队列没有可用转换目标。'
  }
  return getTargetOption(settings.target).description
})
const showsSheetOptions = computed(() => {
  return readyEntries.value.some((entry) => entry.record.kind === 'xlsx' || entry.record.kind === 'csv')
    && ['csv', 'json', 'html', 'pdf'].includes(settings.target)
})
const activeResult = computed<DocumentConversionResultItem | undefined>(() => {
  if (!result.value) {
    return undefined
  }
  return result.value.items.find((item) => item.id === activeResultId.value) || result.value.items[0]
})
const settingsSummary = computed(() => {
  if (!readyFileCount.value) {
    return '先导入文档，工具会根据文件类型推荐可用目标格式。'
  }
  const targetLabel = availableTargets.value.includes(settings.target)
    ? getTargetOption(settings.target).label
    : '无可用目标'
  const activeName = activeFile.value?.name || readyEntries.value[0]?.record.name || ''
  return `${activeName}${readyFileCount.value > 1 ? ` 等 ${readyFileCount.value} 个文件` : ''} · 输出 ${targetLabel}`
})
const resultSummary = computed(() => {
  if (!result.value) {
    return '结果会在本地生成，可预览、复制、下载或打包。'
  }
  return `${result.value.items.length} 个结果 · 耗时 ${result.value.durationMs}ms`
})

watch(availableTargets, (targets) => {
  if (targets.length && !targets.includes(settings.target)) {
    settings.target = targets[0]
  }
})

const triggerFilePick = () => {
  fileInputRef.value?.click()
}

const addFiles = (files: File[]) => {
  if (!files.length) {
    return
  }

  const existingKeys = new Set(sourceEntries.value.map((entry) => `${entry.record.name}-${entry.record.size}-${entry.record.lastModified}`))
  const nextEntries = files
    .filter((file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`))
    .map((file) => ({
      record: createDocumentFileRecord(file),
      file
    }))

  sourceEntries.value = [...sourceEntries.value, ...nextEntries]
  if (!activeFileId.value && sourceEntries.value[0]) {
    activeFileId.value = sourceEntries.value[0].record.id
  }
  result.value = null
  activeResultId.value = ''
  errorMessage.value = ''
  status.value = 'idle'
}

const handleFileInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  addFiles(Array.from(input.files || []))
  input.value = ''
}

const handleDrop = (event: DragEvent) => {
  dragging.value = false
  addFiles(Array.from(event.dataTransfer?.files || []))
}

const removeFile = (id: string) => {
  sourceEntries.value = sourceEntries.value.filter((entry) => entry.record.id !== id)
  if (activeFileId.value === id) {
    activeFileId.value = sourceEntries.value[0]?.record.id || ''
  }
  result.value = null
  activeResultId.value = ''
}

const createWorker = () => {
  worker?.terminate()
  worker = new Worker(new URL('../../workers/documentConverter.worker.ts', import.meta.url), {
    type: 'module'
  })

  worker.onmessage = (event: MessageEvent<DocumentWorkerResponse>) => {
    const response = event.data
    if (response.id !== requestId) {
      return
    }

    if (!response.ok || !response.result) {
      status.value = 'error'
      errorMessage.value = response.error || '文档处理失败'
      return
    }

    result.value = response.result
    activeResultId.value = response.result.items[0]?.id || ''
    status.value = 'success'
    errorMessage.value = ''
    ElMessage.success('转换完成')
  }

  worker.onerror = (event) => {
    status.value = 'error'
    errorMessage.value = event.message || '文档处理失败'
  }
}

const runConversion = async () => {
  if (!canRun.value) {
    ElMessage.warning('当前文件队列没有可用转换目标')
    return
  }

  status.value = 'running'
  errorMessage.value = ''
  result.value = null
  activeResultId.value = ''
  requestId = `document-${Date.now()}-${Math.random().toString(36).slice(2)}`

  try {
    const files = await prepareDocumentWorkerFiles(readyEntries.value)
    createWorker()
    const request: DocumentWorkerRequest = {
      id: requestId,
      files,
      settings: { ...settings }
    }
    worker?.postMessage(request, files.map((file) => file.data))
  } catch (error: any) {
    status.value = 'error'
    errorMessage.value = error?.message || '读取文件失败'
  }
}

const cancelConversion = () => {
  const wasRunning = status.value === 'running'
  worker?.terminate()
  worker = null
  status.value = 'idle'
  errorMessage.value = ''
  if (wasRunning) {
    ElMessage.info('已取消转换')
  }
}

const downloadActiveResult = () => {
  if (!activeResult.value) {
    return
  }
  downloadBlob(buildDocumentResultDownload(activeResult.value))
}

const copyActiveResult = async () => {
  if (!activeResult.value) {
    return
  }

  try {
    await copyDocumentResultText(activeResult.value)
    ElMessage.success('已复制')
  } catch (error: any) {
    ElMessage.error(error?.message || '复制失败')
  }
}

const handleExportCommand = (command: string | number | object) => {
  if (!result.value) {
    return
  }

  if (command === 'active') {
    downloadActiveResult()
    return
  }
  if (command === 'zip') {
    downloadBlob(buildDocumentZipDownload(result.value))
    return
  }
  if (command === 'report') {
    downloadBlob(buildDocumentReportDownload(result.value))
  }
}

const printActiveResult = () => {
  if (!activeResult.value) {
    return
  }

  const html = activeResult.value.previewHtml || [
    '<!doctype html><html><head><meta charset="utf-8"><title>',
    escapeHtml(activeResult.value.outputName),
    '</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px;line-height:1.7;}pre{white-space:pre-wrap;word-break:break-word;}</style></head><body><pre>',
    escapeHtml(activeResult.value.text || activeResult.value.summary),
    '</pre></body></html>'
  ].join('')
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) {
    ElMessage.error('浏览器阻止了打印窗口')
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

const clearAll = () => {
  cancelConversion()
  sourceEntries.value = []
  activeFileId.value = ''
  activeResultId.value = ''
  result.value = null
  errorMessage.value = ''
  status.value = 'idle'
}

onBeforeUnmount(() => {
  worker?.terminate()
})

const escapeHtml = (value: string) => {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return map[char] || char
  })
}
</script>

<style scoped>
.document-page {
  min-height: 100vh;
  background: #f5f7fa;
  color: #1f2937;
}

.document-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 72px;
  padding: 14px 22px;
  background: #ffffff;
  border-bottom: 1px solid #dfe5ee;
}

.topbar-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.topbar-title h1 {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
  white-space: nowrap;
}

.privacy-copy {
  color: #667085;
  font-size: 13px;
}

.topbar-actions,
.panel-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.document-workbench {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(320px, 420px) minmax(420px, 1fr);
  gap: 16px;
  height: calc(100vh - 72px);
  min-height: 620px;
  padding: 16px;
}

.file-panel,
.center-panel,
.result-panel {
  min-width: 0;
  min-height: 0;
  background: #ffffff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
}

.file-panel {
  display: flex;
  flex-direction: column;
  padding: 14px;
}

.drop-zone {
  display: flex;
  min-height: 148px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 18px;
  border: 1px dashed #9aa8ba;
  border-radius: 8px;
  background: #f9fbfe;
  color: #475467;
  text-align: center;
  cursor: pointer;
  transition: border-color .2s, background .2s;
}

.drop-zone :deep(.el-icon) {
  font-size: 30px;
  color: #316f52;
}

.drop-zone strong {
  color: #1f2937;
  font-size: 16px;
}

.drop-zone span {
  font-size: 13px;
  line-height: 1.5;
}

.drop-zone.dragging {
  border-color: #316f52;
  background: #eef8f2;
}

.hidden-input {
  display: none;
}

.file-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 10px;
  color: #344054;
  font-weight: 700;
}

.file-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  padding-right: 2px;
}

.file-item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #ffffff;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.file-item.active {
  border-color: #316f52;
  background: #f1f8f4;
}

.file-item.error {
  border-color: #f1b4b4;
  background: #fff7f7;
}

.file-kind {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  border-radius: 6px;
  background: #eef2f7;
  color: #344054;
  font-size: 12px;
  font-weight: 700;
}

.file-copy {
  min-width: 0;
}

.file-copy strong,
.file-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-copy small {
  margin-top: 4px;
  color: #667085;
  font-size: 12px;
}

.small-empty {
  flex: 1;
}

.center-panel,
.result-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.panel-head h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
}

.panel-head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.result-alert {
  margin-bottom: 10px;
}

.settings-form {
  padding-bottom: 12px;
  border-bottom: 1px solid #e8edf4;
}

.target-select {
  width: 100%;
}

.target-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.target-option span,
.form-help {
  color: #667085;
  font-size: 12px;
}

.form-help {
  margin: 6px 0 0;
}

.option-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
}

.capability-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  overflow: auto;
  padding-top: 14px;
}

.capability-grid div {
  padding: 12px;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  background: #fbfcfe;
}

.capability-grid span,
.capability-grid strong {
  display: block;
}

.capability-grid span {
  color: #667085;
  font-size: 12px;
}

.capability-grid strong {
  margin-top: 4px;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.45;
}

.state-panel {
  display: flex;
  min-height: 260px;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #475467;
  text-align: center;
}

.state-panel :deep(.el-icon) {
  font-size: 30px;
  color: #316f52;
}

.state-panel.error :deep(.el-icon) {
  color: #d92d20;
}

.state-panel strong {
  color: #1f2937;
}

.empty-state {
  flex: 1;
}

.result-layout {
  display: grid;
  grid-template-columns: minmax(180px, 250px) minmax(0, 1fr);
  min-height: 0;
  flex: 1;
  gap: 12px;
}

.result-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.result-item {
  padding: 10px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #ffffff;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.result-item.active {
  border-color: #316f52;
  background: #f1f8f4;
}

.result-item strong,
.result-item span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-item span {
  margin-top: 5px;
  color: #667085;
  font-size: 12px;
}

.preview-panel {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  background: #fbfcfe;
}

.html-preview-wrap,
.html-preview-wrap iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.text-preview {
  height: 100%;
  margin: 0;
  overflow: auto;
  padding: 16px;
  white-space: pre-wrap;
  word-break: break-word;
  color: #111827;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
}

.binary-preview {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #667085;
  text-align: center;
}

.binary-preview :deep(.el-icon) {
  font-size: 38px;
  color: #316f52;
}

.binary-preview strong {
  max-width: 80%;
  overflow: hidden;
  color: #1f2937;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1180px) {
  .document-workbench {
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
    height: auto;
  }

  .result-panel {
    grid-column: 1 / -1;
    min-height: 560px;
  }
}

@media (max-width: 760px) {
  .document-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-title h1 {
    white-space: normal;
  }

  .topbar-actions {
    justify-content: flex-start;
  }

  .document-workbench {
    grid-template-columns: 1fr;
    padding: 10px;
  }

  .file-panel,
  .center-panel,
  .result-panel {
    min-height: 420px;
  }

  .result-layout {
    grid-template-columns: 1fr;
  }

  .result-list {
    max-height: 180px;
  }
}
</style>
