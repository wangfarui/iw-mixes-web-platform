<template>
  <div class="number-generator-page">
    <header class="number-topbar">
      <div class="topbar-title">
        <h1>编号生成器</h1>
        <el-tag type="success" effect="light">本地生成 / 不上传</el-tag>
        <span class="privacy-copy">身份证编号仅用于正则、日期和校验位测试。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button type="primary" @click="handleGenerate">
          <el-icon><MagicStick /></el-icon>
          生成
        </el-button>
        <el-button :disabled="!records.length" @click="copyAll">
          <el-icon><CopyDocument /></el-icon>
          复制全部
        </el-button>
        <el-dropdown trigger="click" :disabled="!records.length" @command="handleExport">
          <el-button :disabled="!records.length">
            <el-icon><Download /></el-icon>
            导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="txt">TXT</el-dropdown-item>
              <el-dropdown-item command="csv">CSV</el-dropdown-item>
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

    <main class="generator-workbench">
      <section class="config-panel">
        <div class="section-head">
          <div>
            <h2>生成规则</h2>
            <p>{{ activeKindLabel }} · 最多 {{ maxGenerateCount }} 条</p>
          </div>
          <el-button text @click="resetCurrentSettings">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </div>

        <el-form label-position="top" class="config-form">
          <el-form-item label="编号类型">
            <el-select v-model="settings.kind" @change="handleKindChange">
              <el-option
                v-for="item in generatorKindOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="生成数量">
            <el-input-number
              v-model="settings.count"
              :min="1"
              :max="maxGenerateCount"
              :step="1"
              controls-position="right"
            />
          </el-form-item>

          <template v-if="settings.kind === 'custom'">
            <el-divider>自定义规则</el-divider>
            <div class="form-grid two">
              <el-form-item label="前缀">
                <el-input v-model="settings.custom.prefix" />
              </el-form-item>
              <el-form-item label="后缀">
                <el-input v-model="settings.custom.suffix" />
              </el-form-item>
              <el-form-item label="分隔符">
                <el-input v-model="settings.custom.separator" maxlength="4" />
              </el-form-item>
              <el-form-item label="转大写">
                <el-switch v-model="settings.custom.uppercase" />
              </el-form-item>
            </div>
            <div class="inline-switches">
              <el-switch v-model="settings.custom.includeDate" active-text="日期" />
              <el-switch v-model="settings.custom.includeSequence" active-text="序号" />
              <el-switch v-model="settings.custom.includeRandom" active-text="随机段" />
            </div>
            <el-form-item v-if="settings.custom.includeDate" label="日期格式">
              <el-select v-model="settings.custom.datePattern">
                <el-option
                  v-for="item in datePatternOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <div v-if="settings.custom.includeSequence" class="form-grid three">
              <el-form-item label="起始序号">
                <el-input-number v-model="settings.custom.sequenceStart" :min="0" controls-position="right" />
              </el-form-item>
              <el-form-item label="步长">
                <el-input-number v-model="settings.custom.sequenceStep" :min="1" controls-position="right" />
              </el-form-item>
              <el-form-item label="序号位数">
                <el-input-number v-model="settings.custom.sequenceLength" :min="1" :max="12" controls-position="right" />
              </el-form-item>
            </div>
            <template v-if="settings.custom.includeRandom">
              <div class="form-grid two">
                <el-form-item label="随机长度">
                  <el-input-number v-model="settings.custom.randomLength" :min="1" :max="64" controls-position="right" />
                </el-form-item>
                <el-form-item label="字符集">
                  <el-select v-model="settings.custom.randomCharsetPreset">
                    <el-option
                      v-for="item in randomCharsetOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </div>
              <el-form-item v-if="settings.custom.randomCharsetPreset === 'custom'" label="自定义字符集">
                <el-input v-model="settings.custom.customCharset" />
              </el-form-item>
            </template>
          </template>

          <template v-if="settings.kind === 'time-sequence'">
            <el-divider>时间序列</el-divider>
            <el-form-item label="日期格式">
              <el-select v-model="settings.timeSequence.datePattern">
                <el-option
                  v-for="item in datePatternOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <div class="form-grid two">
              <el-form-item label="分隔符">
                <el-input v-model="settings.timeSequence.separator" maxlength="4" />
              </el-form-item>
              <el-form-item label="序号位数">
                <el-input-number v-model="settings.timeSequence.sequenceLength" :min="1" :max="12" controls-position="right" />
              </el-form-item>
              <el-form-item label="起始序号">
                <el-input-number v-model="settings.timeSequence.sequenceStart" :min="0" controls-position="right" />
              </el-form-item>
              <el-form-item label="步长">
                <el-input-number v-model="settings.timeSequence.sequenceStep" :min="1" controls-position="right" />
              </el-form-item>
            </div>
          </template>

          <template v-if="settings.kind === 'snowflake'">
            <el-divider>Snowflake 风格</el-divider>
            <el-alert
              title="前端模拟值，不作为正式分布式 ID 服务。"
              type="warning"
              show-icon
              :closable="false"
            />
            <div class="form-grid two spaced">
              <el-form-item label="Epoch">
                <el-input v-model="settings.snowflake.epoch" />
              </el-form-item>
              <el-form-item label="节点 ID">
                <el-input-number v-model="settings.snowflake.nodeId" :min="0" :max="1023" controls-position="right" />
              </el-form-item>
              <el-form-item label="起始序列">
                <el-input-number v-model="settings.snowflake.sequenceStart" :min="0" :max="4095" controls-position="right" />
              </el-form-item>
            </div>
          </template>

          <template v-if="settings.kind === 'business'">
            <el-divider>业务单据</el-divider>
            <el-form-item label="业务模板">
              <el-select v-model="settings.business.domain">
                <el-option
                  v-for="item in businessDomainOptions"
                  :key="item.value"
                  :label="`${item.label} · ${item.prefix}`"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <div class="form-grid two">
              <el-form-item label="日期格式">
                <el-select v-model="settings.business.datePattern">
                  <el-option
                    v-for="item in datePatternOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="分隔符">
                <el-input v-model="settings.business.separator" maxlength="4" />
              </el-form-item>
              <el-form-item label="起始序号">
                <el-input-number v-model="settings.business.sequenceStart" :min="0" controls-position="right" />
              </el-form-item>
              <el-form-item label="序号位数">
                <el-input-number v-model="settings.business.sequenceLength" :min="1" :max="12" controls-position="right" />
              </el-form-item>
            </div>
          </template>

          <template v-if="settings.kind === 'batch'">
            <el-divider>批次号</el-divider>
            <div class="form-grid two">
              <el-form-item label="前缀">
                <el-input v-model="settings.batch.prefix" />
              </el-form-item>
              <el-form-item label="分隔符">
                <el-input v-model="settings.batch.separator" maxlength="4" />
              </el-form-item>
              <el-form-item label="日期格式">
                <el-select v-model="settings.batch.datePattern">
                  <el-option
                    v-for="item in datePatternOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="序号位数">
                <el-input-number v-model="settings.batch.sequenceLength" :min="1" :max="12" controls-position="right" />
              </el-form-item>
              <el-form-item label="起始序号">
                <el-input-number v-model="settings.batch.sequenceStart" :min="0" controls-position="right" />
              </el-form-item>
              <el-form-item label="步长">
                <el-input-number v-model="settings.batch.sequenceStep" :min="1" controls-position="right" />
              </el-form-item>
            </div>
          </template>

          <template v-if="settings.kind === 'short-code'">
            <el-divider>短码</el-divider>
            <div class="form-grid two">
              <el-form-item label="长度">
                <el-input-number v-model="settings.shortCode.length" :min="1" :max="128" controls-position="right" />
              </el-form-item>
              <el-form-item label="字符集">
                <el-select v-model="settings.shortCode.randomCharsetPreset">
                  <el-option
                    v-for="item in randomCharsetOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </div>
            <el-form-item v-if="settings.shortCode.randomCharsetPreset === 'custom'" label="自定义字符集">
              <el-input v-model="settings.shortCode.customCharset" />
            </el-form-item>
          </template>

          <template v-if="settings.kind === 'numeric-code'">
            <el-divider>数字验证码</el-divider>
            <div class="form-grid two">
              <el-form-item label="长度">
                <el-input-number v-model="settings.numericCode.length" :min="1" :max="32" controls-position="right" />
              </el-form-item>
              <el-form-item label="允许 0 开头">
                <el-switch v-model="settings.numericCode.allowLeadingZero" />
              </el-form-item>
            </div>
          </template>

          <template v-if="settings.kind === 'trace-id'">
            <el-divider>Trace ID</el-divider>
            <el-form-item label="格式">
              <el-radio-group v-model="settings.traceId.format">
                <el-radio-button label="hex16">16 位 hex</el-radio-button>
                <el-radio-button label="hex32">32 位 hex</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </template>

          <template v-if="settings.kind === 'checksum'">
            <el-divider>校验位编号</el-divider>
            <div class="form-grid two">
              <el-form-item label="前缀">
                <el-input v-model="settings.checksum.prefix" />
              </el-form-item>
              <el-form-item label="算法">
                <el-select v-model="settings.checksum.algorithm">
                  <el-option label="Luhn" value="luhn" />
                  <el-option label="Mod11" value="mod11" />
                </el-select>
              </el-form-item>
              <el-form-item label="日期格式">
                <el-select v-model="settings.checksum.datePattern">
                  <el-option
                    v-for="item in datePatternOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="序号位数">
                <el-input-number v-model="settings.checksum.sequenceLength" :min="1" :max="12" controls-position="right" />
              </el-form-item>
              <el-form-item label="起始序号">
                <el-input-number v-model="settings.checksum.sequenceStart" :min="0" controls-position="right" />
              </el-form-item>
              <el-form-item label="步长">
                <el-input-number v-model="settings.checksum.sequenceStep" :min="1" controls-position="right" />
              </el-form-item>
            </div>
          </template>

          <template v-if="settings.kind === 'id-card'">
            <el-divider>身份证测试编号</el-divider>
            <el-alert
              title="仅生成测试编号，不表示真实身份。"
              type="warning"
              show-icon
              :closable="false"
            />
            <div class="form-grid two spaced">
              <el-form-item label="样例模式">
                <el-select v-model="settings.idCard.sampleMode">
                  <el-option label="合法测试号" value="valid" />
                  <el-option label="正负混合" value="mixed" />
                  <el-option label="错误校验位" value="invalid-checksum" />
                  <el-option label="错误日期" value="invalid-date" />
                  <el-option label="长度异常" value="invalid-length" />
                  <el-option label="小写 x" value="lowercase-x" />
                </el-select>
              </el-form-item>
              <el-form-item label="地区码">
                <el-radio-group v-model="settings.idCard.areaCodeMode">
                  <el-radio-button label="random">随机</el-radio-button>
                  <el-radio-button label="fixed">固定</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item v-if="settings.idCard.areaCodeMode === 'fixed'" label="固定地区码">
                <el-input v-model="settings.idCard.areaCode" maxlength="6" />
              </el-form-item>
              <el-form-item label="生日范围">
                <el-date-picker
                  v-model="settings.idCard.birthDateRange"
                  type="daterange"
                  value-format="YYYY-MM-DD"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                />
              </el-form-item>
              <el-form-item label="顺序码性别">
                <el-radio-group v-model="settings.idCard.sex">
                  <el-radio-button label="any">随机</el-radio-button>
                  <el-radio-button label="male">男</el-radio-button>
                  <el-radio-button label="female">女</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="起始顺序码">
                <el-input-number v-model="settings.idCard.sequenceStart" :min="1" :max="999" controls-position="right" />
              </el-form-item>
            </div>
          </template>
        </el-form>
      </section>

      <section class="result-panel">
        <div class="result-head">
          <div>
            <h2>生成结果</h2>
            <p v-if="result">
              {{ records.length }} 条 · 重复 {{ result.duplicateCount }} 条 · {{ result.elapsedMs }} ms
            </p>
            <p v-else>选择规则后点击生成。</p>
          </div>
          <div class="result-actions">
            <el-button-group>
              <el-button :disabled="!records.length" @click="copyAllValues">
                <el-icon><DocumentCopy /></el-icon>
                只复制编号
              </el-button>
              <el-button :disabled="!records.length" @click="handleGenerate">
                <el-icon><RefreshRight /></el-icon>
                重新生成
              </el-button>
            </el-button-group>
          </div>
        </div>

        <div v-if="result?.warnings.length" class="warning-list">
          <el-alert
            v-for="warning in result.warnings"
            :key="warning"
            :title="warning"
            type="warning"
            show-icon
            :closable="false"
          />
        </div>

        <el-empty v-if="!records.length" description="暂无结果" />

        <template v-else>
          <el-table
            class="result-table"
            :data="pagedRecords"
            height="calc(100vh - 278px)"
            :row-class-name="tableRowClassName"
          >
            <el-table-column prop="index" label="#" width="72" />
            <el-table-column prop="value" label="编号" min-width="280">
              <template #default="{ row }">
                <span class="number-value">{{ row.value }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="180" />
            <el-table-column prop="status" label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" effect="light">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-tooltip content="复制编号" placement="top">
                  <el-button circle text @click="copyRecord(row.value)">
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-row">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="records.length"
              :page-sizes="[20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next, jumper"
            />
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
  DocumentCopy,
  Download,
  MagicStick,
  RefreshRight
} from '@element-plus/icons-vue'
import {ElMessage} from 'element-plus'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import type {
  GeneratedNumberRecord,
  NumberExportFormat,
  NumberGenerationResult
} from '@/types/numberGenerator'
import {
  BUSINESS_DOMAIN_OPTIONS,
  DATE_PATTERN_OPTIONS,
  GENERATOR_KIND_OPTIONS,
  MAX_GENERATE_COUNT,
  RANDOM_CHARSET_OPTIONS,
  createDefaultNumberGeneratorSettings
} from '@/utils/numberGenerator/config'
import {
  generateNumberRecords,
  getNumberGeneratorKindLabel
} from '@/utils/numberGenerator/generators'
import {
  downloadGeneratedNumbers,
  formatGeneratedNumbers
} from '@/utils/numberGenerator/exporters'

const settings = reactive(createDefaultNumberGeneratorSettings())
const result = ref<NumberGenerationResult | null>(null)
const currentPage = ref(1)
const pageSize = ref(50)

const generatorKindOptions = GENERATOR_KIND_OPTIONS
const datePatternOptions = DATE_PATTERN_OPTIONS
const randomCharsetOptions = RANDOM_CHARSET_OPTIONS
const businessDomainOptions = BUSINESS_DOMAIN_OPTIONS
const maxGenerateCount = MAX_GENERATE_COUNT

const records = computed(() => result.value?.records || [])
const activeKindLabel = computed(() => getNumberGeneratorKindLabel(settings.kind))
const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return records.value.slice(start, start + pageSize.value)
})

const handleGenerate = () => {
  try {
    result.value = generateNumberRecords(settings)
    currentPage.value = 1
    ElMessage.success(`已生成 ${result.value.records.length} 条编号`)
  } catch (error: any) {
    ElMessage.error(error?.message || '生成失败')
  }
}

const handleKindChange = () => {
  result.value = null
  currentPage.value = 1
}

const resetCurrentSettings = () => {
  const next = createDefaultNumberGeneratorSettings()
  const kind = settings.kind
  Object.assign(settings, next, {kind})
  result.value = null
  currentPage.value = 1
}

const clearAll = () => {
  Object.assign(settings, createDefaultNumberGeneratorSettings())
  result.value = null
  currentPage.value = 1
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

const copyAll = () => {
  copyText(formatGeneratedNumbers(records.value, 'csv'), '已复制全部结果')
}

const copyAllValues = () => {
  copyText(records.value.map((record) => record.value).join('\n'), '已复制全部编号')
}

const copyRecord = (value: string) => {
  copyText(value, '已复制编号')
}

const handleExport = (command: string | number | object) => {
  const format = String(command) as NumberExportFormat
  downloadGeneratedNumbers(records.value, format)
  ElMessage.success('已开始导出')
}

const getStatusTagType = (status: GeneratedNumberRecord['status']) => {
  if (status === 'error') {
    return 'danger'
  }

  if (status === 'warning') {
    return 'warning'
  }

  return 'success'
}

const getStatusLabel = (status: GeneratedNumberRecord['status']) => {
  if (status === 'error') {
    return '负向'
  }

  if (status === 'warning') {
    return '提示'
  }

  return '正常'
}

const tableRowClassName = ({row}: { row: GeneratedNumberRecord }) => {
  return `row-${row.status}`
}
</script>

<style scoped>
.number-generator-page {
  min-height: 100vh;
  background: #f5f7fb;
  color: #1f2937;
}

.number-topbar {
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

.generator-workbench {
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

.section-head,
.result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-head h2,
.result-head h2 {
  margin: 0;
  font-size: 18px;
}

.section-head p,
.result-head p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.config-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.config-form :deep(.el-input-number),
.config-form :deep(.el-select),
.config-form :deep(.el-date-editor) {
  width: 100%;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.form-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-grid.spaced {
  margin-top: 12px;
}

.inline-switches {
  margin: 2px 0 14px;
}

.warning-list {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.result-table {
  width: 100%;
}

.number-value {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 13px;
  word-break: break-all;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

:deep(.row-warning) {
  --el-table-tr-bg-color: #fff8e6;
}

:deep(.row-error) {
  --el-table-tr-bg-color: #fff0f0;
}

@media (max-width: 1080px) {
  .number-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .generator-workbench {
    grid-template-columns: 1fr;
  }

  .config-panel {
    max-height: none;
  }
}

@media (max-width: 640px) {
  .generator-workbench,
  .number-topbar {
    padding: 12px;
  }

  .form-grid.two,
  .form-grid.three {
    grid-template-columns: 1fr;
  }

  .topbar-actions :deep(.el-button) {
    flex: 1 1 120px;
  }
}
</style>
