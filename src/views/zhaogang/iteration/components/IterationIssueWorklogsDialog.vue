<template>
  <el-dialog class="iteration-worklogs-dialog" top="8vh" :model-value="modelValue" title="已登记工时" width="min(780px, calc(100% - 28px))"
    :close-on-click-modal="!deletingId" :close-on-press-escape="!deletingId" :show-close="!deletingId"
    @update:model-value="(value: boolean) => !deletingId && emit('update:modelValue', value)">
    <div style="max-height: calc(84vh - 145px); overflow: auto">
      <p class="issue-title">{{ issue?.title }}</p>
      <div class="summary">共 {{ entries.length }} 条本地记录 · {{ total }} h <el-button link type="primary" :disabled="loading || !!deletingId" @click="reload">刷新</el-button></div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="feedback" />
      <el-table v-loading="loading" :data="entries" max-height="380" empty-text="暂无已保存的工时记录">
        <el-table-column label="登记时间" min-width="150"><template #default="{ row }">{{ dateLabel(row.registeredAt) }}</template></el-table-column>
        <el-table-column label="登记人" min-width="110"><template #default="{ row }">{{ row.creator.userName || '—' }}</template></el-table-column>
        <el-table-column label="工时" width="75"><template #default="{ row }">{{ row.spendHours }} h</template></el-table-column>
        <el-table-column label="来源 / 状态" min-width="130"><template #default="{ row }">
          <div>{{ row.source === 'CODING' ? 'CODING 同步' : 'Dev Hub 登记' }}</div>
          <el-tooltip :content="row.syncMessage || statusHint(row)" :disabled="!row.syncMessage && row.canDelete !== false">
            <span class="status">{{ statusLabel(row.syncStatus) }}</span>
          </el-tooltip>
        </template></el-table-column>
        <el-table-column v-if="canEdit" label="操作" width="80" fixed="right"><template #default="{ row }">
          <el-tooltip :content="statusHint(row)" :disabled="row.canDelete !== false"><span>
            <el-button link type="danger" :loading="deletingId === row.id" :disabled="!!deletingId || row.canDelete === false" @click="remove(row)">删除</el-button>
          </span></el-tooltip>
        </template></el-table-column>
      </el-table>
      <p class="hint">仅展示 Dev Hub 已保存的工时记录；可通过“同步 CODING 事项”更新记录。</p>
    </div>
    <template #footer><el-button :disabled="!!deletingId" @click="emit('update:modelValue', false)">关闭</el-button></template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTeamIterationIssueWorklogs, deleteTeamIterationIssueWorklog } from '@/api/zhaogangIteration'
import type { TeamIterationIssue, TeamIterationIssueWorklog } from '@/types/zhaogangIteration'
const props = defineProps<{ modelValue: boolean; iterationId: number; issue?: TeamIterationIssue; canEdit: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; changed: [] }>()
const entries = ref<TeamIterationIssueWorklog[]>([])
const loading = ref(false)
const deletingId = ref<number>()
const error = ref('')
let requestNo = 0
const total = computed(() => entries.value.reduce((sum, row) => sum + row.spendHours, 0).toFixed(2).replace(/\.00$/, ''))
const dateLabel = (value: string) => value?.replace('T', ' ').slice(0, 16) || '—'
const statusLabel = (status: string) => ({ SYNCED: '已同步', FAILED: '同步失败', PENDING: '待同步', SYNCING: '同步中', UNKNOWN: '待核对', NOT_REQUIRED: '本地记录' }[status] || status)
const statusHint = (row: TeamIterationIssueWorklog) => row.syncStatus === 'SYNCING' ? '正在同步，请稍后再试' : row.canDelete === false ? '该记录暂不可删除，请刷新或同步 CODING 事项后重试' : ''
const reload = async () => {
  const issueId = props.issue?.id
  if (!props.modelValue || !issueId) return
  const request = ++requestNo
  loading.value = true; error.value = ''
  try {
    const result = await getTeamIterationIssueWorklogs(props.iterationId, issueId)
    if (request === requestNo) entries.value = result
  } catch (failure) { if (request === requestNo) error.value = failure instanceof Error ? failure.message : '工时记录加载失败' }
  finally { if (request === requestNo) loading.value = false }
}
watch(() => [props.modelValue, props.iterationId, props.issue?.id] as const, ([visible]) => {
  ++requestNo; entries.value = []; error.value = ''; loading.value = false
  if (visible) void reload()
})
const remove = async (row: TeamIterationIssueWorklog) => {
  if (!props.issue || deletingId.value) return
  const iterationId = props.iterationId; const issueId = props.issue.id
  try {
    await ElMessageBox.confirm(`${row.creator.userName || '该用户'}于 ${dateLabel(row.registeredAt)} 登记的 ${row.spendHours} h 将被删除。${row.codingWorklogId ? '同时删除 CODING 中的对应工时记录，并归还剩余工时。' : '该记录尚未同步，仅删除本地登记记录。'}`, '删除工时记录', { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' })
  } catch { return }
  // The parent route/issue may have changed while confirmation was open.
  if (deletingId.value || !props.modelValue || props.iterationId !== iterationId || props.issue?.id !== issueId) return
  deletingId.value = row.id; error.value = ''
  try {
    await deleteTeamIterationIssueWorklog(iterationId, issueId, row.id)
    if (props.iterationId === iterationId && props.issue?.id === issueId) {
      entries.value = entries.value.filter(item => item.id !== row.id)
      ElMessage.success('工时记录已删除'); emit('changed'); await reload()
    }
  } catch (failure) { if (props.iterationId === iterationId) error.value = failure instanceof Error ? failure.message : '删除失败，请稍后重试' }
  finally { deletingId.value = undefined }
}
</script>

<style scoped>
:global(.iteration-worklogs-dialog) { display: flex; flex-direction: column; max-height: 84vh; }
:global(.iteration-worklogs-dialog .el-dialog__body) { overflow: auto; min-height: 0; }
:global(.iteration-worklogs-dialog .el-dialog__header), :global(.iteration-worklogs-dialog .el-dialog__footer) { flex-shrink: 0; }

.issue-title { font-weight: 600; overflow-wrap: anywhere; margin: 0 0 12px; }
.summary { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.hint, .status { font-size: 12px; color: var(--el-text-color-secondary); }
.hint { margin: 16px 0 0; line-height: 1.6; }
.feedback { margin-bottom: 12px; }
</style>
