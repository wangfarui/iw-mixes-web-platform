<template>
  <section class="notification-section" aria-label="工时群通知" v-loading="loading">
    <div class="heading">
      <div class="heading-title">
        <h4>工时群通知</h4>
        <el-switch v-if="config" v-model="enabled" :disabled="busy || webhookDialogVisible" aria-label="开启工时群通知" @change="savePreferences" />
      </div>
      <el-button text :disabled="busy || webhookDialogVisible" @click="load">刷新</el-button>
    </div>
    <p>工作日历标记的工作日按设定时间发送团队报告及成员工时明细，休息日自动跳过。</p>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-form v-if="config" label-position="top" @submit.prevent>
      <el-form-item label="通知时间（北京时间）">
        <el-time-picker v-model="sendTime" format="HH:mm" value-format="HH:mm" :clearable="false"
          :disabled="busy || webhookDialogVisible" aria-label="通知时间（北京时间）" @change="savePreferences" />
      </el-form-item>
      <el-form-item label="汇总提醒成员">
        <el-select v-model="summaryMemberId" clearable :value-on-clear="null" :disabled="busy || webhookDialogVisible"
          placeholder="选择接收汇总 @提醒的团队成员" aria-label="汇总提醒成员" style="width: 100%" @change="savePreferences">
          <el-option v-if="summaryMemberId && !selectedMember" :value="summaryMemberId" label="原提醒成员已退出，请重新选择" disabled />
          <el-option v-for="member in members" :key="member.userId" :value="member.userId"
            :label="`${member.userName}${member.mobile ? '' : '（未填写手机号）'}`" />
        </el-select>
      </el-form-item>
      <p v-if="summaryMemberId && !selectedMember" class="hint">原汇总提醒成员已退出团队，请重新选择或清空。</p>
      <p v-else-if="selectedMember && !selectedMember.mobile" class="hint">该成员未填写手机号，汇总将正常发送，但无法 @提醒。请在成员列表维护手机号。</p>
      <p class="hint">通过手机号 @提醒：汇总提醒所选成员；个人明细仅在未请假、数据完整且不足 8h（含未登记）时提醒本人。未填写手机号时正常发送，不 @。</p>
      <div class="webhook-row">
        <span class="webhook-label">企业微信群 Webhook</span>
        <div class="webhook-field">
          <code v-if="config.webhookConfigured">{{ config.webhookHint || '已配置' }}</code>
          <span v-else class="hint">未配置</span>
          <el-button link type="primary" :disabled="busy" @click="openWebhookDialog">{{ config.webhookConfigured ? '更换' : '配置' }}</el-button>
          <el-button type="primary" plain :disabled="busy || webhookDialogVisible || !config.webhookConfigured || reportActive" :loading="sendingReport" @click="sendNow">立即发送</el-button>
        </div>
      </div>
      <div v-if="recent.length" class="recent" role="status">
        <h5>最近发送</h5>
        <div v-for="item in recent" :key="item.id" class="latest">
          {{ date(item.createdAt) }} · {{ kindLabel(item.kind) }} · {{ stateLabel(item.state) }} · 已受理 {{ item.accepted }}/{{ item.total }} 条
          <span v-if="item.reason">{{ item.reason }}</span>
        </div>
      </div>
      <p v-else class="hint">暂无发送记录</p>
    </el-form>
    <el-dialog v-model="webhookDialogVisible" :title="config?.webhookConfigured ? '更换群 Webhook' : '配置群 Webhook'"
      width="min(560px, calc(100% - 28px))" :close-on-click-modal="false" :close-on-press-escape="!busy" :show-close="!busy"
      @closed="resetWebhookDraft">
      <el-form label-position="top" @submit.prevent="confirmWebhook">
        <el-form-item label="企业微信群 Webhook">
          <el-input v-model="webhookDraft" type="password" show-password autocomplete="off" :disabled="busy"
            placeholder="粘贴新的群机器人 Webhook 地址" aria-label="新群 Webhook 地址" />
        </el-form-item>
        <el-alert v-if="dialogError" :title="dialogError" type="error" :closable="false" show-icon />
      </el-form>
      <template #footer>
        <div class="dialog-actions">
          <el-button :disabled="busy || !webhookDraft.trim()" :loading="testing" @click="testWebhook">发送连接测试</el-button>
          <el-button :disabled="busy" @click="webhookDialogVisible = false">取消</el-button>
          <el-button type="primary" :disabled="busy || !webhookDraft.trim()" :loading="saving" @click="confirmWebhook">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getWorklogNotification, saveWorklogNotification, testWorklogNotification, sendWorklogReportNow } from '@/api/zhaogangNotification'
import { ZhaogangRequestError } from '@/api/zhaogang'
import type { WorklogNotificationStatus } from '@/types/zhaogangNotification'
import type { WorkbenchTeamMember } from '@/types/zhaogangTeam'
const props = defineProps<{ teamId: number; members: WorkbenchTeamMember[] }>()
const summaryMemberId = ref<number | null>(null)
const selectedMember = computed(() => props.members.find(member => member.userId === summaryMemberId.value))
const config = ref<WorklogNotificationStatus | null>(null)
const recent = computed(() => (config.value?.recent ?? []).slice(0, 3))
const enabled = ref(false)
const sendTime = ref('17:00')
const webhookDialogVisible = ref(false)
const webhookDraft = ref('')
const dialogError = ref('')
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const sendingReport = ref(false)
let reportRequestId: string | undefined
const error = ref('')
const busy = computed(() => loading.value || saving.value || testing.value || sendingReport.value)
const reportActive = computed(() => recent.value.some(item => item.kind !== 'TEST' && ['COLLECTING', 'READY'].includes(item.state)))
let generation = 0
let timer: ReturnType<typeof setTimeout> | undefined
const apply = (value: WorklogNotificationStatus) => {
  config.value = value
  enabled.value = value.enabled
  sendTime.value = value.sendTime
  summaryMemberId.value = value.summaryMemberId ?? null
}
const scheduleRefresh = () => {
  clearTimeout(timer)
  if (recent.value.some(item => ['COLLECTING', 'READY', 'TESTING'].includes(item.state))) {
    const current = generation
    timer = setTimeout(async () => {
      if (current !== generation) return
      try {
        const value = await getWorklogNotification(props.teamId)
        if (current !== generation) return
        if (!saving.value && config.value?.revision === value.revision) config.value = value
        scheduleRefresh()
      } catch { /* Manual refresh remains available. */ }
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
const savePreferences = async () => {
  if (!config.value || busy.value) return
  const previous = config.value
  const current = generation
  saving.value = true; error.value = ''
  try {
    const value = await saveWorklogNotification(props.teamId, {
      enabled: enabled.value, revision: previous.revision, summaryMemberId: summaryMemberId.value,
      sendTime: sendTime.value
    })
    if (current === generation) { apply(value); scheduleRefresh(); ElMessage.success('通知配置已更新') }
  } catch (e) {
    if (current === generation) { apply(previous); error.value = e instanceof Error ? e.message : '通知配置更新失败' }
  } finally { if (current === generation) saving.value = false }
}
const resetWebhookDraft = () => { webhookDraft.value = ''; dialogError.value = '' }
const openWebhookDialog = () => { resetWebhookDraft(); webhookDialogVisible.value = true }
const validWebhookDraft = () => {
  if (/^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=[A-Za-z0-9_-]{8,128}$/.test(webhookDraft.value.trim())) return true
  dialogError.value = '请输入有效的企业微信群消息 Webhook 地址'
  return false
}
const confirmWebhook = async () => {
  if (!config.value || busy.value || !validWebhookDraft()) return
  const current = generation
  saving.value = true; dialogError.value = ''
  try {
    const value = await saveWorklogNotification(props.teamId, {
      enabled: config.value.enabled, revision: config.value.revision, summaryMemberId: config.value.summaryMemberId,
      webhook: webhookDraft.value.trim()
    })
    if (current !== generation) return
    apply(value); webhookDialogVisible.value = false; resetWebhookDraft(); scheduleRefresh(); ElMessage.success('Webhook 已更新')
  } catch (e) { if (current === generation) dialogError.value = e instanceof Error ? e.message : 'Webhook 更新失败' }
  finally { if (current === generation) saving.value = false }
}
const testWebhook = async () => {
  if (!config.value || busy.value || !validWebhookDraft()) return
  const current = generation
  testing.value = true; dialogError.value = ''
  try {
    const result = await testWorklogNotification(props.teamId, config.value.revision, webhookDraft.value.trim())
    if (current !== generation) return
    apply(result.status); scheduleRefresh()
    if (result.state === 'ACCEPTED') ElMessage.success('连接测试成功')
    else dialogError.value = result.reason
  } catch (e) { if (current === generation) dialogError.value = e instanceof Error ? e.message : '连接测试失败' }
  finally { if (current === generation) testing.value = false }
}
const sendNow = async () => {
  if (!config.value?.webhookConfigured || busy.value || reportActive.value) return
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
    if (e instanceof ZhaogangRequestError && e.code !== undefined) reportRequestId = undefined
    error.value = e instanceof Error ? e.message : '工时报告触发失败'
  } finally { if (current === generation) sendingReport.value = false }
}
const stateLabel = (state: string) => ({ COLLECTING: '采集中', READY: '发送中', TESTING: '测试中', ACCEPTED: '企微已受理', FAILED: '发送失败', UNKNOWN: '结果未知，已停止', CANCELLED: '已取消', EXPIRED: '已过发送窗口' }[state] ?? state)
const kindLabel = (kind: string) => ({ DAILY: '定时报告', MANUAL: '手动报告', TEST: '连接测试' }[kind] ?? kind)
const date = (value: number) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'short', timeStyle: 'medium', hour12: false }).format(value)
watch(() => props.teamId, () => {
  config.value = null; summaryMemberId.value = null; enabled.value = false; webhookDialogVisible.value = false; resetWebhookDraft()
  saving.value = false; testing.value = false; sendingReport.value = false; reportRequestId = undefined
  void load()
}, { immediate: true })
onBeforeUnmount(() => { generation++; clearTimeout(timer); resetWebhookDraft() })
</script>

<style scoped>
.notification-section { border-top: 1px solid #e8edf4; margin-top: 20px; padding-top: 14px; }
.heading { display: flex; align-items: center; justify-content: space-between; }
.heading-title { display: flex; align-items: center; gap: 20px; }
h4 { margin: 0; font-size: 16px; }
p { color: #69778d; line-height: 1.65; font-size: 13px; }
.webhook-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px 24px; }
.webhook-label { color: var(--el-text-color-regular); font-size: 14px; }
.webhook-field { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 12px; margin-left: auto; }
.webhook-field :deep(.el-button) { margin: 0; }
.webhook-field code { color: #344158; font-size: 14px; }
.dialog-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.dialog-actions :deep(.el-button) { margin: 0; }
.hint { font-size: 12px; color: #8490a4; }
.recent { margin-top: 16px; }
h5 { margin: 0 0 8px; font-size: 13px; color: #69778d; }
.latest { padding: 10px 12px; border-radius: 6px; background: #f5f7fb; font-size: 13px; line-height: 1.8; }
.latest + .latest { margin-top: 6px; }
.latest span { display: block; color: #69778d; }
</style>
