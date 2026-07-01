<template>
  <div class="ip-lookup-page">
    <header class="ip-topbar">
      <div class="topbar-title">
        <h1>IP 地址解析</h1>
        <el-tag type="success" effect="light">公开工具</el-tag>
        <el-tag type="warning" effect="light">经 IW 外部接口查询</el-tag>
        <span class="privacy-copy">支持当前 IP、公网 IP、域名和 URL Host 解析，历史自动保存在当前浏览器。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button :loading="currentLoading" @click="loadCurrentIp">
          <el-icon><Refresh /></el-icon>
          当前 IP
        </el-button>
        <el-badge :value="historyRecords.length" :hidden="historyRecords.length === 0" class="history-badge">
          <el-button @click="openHistoryDialog">
            <el-icon><Clock /></el-icon>
            本地历史
          </el-button>
        </el-badge>
        <el-button :disabled="!result" @click="copyResult">
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
              <el-dropdown-item command="json">JSON</el-dropdown-item>
              <el-dropdown-item command="csv">CSV</el-dropdown-item>
              <el-dropdown-item command="txt">TXT</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="danger" plain @click="clearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </header>

    <main class="ip-workbench">
      <section class="query-panel">
        <el-form class="query-form" label-position="top" @submit.prevent>
          <el-form-item label="查询目标" class="query-input-item">
            <el-input
              v-model="queryForm.input"
              clearable
              size="large"
              placeholder="输入公网 IP、域名或 URL，例如 8.8.8.8 / example.com / https://example.com"
              @keyup.enter="runQuery"
            />
          </el-form-item>
          <el-form-item label="模式" class="query-mode-item">
            <el-select v-model="queryForm.mode" size="large">
              <el-option label="自动识别" value="auto" />
              <el-option label="IP" value="ip" />
              <el-option label="域名" value="domain" />
            </el-select>
          </el-form-item>
          <el-form-item label="操作" class="query-action-item">
            <el-button type="primary" size="large" :loading="queryLoading" @click="runQuery">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
          </el-form-item>
        </el-form>

        <el-alert
          v-if="errorMessage"
          class="state-alert"
          type="error"
          :title="errorMessage"
          show-icon
          :closable="false"
        />
        <el-alert
          v-if="result?.warnings.length"
          class="state-alert"
          type="warning"
          show-icon
          :closable="false"
        >
          <ul class="warning-list">
            <li v-for="warning in result.warnings" :key="warning">{{ warning }}</li>
          </ul>
        </el-alert>
      </section>

      <section class="summary-grid" aria-label="解析摘要">
        <article class="summary-item">
          <span class="summary-label">目标</span>
          <strong>{{ result?.normalizedInput || '-' }}</strong>
        </article>
        <article class="summary-item">
          <span class="summary-label">类型</span>
          <strong>{{ result ? targetTypeLabel(result.targetType) : '-' }}</strong>
        </article>
        <article class="summary-item">
          <span class="summary-label">解析记录</span>
          <strong>{{ result?.records.length ?? 0 }}</strong>
        </article>
        <article class="summary-item">
          <span class="summary-label">公网地址</span>
          <strong>{{ publicRecordCount }}</strong>
        </article>
      </section>

      <section class="result-layout">
        <article class="result-panel">
          <div class="panel-head">
            <div>
              <h2>解析结果</h2>
              <p>{{ resultSummary }}</p>
            </div>
            <el-tag v-if="result" effect="plain">{{ result.queryPerspective }}</el-tag>
          </div>

          <el-table
            v-if="result"
            v-loading="busy"
            :data="result.records"
            border
            stripe
            class="record-table"
            empty-text="暂无解析记录"
          >
            <el-table-column prop="host" label="Host" min-width="180">
              <template #default="{ row }">{{ row.host || '-' }}</template>
            </el-table-column>
            <el-table-column prop="ip" label="IP" min-width="190">
              <template #default="{ row }">
                <span class="mono-text">{{ row.ip }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="family" label="协议" width="90" />
            <el-table-column prop="addressType" label="地址类型" width="130">
              <template #default="{ row }">
                <el-tag :type="addressTypeTag(row.addressType)" effect="light">
                  {{ addressTypeLabel(row.addressType) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="publicIp" label="公网" width="90">
              <template #default="{ row }">
                <el-tag :type="row.publicIp ? 'success' : 'info'" effect="plain">
                  {{ row.publicIp ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="定位" min-width="220">
              <template #default="{ row }">{{ locationText(row) }}</template>
            </el-table-column>
            <el-table-column label="行政区划" width="120">
              <template #default="{ row }">{{ row.location?.adcode || '-' }}</template>
            </el-table-column>
            <el-table-column label="提示" min-width="170">
              <template #default="{ row }">
                <span v-if="row.message" class="record-message">
                  <el-icon><WarningFilled /></el-icon>
                  {{ row.message }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-else-if="busy" description="正在解析当前 IP" />
          <el-empty v-else description="输入目标或点击当前 IP 开始解析" />
        </article>

        <aside class="details-panel">
          <div class="panel-head">
            <div>
              <h2>详情</h2>
              <p>查询元信息和服务商原始响应。</p>
            </div>
          </div>

          <el-descriptions v-if="result" :column="1" border size="small">
            <el-descriptions-item label="原始输入">{{ result.input }}</el-descriptions-item>
            <el-descriptions-item label="规范输入">{{ result.normalizedInput }}</el-descriptions-item>
            <el-descriptions-item label="目标类型">{{ targetTypeLabel(result.targetType) }}</el-descriptions-item>
            <el-descriptions-item label="客户端IP">{{ result.clientIp || '-' }}</el-descriptions-item>
            <el-descriptions-item label="查询时间">{{ formatDate(result.queriedAt) }}</el-descriptions-item>
          </el-descriptions>

          <pre v-if="result" class="raw-json">{{ resultPayload }}</pre>
          <el-empty v-else description="暂无详情" />
        </aside>
      </section>
    </main>

    <el-dialog
      v-model="historyVisible"
      title="IP 地址解析历史"
      width="920px"
      :close-on-click-modal="false"
    >
      <el-alert
        class="history-alert"
        type="info"
        :closable="false"
        show-icon
        title="查询成功后会自动保存到当前浏览器 localStorage，不会写入服务器。"
      />
      <div class="history-toolbar">
        <span>{{ historyRecords.length }} 条历史</span>
        <el-button type="danger" plain :disabled="!historyRecords.length" @click="clearHistory">
          全部删除
        </el-button>
      </div>
      <el-table :data="historyRecords" max-height="420" empty-text="暂无本地历史">
        <el-table-column label="查询目标" min-width="180">
          <template #default="{ row }">{{ historyTitle(row) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{ targetTypeLabel(row.result.targetType) }}</template>
        </el-table-column>
        <el-table-column label="记录数" width="90">
          <template #default="{ row }">{{ row.result.records.length }}</template>
        </el-table-column>
        <el-table-column label="公网数" width="90">
          <template #default="{ row }">{{ historyPublicRecordCount(row) }}</template>
        </el-table-column>
        <el-table-column label="保存时间" min-width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowDown,
  Clock,
  CopyDocument,
  Delete,
  Download,
  Refresh,
  Search,
  WarningFilled
} from '@element-plus/icons-vue'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import { queryCurrentIpLookup, queryIpLookup } from '@/api/ipLookup'
import type {
  IpLookupExportFormat,
  IpLookupHistoryRecord,
  IpLookupMode,
  IpLookupRecordVo,
  IpLookupResultVo
} from '@/types/ipLookup'
import {
  downloadIpLookupResult,
  formatIpLookupResult
} from '@/utils/ipLookup/exporters'
import {
  clearIpLookupHistoryRecords,
  deleteIpLookupHistoryRecord,
  listIpLookupHistoryRecords,
  saveIpLookupHistoryRecord
} from '@/utils/ipLookup/history'

const queryForm = reactive({
  input: '',
  mode: 'auto' as IpLookupMode
})

const result = ref<IpLookupResultVo | null>(null)
const queryLoading = ref(false)
const currentLoading = ref(false)
const errorMessage = ref('')
const historyVisible = ref(false)
const historyRecords = ref<IpLookupHistoryRecord[]>(listIpLookupHistoryRecords())

const busy = computed(() => queryLoading.value || currentLoading.value)

const publicRecordCount = computed(() => {
  return result.value?.records.filter((record) => record.publicIp).length ?? 0
})

const resultSummary = computed(() => {
  if (!result.value) {
    return '等待输入公网 IP、域名或 URL。'
  }
  return `${targetTypeLabel(result.value.targetType)} · ${result.value.records.length} 条记录 · ${formatDate(result.value.queriedAt)}`
})

const resultPayload = computed(() => {
  return result.value ? JSON.stringify(result.value, null, 2) : ''
})

const targetTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    CURRENT_IP: '当前 IP',
    IP: 'IP',
    DOMAIN: '域名'
  }

  return labels[type] || type
}

const addressTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    public: '公网',
    private: '内网',
    loopback: '回环',
    'link-local': '链路本地',
    'carrier-grade-nat': '运营商 NAT',
    documentation: '文档地址',
    benchmark: '测试地址',
    'unique-local': '唯一本地',
    multicast: '组播',
    unspecified: '未指定',
    reserved: '保留'
  }

  return labels[type] || type
}

const addressTypeTag = (type: string): 'success' | 'warning' | 'info' | 'danger' => {
  if (type === 'public') {
    return 'success'
  }
  if (type === 'private' || type === 'loopback' || type === 'unique-local') {
    return 'info'
  }
  if (type === 'reserved' || type === 'documentation' || type === 'benchmark') {
    return 'warning'
  }
  return 'danger'
}

const locationText = (record: IpLookupRecordVo): string => {
  const location = record.location
  if (!location) {
    return '-'
  }

  const parts = Array.from(new Set([
    location.country,
    location.province,
    location.city
  ].filter(Boolean)))

  return parts.length ? parts.join(' ') : '-'
}

const formatDate = (value: string): string => {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '查询失败'
}

const createHistoryId = () => {
  return crypto.randomUUID?.() || `ip-lookup-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const refreshHistoryRecords = () => {
  historyRecords.value = listIpLookupHistoryRecords()
}

const saveAutoHistory = (lookupResult: IpLookupResultVo, input: string, mode: IpLookupMode) => {
  const record: IpLookupHistoryRecord = {
    id: createHistoryId(),
    createdAt: new Date().toISOString(),
    input,
    mode,
    result: lookupResult
  }

  saveIpLookupHistoryRecord(record)
  refreshHistoryRecords()
}

const loadCurrentIp = async () => {
  currentLoading.value = true
  errorMessage.value = ''
  try {
    const response = await queryCurrentIpLookup()
    result.value = response.data
    saveAutoHistory(response.data, '', 'auto')
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    currentLoading.value = false
  }
}

const runQuery = async () => {
  const input = queryForm.input.trim()
  if (!input) {
    ElMessage.warning('请输入公网 IP、域名或 URL')
    return
  }

  queryLoading.value = true
  errorMessage.value = ''
  try {
    const response = await queryIpLookup({
      input,
      mode: queryForm.mode
    })
    result.value = response.data
    saveAutoHistory(response.data, input, queryForm.mode)
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    queryLoading.value = false
  }
}

const writeClipboardText = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)
  textArea.select()
  document.execCommand('copy')
  textArea.remove()
}

const copyResult = async () => {
  if (!result.value) {
    return
  }

  await writeClipboardText(formatIpLookupResult(result.value, 'json'))
  ElMessage.success('已复制解析结果')
}

const handleExportCommand = (command: string | number | object) => {
  if (!result.value) {
    return
  }
  downloadIpLookupResult(result.value, command as IpLookupExportFormat)
}

const openHistoryDialog = () => {
  refreshHistoryRecords()
  historyVisible.value = true
}

const historyTitle = (record: IpLookupHistoryRecord): string => {
  if (record.result.targetType === 'CURRENT_IP') {
    return `当前 IP：${record.result.normalizedInput}`
  }
  return record.result.normalizedInput || record.input || '-'
}

const historyPublicRecordCount = (record: IpLookupHistoryRecord): number => {
  return record.result.records.filter((item) => item.publicIp).length
}

const restoreHistory = (record: IpLookupHistoryRecord) => {
  result.value = record.result
  queryForm.input = record.input
  queryForm.mode = record.mode
  errorMessage.value = ''
  historyVisible.value = false
}

const removeHistory = (id: string) => {
  deleteIpLookupHistoryRecord(id)
  refreshHistoryRecords()
  ElMessage.success('已删除历史记录')
}

const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确认删除当前浏览器中的所有 IP 地址解析历史？', '全部删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    clearIpLookupHistoryRecords()
    refreshHistoryRecords()
    ElMessage.success('本地历史已清空')
  } catch {
    // 用户取消时保持现状。
  }
}

const clearAll = () => {
  queryForm.input = ''
  queryForm.mode = 'auto'
  result.value = null
  errorMessage.value = ''
}

onMounted(() => {
  loadCurrentIp()
})
</script>

<style scoped>
.ip-lookup-page {
  min-height: 100vh;
  background: #f6f8fb;
  color: #1f2937;
}

.ip-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 28px;
  background: #ffffff;
  border-bottom: 1px solid #dfe5ee;
}

.topbar-title {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.topbar-title h1 {
  margin: 0 6px 0 0;
  color: #111827;
  font-size: 22px;
  line-height: 1.35;
  font-weight: 700;
  letter-spacing: 0;
}

.privacy-copy {
  color: #5b6472;
  font-size: 13px;
  line-height: 1.5;
}

.topbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.history-badge {
  line-height: 1;
}

.ip-workbench {
  width: min(1320px, calc(100% - 40px));
  margin: 0 auto;
  padding: 24px 0 36px;
}

.query-panel,
.result-panel,
.details-panel {
  background: #ffffff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(31, 41, 55, 0.05);
}

.query-panel {
  padding: 18px;
}

.query-form {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 150px 112px;
  gap: 14px;
  align-items: end;
}

.query-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.query-action-item :deep(.el-form-item__content) {
  width: 100%;
}

.query-action-item .el-button {
  width: 100%;
}

.state-alert {
  margin-top: 14px;
}

.warning-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.7;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.summary-item {
  min-width: 0;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
}

.summary-label {
  display: block;
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 12px;
}

.summary-item strong {
  display: block;
  overflow: hidden;
  color: #111827;
  font-size: 20px;
  line-height: 1.35;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}

.result-panel,
.details-panel {
  min-width: 0;
  padding: 18px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.panel-head h2 {
  margin: 0;
  color: #111827;
  font-size: 16px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0;
}

.panel-head p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.record-table {
  width: 100%;
}

.mono-text {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}

.record-message {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #b45309;
  line-height: 1.5;
}

.raw-json {
  max-height: 420px;
  margin: 14px 0 0;
  padding: 12px;
  overflow: auto;
  color: #1f2937;
  background: #f8fafc;
  border: 1px solid #dfe5ee;
  border-radius: 6px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.history-alert {
  margin-bottom: 14px;
}

.history-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  color: #5b6472;
  font-size: 13px;
}

@media (max-width: 1080px) {
  .ip-topbar {
    align-items: stretch;
    flex-direction: column;
  }

  .topbar-actions {
    justify-content: flex-start;
  }

  .summary-grid,
  .result-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .ip-workbench {
    width: min(100% - 24px, 1320px);
    padding: 16px 0 28px;
  }

  .query-form {
    grid-template-columns: 1fr;
  }

  .topbar-actions .el-button,
  .topbar-actions :deep(.el-dropdown),
  .history-badge {
    flex: 1 1 140px;
  }

  .history-badge :deep(.el-button) {
    width: 100%;
  }

  .summary-grid {
    gap: 10px;
  }

  .summary-item strong {
    white-space: normal;
    word-break: break-word;
  }

  .panel-head {
    align-items: stretch;
    flex-direction: column;
  }

  .history-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .history-toolbar .el-button {
    width: 100%;
  }
}
</style>
