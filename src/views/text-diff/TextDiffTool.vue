<template>
  <div
    class="text-diff-page"
    :class="[`theme-${settings.theme}`, { 'wrap-lines': settings.wrapLines }]"
  >
    <header class="diff-topbar">
      <div class="topbar-title">
        <h1>文本比对 / Diff 工具</h1>
        <el-tag type="success" effect="light">本地处理 / 不上传</el-tag>
        <span class="privacy-copy">所有比对均在本机浏览器完成，默认不保存历史。</span>
      </div>
      <div class="topbar-actions">
        <el-switch
          :model-value="settings.theme === 'dark'"
          inline-prompt
          :active-icon="Moon"
          :inactive-icon="Sunny"
          @change="toggleTheme"
        />
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
      </div>
    </header>

    <main class="diff-workbench">
      <section class="input-section" :class="{ collapsed: inputCollapsed }">
        <div class="section-head">
          <div>
            <h2>输入</h2>
            <p>可粘贴文本、拖拽文件或点击选择文件。</p>
          </div>
          <div class="section-actions">
            <el-dropdown trigger="click" @command="handleBothPreprocessCommand">
              <el-button>
                <el-icon><MagicStick /></el-icon>
                两侧预处理
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="item in preprocessItems"
                    :key="item.action"
                    :command="item.action"
                  >
                    {{ item.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button @click="swapSides">
              <el-icon><Switch /></el-icon>
              交换
            </el-button>
            <el-button type="primary" :disabled="!hasAnyInput || compareStatus === 'running'" @click="runDiff('manual')">
              开始比对
            </el-button>
            <el-button v-if="compareStatus === 'running'" type="warning" @click="cancelDiff">
              取消
            </el-button>
            <el-button type="danger" plain @click="clearAll">
              <el-icon><Delete /></el-icon>
              一键清空
            </el-button>
            <el-button text @click="inputCollapsed = !inputCollapsed">
              {{ inputCollapsed ? '展开输入' : '折叠输入' }}
            </el-button>
          </div>
        </div>

        <el-collapse-transition>
          <div
            v-show="!inputCollapsed"
            ref="inputSplitRef"
            class="editor-grid"
            :style="{ gridTemplateColumns: `${inputLeftRatio}% 8px ${100 - inputLeftRatio}%` }"
          >
            <article
              class="editor-panel"
              :class="{ dragging: draggingSide === 'old' }"
              @dragenter.prevent="draggingSide = 'old'"
              @dragover.prevent="draggingSide = 'old'"
              @dragleave.prevent="draggingSide = null"
              @drop.prevent="handleDrop($event, 'old')"
            >
              <div class="editor-head">
                <div>
                  <strong>原文本 / Old</strong>
                  <span v-if="oldFileInfo" class="file-meta">
                    {{ oldFileInfo.name }} · {{ formatBytes(oldFileInfo.size) }} · {{ oldFileInfo.lines }} 行 · {{ oldFileInfo.encoding }}
                  </span>
                </div>
                <div class="editor-actions">
                  <el-button text @click="triggerFilePick('old')">
                    <el-icon><Upload /></el-icon>
                    文件
                  </el-button>
                  <el-dropdown trigger="click" @command="handleOldPreprocessCommand">
                    <el-button text>
                      预处理
                      <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item
                          v-for="item in preprocessItems"
                          :key="item.action"
                          :command="item.action"
                        >
                          {{ item.label }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button text type="danger" @click="clearSide('old')">清空</el-button>
                </div>
              </div>
              <el-input
                v-model="oldText"
                class="text-editor"
                type="textarea"
                resize="vertical"
                placeholder="粘贴原文本，或拖拽 .txt / .json / .md / .log 等文本文件到此处"
              />
              <div v-if="oldFileInfo?.status === 'error'" class="file-error">{{ oldFileInfo.message }}</div>
            </article>

            <div class="split-resizer" title="拖拽调整输入区宽度" @mousedown="startInputResize" />

            <article
              class="editor-panel"
              :class="{ dragging: draggingSide === 'new' }"
              @dragenter.prevent="draggingSide = 'new'"
              @dragover.prevent="draggingSide = 'new'"
              @dragleave.prevent="draggingSide = null"
              @drop.prevent="handleDrop($event, 'new')"
            >
              <div class="editor-head">
                <div>
                  <strong>新文本 / New</strong>
                  <span v-if="newFileInfo" class="file-meta">
                    {{ newFileInfo.name }} · {{ formatBytes(newFileInfo.size) }} · {{ newFileInfo.lines }} 行 · {{ newFileInfo.encoding }}
                  </span>
                </div>
                <div class="editor-actions">
                  <el-button text @click="triggerFilePick('new')">
                    <el-icon><Upload /></el-icon>
                    文件
                  </el-button>
                  <el-dropdown trigger="click" @command="handleNewPreprocessCommand">
                    <el-button text>
                      预处理
                      <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item
                          v-for="item in preprocessItems"
                          :key="item.action"
                          :command="item.action"
                        >
                          {{ item.label }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button text type="danger" @click="clearSide('new')">清空</el-button>
                </div>
              </div>
              <el-input
                v-model="newText"
                class="text-editor"
                type="textarea"
                resize="vertical"
                placeholder="粘贴新文本，或拖拽文件到此处"
              />
              <div v-if="newFileInfo?.status === 'error'" class="file-error">{{ newFileInfo.message }}</div>
            </article>
          </div>
        </el-collapse-transition>
      </section>

      <section class="result-section">
        <div class="result-toolbar">
          <div class="result-controls">
            <el-radio-group v-model="settings.viewMode" size="small">
              <el-radio-button label="split">左右并排</el-radio-button>
              <el-radio-button label="unified">Unified</el-radio-button>
            </el-radio-group>
            <el-radio-group v-model="settings.granularity" size="small">
              <el-radio-button label="line">行级</el-radio-button>
              <el-radio-button label="word">词级</el-radio-button>
              <el-radio-button label="char">字符级</el-radio-button>
            </el-radio-group>
            <el-button-group>
              <el-button :disabled="!changeCount" @click="jumpToChange(-1)">
                <el-icon><ArrowUp /></el-icon>
                上一处
              </el-button>
              <el-button :disabled="!changeCount" @click="jumpToChange(1)">
                <el-icon><ArrowDown /></el-icon>
                下一处
              </el-button>
            </el-button-group>
            <el-switch v-model="settings.collapseUnchanged" active-text="折叠未变更" />
            <el-select v-model="settings.contextSize" size="small" class="context-select">
              <el-option label="上下文 3 行" :value="3" />
              <el-option label="上下文 5 行" :value="5" />
              <el-option label="上下文 10 行" :value="10" />
              <el-option label="上下文全部" value="all" />
            </el-select>
          </div>
          <div class="result-actions">
            <el-button :disabled="!result" @click="copyUnifiedDiff">
              <el-icon><CopyDocument /></el-icon>
              复制 diff
            </el-button>
            <el-dropdown trigger="click" :disabled="!result" @command="handleExportCommand">
              <el-button :disabled="!result">
                <el-icon><Download /></el-icon>
                导出
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="diff">下载 .diff</el-dropdown-item>
                  <el-dropdown-item command="patch">下载 .patch</el-dropdown-item>
                  <el-dropdown-item command="html">下载 HTML 报告</el-dropdown-item>
                  <el-dropdown-item command="markdown">下载 Markdown 报告</el-dropdown-item>
                  <el-dropdown-item command="text">下载纯文本报告</el-dropdown-item>
                  <el-dropdown-item command="print">打印友好视图</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button :disabled="!hasAnyInput" @click="saveCurrentHistory">
              手动保存历史
            </el-button>
          </div>
        </div>

        <div v-if="activeIgnoreLabels.length || result?.activeIgnoreRules.length" class="active-rule-bar">
          <span>当前忽略规则：</span>
          <el-tag
            v-for="rule in result?.activeIgnoreRules.length ? result.activeIgnoreRules : activeIgnoreLabels"
            :key="rule"
            size="small"
            effect="plain"
          >
            {{ rule }}
          </el-tag>
        </div>

        <el-alert
          v-if="manualDiffRequired && !result && hasAnyInput"
          class="result-alert"
          type="warning"
          :closable="false"
          show-icon
          title="当前文本较大，已停止自动比对，请点击“开始比对”。计算会在 Web Worker 中执行。"
        />
        <el-alert
          v-if="hugeTextWarning"
          class="result-alert"
          type="warning"
          :closable="false"
          show-icon
          title="文本规模很大，建议使用行级 diff、折叠未变更内容，并减少词级/字符级比对。"
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

        <div class="result-layout">
          <div class="diff-panel">
            <div v-if="compareStatus === 'running'" class="state-panel">
              <el-icon class="is-loading"><RefreshRight /></el-icon>
              <strong>正在本地计算 diff...</strong>
              <span>大文本会在 Web Worker 中处理，可随时取消。</span>
            </div>
            <el-empty
              v-else-if="!hasAnyInput"
              description="粘贴文本或拖拽文件开始比对"
              class="empty-state"
            />
            <div v-else-if="compareStatus === 'error'" class="state-panel error">
              <el-icon><Close /></el-icon>
              <strong>比对失败</strong>
              <span>{{ errorMessage }}</span>
            </div>
            <div v-else-if="result && !hasDiffChanges" class="state-panel success">
              <el-icon><DocumentCopy /></el-icon>
              <strong>没有差异</strong>
              <span>当前设置下两侧文本完全一致。</span>
            </div>
            <div v-else-if="result" class="diff-table-wrap">
              <div
                v-if="settings.viewMode === 'split'"
                class="split-diff-table"
                :style="{ '--result-left': `${resultLeftRatio}%` }"
              >
                <div class="split-header split-row">
                  <div class="split-side old-side">Old</div>
                  <div class="result-resizer" title="拖拽调整结果区宽度" @mousedown="startResultResize" />
                  <div class="split-side new-side">New</div>
                </div>
                <template v-for="row in visibleRows" :key="row.id">
                  <div
                    v-if="row.type === 'fold'"
                    :id="rowDomId(row)"
                    class="fold-row"
                  >
                    已折叠 {{ row.hiddenCount }} 行未变更内容
                  </div>
                  <div
                    v-else
                    :id="rowDomId(row)"
                    class="split-row diff-row"
                    :class="[`row-${row.type}`, { current: currentRowId === row.id }]"
                  >
                    <div class="split-side old-side">
                      <span v-if="settings.showLineNumbers" class="line-number">{{ row.oldLineNumber || '' }}</span>
                      <code class="line-code">
                        <span
                          v-for="(segment, index) in row.oldSegments"
                          :key="`old-${index}`"
                          class="inline-segment"
                          :class="`seg-${segment.type}`"
                        >{{ displaySegment(segment.text) }}</span>
                      </code>
                    </div>
                    <div class="result-resizer" @mousedown="startResultResize" />
                    <div class="split-side new-side">
                      <span v-if="settings.showLineNumbers" class="line-number">{{ row.newLineNumber || '' }}</span>
                      <code class="line-code">
                        <span
                          v-for="(segment, index) in row.newSegments"
                          :key="`new-${index}`"
                          class="inline-segment"
                          :class="`seg-${segment.type}`"
                        >{{ displaySegment(segment.text) }}</span>
                      </code>
                    </div>
                  </div>
                </template>
              </div>

              <div v-else class="unified-diff-table">
                <template v-for="row in visibleRows" :key="row.id">
                  <div v-if="row.type === 'fold'" :id="rowDomId(row)" class="fold-row">
                    已折叠 {{ row.hiddenCount }} 行未变更内容
                  </div>
                  <template v-else-if="row.type === 'modified'">
                    <div
                      :id="rowDomId(row)"
                      class="unified-line row-removed"
                      :class="{ current: currentRowId === row.id }"
                    >
                      <span class="line-prefix">-</span>
                      <span v-if="settings.showLineNumbers" class="line-number">{{ row.oldLineNumber }}</span>
                      <code class="line-code">
                        <span
                          v-for="(segment, index) in row.oldSegments"
                          :key="`modified-old-${index}`"
                          class="inline-segment"
                          :class="`seg-${segment.type}`"
                        >{{ displaySegment(segment.text) }}</span>
                      </code>
                    </div>
                    <div class="unified-line row-added">
                      <span class="line-prefix">+</span>
                      <span v-if="settings.showLineNumbers" class="line-number">{{ row.newLineNumber }}</span>
                      <code class="line-code">
                        <span
                          v-for="(segment, index) in row.newSegments"
                          :key="`modified-new-${index}`"
                          class="inline-segment"
                          :class="`seg-${segment.type}`"
                        >{{ displaySegment(segment.text) }}</span>
                      </code>
                    </div>
                  </template>
                  <div
                    v-else
                    :id="rowDomId(row)"
                    class="unified-line"
                    :class="[`row-${row.type}`, { current: currentRowId === row.id }]"
                  >
                    <span class="line-prefix">{{ unifiedPrefix(row.type) }}</span>
                    <span v-if="settings.showLineNumbers" class="line-number">
                      {{ row.type === 'added' ? row.newLineNumber : row.oldLineNumber }}
                    </span>
                    <code class="line-code">
                      <span
                        v-for="(segment, index) in unifiedSegments(row)"
                        :key="`unified-${index}`"
                        class="inline-segment"
                        :class="`seg-${segment.type}`"
                      >{{ displaySegment(segment.text) }}</span>
                    </code>
                  </div>
                </template>
              </div>

              <div v-if="hasMoreRows" class="load-more">
                <el-button @click="showMoreRows">
                  分块渲染中，继续显示 {{ Math.min(renderStepRows, displayRows.length - visibleRowLimit) }} 行
                </el-button>
              </div>
            </div>
          </div>

          <aside class="info-panel">
            <div class="info-block">
              <h3>变更统计</h3>
              <div class="stat-grid">
                <div>
                  <span>新增</span>
                  <strong>{{ result?.stats.added || 0 }}</strong>
                </div>
                <div>
                  <span>删除</span>
                  <strong>{{ result?.stats.deleted || 0 }}</strong>
                </div>
                <div>
                  <span>修改</span>
                  <strong>{{ result?.stats.modified || 0 }}</strong>
                </div>
                <div>
                  <span>未变更</span>
                  <strong>{{ result?.stats.unchanged || 0 }}</strong>
                </div>
                <div>
                  <span>变更块</span>
                  <strong>{{ result?.stats.blocks || 0 }}</strong>
                </div>
                <div>
                  <span>耗时</span>
                  <strong>{{ result ? `${result.stats.durationMs}ms` : '-' }}</strong>
                </div>
              </div>
            </div>

            <div class="info-block">
              <h3>文本规模</h3>
              <div class="metric-compare">
                <div>
                  <span>Old</span>
                  <strong>{{ oldMetrics.characters }}</strong>
                  <small>{{ oldMetrics.words }} 词 / {{ oldMetrics.lines }} 行 / {{ formatBytes(oldMetrics.bytes) }}</small>
                </div>
                <div>
                  <span>New</span>
                  <strong>{{ newMetrics.characters }}</strong>
                  <small>{{ newMetrics.words }} 词 / {{ newMetrics.lines }} 行 / {{ formatBytes(newMetrics.bytes) }}</small>
                </div>
              </div>
            </div>

            <div class="info-block">
              <h3>隐私状态</h3>
              <ul class="privacy-list">
                <li>不上传输入文本</li>
                <li>不调用在线 diff API</li>
                <li>默认不保存历史</li>
                <li>历史只写入当前浏览器 localStorage</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>

    <input
      ref="oldFileInputRef"
      class="hidden-file-input"
      type="file"
      :accept="fileAccept"
      @change="handleOldFileInput"
    />
    <input
      ref="newFileInputRef"
      class="hidden-file-input"
      type="file"
      :accept="fileAccept"
      @change="handleNewFileInput"
    />
    <input
      ref="historyImportInputRef"
      class="hidden-file-input"
      type="file"
      accept=".json,application/json"
      @change="handleHistoryImportInput"
    />

    <el-drawer v-model="settingsVisible" title="Diff 设置" size="420px">
      <el-form label-width="150px" label-position="left">
        <el-divider content-position="left">显示</el-divider>
        <el-form-item label="自动换行">
          <el-switch v-model="settings.wrapLines" />
        </el-form-item>
        <el-form-item label="显示行号">
          <el-switch v-model="settings.showLineNumbers" />
        </el-form-item>
        <el-form-item label="显示不可见字符">
          <el-switch v-model="settings.showInvisibleChars" />
        </el-form-item>
        <el-form-item label="折叠未变更内容">
          <el-switch v-model="settings.collapseUnchanged" />
        </el-form-item>
        <el-form-item label="上下文行数">
          <el-radio-group v-model="settings.contextSize">
            <el-radio-button :label="3">3</el-radio-button>
            <el-radio-button :label="5">5</el-radio-button>
            <el-radio-button :label="10">10</el-radio-button>
            <el-radio-button label="all">全部</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-divider content-position="left">忽略规则</el-divider>
        <el-form-item label="忽略大小写">
          <el-switch v-model="ignoreOptions.ignoreCase" />
        </el-form-item>
        <el-form-item label="忽略所有空白差异">
          <el-switch v-model="ignoreOptions.ignoreAllWhitespace" />
        </el-form-item>
        <el-form-item label="忽略行首行尾空格">
          <el-switch v-model="ignoreOptions.ignoreTrimWhitespace" />
        </el-form-item>
        <el-form-item label="忽略空行">
          <el-switch v-model="ignoreOptions.ignoreBlankLines" />
        </el-form-item>
        <el-form-item label="忽略 CRLF / LF">
          <el-switch v-model="ignoreOptions.ignoreLineEndings" />
        </el-form-item>
        <el-form-item label="忽略末尾换行">
          <el-switch v-model="ignoreOptions.ignoreTrailingNewline" />
        </el-form-item>
        <el-form-item label="忽略匹配正则的行">
          <el-input
            v-model="ignoreOptions.customIgnoreRegex"
            clearable
            placeholder="例如：timestamp|requestId|[0-9a-f-]{36}"
          />
        </el-form-item>
      </el-form>
    </el-drawer>

    <el-dialog v-model="historyVisible" title="本地历史" width="920px" :close-on-click-modal="false">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="本地历史默认关闭；开启后，只有点击“手动保存历史”才会把文本写入当前浏览器 localStorage。"
      />
      <div class="history-toolbar">
        <el-switch
          :model-value="historyEnabled"
          active-text="开启本地历史"
          @change="handleHistoryToggle"
        />
        <div>
          <el-button @click="saveCurrentHistory">保存当前比对</el-button>
          <el-button @click="exportHistory">导出历史 JSON</el-button>
          <el-button @click="triggerHistoryImport">导入历史 JSON</el-button>
          <el-button type="danger" plain @click="clearHistory">清空历史</el-button>
        </div>
      </div>
      <el-table :data="historyRecords" max-height="420" empty-text="暂无本地历史">
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="规模" min-width="220">
          <template #default="{ row }">
            Old {{ row.oldText.length }} 字符 / New {{ row.newText.length }} 字符
          </template>
        </el-table-column>
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Close,
  CopyDocument,
  Delete,
  DocumentCopy,
  Download,
  MagicStick,
  Moon,
  RefreshRight,
  Setting,
  Sunny,
  Switch,
  Upload
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import TextDiffWorker from '@/workers/textDiff.worker?worker'
import type {
  DiffResult,
  DiffRow,
  FileReadInfo,
  IgnoreOptions,
  InlineSegment,
  PreprocessAction,
  PreprocessTarget,
  TextDiffHistoryRecord
} from '@/types/textDiff'
import {
  DEFAULT_DIFF_SETTINGS,
  DEFAULT_IGNORE_OPTIONS,
  DIFF_LIMITS,
  TEXT_FILE_EXTENSIONS
} from '@/utils/textDiff/config'
import { FORMATTER_DIFF_PAYLOAD_KEY } from '@/utils/formatter/config'
import { applyPreprocessAction } from '@/utils/textDiff/preprocess'
import {
  buildDisplayRows,
  getChangedRowIndexes
} from '@/utils/textDiff/diffEngine'
import {
  buildHtmlReport,
  buildMarkdownReport,
  buildPlainTextReport,
  downloadTextFile
} from '@/utils/textDiff/exporters'
import {
  clearHistoryRecords,
  deleteHistoryRecord,
  exportHistoryRecords,
  importHistoryRecords,
  isHistoryEnabled,
  listHistoryRecords,
  saveHistoryRecord,
  setHistoryEnabled
} from '@/utils/textDiff/history'
import { readTextFile } from '@/utils/textDiff/files'
import {
  calculateTextMetrics,
  formatBytes,
  isHugeText,
  makeVisibleWhitespace,
  shouldUseManualDiff
} from '@/utils/textDiff/textMetrics'

type InputSide = 'old' | 'new'

interface FormatterDiffPayload {
  oldText: string
  newText: string
  oldFileName?: string
  newFileName?: string
}

const preprocessItems: Array<{ action: PreprocessAction; label: string }> = [
  { action: 'json-format', label: 'JSON 格式化' },
  { action: 'json-compact', label: 'JSON 压缩' },
  { action: 'json-sort-keys', label: 'JSON key 排序后比对' },
  { action: 'markup-format', label: 'XML / HTML 格式化' },
  { action: 'markdown-source', label: 'Markdown 源码比对' },
  { action: 'url-encode', label: 'URL encode' },
  { action: 'url-decode', label: 'URL decode' },
  { action: 'base64-decode', label: 'Base64 decode' },
  { action: 'trim', label: '去除首尾空白' },
  { action: 'tabs-to-spaces', label: 'Tab 转空格' },
  { action: 'normalize-newlines', label: '统一换行符' }
]

const oldText = ref('')
const newText = ref('')
const oldFileInfo = ref<FileReadInfo | null>(null)
const newFileInfo = ref<FileReadInfo | null>(null)
const result = ref<DiffResult | null>(null)
const settings = reactive({ ...DEFAULT_DIFF_SETTINGS })
const ignoreOptions = reactive<IgnoreOptions>({ ...DEFAULT_IGNORE_OPTIONS })
const compareStatus = ref<'idle' | 'running' | 'done' | 'error' | 'cancelled'>('idle')
const errorMessage = ref('')
const inputCollapsed = ref(false)
const settingsVisible = ref(false)
const historyVisible = ref(false)
const historyEnabled = ref(isHistoryEnabled())
const historyRecords = ref<TextDiffHistoryRecord[]>(listHistoryRecords())
const draggingSide = ref<InputSide | null>(null)
const inputLeftRatio = ref(50)
const resultLeftRatio = ref(50)
const visibleRowLimit = ref<number>(DIFF_LIMITS.initialRenderRows)
const currentChangePosition = ref(-1)
const currentRowId = ref('')

const oldFileInputRef = ref<HTMLInputElement>()
const newFileInputRef = ref<HTMLInputElement>()
const historyImportInputRef = ref<HTMLInputElement>()
const inputSplitRef = ref<HTMLElement>()

let worker: Worker | null = null
let requestId = 0
let autoTimer: number | undefined
let resizingTarget: 'input' | 'result' | null = null

const fileAccept = Array.from(TEXT_FILE_EXTENSIONS).join(',')
const renderStepRows = DIFF_LIMITS.renderStepRows

const hasAnyInput = computed(() => Boolean(oldText.value || newText.value))
const oldMetrics = computed(() => calculateTextMetrics(oldText.value))
const newMetrics = computed(() => calculateTextMetrics(newText.value))
const manualDiffRequired = computed(() => {
  return hasAnyInput.value && shouldUseManualDiff(oldText.value, newText.value, DIFF_LIMITS)
})
const hugeTextWarning = computed(() => {
  return hasAnyInput.value && isHugeText(oldText.value, newText.value, DIFF_LIMITS)
})
const displayRows = computed(() => result.value
  ? buildDisplayRows(result.value.rows, settings.collapseUnchanged, settings.contextSize)
  : []
)
const visibleRows = computed(() => displayRows.value.slice(0, visibleRowLimit.value))
const hasMoreRows = computed(() => displayRows.value.length > visibleRowLimit.value)
const changeRowIndexes = computed(() => getChangedRowIndexes(displayRows.value))
const changeCount = computed(() => changeRowIndexes.value.length)
const hasDiffChanges = computed(() => {
  if (!result.value) {
    return false
  }
  const stats = result.value.stats
  return stats.added + stats.deleted + stats.modified > 0
})
const activeIgnoreLabels = computed(() => {
  const labels: string[] = []
  if (ignoreOptions.ignoreCase) labels.push('忽略大小写')
  if (ignoreOptions.ignoreAllWhitespace) labels.push('忽略所有空白差异')
  if (ignoreOptions.ignoreTrimWhitespace) labels.push('忽略行首行尾空格')
  if (ignoreOptions.ignoreBlankLines) labels.push('忽略空行')
  if (ignoreOptions.ignoreLineEndings) labels.push('忽略 CRLF / LF 换行差异')
  if (ignoreOptions.ignoreTrailingNewline) labels.push('忽略末尾换行差异')
  if (ignoreOptions.customIgnoreRegex.trim()) labels.push(`正则：/${ignoreOptions.customIgnoreRegex}/`)
  return labels
})
const ignoreSignature = computed(() => JSON.stringify(ignoreOptions))

watch(displayRows, () => {
  visibleRowLimit.value = DIFF_LIMITS.initialRenderRows
  currentChangePosition.value = -1
  currentRowId.value = ''
})

watch(
  [oldText, newText, () => settings.granularity, ignoreSignature],
  () => {
    if (!hasAnyInput.value) {
      result.value = null
      compareStatus.value = 'idle'
      errorMessage.value = ''
      return
    }

    result.value = null
    currentRowId.value = ''

    if (manualDiffRequired.value) {
      compareStatus.value = 'idle'
      return
    }

    scheduleAutoDiff()
  }
)

const terminateWorker = () => {
  if (worker) {
    worker.terminate()
    worker = null
  }
}

const scheduleAutoDiff = () => {
  window.clearTimeout(autoTimer)
  autoTimer = window.setTimeout(() => {
    runDiff('auto')
  }, 500)
}

const runDiff = (source: 'auto' | 'manual') => {
  if (!hasAnyInput.value) {
    ElMessage.warning('请先输入或选择文本文件')
    return
  }

  if (source === 'auto' && manualDiffRequired.value) {
    return
  }

  window.clearTimeout(autoTimer)
  terminateWorker()
  compareStatus.value = 'running'
  errorMessage.value = ''

  const currentRequestId = requestId + 1
  requestId = currentRequestId
  worker = new TextDiffWorker()

  worker.onmessage = (event) => {
    if (event.data.id !== currentRequestId) {
      return
    }

    terminateWorker()

    if (event.data.ok) {
      result.value = event.data.result
      compareStatus.value = 'done'
      visibleRowLimit.value = DIFF_LIMITS.initialRenderRows
      return
    }

    compareStatus.value = 'error'
    errorMessage.value = event.data.error
  }

  worker.onerror = (event) => {
    terminateWorker()
    compareStatus.value = 'error'
    errorMessage.value = event.message || 'Worker 执行失败'
  }

  worker.postMessage({
    id: currentRequestId,
    oldText: oldText.value,
    newText: newText.value,
    options: {
      granularity: settings.granularity,
      ignoreOptions: { ...ignoreOptions },
      oldFileName: oldFileInfo.value?.name || 'old.txt',
      newFileName: newFileInfo.value?.name || 'new.txt'
    }
  })
}

const cancelDiff = () => {
  window.clearTimeout(autoTimer)
  terminateWorker()
  compareStatus.value = 'cancelled'
  ElMessage.info('已取消本次比对')
}

const triggerFilePick = (side: InputSide) => {
  if (side === 'old') {
    oldFileInputRef.value?.click()
    return
  }
  newFileInputRef.value?.click()
}

const setFileError = (side: InputSide, file: File, message: string) => {
  const info: FileReadInfo = {
    name: file.name,
    size: file.size,
    lines: 0,
    encoding: '-',
    status: 'error',
    message
  }

  if (side === 'old') {
    oldFileInfo.value = info
  } else {
    newFileInfo.value = info
  }
}

const readFileToSide = async (file: File, side: InputSide) => {
  try {
    const fileResult = await readTextFile(file)
    if (side === 'old') {
      oldText.value = fileResult.text
      oldFileInfo.value = fileResult.info
    } else {
      newText.value = fileResult.text
      newFileInfo.value = fileResult.info
    }
    ElMessage.success(`${file.name} 读取完成`)
  } catch (error: any) {
    setFileError(side, file, error?.message || '文件读取失败')
    ElMessage.error(error?.message || '文件读取失败')
  }
}

const handleDrop = (event: DragEvent, side: InputSide) => {
  draggingSide.value = null
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    readFileToSide(file, side)
  }
}

const handleOldFileInput = (event: Event) => {
  handleFileInput(event, 'old')
}

const handleNewFileInput = (event: Event) => {
  handleFileInput(event, 'new')
}

const handleFileInput = (event: Event, side: InputSide) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    readFileToSide(file, side)
  }
  input.value = ''
}

const clearSide = (side: InputSide) => {
  if (side === 'old') {
    oldText.value = ''
    oldFileInfo.value = null
    return
  }
  newText.value = ''
  newFileInfo.value = null
}

const clearAll = () => {
  window.clearTimeout(autoTimer)
  terminateWorker()
  oldText.value = ''
  newText.value = ''
  oldFileInfo.value = null
  newFileInfo.value = null
  result.value = null
  compareStatus.value = 'idle'
  errorMessage.value = ''
  currentChangePosition.value = -1
  currentRowId.value = ''
  visibleRowLimit.value = DIFF_LIMITS.initialRenderRows
}

const swapSides = () => {
  const oldValue = oldText.value
  const oldInfo = oldFileInfo.value
  oldText.value = newText.value
  oldFileInfo.value = newFileInfo.value
  newText.value = oldValue
  newFileInfo.value = oldInfo
}

const applyPreprocessToSide = (side: InputSide, action: PreprocessAction) => {
  const source = side === 'old' ? oldText.value : newText.value
  const processed = applyPreprocessAction(source, action)
  if (side === 'old') {
    oldText.value = processed.text
  } else {
    newText.value = processed.text
  }
  return processed.message
}

const handlePreprocessCommand = (command: string, target: PreprocessTarget) => {
  const action = command as PreprocessAction
  try {
    const messages: string[] = []
    if (target === 'old' || target === 'both') {
      messages.push(`Old：${applyPreprocessToSide('old', action)}`)
    }
    if (target === 'new' || target === 'both') {
      messages.push(`New：${applyPreprocessToSide('new', action)}`)
    }
    ElMessage.success(messages.join('；'))
  } catch (error: any) {
    ElMessage.error(error?.message || '预处理失败')
  }
}

const handleBothPreprocessCommand = (command: string | number | object) => {
  handlePreprocessCommand(String(command), 'both')
}

const handleOldPreprocessCommand = (command: string | number | object) => {
  handlePreprocessCommand(String(command), 'old')
}

const handleNewPreprocessCommand = (command: string | number | object) => {
  handlePreprocessCommand(String(command), 'new')
}

const displaySegment = (text: string) => {
  return settings.showInvisibleChars ? makeVisibleWhitespace(text) : text
}

const unifiedPrefix = (type: DiffRow['type']) => {
  if (type === 'added') return '+'
  if (type === 'removed') return '-'
  return ' '
}

const unifiedSegments = (row: DiffRow): InlineSegment[] => {
  if (row.type === 'added') {
    return row.newSegments
  }
  if (row.type === 'removed') {
    return row.oldSegments
  }
  return row.newSegments.length ? row.newSegments : row.oldSegments
}

const rowDomId = (row: DiffRow) => `text-diff-${row.id}`

const jumpToChange = async (direction: 1 | -1) => {
  if (!changeCount.value) {
    return
  }

  let nextPosition = currentChangePosition.value + direction
  if (nextPosition < 0) {
    nextPosition = changeCount.value - 1
  }
  if (nextPosition >= changeCount.value) {
    nextPosition = 0
  }

  currentChangePosition.value = nextPosition
  const rowIndex = changeRowIndexes.value[nextPosition]
  const row = displayRows.value[rowIndex]
  if (!row) {
    return
  }

  currentRowId.value = row.id
  if (rowIndex >= visibleRowLimit.value) {
    visibleRowLimit.value = Math.min(displayRows.value.length, rowIndex + 80)
  }

  await nextTick()
  document.getElementById(rowDomId(row))?.scrollIntoView({
    block: 'center',
    behavior: 'smooth'
  })
}

const showMoreRows = () => {
  visibleRowLimit.value = Math.min(displayRows.value.length, visibleRowLimit.value + DIFF_LIMITS.renderStepRows)
}

const copyToClipboard = async (text: string) => {
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

const copyUnifiedDiff = async () => {
  if (!result.value) {
    return
  }
  await copyToClipboard(result.value.unifiedDiff)
  ElMessage.success('Unified diff 已复制')
}

const safeTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-')

const handleExportCommand = (command: string | number | object) => {
  if (!result.value) {
    return
  }

  const action = String(command)
  const filenameBase = `text-diff-${safeTimestamp()}`

  if (action === 'diff' || action === 'patch') {
    downloadTextFile(`${filenameBase}.${action}`, result.value.unifiedDiff, 'text/x-diff')
    return
  }

  if (action === 'html') {
    downloadTextFile(`${filenameBase}.html`, buildHtmlReport(result.value, displayRows.value), 'text/html')
    return
  }

  if (action === 'markdown') {
    downloadTextFile(`${filenameBase}.md`, buildMarkdownReport(result.value), 'text/markdown')
    return
  }

  if (action === 'text') {
    downloadTextFile(`${filenameBase}.txt`, buildPlainTextReport(result.value), 'text/plain')
    return
  }

  if (action === 'print') {
    window.print()
  }
}

const refreshHistoryRecords = () => {
  historyRecords.value = listHistoryRecords()
}

const handleHistoryToggle = async (value: string | number | boolean) => {
  const enabled = Boolean(value)

  if (enabled && !historyEnabled.value) {
    try {
      await ElMessageBox.confirm(
        '开启后，只有你手动保存的比对内容会保存在当前浏览器 localStorage。不会上传到服务器。',
        '开启本地历史',
        {
          confirmButtonText: '开启',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      setHistoryEnabled(true)
      historyEnabled.value = true
      ElMessage.success('本地历史已开启')
    } catch {
      historyEnabled.value = false
    }
    return
  }

  if (!enabled) {
    setHistoryEnabled(false)
    historyEnabled.value = false
    ElMessage.info('本地历史已关闭，已有记录不会自动删除')
  }
}

const createHistoryId = () => {
  return crypto.randomUUID?.() || `history-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const saveCurrentHistory = async () => {
  if (!historyEnabled.value) {
    ElMessage.warning('本地历史默认关闭，请先开启后再手动保存')
    return
  }

  if (!hasAnyInput.value) {
    ElMessage.warning('没有可保存的文本')
    return
  }

  try {
    const promptResult: any = await ElMessageBox.prompt(
      '请输入这条比对记录的名称',
      '保存到本地历史',
      {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputValue: `文本比对 ${new Date().toLocaleString()}`
      }
    )

    const record: TextDiffHistoryRecord = {
      id: createHistoryId(),
      name: promptResult.value || '未命名比对',
      createdAt: new Date().toISOString(),
      oldText: oldText.value,
      newText: newText.value,
      oldFileName: oldFileInfo.value?.name,
      newFileName: newFileInfo.value?.name,
      settings: { ...settings },
      ignoreOptions: { ...ignoreOptions },
      stats: result.value?.stats
    }

    saveHistoryRecord(record)
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

const restoreHistory = (record: TextDiffHistoryRecord) => {
  oldText.value = record.oldText
  newText.value = record.newText
  Object.assign(settings, record.settings)
  Object.assign(ignoreOptions, record.ignoreOptions)
  oldFileInfo.value = record.oldFileName
    ? {
      name: record.oldFileName,
      size: calculateTextMetrics(record.oldText).bytes,
      lines: calculateTextMetrics(record.oldText).lines,
      encoding: 'localStorage',
      status: 'ready',
      message: '从本地历史恢复'
    }
    : null
  newFileInfo.value = record.newFileName
    ? {
      name: record.newFileName,
      size: calculateTextMetrics(record.newText).bytes,
      lines: calculateTextMetrics(record.newText).lines,
      encoding: 'localStorage',
      status: 'ready',
      message: '从本地历史恢复'
    }
    : null
  historyVisible.value = false
  ElMessage.success('已恢复历史记录')
}

const removeHistory = async (id: string) => {
  deleteHistoryRecord(id)
  refreshHistoryRecords()
  ElMessage.success('已删除历史记录')
}

const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确认清空当前浏览器中的所有文本比对历史？', '清空本地历史', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
    clearHistoryRecords()
    refreshHistoryRecords()
    ElMessage.success('本地历史已清空')
  } catch {
    // 用户取消
  }
}

const exportHistory = () => {
  downloadTextFile(`text-diff-history-${safeTimestamp()}.json`, exportHistoryRecords(), 'application/json')
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
    const count = importHistoryRecords(await file.text())
    refreshHistoryRecords()
    ElMessage.success(`已导入 ${count} 条历史记录`)
  } catch (error: any) {
    ElMessage.error(error?.message || '历史导入失败')
  }
}

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const toggleTheme = (value: string | number | boolean) => {
  settings.theme = value ? 'dark' : 'light'
}

const updateResizeRatio = (event: MouseEvent) => {
  if (!resizingTarget) {
    return
  }

  const element = resizingTarget === 'input'
    ? inputSplitRef.value
    : document.querySelector('.diff-table-wrap')

  if (!element) {
    return
  }

  const rect = element.getBoundingClientRect()
  const ratio = Math.min(75, Math.max(25, ((event.clientX - rect.left) / rect.width) * 100))

  if (resizingTarget === 'input') {
    inputLeftRatio.value = ratio
  } else {
    resultLeftRatio.value = ratio
  }
}

const stopResize = () => {
  resizingTarget = null
  window.removeEventListener('mousemove', updateResizeRatio)
  window.removeEventListener('mouseup', stopResize)
}

const startInputResize = () => {
  resizingTarget = 'input'
  window.addEventListener('mousemove', updateResizeRatio)
  window.addEventListener('mouseup', stopResize)
}

const startResultResize = () => {
  resizingTarget = 'result'
  window.addEventListener('mousemove', updateResizeRatio)
  window.addEventListener('mouseup', stopResize)
}

const restoreFormatterDiffPayload = () => {
  const raw = sessionStorage.getItem(FORMATTER_DIFF_PAYLOAD_KEY)
  if (!raw) {
    return
  }

  sessionStorage.removeItem(FORMATTER_DIFF_PAYLOAD_KEY)

  try {
    const payload = JSON.parse(raw) as FormatterDiffPayload
    if (typeof payload.oldText !== 'string' || typeof payload.newText !== 'string') {
      return
    }

    oldText.value = payload.oldText
    newText.value = payload.newText
    oldFileInfo.value = payload.oldFileName
      ? {
        name: payload.oldFileName,
        size: calculateTextMetrics(payload.oldText).bytes,
        lines: calculateTextMetrics(payload.oldText).lines,
        encoding: 'sessionStorage',
        status: 'ready',
        message: '从格式化工具导入'
      }
      : null
    newFileInfo.value = payload.newFileName
      ? {
        name: payload.newFileName,
        size: calculateTextMetrics(payload.newText).bytes,
        lines: calculateTextMetrics(payload.newText).lines,
        encoding: 'sessionStorage',
        status: 'ready',
        message: '从格式化工具导入'
      }
      : null
    ElMessage.success('已从格式化工具载入原文和结果')
  } catch {
    // 忽略损坏的临时载荷
  }
}

onMounted(() => {
  restoreFormatterDiffPayload()
})

onBeforeUnmount(() => {
  window.clearTimeout(autoTimer)
  terminateWorker()
  stopResize()
})
</script>

<style scoped>
.text-diff-page {
  --page-bg: #f3f6fb;
  --panel-bg: #ffffff;
  --panel-border: #d9e2ef;
  --text-main: #172033;
  --text-muted: #667085;
  --line-bg: #f8fafc;
  --line-number-bg: #eef2f7;
  --added-bg: #e8f8ee;
  --added-strong: #b9edc9;
  --removed-bg: #fdecec;
  --removed-strong: #fac8c8;
  --modified-bg: #fff7d6;
  --modified-strong: #f7df8a;
  --current-outline: #409eff;
  min-height: 100vh;
  background: var(--page-bg);
  color: var(--text-main);
  display: flex;
  flex-direction: column;
}

.text-diff-page.theme-dark {
  --page-bg: #111827;
  --panel-bg: #182235;
  --panel-border: #2d3a52;
  --text-main: #edf2f7;
  --text-muted: #aab4c4;
  --line-bg: #121a29;
  --line-number-bg: #202b40;
  --added-bg: #143322;
  --added-strong: #1f6b3d;
  --removed-bg: #3a1a1d;
  --removed-strong: #7b2e35;
  --modified-bg: #3a3217;
  --modified-strong: #7a651f;
  --current-outline: #79bbff;
}

.diff-topbar {
  min-height: 64px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--panel-border);
  background: var(--panel-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.topbar-title,
.topbar-actions,
.section-actions,
.result-controls,
.result-actions,
.editor-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.topbar-title h1 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.privacy-copy,
.section-head p,
.file-meta,
.info-block small {
  color: var(--text-muted);
  font-size: 12px;
}

.diff-workbench {
  flex: 1;
  min-height: 0;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-section,
.result-section {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
}

.input-section.collapsed {
  flex: 0 0 auto;
}

.section-head {
  padding: 12px;
  border-bottom: 1px solid var(--panel-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.section-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.editor-grid {
  display: grid;
  min-height: 260px;
  padding: 12px;
}

.split-resizer,
.result-resizer {
  cursor: col-resize;
  background: transparent;
  position: relative;
}

.split-resizer::after,
.result-resizer::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 3px;
  width: 2px;
  background: var(--panel-border);
}

.editor-panel {
  min-width: 0;
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  background: var(--line-bg);
  overflow: hidden;
}

.editor-panel.dragging {
  outline: 2px dashed #409eff;
  outline-offset: -4px;
}

.editor-head {
  min-height: 46px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--panel-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.editor-head strong {
  display: block;
  font-weight: 700;
}

.file-error {
  padding: 6px 10px;
  color: #f56c6c;
  font-size: 12px;
}

:deep(.text-editor .el-textarea__inner) {
  min-height: 210px !important;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  resize: vertical;
  background: var(--line-bg);
  color: var(--text-main);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 13px;
  line-height: 1.55;
}

.result-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.result-toolbar {
  padding: 10px 12px;
  border-bottom: 1px solid var(--panel-border);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.context-select {
  width: 132px;
}

.active-rule-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--panel-border);
  color: var(--text-muted);
  font-size: 12px;
}

.result-alert {
  margin: 10px 12px 0;
}

.result-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
}

.diff-panel {
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--panel-border);
}

.diff-table-wrap {
  height: 100%;
  overflow: auto;
  background: var(--line-bg);
}

.empty-state,
.state-panel {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.state-panel strong {
  color: var(--text-main);
  font-weight: 700;
}

.state-panel .el-icon {
  font-size: 28px;
}

.state-panel.error .el-icon {
  color: #f56c6c;
}

.state-panel.success .el-icon {
  color: #67c23a;
}

.split-diff-table,
.unified-diff-table {
  min-width: 720px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
}

.split-row {
  display: grid;
  grid-template-columns: var(--result-left) 8px minmax(0, 1fr);
}

.split-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--panel-bg);
  border-bottom: 1px solid var(--panel-border);
}

.split-header .split-side {
  padding: 8px 10px;
  font-weight: 700;
}

.diff-row {
  border-bottom: 1px solid var(--panel-border);
}

.split-side {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
}

.line-number {
  min-width: 52px;
  padding: 3px 8px;
  text-align: right;
  color: var(--text-muted);
  background: var(--line-number-bg);
  user-select: none;
}

.line-code {
  min-height: 24px;
  padding: 3px 8px;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-word;
}

.text-diff-page :deep(.el-switch__label) {
  color: var(--text-main);
}

.text-diff-page:not(.wrap-lines) .line-code {
  white-space: pre;
}

.row-added .new-side,
.unified-line.row-added {
  background: var(--added-bg);
}

.row-removed .old-side,
.unified-line.row-removed {
  background: var(--removed-bg);
}

.row-modified .old-side,
.row-modified .new-side {
  background: var(--modified-bg);
}

.seg-added {
  background: var(--added-strong);
}

.seg-removed {
  background: var(--removed-strong);
}

.row-modified .seg-added,
.row-modified .seg-removed {
  background: var(--modified-strong);
}

.current {
  outline: 2px solid var(--current-outline);
  outline-offset: -2px;
}

.fold-row {
  padding: 8px;
  text-align: center;
  color: var(--text-muted);
  background: var(--panel-bg);
  border-bottom: 1px solid var(--panel-border);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 12px;
}

.unified-line {
  display: grid;
  grid-template-columns: 32px auto minmax(0, 1fr);
  border-bottom: 1px solid var(--panel-border);
}

.line-prefix {
  padding: 3px 8px;
  color: var(--text-muted);
  text-align: center;
  background: var(--line-number-bg);
  user-select: none;
}

.load-more {
  padding: 12px;
  text-align: center;
}

.info-panel {
  min-width: 0;
  padding: 12px;
  overflow: auto;
  background: var(--panel-bg);
}

.info-block {
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--panel-border);
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
.metric-compare div {
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  padding: 8px;
  background: var(--line-bg);
}

.stat-grid span,
.metric-compare span {
  display: block;
  color: var(--text-muted);
  font-size: 12px;
}

.stat-grid strong,
.metric-compare strong {
  display: block;
  margin-top: 2px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
}

.metric-compare {
  display: grid;
  gap: 8px;
}

.privacy-list {
  margin: 0;
  padding-left: 18px;
  color: var(--text-muted);
  font-size: 12px;
}

.hidden-file-input {
  display: none;
}

.history-toolbar {
  margin: 12px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 1100px) {
  .result-layout {
    grid-template-columns: 1fr;
  }

  .diff-panel {
    border-right: 0;
    border-bottom: 1px solid var(--panel-border);
  }

  .info-panel {
    max-height: none;
  }
}

@media (max-width: 820px) {
  .diff-topbar,
  .section-head,
  .result-toolbar,
  .history-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .editor-grid {
    display: block;
  }

  .split-resizer {
    height: 8px;
    cursor: row-resize;
  }

  .split-resizer::after {
    top: 3px;
    left: 0;
    right: 0;
    bottom: auto;
    width: auto;
    height: 2px;
  }

  .editor-panel + .editor-panel {
    margin-top: 8px;
  }
}

@media print {
  .diff-topbar,
  .input-section,
  .result-toolbar,
  .active-rule-bar,
  .info-panel,
  .load-more {
    display: none !important;
  }

  .text-diff-page {
    min-height: auto;
    background: #fff;
  }

  .diff-workbench {
    padding: 0;
  }

  .result-section,
  .diff-panel {
    border: 0;
  }

  .result-layout {
    display: block;
  }

  .diff-table-wrap {
    height: auto;
    overflow: visible;
  }
}
</style>
