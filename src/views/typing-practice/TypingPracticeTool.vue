<template>
  <div class="typing-page">
    <header class="typing-topbar">
      <div class="topbar-title">
        <h1>打字练习</h1>
        <el-tag type="success" effect="light">随机生成 / 不上传</el-tag>
        <span class="privacy-copy">练习内容在浏览器本地生成，输入与成绩默认仅保留在当前页面。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button @click="openHistory">
          <el-icon><Clock /></el-icon>
          本地历史{{ historyRecords.length ? `(${historyRecords.length})` : '' }}
        </el-button>
        <el-button type="danger" plain @click="clearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </header>

    <main class="typing-workbench">
      <section class="config-strip" aria-label="练习配置">
        <el-form label-position="top" class="config-form">
          <el-form-item label="练习内容">
            <el-select v-model="contentKind" :disabled="isSessionActive" @change="createNewChallenge">
              <el-option
                v-for="item in contentKindOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item v-if="contentKind === 'code'" label="代码语言">
            <el-select v-model="codeLanguage" :disabled="isSessionActive" @change="createNewChallenge">
              <el-option
                v-for="item in codeLanguageOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="练习模式">
            <el-select v-model="practiceMode" :disabled="isSessionActive" @change="handleModeChange">
              <el-option
                v-for="item in practiceModeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item v-if="practiceMode === 'fixed'" label="目标长度">
            <div class="length-control">
              <el-select
                v-model="lengthPreset"
                :disabled="isSessionActive"
                aria-label="目标长度预设"
                @change="handleLengthPresetChange"
              >
                <el-option
                  v-for="length in targetLengthPresets"
                  :key="length"
                  :label="`${length.toLocaleString('zh-CN')} 字符`"
                  :value="length"
                />
                <el-option label="自定义" value="custom" />
              </el-select>
              <el-input-number
                v-if="lengthPreset === 'custom'"
                v-model="targetLength"
                :disabled="isSessionActive"
                :min="minTargetLength"
                :max="maxTargetLength"
                :step="10"
                controls-position="right"
                aria-label="自定义目标长度"
                @change="handleCustomLengthChange"
              />
            </div>
          </el-form-item>

          <el-form-item label="显示辅助">
            <el-switch v-model="showWhitespace" active-text="空格与换行" />
          </el-form-item>
        </el-form>

        <div class="config-actions">
          <el-button :disabled="isSessionActive" @click="createNewChallenge">
            <el-icon><RefreshRight /></el-icon>
            换一组
          </el-button>
          <el-button :disabled="!snapshot || isSessionActive" @click="restartCurrentChallenge">
            重新开始
          </el-button>
        </div>
      </section>

      <el-alert
        v-if="pageError"
        class="page-alert"
        type="error"
        :title="pageError"
        show-icon
        :closable="false"
      />

      <section class="practice-grid">
        <article class="practice-panel">
          <div class="panel-head">
            <div>
              <h2>{{ snapshot?.title || '准备随机练习' }}</h2>
              <p v-if="snapshot">
                {{ contentKindLabel }} · {{ practiceModeLabel }} · {{ challengeSizeLabel }}
                <el-tooltip :content="`随机种子：${snapshot.seed}`" placement="top">
                  <span class="seed-label">种子 {{ shortSeed }}</span>
                </el-tooltip>
              </p>
              <p v-else>选择配置后生成练习内容。</p>
            </div>
            <el-tag :type="statusTagType" effect="light">{{ statusLabel }}</el-tag>
          </div>

          <el-progress
            v-if="practiceMode === 'fixed'"
            :percentage="snapshot?.progress || 0"
            :stroke-width="8"
            :show-text="false"
          />
          <div v-else class="infinite-track">
            <span class="infinite-pulse" />
            内容会随输入持续生成，点击“结束挑战”后结算成绩
          </div>

          <div
            ref="typingSurfaceRef"
            class="typing-surface"
            :class="{
              'code-mode': contentKind === 'code',
              paused: snapshot?.status === 'paused',
              completed: snapshot?.status === 'completed'
            }"
            tabindex="0"
            role="textbox"
            aria-label="打字练习内容，点击后开始输入"
            @click="focusCapture"
            @keydown.enter.prevent="focusCapture"
            @keydown.space.prevent="focusCapture"
          >
            <el-empty v-if="!snapshot" description="正在准备随机练习" />
            <div v-else class="character-stream" aria-live="off">
              <template v-for="character in snapshot.characters" :key="character.index">
                <template v-if="character.expected === '\n'">
                  <span
                    class="typing-character line-break"
                    :class="character.status"
                    :data-current="character.status === 'current' ? 'true' : undefined"
                    :title="characterTitle(character)"
                  >{{ showWhitespace ? '↵' : '' }}</span><br />
                </template>
                <span
                  v-else
                  class="typing-character"
                  :class="character.status"
                  :data-current="character.status === 'current' ? 'true' : undefined"
                  :title="characterTitle(character)"
                >{{ displayCharacter(character.expected) }}</span>
              </template>
            </div>

            <div v-if="snapshot?.status === 'paused'" class="state-overlay">
              <strong>练习已暂停</strong>
              <span>暂停期间不计时，点击继续后恢复输入。</span>
              <el-button type="primary" @click.stop="resumePractice">继续练习</el-button>
            </div>

            <div v-else-if="snapshot?.status === 'completed'" class="state-overlay completed-overlay">
              <strong>本次练习已结束</strong>
              <span>成绩已生成，可在下方查看详情。</span>
              <el-button type="primary" @click.stop="restartCurrentChallenge">再练一次</el-button>
            </div>
          </div>

          <div class="capture-row" :class="{ focused: captureFocused }">
            <textarea
              ref="captureInputRef"
              v-model="captureValue"
              class="capture-input"
              rows="1"
              :disabled="!snapshot || snapshot.status === 'paused' || snapshot.status === 'completed'"
              :placeholder="capturePlaceholder"
              aria-label="打字输入捕获区"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              @focus="captureFocused = true"
              @blur="captureFocused = false"
              @input="handleCaptureInput"
              @keydown="handleCaptureKeydown"
              @compositionstart="isComposing = true"
              @compositionend="handleCompositionEnd"
            />
            <span class="capture-state">
              {{ isComposing ? '输入法组词中，文字上屏后再判定' : captureHint }}
            </span>
          </div>

          <div class="practice-actions">
            <el-button v-if="snapshot?.status === 'ready'" type="primary" @click="focusCapture">
              <el-icon><VideoPlay /></el-icon>
              准备输入
            </el-button>
            <el-button v-else-if="snapshot?.status === 'running'" @click="pausePractice">
              <el-icon><VideoPause /></el-icon>
              暂停
            </el-button>
            <el-button v-else-if="snapshot?.status === 'paused'" type="primary" @click="resumePractice">
              <el-icon><VideoPlay /></el-icon>
              继续
            </el-button>
            <el-button v-if="isSessionActive" type="danger" plain @click="finishPractice">
              {{ practiceMode === 'infinite' ? '结束挑战' : '结束练习' }}
            </el-button>
            <span>计时从第一个有效字符上屏后开始；切换到其他标签页会自动暂停。</span>
          </div>
        </article>

        <aside class="stats-panel" aria-label="实时成绩" aria-live="polite">
          <div class="stats-head">
            <div>
              <h2>实时成绩</h2>
              <p>有效练习时间</p>
            </div>
            <span class="timer-value">{{ formattedTimer }}</span>
          </div>

          <div class="primary-stats">
            <div><span>WPM</span><strong>{{ formatMetric(snapshot?.wpm) }}</strong><small>标准速度</small></div>
            <div><span>CPM</span><strong>{{ formatMetric(snapshot?.cpm) }}</strong><small>正确字符/分钟</small></div>
          </div>

          <dl class="detail-stats">
            <div><dt>准确率</dt><dd>{{ snapshot?.totalCommittedAttempts ? `${snapshot.accuracy}%` : '—' }}</dd></div>
            <div>
              <dt>{{ practiceMode === 'infinite' ? '累计输入' : '完成进度' }}</dt>
              <dd>{{ practiceMode === 'infinite' ? `${snapshot?.typedLength || 0} 字符` : `${snapshot?.progress || 0}%` }}</dd>
            </div>
            <div><dt>正确字符</dt><dd>{{ snapshot?.correctCharacters || 0 }}</dd></div>
            <div><dt>错误尝试</dt><dd>{{ snapshot?.mistakeAttempts || 0 }}</dd></div>
            <div><dt>连续正确</dt><dd>{{ snapshot?.longestCorrectStreak || 0 }}</dd></div>
            <div><dt>退格修正</dt><dd>{{ snapshot?.correctionCount || 0 }}</dd></div>
          </dl>

          <div class="shortcut-note">
            <strong>快捷操作</strong>
            <span><kbd>Esc</kbd> 暂停</span>
            <span><kbd>Backspace</kbd> 修正</span>
            <span><kbd>Enter</kbd> 输入换行</span>
          </div>
        </aside>
      </section>

      <section v-if="snapshot?.status === 'completed'" class="result-panel" aria-live="polite">
        <div class="result-head">
          <div>
            <span class="section-kicker">SESSION RESULT</span>
            <h2>练习成绩</h2>
            <p>{{ completionLabel }} · {{ snapshot.title }}</p>
          </div>
          <div class="result-actions">
            <el-button @click="copyResult"><el-icon><CopyDocument /></el-icon>复制摘要</el-button>
            <el-dropdown trigger="click" @command="exportResult">
              <el-button>
                <el-icon><Download /></el-icon>导出<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="json">JSON</el-dropdown-item>
                  <el-dropdown-item command="csv">CSV</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button :disabled="!historyEnabled || resultSaved" @click="saveCurrentResult">
              {{ resultSaved ? '已保存历史' : '保存到历史' }}
            </el-button>
          </div>
        </div>

        <el-alert v-if="!historyEnabled" type="info" :closable="false" show-icon>
          <template #title>历史默认关闭；需要保存成绩趋势时，可在“本地历史”中手动开启并保存。</template>
        </el-alert>

        <div class="result-kpis">
          <div><span>WPM</span><strong>{{ snapshot.wpm }}</strong></div>
          <div><span>CPM</span><strong>{{ snapshot.cpm }}</strong></div>
          <div><span>准确率</span><strong>{{ snapshot.accuracy }}%</strong></div>
          <div><span>有效时长</span><strong>{{ formatDuration(snapshot.elapsedMs) }}</strong></div>
          <div><span>累计输入</span><strong>{{ snapshot.typedLength }}</strong></div>
          <div><span>最长连续正确</span><strong>{{ snapshot.longestCorrectStreak }}</strong></div>
        </div>

        <div class="mistake-section">
          <div class="section-head compact">
            <div>
              <h3>易错字符</h3>
              <p>按本次错误尝试次数排序，修正后的错误仍会保留。</p>
            </div>
          </div>
          <el-empty v-if="!snapshot.mistakes.length" description="本次没有错误尝试" :image-size="72" />
          <el-table v-else :data="snapshot.mistakes.slice(0, 10)" size="small" stripe>
            <el-table-column label="应输入" width="140">
              <template #default="{ row }"><code>{{ visibleSymbol(row.expected) }}</code></template>
            </el-table-column>
            <el-table-column label="实际输入" width="140">
              <template #default="{ row }"><code>{{ visibleSymbol(row.actual) }}</code></template>
            </el-table-column>
            <el-table-column prop="count" label="次数" width="100" />
          </el-table>
        </div>
      </section>
    </main>

    <el-drawer v-model="historyVisible" title="打字练习本地历史" size="900px">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="历史默认关闭；开启后仍需在练习结果中手动保存。只保存成绩摘要和随机种子，不保存逐键输入。"
      />

      <div class="history-toolbar">
        <el-switch
          v-model="historyEnabled"
          aria-label="开启本地历史"
          active-text="开启本地历史"
          @change="handleHistoryToggle"
        />
        <div class="history-actions">
          <el-button :disabled="!historyRecords.length" @click="exportHistory">导出 JSON</el-button>
          <el-button @click="triggerHistoryImport">导入 JSON</el-button>
          <el-button type="danger" plain :disabled="!historyRecords.length" @click="clearHistory">清空全部</el-button>
        </div>
      </div>

      <div class="history-filters">
        <el-select v-model="historyKindFilter" aria-label="历史内容类型" placeholder="内容类型">
          <el-option label="全部类型" value="all" />
          <el-option
            v-for="item in contentKindOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-date-picker
          v-model="historyDateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          range-separator="至"
          unlink-panels
        />
      </div>

      <el-table :data="filteredHistoryRecords" max-height="520" empty-text="暂无本地历史" stripe>
        <el-table-column prop="title" label="练习" min-width="150" show-overflow-tooltip />
        <el-table-column label="模式" width="100">
          <template #default="{ row }">{{ modeLabel(row.mode) }}</template>
        </el-table-column>
        <el-table-column label="长度" width="90">
          <template #default="{ row }">{{ row.targetLength || '无限' }}</template>
        </el-table-column>
        <el-table-column prop="wpm" label="WPM" width="80" />
        <el-table-column prop="cpm" label="CPM" width="80" />
        <el-table-column label="准确率" width="90">
          <template #default="{ row }">{{ row.accuracy }}%</template>
        </el-table-column>
        <el-table-column label="时间" min-width="160">
          <template #default="{ row }">{{ formatDate(row.completedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button text type="danger" @click="deleteHistory(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>

    <input
      ref="historyFileInputRef"
      class="hidden-input"
      type="file"
      accept="application/json,.json"
      @change="handleHistoryImport"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ArrowDown,
  Clock,
  CopyDocument,
  Delete,
  Download,
  RefreshRight,
  VideoPause,
  VideoPlay
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import type {
  TypingCharacterView,
  TypingCodeLanguage,
  TypingContentKind,
  TypingEngine,
  TypingExportFormat,
  TypingHistoryRecord,
  TypingPracticeMode,
  TypingSessionCommand,
  TypingSessionSnapshot
} from '@/types/typingPractice'
import {
  CODE_LANGUAGE_OPTIONS,
  CONTENT_KIND_LABELS,
  CONTENT_KIND_OPTIONS,
  PRACTICE_MODE_LABELS,
  PRACTICE_MODE_OPTIONS,
  TARGET_LENGTH_PRESETS,
  TYPING_PRACTICE_LIMITS,
  validateTargetLength
} from '@/utils/typing-practice/config'
import {
  createTypingSeed,
  createTypingTextGenerator
} from '@/utils/typing-practice/generator'
import { createTypingEngine } from '@/utils/typing-practice/session'
import {
  clearTypingHistoryRecords,
  createTypingHistoryRecord,
  deleteTypingHistoryRecord,
  importTypingHistoryRecords,
  isTypingHistoryEnabled,
  listTypingHistoryRecords,
  parseTypingHistoryRecords,
  saveTypingHistoryRecord,
  serializeTypingHistoryRecords,
  setTypingHistoryEnabled
} from '@/utils/typing-practice/history'
import {
  downloadTextContent,
  downloadTypingResult,
  formatTypingResultText
} from '@/utils/typing-practice/exporters'

type HistoryKindFilter = TypingContentKind | 'all'
type LengthPreset = number | 'custom'

const contentKindOptions = CONTENT_KIND_OPTIONS
const codeLanguageOptions = CODE_LANGUAGE_OPTIONS
const practiceModeOptions = PRACTICE_MODE_OPTIONS
const targetLengthPresets = TARGET_LENGTH_PRESETS
const minTargetLength = TYPING_PRACTICE_LIMITS.minTargetLength
const maxTargetLength = TYPING_PRACTICE_LIMITS.maxTargetLength

const contentKind = ref<TypingContentKind>('chinese')
const codeLanguage = ref<TypingCodeLanguage>('typescript')
const practiceMode = ref<TypingPracticeMode>('fixed')
const targetLength = ref(100)
const lengthPreset = ref<LengthPreset>(100)
const activeSeed = ref('')
const showWhitespace = ref(false)
const pageError = ref('')

const engine = ref<TypingEngine>()
const snapshot = ref<TypingSessionSnapshot>()
const captureInputRef = ref<HTMLTextAreaElement>()
const typingSurfaceRef = ref<HTMLElement>()
const captureValue = ref('')
const captureFocused = ref(false)
const isComposing = ref(false)
const resultSaved = ref(false)

const historyVisible = ref(false)
const historyEnabled = ref(false)
const historyRecords = ref<TypingHistoryRecord[]>([])
const historyKindFilter = ref<HistoryKindFilter>('all')
const historyDateRange = ref<[string, string] | []>([])
const historyFileInputRef = ref<HTMLInputElement>()

let ticker: number | undefined

const isSessionActive = computed(() => (
  snapshot.value?.status === 'running' || snapshot.value?.status === 'paused'
))
const contentKindLabel = computed(() => CONTENT_KIND_LABELS[contentKind.value])
const practiceModeLabel = computed(() => PRACTICE_MODE_LABELS[practiceMode.value])
const challengeSizeLabel = computed(() => practiceMode.value === 'infinite'
  ? `已输入 ${snapshot.value?.typedLength || 0} 字符`
  : `目标 ${snapshot.value?.targetLength ?? targetLength.value} 字符`)
const shortSeed = computed(() => snapshot.value?.seed.slice(0, 8) ?? '—')

const statusLabel = computed(() => {
  switch (snapshot.value?.status) {
    case 'running': return practiceMode.value === 'infinite' ? '挑战中' : '练习中'
    case 'paused': return '已暂停'
    case 'completed': return '已完成'
    case 'ready': return '等待输入'
    default: return '准备中'
  }
})

const statusTagType = computed(() => {
  switch (snapshot.value?.status) {
    case 'running': return 'success'
    case 'paused': return 'warning'
    case 'completed': return 'primary'
    default: return 'info'
  }
})

const capturePlaceholder = computed(() => {
  if (!snapshot.value) return '正在准备随机练习'
  if (snapshot.value.status === 'ready') return '点击这里开始输入，第一个字符上屏后开始计时'
  if (snapshot.value.status === 'running') return '继续输入…'
  if (snapshot.value.status === 'paused') return '练习已暂停'
  return '本次练习已结束'
})

const captureHint = computed(() => {
  if (snapshot.value?.status === 'ready') return '支持中文输入法，拼音组词过程不会被判错'
  if (snapshot.value?.status === 'running' && practiceMode.value === 'infinite') return '内容会在接近末尾时自动生成'
  if (snapshot.value?.status === 'running') return '输入内容仅用于当前练习，不会上传'
  if (snapshot.value?.status === 'paused') return '继续练习后恢复输入'
  if (snapshot.value?.status === 'completed') return '可在下方查看本次成绩'
  return '准备随机练习后开始'
})

const formattedTimer = computed(() => formatDuration(snapshot.value?.elapsedMs ?? 0))
const completionLabel = computed(() => snapshot.value?.completionReason === 'length-complete'
  ? '目标长度完成'
  : '手动结束')

const filteredHistoryRecords = computed(() => historyRecords.value.filter((record) => {
  if (historyKindFilter.value !== 'all' && record.contentKind !== historyKindFilter.value) return false
  if (historyDateRange.value.length === 2) {
    const date = record.completedAt.slice(0, 10)
    return date >= historyDateRange.value[0] && date <= historyDateRange.value[1]
  }
  return true
}))

const formatMetric = (value?: number) => value === undefined || value === 0 ? '—' : value.toFixed(1)

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const formatDate = (value: string) => new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(value))

const modeLabel = (mode: TypingPracticeMode) => PRACTICE_MODE_LABELS[mode]
const displayCharacter = (value: string) => value === ' '
  ? showWhitespace.value ? '·' : '\u00a0'
  : value
const visibleSymbol = (value: string) => {
  if (value === ' ') return '空格'
  if (value === '\n') return '换行'
  return value
}
const characterTitle = (character: TypingCharacterView) => character.status === 'incorrect'
  ? `应输入“${visibleSymbol(character.expected)}”，实际输入“${visibleSymbol(character.typed || '')}”`
  : undefined

const createTitle = () => contentKind.value === 'code'
  ? `${CODE_LANGUAGE_OPTIONS.find((item) => item.value === codeLanguage.value)?.label ?? '代码'} · 随机练习`
  : `${CONTENT_KIND_LABELS[contentKind.value]} · 随机练习`

const scrollCurrentCharacterIntoView = () => {
  void nextTick(() => {
    const current = typingSurfaceRef.value?.querySelector<HTMLElement>('[data-current="true"]')
    current?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  })
}

const updateSnapshot = (next: TypingSessionSnapshot) => {
  const previousStatus = snapshot.value?.status
  const previousTypedLength = snapshot.value?.typedLength
  snapshot.value = next
  if (previousTypedLength !== next.typedLength) scrollCurrentCharacterIntoView()
  if (previousStatus !== 'completed' && next.status === 'completed') {
    resultSaved.value = false
    captureInputRef.value?.blur()
    ElMessage.success(next.completionReason === 'length-complete' ? '目标完成，成绩已生成' : '挑战结束，成绩已生成')
  }
}

const sendCommand = (command: TypingSessionCommand) => {
  if (engine.value) updateSnapshot(engine.value.send(command))
}

const createSession = (seed: string) => {
  pageError.value = ''
  try {
    if (practiceMode.value === 'fixed') validateTargetLength(targetLength.value)
    const generator = createTypingTextGenerator({
      contentKind: contentKind.value,
      codeLanguage: contentKind.value === 'code' ? codeLanguage.value : undefined,
      seed
    })
    engine.value = createTypingEngine({
      title: createTitle(),
      contentKind: contentKind.value,
      mode: practiceMode.value,
      seed,
      generator,
      targetLength: practiceMode.value === 'fixed' ? targetLength.value : undefined
    })
    activeSeed.value = seed
    captureValue.value = ''
    resultSaved.value = false
    updateSnapshot(engine.value.snapshot())
  } catch (error) {
    engine.value = undefined
    snapshot.value = undefined
    pageError.value = error instanceof Error ? error.message : '无法生成练习内容。'
  }
}

const createNewChallenge = () => createSession(createTypingSeed())
const restartCurrentChallenge = () => {
  if (!activeSeed.value) return
  createSession(activeSeed.value)
  void nextTick(focusCapture)
}
const handleModeChange = () => createNewChallenge()
const handleLengthPresetChange = (value: LengthPreset) => {
  if (typeof value === 'number') targetLength.value = value
  createNewChallenge()
}
const handleCustomLengthChange = (value?: number) => {
  if (value !== undefined) targetLength.value = value
  createNewChallenge()
}

const focusCapture = () => {
  if (!snapshot.value || snapshot.value.status === 'paused' || snapshot.value.status === 'completed') return
  captureInputRef.value?.focus()
}
const consumeCaptureValue = () => {
  if (!captureValue.value || isComposing.value) return
  const value = captureValue.value
  captureValue.value = ''
  sendCommand({ type: 'commit', text: value })
}
const handleCaptureInput = (event: Event) => {
  const inputEvent = event as InputEvent
  if (!inputEvent.isComposing && !isComposing.value) consumeCaptureValue()
}
const handleCompositionEnd = () => {
  isComposing.value = false
  void nextTick(consumeCaptureValue)
}
const handleCaptureKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    pausePractice()
  } else if (event.key === 'Backspace' && !isComposing.value && !captureValue.value) {
    event.preventDefault()
    sendCommand({ type: 'backspace' })
  }
}

const pausePractice = () => sendCommand({ type: 'pause' })
const resumePractice = () => {
  sendCommand({ type: 'resume' })
  void nextTick(focusCapture)
}
const finishPractice = async () => {
  const noun = practiceMode.value === 'infinite' ? '挑战' : '练习'
  try {
    await ElMessageBox.confirm(`结束后会立即生成当前成绩，确认结束本次${noun}？`, `结束${noun}`, {
      confirmButtonText: `结束${noun}`,
      cancelButtonText: `继续${noun}`,
      type: 'warning'
    })
    sendCommand({ type: 'finish' })
  } catch {
    // 用户继续练习
  }
}

const clearAll = async () => {
  if (isSessionActive.value) {
    try {
      await ElMessageBox.confirm('当前练习尚未结束，确认清空当前输入和结果？', '清空当前练习', {
        confirmButtonText: '确认清空', cancelButtonText: '取消', type: 'warning'
      })
    } catch {
      return
    }
  }
  contentKind.value = 'chinese'
  codeLanguage.value = 'typescript'
  practiceMode.value = 'fixed'
  targetLength.value = 100
  lengthPreset.value = 100
  captureValue.value = ''
  pageError.value = ''
  createNewChallenge()
  ElMessage.success('已清空，并生成新的随机练习')
}

const copyResult = async () => {
  if (!snapshot.value) return
  try {
    await navigator.clipboard.writeText(formatTypingResultText(snapshot.value))
    ElMessage.success('成绩摘要已复制')
  } catch {
    ElMessage.error('复制失败，请检查浏览器剪贴板权限')
  }
}
const exportResult = (command: string) => {
  if (snapshot.value) downloadTypingResult(snapshot.value, command as TypingExportFormat)
}

const loadHistory = () => { historyRecords.value = listTypingHistoryRecords() }
const openHistory = () => {
  historyEnabled.value = isTypingHistoryEnabled()
  loadHistory()
  historyVisible.value = true
}
const handleHistoryToggle = (value: string | number | boolean) => {
  const enabled = Boolean(value)
  setTypingHistoryEnabled(enabled)
  ElMessage.success(enabled ? '本地历史已开启，完成后可手动保存成绩' : '本地历史已关闭，已有记录不会自动删除')
}
const saveCurrentResult = () => {
  if (!snapshot.value || snapshot.value.status !== 'completed') return
  if (!historyEnabled.value) {
    ElMessage.warning('请先在本地历史中开启保存')
    return
  }
  saveTypingHistoryRecord(createTypingHistoryRecord(snapshot.value))
  loadHistory()
  resultSaved.value = true
  ElMessage.success('成绩摘要已保存到当前浏览器')
}
const deleteHistory = (id: string) => {
  deleteTypingHistoryRecord(id)
  loadHistory()
  ElMessage.success('历史记录已删除')
}
const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确认清空当前浏览器中的全部打字练习历史？', '清空本地历史', {
      confirmButtonText: '全部清空', cancelButtonText: '取消', type: 'warning'
    })
    clearTypingHistoryRecords()
    loadHistory()
    ElMessage.success('本地历史已清空')
  } catch {
    // 用户取消
  }
}
const exportHistory = () => {
  downloadTextContent(
    serializeTypingHistoryRecords(historyRecords.value),
    `typing-practice-history-${new Date().toISOString().slice(0, 10)}.json`,
    'application/json'
  )
}
const triggerHistoryImport = () => historyFileInputRef.value?.click()
const handleHistoryImport = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const records = parseTypingHistoryRecords(await file.text())
    const count = importTypingHistoryRecords(records)
    loadHistory()
    ElMessage.success(`已导入 ${count} 条历史记录`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '历史导入失败')
  }
}

const handleVisibilityChange = () => {
  if (document.hidden && snapshot.value?.status === 'running') pausePractice()
}

onMounted(() => {
  historyEnabled.value = isTypingHistoryEnabled()
  loadHistory()
  createNewChallenge()
  ticker = window.setInterval(() => {
    if (engine.value && (snapshot.value?.status === 'running' || snapshot.value?.status === 'paused')) {
      updateSnapshot(engine.value.snapshot())
    }
  }, 200)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  if (ticker !== undefined) window.clearInterval(ticker)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.typing-page { min-height: 100vh; color: #1f2937; background: #f5f7fa; }
.typing-topbar, .typing-workbench { width: min(1400px, calc(100% - 48px)); margin: 0 auto; }
.typing-topbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px 0 16px; border-bottom: 1px solid #dfe5ee; }
.topbar-title, .topbar-actions, .panel-head, .result-head, .section-head, .history-toolbar, .history-actions, .practice-actions { display: flex; align-items: center; gap: 12px; }
.topbar-title { flex-wrap: wrap; }
.topbar-title h1 { margin: 0; font-size: 26px; }
.privacy-copy, .panel-head p, .stats-head p, .result-head p, .section-head p { color: #64748b; font-size: 13px; }
.topbar-actions { flex-wrap: wrap; justify-content: flex-end; }
.typing-workbench { padding: 20px 0 48px; }
.config-strip, .practice-panel, .stats-panel, .result-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 8px 20px rgba(15, 23, 42, .04); }
.config-strip { display: flex; align-items: end; gap: 16px; padding: 14px 16px; }
.config-form { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)); gap: 12px; flex: 1; }
.config-form :deep(.el-form-item) { margin-bottom: 0; }
.config-form :deep(.el-form-item__label) { padding-bottom: 5px; color: #64748b; line-height: 1.2; }
.config-form :deep(.el-select), .length-control, .length-control :deep(.el-input-number) { width: 100%; }
.length-control { display: flex; gap: 8px; }
.config-actions { display: flex; gap: 8px; padding-bottom: 1px; white-space: nowrap; }
.page-alert { margin-top: 14px; }
.practice-grid { display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 16px; margin-top: 16px; align-items: start; }
.practice-panel, .stats-panel, .result-panel { padding: 20px; }
.panel-head, .result-head, .section-head, .history-toolbar { justify-content: space-between; }
.panel-head h2, .stats-head h2, .result-head h2, .section-head h3 { margin: 0; }
.panel-head p, .stats-head p, .result-head p, .section-head p { margin: 4px 0 0; }
.seed-label { margin-left: 8px; padding: 2px 6px; color: #475569; background: #f1f5f9; border-radius: 4px; cursor: help; }
.practice-panel > :deep(.el-progress) { margin: 16px 0 12px; }
.infinite-track { display: flex; align-items: center; gap: 8px; margin: 16px 0 12px; padding: 8px 11px; color: #1d4ed8; font-size: 12px; background: #eff6ff; border-radius: 6px; }
.infinite-pulse { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 0 4px rgba(59, 130, 246, .15); }
.typing-surface { position: relative; min-height: 360px; max-height: 520px; overflow: auto; padding: 30px 32px; background: #f8fafc; border: 1px solid #dbe3ee; border-radius: 8px; cursor: text; outline: none; }
.typing-surface:focus-visible, .typing-surface:focus-within { border-color: #409eff; box-shadow: 0 0 0 3px rgba(64, 158, 255, .12); }
.character-stream { color: #94a3b8; font-family: "SFMono-Regular", Consolas, "Liberation Mono", "Microsoft YaHei", monospace; font-size: 24px; line-height: 1.9; letter-spacing: .025em; white-space: normal; overflow-wrap: anywhere; }
.code-mode .character-stream { font-size: 18px; line-height: 1.75; letter-spacing: 0; white-space: pre-wrap; }
.typing-character { border-radius: 3px; transition: color .1s ease, background-color .1s ease, box-shadow .1s ease; }
.typing-character.correct { color: #166534; background: #dcfce7; }
.typing-character.incorrect { color: #b91c1c; background: #fee2e2; text-decoration: underline wavy #dc2626; text-underline-offset: 5px; }
.typing-character.current { color: #0f172a; background: #dbeafe; box-shadow: inset 2px 0 0 #2563eb; }
.typing-character.line-break { display: inline-block; min-width: 4px; color: #94a3b8; font-size: .72em; }
.state-overlay { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 9px; text-align: center; background: rgba(248, 250, 252, .94); backdrop-filter: blur(2px); }
.state-overlay strong { font-size: 22px; }
.state-overlay span { color: #64748b; }
.capture-row { display: grid; grid-template-columns: minmax(180px, 360px) 1fr; gap: 12px; align-items: center; margin-top: 12px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
.capture-row.focused { border-color: #93c5fd; background: #eff6ff; }
.capture-input { width: 100%; min-height: 38px; max-height: 76px; box-sizing: border-box; resize: none; padding: 8px 10px; color: #1e3a8a; font: 15px/1.4 "SFMono-Regular", Consolas, monospace; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; }
.capture-input:focus { border-color: #409eff; }
.capture-input:disabled { color: #94a3b8; background: #f1f5f9; }
.capture-state, .practice-actions > span { color: #64748b; font-size: 12px; }
.practice-actions { margin-top: 14px; flex-wrap: wrap; }
.stats-panel { position: sticky; top: 16px; }
.stats-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.timer-value { color: #1d4ed8; font: 700 22px/1 "SFMono-Regular", Consolas, monospace; }
.primary-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
.primary-stats > div { padding: 14px 12px; text-align: center; background: #eff6ff; border-radius: 8px; }
.primary-stats span, .primary-stats small, .result-kpis span { display: block; color: #64748b; font-size: 12px; }
.primary-stats strong { display: block; margin: 5px 0; color: #1d4ed8; font-size: 28px; }
.detail-stats { margin: 16px 0 0; }
.detail-stats > div { display: flex; align-items: center; justify-content: space-between; padding: 10px 2px; border-bottom: 1px solid #edf2f7; }
.detail-stats dt { color: #64748b; font-size: 13px; }
.detail-stats dd { margin: 0; font-weight: 700; }
.shortcut-note { display: grid; gap: 7px; margin-top: 18px; padding: 12px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 8px; }
kbd { display: inline-block; min-width: 34px; padding: 2px 5px; color: #334155; text-align: center; background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; box-shadow: 0 1px 0 #cbd5e1; }
.result-panel { margin-top: 16px; }
.result-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.section-kicker { color: #2563eb; font-size: 11px; font-weight: 800; letter-spacing: .1em; }
.result-panel > :deep(.el-alert) { margin-top: 16px; }
.result-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-top: 18px; }
.result-kpis > div { padding: 14px; background: #f8fafc; border: 1px solid #edf2f7; border-radius: 8px; }
.result-kpis strong { display: block; margin-top: 7px; color: #0f172a; font-size: 22px; }
.mistake-section { margin-top: 20px; }
.section-head.compact { margin-bottom: 10px; }
.mistake-section code { padding: 2px 7px; color: #9f1239; background: #fff1f2; border-radius: 4px; }
.history-toolbar { margin: 16px 0 12px; flex-wrap: wrap; }
.history-filters { display: grid; grid-template-columns: 180px minmax(280px, 380px); gap: 10px; margin-bottom: 12px; }
.hidden-input { display: none; }

@media (max-width: 1120px) {
  .config-form { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .config-strip { align-items: stretch; flex-direction: column; }
  .config-actions { justify-content: flex-end; }
  .result-kpis { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 820px) {
  .typing-topbar { align-items: flex-start; flex-direction: column; }
  .topbar-actions { justify-content: flex-start; }
  .practice-grid { grid-template-columns: 1fr; }
  .stats-panel { position: static; }
  .detail-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
}
@media (max-width: 620px) {
  .typing-topbar, .typing-workbench { width: min(100% - 24px, 1400px); }
  .config-form, .result-kpis, .history-filters { grid-template-columns: 1fr; }
  .typing-surface { min-height: 310px; padding: 20px 16px; }
  .character-stream { font-size: 20px; }
  .capture-row { grid-template-columns: 1fr; }
  .panel-head, .result-head { align-items: flex-start; flex-direction: column; }
  .detail-stats { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { .typing-character { transition: none; } }
</style>
