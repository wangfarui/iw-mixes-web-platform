<template>
  <div class="network-diagnostics-page">
    <header class="diagnostics-topbar">
      <div class="topbar-title">
        <h1>网络诊断</h1>
        <el-tag type="success" effect="light">公开工具</el-tag>
        <el-tag type="warning" effect="light">经 IW 外部接口诊断</el-tag>
        <el-tag effect="plain">不保存历史</el-tag>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button type="primary" :loading="loading" @click="runDiagnostics">
          <el-icon><Connection /></el-icon>
          开始诊断
        </el-button>
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

    <main class="diagnostics-workbench">
      <section class="query-panel">
        <el-form label-position="top" class="query-form" @submit.prevent>
          <el-form-item label="诊断目标" class="target-item">
            <el-input
              v-model="form.target"
              clearable
              size="large"
              placeholder="输入公网域名、URL或公网IP，例如 https://example.com"
              @keyup.enter="runDiagnostics"
            />
          </el-form-item>
          <el-form-item label="诊断项">
            <div class="toggle-row">
              <el-checkbox v-model="form.latencyEnabled" label="延迟" border />
              <el-checkbox v-model="form.dnsEnabled" label="DNS" border />
              <el-checkbox v-model="form.headersEnabled" label="响应头" border />
            </div>
          </el-form-item>
          <el-form-item label="DNS记录">
            <el-checkbox-group v-model="form.dnsRecordTypes" class="dns-record-group" :disabled="!form.dnsEnabled">
              <el-checkbox-button
                v-for="type in dnsRecordOptions"
                :key="type"
                :label="type"
              >
                {{ type }}
              </el-checkbox-button>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="探测次数">
            <el-input-number
              v-model="form.probeCount"
              :min="1"
              :max="5"
              controls-position="right"
              :disabled="!form.latencyEnabled"
            />
          </el-form-item>
          <el-form-item label="超时">
            <el-select v-model="form.timeoutMs">
              <el-option label="1 秒" :value="1000" />
              <el-option label="2 秒" :value="2000" />
              <el-option label="3 秒" :value="3000" />
              <el-option label="5 秒" :value="5000" />
            </el-select>
          </el-form-item>
        </el-form>

        <el-alert
          v-if="responseMessage"
          class="state-alert"
          :type="loginRequired ? 'warning' : 'error'"
          :closable="false"
          show-icon
        >
          <div class="alert-content">
            <span>{{ responseMessage }}</span>
            <el-button v-if="loginRequired" type="primary" link @click="goLogin">去登录</el-button>
          </div>
        </el-alert>
      </section>

      <section class="summary-grid" aria-label="诊断摘要">
        <article class="summary-item">
          <span>目标</span>
          <strong>{{ result?.host || '-' }}</strong>
        </article>
        <article class="summary-item">
          <span>状态</span>
          <strong>{{ result ? (result.success ? '可达' : '异常') : '-' }}</strong>
        </article>
        <article class="summary-item">
          <span>平均延迟</span>
          <strong>{{ result?.latency?.avgMs != null ? `${result.latency.avgMs}ms` : '-' }}</strong>
        </article>
        <article class="summary-item">
          <span>HTTP</span>
          <strong>{{ result?.headers?.statusCode || '-' }}</strong>
        </article>
        <article class="summary-item">
          <span>额度</span>
          <strong>{{ quotaSummary }}</strong>
        </article>
      </section>

      <section class="result-panel">
        <div class="panel-head">
          <div>
            <h2>诊断结果</h2>
            <p>{{ result?.summary || resultHint }}</p>
          </div>
          <el-tag v-if="result" :type="result.success ? 'success' : 'danger'" effect="light">
            {{ result.success ? '完成' : '无有效结果' }}
          </el-tag>
        </div>

        <el-empty v-if="!result && !loading" description="输入目标后开始诊断" />
        <div v-else-if="loading" class="state-panel">
          <el-icon class="is-loading"><Refresh /></el-icon>
          <strong>正在诊断</strong>
          <span>正在从 IW 外部服务视角检查目标。</span>
        </div>

        <el-tabs v-else v-model="activeTab" class="result-tabs">
          <el-tab-pane label="总览" name="overview">
            <div class="overview-layout">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="原始输入">{{ result?.input }}</el-descriptions-item>
                <el-descriptions-item label="规范目标">{{ result?.normalizedTarget }}</el-descriptions-item>
                <el-descriptions-item label="主机">{{ result?.host }}</el-descriptions-item>
                <el-descriptions-item label="协议端口">{{ result?.scheme }}:{{ result?.port }}</el-descriptions-item>
                <el-descriptions-item label="目标类型">{{ result?.targetType }}</el-descriptions-item>
                <el-descriptions-item label="诊断时间">{{ formatDate(result?.checkedAt) }}</el-descriptions-item>
                <el-descriptions-item label="总耗时">{{ result?.durationMs }}ms</el-descriptions-item>
                <el-descriptions-item label="额度">{{ quotaDetail }}</el-descriptions-item>
              </el-descriptions>

              <div class="warning-list">
                <el-alert
                  v-for="warning in allWarnings"
                  :key="warning"
                  type="warning"
                  show-icon
                  :closable="false"
                  :title="warning"
                />
                <el-empty v-if="!allWarnings.length" description="暂无额外提示" />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="延迟" name="latency" :disabled="!result?.latency">
            <div v-if="result?.latency" class="metric-strip">
              <span>成功 {{ result.latency.successCount }}/{{ result.latency.probeCount }}</span>
              <span>最小 {{ valueOrDash(result.latency.minMs, 'ms') }}</span>
              <span>平均 {{ valueOrDash(result.latency.avgMs, 'ms') }}</span>
              <span>最大 {{ valueOrDash(result.latency.maxMs, 'ms') }}</span>
              <span>抖动 {{ valueOrDash(result.latency.jitterMs, 'ms') }}</span>
            </div>
            <el-table v-if="result?.latency" :data="result.latency.attempts" border stripe>
              <el-table-column prop="index" label="#" width="70" />
              <el-table-column label="结果" width="110">
                <template #default="{ row }">
                  <el-tag :type="row.success ? 'success' : 'danger'" effect="light">
                    {{ row.success ? '成功' : '失败' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="statusCode" label="HTTP" width="100">
                <template #default="{ row }">{{ row.statusCode || '-' }}</template>
              </el-table-column>
              <el-table-column prop="durationMs" label="耗时" width="120">
                <template #default="{ row }">{{ row.durationMs != null ? `${row.durationMs}ms` : '-' }}</template>
              </el-table-column>
              <el-table-column prop="finalUrl" label="最终URL" min-width="260" show-overflow-tooltip />
              <el-table-column prop="error" label="错误" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">{{ row.error || '-' }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="DNS" name="dns" :disabled="!result?.dns">
            <el-alert
              v-if="result?.dns?.error"
              class="result-alert"
              type="error"
              :title="result.dns.error"
              :closable="false"
              show-icon
            />
            <el-table v-if="result?.dns" :data="result.dns.records" border stripe empty-text="暂无DNS记录">
              <el-table-column prop="type" label="类型" width="110" />
              <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
              <el-table-column prop="value" label="记录值" min-width="360" show-overflow-tooltip />
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="响应头" name="headers" :disabled="!result?.headers">
            <el-alert
              v-if="result?.headers?.error"
              class="result-alert"
              type="error"
              :title="result.headers.error"
              :closable="false"
              show-icon
            />
            <div v-if="result?.headers" class="headers-meta">
              <span>HTTP {{ result.headers.statusCode || '-' }}</span>
              <span>{{ valueOrDash(result.headers.durationMs, 'ms') }}</span>
              <span>{{ result.headers.finalUrl || '-' }}</span>
            </div>
            <el-table
              v-if="result?.headers?.redirects?.length"
              class="redirect-table"
              :data="result.headers.redirects"
              border
              stripe
            >
              <el-table-column prop="statusCode" label="状态" width="100" />
              <el-table-column prop="durationMs" label="耗时" width="110">
                <template #default="{ row }">{{ row.durationMs }}ms</template>
              </el-table-column>
              <el-table-column prop="fromUrl" label="来源" min-width="260" show-overflow-tooltip />
              <el-table-column prop="toUrl" label="跳转到" min-width="260" show-overflow-tooltip />
            </el-table>
            <el-table v-if="result?.headers" :data="headerRows" border stripe empty-text="暂无响应头">
              <el-table-column prop="name" label="Header" min-width="220" />
              <el-table-column prop="value" label="Value" min-width="420" show-overflow-tooltip />
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="原始数据" name="raw">
            <pre class="raw-json">{{ rawJson }}</pre>
          </el-tab-pane>
        </el-tabs>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  Connection,
  CopyDocument,
  Delete,
  Download,
  Refresh
} from '@element-plus/icons-vue'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import {
  NETWORK_DIAGNOSTICS_LOGIN_CODES,
  checkNetworkDiagnostics
} from '@/api/networkDiagnostics'
import type {
  NetworkDiagnosticsCheckDto,
  NetworkDiagnosticsExportFormat,
  NetworkDiagnosticsResultVo
} from '@/types/networkDiagnostics'

const router = useRouter()
const dnsRecordOptions = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS']

const form = reactive<NetworkDiagnosticsCheckDto>({
  target: '',
  latencyEnabled: true,
  dnsEnabled: true,
  headersEnabled: true,
  dnsRecordTypes: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'],
  probeCount: 3,
  timeoutMs: 3000
})

const loading = ref(false)
const result = ref<NetworkDiagnosticsResultVo>()
const responseCode = ref<number>()
const responseMessage = ref('')
const activeTab = ref('overview')

const hasSelectedDiagnostics = computed(() => {
  return form.latencyEnabled || form.dnsEnabled || form.headersEnabled
})

const loginRequired = computed(() => {
  return responseCode.value != null && NETWORK_DIAGNOSTICS_LOGIN_CODES.includes(responseCode.value)
})

const resultHint = computed(() => {
  return hasSelectedDiagnostics.value ? '等待诊断' : '至少启用一个诊断项'
})

const quotaSummary = computed(() => {
  const quota = result.value?.quota
  if (!quota) {
    return '-'
  }
  return `${quota.dailyUsed}/${quota.dailyLimit}`
})

const quotaDetail = computed(() => {
  const quota = result.value?.quota
  if (!quota) {
    return '-'
  }
  const scope = quota.scope === 'USER' ? '登录用户' : '匿名'
  return `${scope} 今日 ${quota.dailyUsed}/${quota.dailyLimit}，分钟 ${quota.minuteUsed}/${quota.minuteLimit}`
})

const allWarnings = computed(() => {
  const warnings = new Set<string>()
  result.value?.warnings?.forEach((warning) => warnings.add(warning))
  result.value?.latency?.warnings?.forEach((warning) => warnings.add(warning))
  result.value?.dns?.warnings?.forEach((warning) => warnings.add(warning))
  result.value?.headers?.warnings?.forEach((warning) => warnings.add(warning))
  return [...warnings]
})

const headerRows = computed(() => {
  const headers = result.value?.headers?.responseHeaders || {}
  return Object.entries(headers).map(([name, values]) => ({
    name,
    value: values.join('\n')
  }))
})

const rawJson = computed(() => {
  return result.value ? JSON.stringify(result.value, null, 2) : ''
})

const runDiagnostics = async () => {
  const target = form.target.trim()
  if (!target) {
    ElMessage.warning('请输入诊断目标')
    return
  }
  if (!hasSelectedDiagnostics.value) {
    ElMessage.warning('请至少启用一个诊断项')
    return
  }

  loading.value = true
  responseCode.value = undefined
  responseMessage.value = ''

  try {
    const response = await checkNetworkDiagnostics({
      ...form,
      target,
      dnsRecordTypes: [...form.dnsRecordTypes]
    })
    responseCode.value = response.code
    if (response.code === 200 && response.data) {
      result.value = response.data
      activeTab.value = 'overview'
      ElMessage.success('诊断完成')
      return
    }
    responseMessage.value = response.message || '诊断失败'
    result.value = response.data
  } catch (error) {
    responseMessage.value = '网络诊断请求失败'
  } finally {
    loading.value = false
  }
}

const clearAll = () => {
  form.target = ''
  form.latencyEnabled = true
  form.dnsEnabled = true
  form.headersEnabled = true
  form.dnsRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS']
  form.probeCount = 3
  form.timeoutMs = 3000
  result.value = undefined
  responseCode.value = undefined
  responseMessage.value = ''
  activeTab.value = 'overview'
}

const goLogin = () => {
  router.push('/login')
}

const copyResult = async () => {
  if (!result.value) {
    return
  }
  await navigator.clipboard.writeText(formatTextReport(result.value))
  ElMessage.success('已复制诊断结果')
}

const handleExportCommand = (command: string) => {
  if (!result.value) {
    return
  }
  downloadResult(result.value, command as NetworkDiagnosticsExportFormat)
}

const downloadResult = (data: NetworkDiagnosticsResultVo, format: NetworkDiagnosticsExportFormat) => {
  const content = format === 'json'
    ? JSON.stringify(data, null, 2)
    : formatTextReport(data)
  const mime = format === 'json' ? 'application/json' : 'text/plain'
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)

  link.href = url
  link.download = `network-diagnostics-${timestamp}.${format}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const formatTextReport = (data: NetworkDiagnosticsResultVo): string => {
  const lines = [
    '网络诊断结果',
    `目标：${data.input}`,
    `规范目标：${data.normalizedTarget}`,
    `主机：${data.host}`,
    `协议端口：${data.scheme}:${data.port}`,
    `摘要：${data.summary}`,
    `时间：${formatDate(data.checkedAt)}`,
    ''
  ]

  if (data.latency) {
    lines.push('延迟：')
    lines.push(`- 成功：${data.latency.successCount}/${data.latency.probeCount}`)
    lines.push(`- 最小/平均/最大：${valueOrDash(data.latency.minMs, 'ms')} / ${valueOrDash(data.latency.avgMs, 'ms')} / ${valueOrDash(data.latency.maxMs, 'ms')}`)
    lines.push('')
  }

  if (data.dns) {
    lines.push('DNS：')
    data.dns.records.forEach((record) => lines.push(`- ${record.type} ${record.value}`))
    if (data.dns.error) {
      lines.push(`- 错误：${data.dns.error}`)
    }
    lines.push('')
  }

  if (data.headers) {
    lines.push('响应头：')
    lines.push(`- HTTP：${data.headers.statusCode || '-'}`)
    lines.push(`- 最终URL：${data.headers.finalUrl || '-'}`)
    Object.entries(data.headers.responseHeaders || {}).forEach(([name, values]) => {
      lines.push(`- ${name}: ${values.join(' | ')}`)
    })
  }

  return lines.join('\n')
}

const valueOrDash = (value?: number, suffix = '') => {
  return value == null ? '-' : `${value}${suffix}`
}

const formatDate = (value?: string) => {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}
</script>

<style scoped>
.network-diagnostics-page {
  min-height: 100vh;
  background: #f5f7fa;
  color: #1f2937;
}

.diagnostics-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #dfe5ee;
  background: #fff;
}

.topbar-title,
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.topbar-title h1 {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
}

.topbar-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.diagnostics-workbench {
  width: min(1280px, calc(100% - 48px));
  margin: 0 auto;
  padding: 24px 0 36px;
}

.query-panel,
.result-panel {
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #fff;
}

.query-panel {
  padding: 18px;
}

.query-form {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 220px 360px 140px 140px;
  gap: 14px;
  align-items: end;
}

.target-item {
  min-width: 0;
}

.toggle-row,
.dns-record-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.state-alert,
.result-alert {
  margin-top: 14px;
}

.alert-content {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.summary-item {
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #fff;
}

.summary-item span {
  display: block;
  margin-bottom: 8px;
  color: #64748b;
  font-size: 13px;
}

.summary-item strong {
  display: block;
  overflow: hidden;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-panel {
  padding: 18px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-head h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.panel-head p {
  margin: 0;
  color: #64748b;
}

.state-panel {
  display: flex;
  min-height: 260px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #475569;
}

.result-tabs {
  min-height: 420px;
}

.overview-layout {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 16px;
}

.warning-list {
  display: grid;
  align-content: start;
  gap: 10px;
}

.metric-strip,
.headers-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.metric-strip span,
.headers-meta span {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  overflow: hidden;
  border: 1px solid #d8e0ea;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.redirect-table {
  margin-bottom: 14px;
}

.raw-json {
  max-height: 560px;
  margin: 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid #d8e0ea;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.55;
}

@media (max-width: 1120px) {
  .diagnostics-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-actions {
    justify-content: flex-start;
  }

  .query-form {
    grid-template-columns: 1fr 1fr;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .diagnostics-workbench {
    width: min(100% - 24px, 1280px);
  }

  .query-form,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .topbar-title {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
