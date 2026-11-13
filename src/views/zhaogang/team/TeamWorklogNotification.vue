<template>
  <section class="notification-section" aria-label="工时群通知" v-loading="loading">
    <div class="heading"><h4>工时群通知</h4><el-button text :disabled="busy" @click="load">刷新</el-button></div>
    <p>工作台日历中的工作日，每天 17:00（北京时间）发送团队报告，再逐人发送今日工时明细。</p>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-form v-if="config" label-position="top" @submit.prevent="save(false)">
      <el-form-item label="开启通知"><el-switch v-model="enabled" :disabled="busy" aria-label="开启工时群通知" /></el-form-item>
      <el-form-item label="企业微信群 Webhook">
        <div class="webhook-field">
          <el-tag :type="config.webhookConfigured ? 'success' : 'info'" effect="plain">{{ config.webhookConfigured ? '已配置' : '未配置' }}</el-tag>
          <el-input v-model="webhook" type="password" autocomplete="off" :disabled="busy" :placeholder="config.webhookConfigured ? '留空保留原地址，输入新地址可更换' : '粘贴群机器人的 Webhook 地址'" aria-label="群 Webhook 地址" />
        </div>
      </el-form-item>
      <p class="hint">在企业微信群添加“消息推送”机器人，名称可设为“工作台助手”，复制 Webhook 后保存。地址保存后不回显。</p>
      <div class="actions">
        <el-button type="primary" :loading="saving" :disabled="busy" @click="save(false)">保存配置</el-button>
        <el-button type="primary" plain :disabled="busy || !savedConfigReady || reportActive" :loading="sendingReport" @click="sendNow">立即发送</el-button>
        <el-button :disabled="busy || !config.webhookConfigured || !!webhook.trim() || enabled !== config.enabled" :loading="testing" @click="test">发送连接测试</el-button>
        <el-button v-if="config.webhookConfigured" type="danger" plain :disabled="busy" @click="clear">清除并停用</el-button>
      </div>
      <p class="hint">立即发送会将今日团队报告和全员明细发送到群，自动通知关闭时也可使用。测试仅发送一条连接消息；修改配置后请先保存。</p>
      <div v-if="config.latest" class="latest" role="status">
        最近发送：{{ date(config.latest.createdAt) }} · {{ stateLabel(config.latest.state) }} · 已受理 {{ config.latest.accepted }}/{{ config.latest.total }} 条
        <span v-if="config.latest.reason">{{ config.latest.reason }}</span>
      </div>
      <p v-else class="hint">暂无发送记录</p>
    </el-form>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getWorklogNotification, saveWorklogNotification, testWorklogNotification, sendWorklogReportNow } from '@/api/zhaogangNotification'
import { ZhaogangRequestError } from '@/api/zhaogang'
import type { WorklogNotificationStatus } from '@/types/zhaogangNotification'
const props = defineProps<{ teamId: number }>()
const config = ref<WorklogNotificationStatus | null>(null)
const enabled = ref(false)
const webhook = ref('')
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const sendingReport = ref(false)
let reportRequestId: string | undefined
const error = ref('')
const busy = computed(() => loading.value || saving.value || testing.value || sendingReport.value)
const savedConfigReady = computed(() => !!config.value?.webhookConfigured && !webhook.value.trim() && enabled.value === config.value.enabled)
const reportActive = computed(() => !!config.value?.latest && config.value.latest.kind !== 'TEST' && ['COLLECTING', 'READY'].includes(config.value.latest.state))
let generation = 0
let timer: ReturnType<typeof setTimeout> | undefined
const apply = (value: WorklogNotificationStatus) => { config.value = value; enabled.value = value.enabled }
const scheduleRefresh = () => {
  clearTimeout(timer)
  if (config.value?.latest && ['COLLECTING', 'READY'].includes(config.value.latest.state)) {
    const current = generation
    timer = setTimeout(async () => {
      if (current !== generation) return
      try {
        const value = await getWorklogNotification(props.teamId)
        if (current !== generation) return
        // Status polling never overwrites an unsaved switch or Webhook draft.
        if (config.value?.revision === value.revision) config.value = value
        scheduleRefresh()
      } catch { /* Manual refresh remains available; preserve configuration and drafts. */ }
    }, 4000)
  }
}
const load = async () => {
  const current = ++generation
  clearTimeout(timer)
  loading.value = true; error.value = ''
  try {
    const value = await getWorklogNotification(props.teamId)
    if (current === generation) { apply(value); scheduleRefresh() }
  } catch (e) { if (current === generation) error.value = e instanceof Error ? e.message : '通知配置加载失败' }
  finally { if (current === generation) loading.value = false }
}
const save = async (clearWebhook: boolean) => {
  if (!config.value || busy.value) return
  const current = generation
  saving.value = true; error.value = ''
  try {
    const value = await saveWorklogNotification(props.teamId, {
      enabled: clearWebhook ? false : enabled.value, revision: config.value.revision,
      ...(clearWebhook ? { clearWebhook: true } : webhook.value.trim() ? { webhook: webhook.value.trim() } : {})
    })
    if (current !== generation) return
    apply(value); webhook.value = ''; scheduleRefresh(); ElMessage.success(clearWebhook ? '已清除并停用' : '通知配置已保存')
  } catch (e) { if (current === generation) error.value = e instanceof Error ? e.message : '通知配置保存失败' }
  finally { if (current === generation) saving.value = false }
}
const clear = async () => {
  const current = generation
  try {
    await ElMessageBox.confirm('清除群 Webhook 并停止后续通知？已发送到群的消息会保留。', '清除并停用', { type: 'warning' })
    if (current === generation) await save(true)
  } catch { /* Cancel keeps the configuration. */ }
}
const test = async () => {
  if (!config.value || busy.value) return
  const current = generation
  try {
    await ElMessageBox.confirm('将向已保存的企业微信群发送一条连接测试消息。', '发送连接测试', { confirmButtonText: '发送测试' })
  } catch { return }
  if (current !== generation || busy.value || !config.value) return
  testing.value = true; error.value = ''
  try {
    const value = await testWorklogNotification(props.teamId, config.value.revision)
    if (current === generation) { apply(value); scheduleRefresh(); ElMessage.success('测试已进入发送队列，请查看最近发送结果') }
  } catch (e) { if (current === generation) error.value = e instanceof Error ? e.message : '测试发送失败' }
  finally { if (current === generation) testing.value = false }
}
const sendNow = async () => {
  if (!config.value || busy.value || !savedConfigReady.value || reportActive.value) return
  const current = generation
  reportRequestId ??= crypto.randomUUID()
  sendingReport.value = true; error.value = ''
  try {
    const value = await sendWorklogReportNow(props.teamId, config.value.revision, reportRequestId)
    if (current !== generation) return
    reportRequestId = undefined
    apply(value); scheduleRefresh()
    ElMessage.success('工时报告已触发，正在采集并按顺序发送，请查看最近发送结果')
  } catch (e) {
    if (current !== generation) return
    // Retain the request ID on an ambiguous network failure so retry cannot create a second report.
    if (e instanceof ZhaogangRequestError && e.code !== undefined) reportRequestId = undefined
    error.value = e instanceof Error ? e.message : '工时报告触发失败'
  } finally { if (current === generation) sendingReport.value = false }
}
const stateLabel = (state: string) => ({ COLLECTING: '采集中', READY: '发送中', ACCEPTED: '企微已受理', FAILED: '发送失败', UNKNOWN: '结果未知，已停止', CANCELLED: '已取消', EXPIRED: '已过发送窗口' }[state] ?? state)
const date = (value: number) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'short', timeStyle: 'medium', hour12: false }).format(value)
watch(() => props.teamId, () => {
  config.value = null; webhook.value = ''; enabled.value = false; saving.value = false; testing.value = false; sendingReport.value = false; reportRequestId = undefined
  void load()
}, { immediate: true })
onBeforeUnmount(() => { generation++; clearTimeout(timer); webhook.value = '' })
</script>

<style scoped>
.notification-section { border-top: 1px solid #e8edf4; margin-top: 20px; padding-top: 14px; }
.heading { display: flex; align-items: center; justify-content: space-between; }
h4 { margin: 0; font-size: 16px; }
p { color: #69778d; line-height: 1.65; font-size: 13px; }
.webhook-field { display: flex; align-items: center; gap: 12px; width: 100%; }
.webhook-field :deep(.el-input) { flex: 1; min-width: 0; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.actions :deep(.el-button) { margin: 0; }
.hint { font-size: 12px; color: #8490a4; }
.latest { padding: 12px; border-radius: 6px; background: #f5f7fb; font-size: 13px; line-height: 1.8; }
.latest span { display: block; color: #69778d; }
@media(max-width: 600px) { .webhook-field { align-items: stretch; flex-direction: column; } }
</style>
