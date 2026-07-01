<template>
  <div class="text-playground-page">
    <header class="playground-topbar">
      <div class="topbar-title">
        <h1>文字游戏工坊</h1>
        <el-tag type="success" effect="light">本地生成 / 不上传</el-tag>
        <span class="privacy-copy">藏头诗、随机语录、文字转换和弹幕滚动屏。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button type="primary" :loading="aiLoading" @click="handlePrimaryAction">
          <el-icon><MagicStick /></el-icon>
          {{ primaryActionLabel }}
        </el-button>
        <el-button v-if="supportsAiMode" :disabled="aiLoading" @click="handleLocalAction">
          本地生成
        </el-button>
        <el-button :disabled="!hasExportableOutput" @click="copyActiveOutput">
          <el-icon><CopyDocument /></el-icon>
          复制
        </el-button>
        <el-dropdown trigger="click" :disabled="!hasExportableOutput" @command="handleExport">
          <el-button :disabled="!hasExportableOutput">
            <el-icon><Download /></el-icon>
            导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="txt">TXT</el-dropdown-item>
              <el-dropdown-item command="markdown">Markdown</el-dropdown-item>
              <el-dropdown-item command="json">JSON</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="danger" plain @click="clearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </header>

    <main class="playground-workbench">
      <section class="config-panel">
        <el-tabs v-model="activeMode" class="mode-tabs">
          <el-tab-pane label="随机语录" name="quote" />
          <el-tab-pane label="藏头诗" name="acrostic" />
          <el-tab-pane label="文字转换" name="transform" />
          <el-tab-pane label="弹幕屏" name="danmaku" />
        </el-tabs>

        <section v-if="activeMode === 'quote'" class="settings-block">
          <div class="section-head">
            <div>
              <h2>语录生成</h2>
              <p>彩虹屁、毒鸡汤、废话文学和摸鱼文案。</p>
            </div>
            <el-button text @click="runQuote">
              <el-icon><RefreshRight /></el-icon>
              换一批
            </el-button>
          </div>

          <el-form label-position="top" class="tool-form">
            <el-form-item label="语录类型">
              <el-select v-model="quoteSettings.kind">
                <el-option
                  v-for="item in quoteKindOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                >
                  <div class="select-option">
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.description }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="语气强度">
              <el-radio-group v-model="quoteSettings.tone">
                <el-radio-button
                  v-for="item in quoteToneOptions"
                  :key="item.value"
                  :label="item.value"
                >
                  {{ item.label }}
                </el-radio-button>
              </el-radio-group>
            </el-form-item>
            <div class="form-grid two">
              <el-form-item label="生成数量">
                <el-input-number
                  v-model="quoteSettings.count"
                  :min="1"
                  :max="maxQuoteCount"
                  controls-position="right"
                />
              </el-form-item>
              <el-form-item label="附加效果">
                <div class="inline-switches">
                  <el-switch v-model="quoteSettings.emoji" active-text="emoji" />
                  <el-switch v-model="quoteSettings.rhyme" active-text="尾韵" />
                </div>
              </el-form-item>
            </div>
          </el-form>
        </section>

        <section v-if="activeMode === 'acrostic'" class="settings-block">
          <div class="section-head">
            <div>
              <h2>藏头诗</h2>
              <p>每行首字来自输入文本，最多 {{ maxAcrosticHeads }} 个字。</p>
            </div>
            <el-button text @click="fillAcrosticExample">示例</el-button>
          </div>

          <el-form label-position="top" class="tool-form">
            <el-form-item label="藏头文字">
              <el-input
                v-model="acrosticSettings.heads"
                maxlength="24"
                show-word-limit
                placeholder="例如：快乐生活"
              />
            </el-form-item>
            <el-form-item label="主题关键词">
              <el-input v-model="acrosticSettings.topic" maxlength="24" placeholder="例如：春天、生日、下班" />
            </el-form-item>
            <div class="form-grid two">
              <el-form-item label="风格">
                <el-select v-model="acrosticSettings.style">
                  <el-option
                    v-for="item in acrosticStyleOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  >
                    <div class="select-option">
                      <strong>{{ item.label }}</strong>
                      <span>{{ item.description }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="句式">
                <el-radio-group v-model="acrosticSettings.lineLength">
                  <el-radio-button :label="5">五言</el-radio-button>
                  <el-radio-button :label="7">七言</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </div>
            <div class="form-grid two">
              <el-form-item label="生成版数">
                <el-input-number
                  v-model="acrosticSettings.count"
                  :min="1"
                  :max="maxAcrosticCount"
                  controls-position="right"
                />
              </el-form-item>
              <el-form-item label="押韵">
                <el-switch v-model="acrosticSettings.rhyme" active-text="尾字押韵" />
              </el-form-item>
            </div>
          </el-form>
        </section>

        <section v-if="activeMode === 'transform'" class="settings-block">
          <div class="section-head">
            <div>
              <h2>文字转换</h2>
              <p>火星文、反犬文和倒序类文字游戏。</p>
            </div>
            <el-button text :disabled="!transformResult" @click="useTransformOutput">
              使用结果
            </el-button>
          </div>

          <el-form label-position="top" class="tool-form">
            <el-form-item label="转换类型">
              <el-select v-model="transformSettings.operation">
                <el-option
                  v-for="item in transformOperationOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                >
                  <div class="select-option">
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.description }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="输入文本">
              <el-input
                v-model="transformInput"
                type="textarea"
                resize="none"
                :rows="9"
                placeholder="输入要转换的文本"
              />
            </el-form-item>
            <el-form-item label="符号强度">
              <el-slider v-model="transformSettings.symbolLevel" :min="0" :max="3" :step="1" show-stops />
            </el-form-item>
            <el-form-item label="换行">
              <el-switch v-model="transformSettings.keepLineBreaks" active-text="保留行内转换" />
            </el-form-item>
          </el-form>
        </section>

        <section v-if="activeMode === 'danmaku'" class="settings-block">
          <div class="section-head">
            <div>
              <h2>弹幕滚动屏</h2>
              <p>一行一条弹幕，适合投屏、活动暖场和整活。</p>
            </div>
            <el-button text @click="toggleDanmakuPaused">
              <el-icon><component :is="danmakuPaused ? VideoPlay : VideoPause" /></el-icon>
              {{ danmakuPaused ? '播放' : '暂停' }}
            </el-button>
          </div>

          <el-form label-position="top" class="tool-form">
            <el-form-item label="弹幕文本">
              <el-input
                v-model="danmakuSettings.sourceText"
                type="textarea"
                resize="none"
                :rows="10"
                placeholder="每行一条弹幕"
              />
            </el-form-item>
            <div class="form-grid two">
              <el-form-item label="速度">
                <el-radio-group v-model="danmakuSettings.speed">
                  <el-radio-button
                    v-for="item in danmakuSpeedOptions"
                    :key="item.value"
                    :label="item.value"
                  >
                    {{ item.label }}
                  </el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="颜色">
                <el-select v-model="danmakuSettings.colorMode">
                  <el-option
                    v-for="item in danmakuColorOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="字号">
                <el-input-number
                  v-model="danmakuSettings.fontSize"
                  :min="16"
                  :max="56"
                  controls-position="right"
                />
              </el-form-item>
              <el-form-item label="轨道数">
                <el-input-number
                  v-model="danmakuSettings.density"
                  :min="1"
                  :max="12"
                  controls-position="right"
                />
              </el-form-item>
            </div>
            <div class="inline-switches">
              <el-switch v-model="danmakuSettings.shuffle" active-text="随机顺序" />
              <el-switch v-model="danmakuSettings.loop" active-text="循环播放" />
            </div>
          </el-form>
        </section>
      </section>

      <section class="result-panel">
        <div class="result-head">
          <div>
            <h2>{{ resultTitle }}</h2>
            <p>{{ resultSummary }}</p>
          </div>
          <div class="result-actions">
            <el-button-group v-if="activeMode === 'quote' || activeMode === 'acrostic'">
              <el-button :disabled="!activeRecords.length" @click="copyActiveOutput">
                <el-icon><CopyDocument /></el-icon>
                复制全部
              </el-button>
              <el-button @click="handlePrimaryAction">
                <el-icon><RefreshRight /></el-icon>
                重新生成
              </el-button>
            </el-button-group>
            <el-button-group v-if="activeMode === 'transform'">
              <el-button :disabled="!transformResult?.output" @click="copyActiveOutput">
                <el-icon><CopyDocument /></el-icon>
                复制结果
              </el-button>
              <el-button :disabled="!transformResult?.output" @click="useTransformOutput">
                <el-icon><RefreshRight /></el-icon>
                继续转换
              </el-button>
            </el-button-group>
            <el-button-group v-if="activeMode === 'danmaku'">
              <el-button :disabled="!danmakuLines.length" @click="toggleDanmakuPaused">
                <el-icon><component :is="danmakuPaused ? VideoPlay : VideoPause" /></el-icon>
                {{ danmakuPaused ? '播放' : '暂停' }}
              </el-button>
              <el-button :disabled="!danmakuLines.length" @click="copyActiveOutput">
                <el-icon><CopyDocument /></el-icon>
                复制文案
              </el-button>
            </el-button-group>
          </div>
        </div>

        <template v-if="activeMode === 'quote' || activeMode === 'acrostic'">
          <el-alert
            v-if="aiNotice"
            class="result-alert"
            :type="aiNoticeType"
            :title="aiNotice"
            show-icon
            :closable="false"
          />
          <el-empty v-if="!activeRecords.length" description="暂无结果，点击生成开始" />
          <div v-else class="record-grid">
            <article v-for="record in activeRecords" :key="record.id" class="text-record">
              <div class="record-head">
                <div>
                  <h3>{{ record.title }}</h3>
                  <p>{{ record.meta.join(' · ') }}</p>
                </div>
                <el-button circle text @click="copyRecord(record.content)">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
              <pre>{{ record.content }}</pre>
            </article>
          </div>
        </template>

        <template v-if="activeMode === 'transform'">
          <div v-if="transformResult?.warnings.length" class="warning-list">
            <el-alert
              v-for="warning in transformResult.warnings"
              :key="warning"
              :title="warning"
              type="warning"
              show-icon
              :closable="false"
            />
          </div>
          <el-empty v-if="!transformResult" description="输入文本后点击转换" />
          <div v-else class="transform-output">
            <pre>{{ transformResult.output }}</pre>
          </div>
        </template>

        <template v-if="activeMode === 'danmaku'">
          <el-alert
            v-if="aiNotice"
            class="result-alert"
            :type="aiNoticeType"
            :title="aiNotice"
            show-icon
            :closable="false"
          />
          <el-empty v-if="!danmakuLines.length" description="暂无弹幕，输入文本后生成滚动屏" />
          <div
            v-else
            class="danmaku-stage"
            :class="{ paused: danmakuPaused }"
            aria-label="弹幕滚动预览"
          >
            <span
              v-for="line in danmakuLines"
              :key="line.id"
              class="danmaku-item"
              :style="getDanmakuStyle(line)"
            >
              {{ line.text }}
            </span>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import {computed, reactive, ref} from 'vue'
import {
  ArrowDown,
  CopyDocument,
  Delete,
  Download,
  MagicStick,
  RefreshRight,
  VideoPause,
  VideoPlay
} from '@element-plus/icons-vue'
import {ElMessage} from 'element-plus'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import type {
  DanmakuLine,
  TextPlaygroundExportFormat,
  TextPlaygroundMode,
  TextPlaygroundRecord,
  TextTransformResult,
  ToolAiBusinessType,
  ToolAiGenerateVo
} from '@/types/textPlayground'
import {
  TOOL_AI_BLOCKED_CODE,
  TOOL_AI_FALLBACK_CODES,
  generateToolAiContent
} from '@/api/toolAi'
import {
  ACROSTIC_STYLE_OPTIONS,
  DANMAKU_COLOR_OPTIONS,
  DANMAKU_SPEED_OPTIONS,
  MAX_ACROSTIC_COUNT,
  MAX_ACROSTIC_HEADS,
  MAX_QUOTE_COUNT,
  QUOTE_KIND_OPTIONS,
  QUOTE_TONE_OPTIONS,
  TRANSFORM_OPERATION_OPTIONS,
  createDefaultAcrosticSettings,
  createDefaultDanmakuSettings,
  createDefaultQuoteSettings,
  createDefaultTransformSettings
} from '@/utils/textPlayground/config'
import {
  generateAcrosticRecords,
  getAcrosticHeadPreview,
  getRandomAcrosticExample
} from '@/utils/textPlayground/acrostic'
import {generateQuoteRecords} from '@/utils/textPlayground/quotes'
import {transformText} from '@/utils/textPlayground/transforms'
import {
  buildDanmakuLines,
  getDanmakuTrackTop
} from '@/utils/textPlayground/danmaku'
import {
  downloadTextContent,
  formatDanmakuLines,
  formatTextPlaygroundRecords,
  formatTransformResult
} from '@/utils/textPlayground/exporters'

const activeMode = ref<TextPlaygroundMode>('quote')
const acrosticSettings = reactive(createDefaultAcrosticSettings())
const quoteSettings = reactive(createDefaultQuoteSettings())
const transformSettings = reactive(createDefaultTransformSettings())
const danmakuSettings = reactive(createDefaultDanmakuSettings())

const quoteRecords = ref<TextPlaygroundRecord[]>(generateQuoteRecords(quoteSettings))
const acrosticRecords = ref<TextPlaygroundRecord[]>([])
const transformInput = ref('欢迎来到文字游戏工坊')
const transformResult = ref<TextTransformResult | null>(transformText(transformInput.value, transformSettings))
const danmakuLines = ref<DanmakuLine[]>(buildDanmakuLines(danmakuSettings))
const danmakuPaused = ref(false)
const aiLoading = ref(false)
const aiNotice = ref('')
const aiNoticeType = ref<'success' | 'warning' | 'error' | 'info'>('info')

const acrosticStyleOptions = ACROSTIC_STYLE_OPTIONS
const quoteKindOptions = QUOTE_KIND_OPTIONS
const quoteToneOptions = QUOTE_TONE_OPTIONS
const transformOperationOptions = TRANSFORM_OPERATION_OPTIONS
const danmakuSpeedOptions = DANMAKU_SPEED_OPTIONS
const danmakuColorOptions = DANMAKU_COLOR_OPTIONS
const maxQuoteCount = MAX_QUOTE_COUNT
const maxAcrosticHeads = MAX_ACROSTIC_HEADS
const maxAcrosticCount = MAX_ACROSTIC_COUNT

const resultTitle = computed(() => {
  if (activeMode.value === 'acrostic') {
    return '藏头诗结果'
  }

  if (activeMode.value === 'transform') {
    return '转换结果'
  }

  if (activeMode.value === 'danmaku') {
    return '弹幕预览'
  }

  return '语录结果'
})

const supportsAiMode = computed(() => {
  return activeMode.value === 'quote' || activeMode.value === 'acrostic' || activeMode.value === 'danmaku'
})

const primaryActionLabel = computed(() => {
  if (activeMode.value === 'acrostic') {
    return 'AI生成藏头诗'
  }

  if (activeMode.value === 'transform') {
    return '开始转换'
  }

  if (activeMode.value === 'danmaku') {
    return 'AI生成弹幕'
  }

  return 'AI生成语录'
})

const activeRecords = computed<TextPlaygroundRecord[]>(() => {
  if (activeMode.value === 'acrostic') {
    return acrosticRecords.value
  }

  if (activeMode.value === 'quote') {
    return quoteRecords.value
  }

  return []
})

const activeOutput = computed(() => {
  if (activeMode.value === 'transform') {
    return transformResult.value?.output || ''
  }

  if (activeMode.value === 'danmaku') {
    return formatDanmakuLines(danmakuLines.value, 'txt')
  }

  return formatTextPlaygroundRecords(activeRecords.value, 'txt')
})

const hasExportableOutput = computed(() => Boolean(activeOutput.value.trim()))

const resultSummary = computed(() => {
  if (activeMode.value === 'transform') {
    if (!transformResult.value) {
      return '等待转换。'
    }

    return `${transformResult.value.operationLabel} · ${transformResult.value.outputMetrics.characters} 字符 · ${transformResult.value.outputMetrics.lines} 行`
  }

  if (activeMode.value === 'danmaku') {
    return danmakuLines.value.length
      ? `${danmakuLines.value.length} 条 · ${danmakuSettings.density} 条轨道 · ${danmakuSettings.loop ? '循环' : '单次'}`
      : '等待生成弹幕。'
  }

  return activeRecords.value.length
    ? `${activeRecords.value.length} 条 · 可复制或导出`
    : '等待生成。'
})

const runQuote = () => {
  quoteRecords.value = generateQuoteRecords(quoteSettings)
  ElMessage.success(`已生成 ${quoteRecords.value.length} 条语录`)
}

const runAcrostic = () => {
  const preview = getAcrosticHeadPreview(acrosticSettings.heads)

  if (!preview) {
    ElMessage.warning('请先输入藏头文字')
    return
  }

  acrosticRecords.value = generateAcrosticRecords(acrosticSettings)
  ElMessage.success(`已生成 ${acrosticRecords.value.length} 版藏头诗`)
}

const runTransform = () => {
  if (!transformInput.value.trim()) {
    transformResult.value = null
    ElMessage.warning('请先输入要转换的文本')
    return
  }

  transformResult.value = transformText(transformInput.value, transformSettings)
  ElMessage.success('已完成转换')
}

const runDanmaku = () => {
  danmakuLines.value = buildDanmakuLines(danmakuSettings)
  danmakuPaused.value = false

  if (!danmakuLines.value.length) {
    ElMessage.warning('请先输入弹幕文本')
    return
  }

  ElMessage.success(`已生成 ${danmakuLines.value.length} 条弹幕`)
}

const handlePrimaryAction = () => {
  if (supportsAiMode.value) {
    runAiGenerate()
    return
  }

  runTransform()
}

const handleLocalAction = () => {
  aiNotice.value = ''
  if (activeMode.value === 'acrostic') {
    runAcrostic()
  } else if (activeMode.value === 'danmaku') {
    runDanmaku()
  } else {
    runQuote()
  }
}

const getAiBusinessType = (): ToolAiBusinessType | null => {
  if (activeMode.value === 'acrostic') {
    return 'TEXT_GAME_ACROSTIC'
  }

  if (activeMode.value === 'quote') {
    return 'TEXT_GAME_QUOTE'
  }

  if (activeMode.value === 'danmaku') {
    return 'TEXT_GAME_DANMAKU'
  }

  return null
}

const buildAiMessage = (): Record<string, unknown> => {
  if (activeMode.value === 'acrostic') {
    return {
      heads: acrosticSettings.heads,
      topic: acrosticSettings.topic,
      style: acrosticSettings.style,
      lineLength: acrosticSettings.lineLength,
      count: acrosticSettings.count,
      rhyme: acrosticSettings.rhyme
    }
  }

  if (activeMode.value === 'danmaku') {
    return {
      sourceText: danmakuSettings.sourceText,
      speed: danmakuSettings.speed,
      colorMode: danmakuSettings.colorMode,
      count: Math.min(24, Math.max(8, danmakuLines.value.length || 16))
    }
  }

  return {
    kind: quoteSettings.kind,
    tone: quoteSettings.tone,
    count: Math.min(12, quoteSettings.count),
    emoji: quoteSettings.emoji,
    rhyme: quoteSettings.rhyme
  }
}

const createAiRecords = (
  mode: 'quote' | 'acrostic',
  aiResult: ToolAiGenerateVo
): TextPlaygroundRecord[] => {
  const label = mode === 'quote' ? 'AI语录' : 'AI藏头诗'
  const createdAt = new Date().toISOString()

  return (aiResult.items || []).map((content, index) => ({
    id: `ai-${mode}-${aiResult.requestId}-${index}`,
    index: index + 1,
    mode,
    label,
    title: `${label} ${index + 1}`,
    content,
    meta: [
      'AI生成',
      aiResult.model || 'AI模型',
      aiResult.totalTokens ? `${aiResult.totalTokens} tokens` : ''
    ].filter(Boolean),
    createdAt
  }))
}

const applyAiResult = (aiResult: ToolAiGenerateVo) => {
  if (activeMode.value === 'acrostic') {
    acrosticRecords.value = createAiRecords('acrostic', aiResult)
  } else if (activeMode.value === 'danmaku') {
    danmakuSettings.sourceText = (aiResult.items || []).join('\n')
    danmakuLines.value = buildDanmakuLines(danmakuSettings)
    danmakuPaused.value = false
  } else {
    quoteRecords.value = createAiRecords('quote', aiResult)
  }
  aiNoticeType.value = 'success'
  aiNotice.value = `AI生成完成，requestId：${aiResult.requestId}`
}

const fallbackToLocal = (reason: string) => {
  aiNoticeType.value = 'warning'
  aiNotice.value = `${reason}，已自动使用本地离线方案。`
  if (activeMode.value === 'acrostic') {
    runAcrostic()
  } else if (activeMode.value === 'danmaku') {
    runDanmaku()
  } else {
    runQuote()
  }
}

const runAiGenerate = async () => {
  const businessType = getAiBusinessType()
  if (!businessType) {
    runTransform()
    return
  }

  if (activeMode.value === 'acrostic' && !acrosticSettings.heads.trim()) {
    ElMessage.warning('请先输入藏头文字')
    return
  }

  aiLoading.value = true
  aiNotice.value = ''
  try {
    const response = await generateToolAiContent({
      businessType,
      message: buildAiMessage()
    })
    if (response.code === 200 && response.data?.items?.length) {
      applyAiResult(response.data)
      ElMessage.success('AI生成完成')
      return
    }

    if (TOOL_AI_FALLBACK_CODES.includes(response.code)) {
      fallbackToLocal(response.message || 'AI生成暂不可用')
      return
    }

    if (response.code === TOOL_AI_BLOCKED_CODE) {
      aiNoticeType.value = 'error'
      aiNotice.value = response.message || '内容不适合AI生成'
      ElMessage.error(aiNotice.value)
      return
    }

    fallbackToLocal(response.message || 'AI生成失败')
  } catch (error: any) {
    fallbackToLocal(error?.message || 'AI接口请求失败')
  } finally {
    aiLoading.value = false
  }
}

const fillAcrosticExample = () => {
  acrosticSettings.heads = getRandomAcrosticExample()
  runAcrostic()
}

const useTransformOutput = () => {
  if (!transformResult.value?.output) {
    return
  }

  transformInput.value = transformResult.value.output
  transformResult.value = null
}

const toggleDanmakuPaused = () => {
  danmakuPaused.value = !danmakuPaused.value
}

const fallbackCopyText = (text: string) => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

const copyText = async (text: string, message = '已复制') => {
  if (!text) {
    return
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      fallbackCopyText(text)
    }
    ElMessage.success(message)
  } catch (error) {
    fallbackCopyText(text)
    ElMessage.success(message)
  }
}

const copyRecord = (content: string) => {
  copyText(content, '已复制当前结果')
}

const copyActiveOutput = () => {
  copyText(activeOutput.value, '已复制当前玩法结果')
}

const buildExportContent = (format: TextPlaygroundExportFormat): string => {
  if (activeMode.value === 'transform' && transformResult.value) {
    return formatTransformResult(transformResult.value, format)
  }

  if (activeMode.value === 'danmaku') {
    return formatDanmakuLines(danmakuLines.value, format)
  }

  return formatTextPlaygroundRecords(activeRecords.value, format)
}

const handleExport = (command: string | number | object) => {
  const format = String(command) as TextPlaygroundExportFormat
  downloadTextContent(buildExportContent(format), format, `text-playground-${activeMode.value}`)
  ElMessage.success('已开始导出')
}

const clearAll = () => {
  Object.assign(acrosticSettings, createDefaultAcrosticSettings())
  Object.assign(quoteSettings, createDefaultQuoteSettings())
  Object.assign(transformSettings, createDefaultTransformSettings())
  Object.assign(danmakuSettings, createDefaultDanmakuSettings(), {sourceText: ''})
  quoteRecords.value = []
  acrosticRecords.value = []
  transformInput.value = ''
  transformResult.value = null
  danmakuLines.value = []
  danmakuPaused.value = false
}

const getDanmakuStyle = (line: DanmakuLine) => ({
  top: getDanmakuTrackTop(line, danmakuSettings.density),
  color: line.color,
  fontSize: `${danmakuSettings.fontSize}px`,
  animationDuration: `${line.durationSeconds}s`,
  animationDelay: `${line.delaySeconds}s`,
  animationIterationCount: danmakuSettings.loop ? 'infinite' : '1'
})
</script>

<style scoped>
.text-playground-page {
  min-height: 100vh;
  background: #f5f7fb;
  color: #1f2937;
}

.playground-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.topbar-title,
.topbar-actions,
.result-actions,
.inline-switches {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.topbar-title h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.privacy-copy {
  color: #6b7280;
  font-size: 13px;
}

.playground-workbench {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
}

.config-panel,
.result-panel {
  min-width: 0;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.config-panel {
  max-height: calc(100vh - 92px);
  overflow: auto;
  padding: 16px;
}

.result-panel {
  padding: 16px;
}

.mode-tabs {
  margin-bottom: 4px;
}

.section-head,
.result-head,
.record-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-head,
.result-head {
  margin-bottom: 14px;
}

.section-head h2,
.result-head h2 {
  margin: 0;
  font-size: 18px;
}

.record-head h3 {
  margin: 0;
  font-size: 15px;
}

.section-head p,
.result-head p,
.record-head p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.tool-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.tool-form :deep(.el-input-number),
.tool-form :deep(.el-select) {
  width: 100%;
}

.select-option {
  display: grid;
  gap: 2px;
}

.select-option span {
  color: #6b7280;
  font-size: 12px;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.form-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.inline-switches {
  min-height: 32px;
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.text-record {
  min-width: 0;
  padding: 14px;
  background: #fbfcfe;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.text-record pre,
.transform-output pre {
  margin: 12px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 14px;
  line-height: 1.8;
}

.transform-output {
  min-height: 360px;
  padding: 16px;
  background: #fbfcfe;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.transform-output pre {
  margin: 0;
  font-size: 16px;
}

.warning-list {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.result-alert {
  margin-bottom: 12px;
}

.danmaku-stage {
  position: relative;
  height: calc(100vh - 220px);
  min-height: 420px;
  overflow: hidden;
  background: #111827;
  border: 1px solid #253047;
  border-radius: 8px;
}

.danmaku-stage.paused .danmaku-item {
  animation-play-state: paused;
}

.danmaku-item {
  position: absolute;
  left: 0;
  display: inline-flex;
  align-items: center;
  max-width: none;
  white-space: nowrap;
  font-weight: 700;
  line-height: 1.2;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.65);
  transform: translateX(100vw);
  animation-name: danmaku-move;
  animation-timing-function: linear;
  animation-fill-mode: both;
}

@keyframes danmaku-move {
  from {
    transform: translateX(100vw);
  }

  to {
    transform: translateX(-120%);
  }
}

@media (max-width: 1080px) {
  .playground-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .playground-workbench {
    grid-template-columns: 1fr;
  }

  .config-panel {
    max-height: none;
  }

  .danmaku-stage {
    height: 420px;
  }
}

@media (max-width: 640px) {
  .playground-workbench,
  .playground-topbar {
    padding: 12px;
  }

  .form-grid.two {
    grid-template-columns: 1fr;
  }

  .topbar-actions :deep(.el-button) {
    flex: 1 1 118px;
  }

  .record-grid {
    grid-template-columns: 1fr;
  }

  .danmaku-stage {
    min-height: 320px;
  }
}
</style>
