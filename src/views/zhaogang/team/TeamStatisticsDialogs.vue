<template>
  <el-dialog
    :model-value="mode === 'token'"
    title="管理令牌"
    width="min(500px, calc(100% - 28px))"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @update:model-value="close"
  >
    <div class="dialog-body" v-loading="loading">
      <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
        <el-button link type="primary" @click="load">重试</el-button>
      </el-alert>
      <template v-else-if="status">
        <dl class="token-status">
          <dt>状态</dt><dd>{{ status.configured ? '已配置' : '未配置' }}</dd>
          <template v-if="status.configured">
            <dt>所属账号</dt><dd>{{ status.ownerName }}（{{ status.ownerUserId }}）</dd>
            <dt>最后验证</dt><dd>{{ status.verifiedAt?.replace('T', ' ') || '—' }}</dd>
          </template>
        </dl>
        <p class="field-help">用于读取手动添加成员在 CODING 的工时和代码数据。</p>
        <el-form label-position="top" @submit.prevent="saveToken">
          <el-form-item :label="status.configured ? '新管理令牌' : 'CODING 访问令牌'">
            <el-input
              v-model="token"
              type="password"
              autocomplete="new-password"
              placeholder="粘贴 CODING PAT"
              :maxlength="512"
              :disabled="saving"
              @keydown.enter.prevent="saveToken"
            />
          </el-form-item>
        </el-form>
      </template>
      <el-alert v-if="submitError" :title="submitError" type="error" :closable="false" show-icon />
    </div>
    <template #footer>
      <el-button :disabled="saving" @click="close(false)">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="loading || !status || !token.trim()" @click="saveToken">
        {{ status?.configured ? '更换令牌' : '保存令牌' }}
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    :model-value="mode === 'members'"
    title="添加成员"
    width="min(520px, calc(100% - 28px))"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @update:model-value="close"
  >
    <div class="dialog-body" v-loading="loading">
      <el-button
        v-if="status?.configured && team.memberSourceProjectId"
        class="source-action"
        link type="primary"
        :disabled="loading || saving"
        @click="changeProjectSource"
      >{{ matchTeamName ? '使用已关联项目' : '按团队名称重新匹配项目' }}</el-button>
      <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
        <el-button link type="primary" @click="load">重试</el-button>
      </el-alert>
      <template v-else-if="status">
        <el-alert v-if="!status.configured" title="请先配置团队管理令牌" type="warning" :closable="false" show-icon>
          <el-button link type="primary" @click="$emit('update:mode', 'token')">管理令牌</el-button>
        </el-alert>
        <template v-else-if="source">
          <p class="source-project"><span>来源项目</span> <strong>{{ source.projectName }}</strong></p>
          <p v-if="matchTeamName && team.memberSourceProjectId !== source.projectId" class="field-help">
            添加成功后，本团队将使用这个项目查找后续成员。
          </p>
          <el-form label-position="top" @submit.prevent="saveMembers">
            <el-form-item label="CODING 成员">
              <el-select
                v-model="selectedIds"
                multiple filterable clearable
                aria-label="CODING 成员"
                placeholder="按姓名或用户 ID 搜索"
                no-data-text="没有可添加的成员"
                no-match-text="没有匹配的成员"
                :multiple-limit="100"
                :disabled="loading || saving"
                class="member-picker"
              >
                <el-option
                  v-for="candidate in availableCandidates"
                  :key="candidate.userId"
                  :value="candidate.userId"
                  :label="`${candidate.userName} · ${candidate.userId}`"
                />
              </el-select>
            </el-form-item>
          </el-form>
          <p class="field-help">成员加入后，默认使用团队管理令牌统计工时和代码。</p>
        </template>
      </template>
      <el-alert v-if="submitError" :title="submitError" type="error" :closable="false" show-icon />
    </div>
    <template #footer>
      <el-button :disabled="saving" @click="close(false)">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="loading || !selectedIds.length" @click="saveMembers">
        {{ selectedIds.length ? `添加 ${selectedIds.length} 人` : '添加' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  addWorkbenchTeamMembers,
  getWorkbenchTeamManagementTokenStatus,
  getWorkbenchTeamMemberCandidates,
  updateWorkbenchTeamManagementToken
} from '@/api/zhaogangTeam'
import type {
  WorkbenchTeamDetail,
  WorkbenchTeamManagementTokenStatus,
  WorkbenchTeamMemberCandidates
} from '@/types/zhaogangTeam'

const props = defineProps<{ team: WorkbenchTeamDetail, mode: 'token' | 'members' | null }>()
const emit = defineEmits<{
  'update:mode': [mode: typeof props.mode]
  updated: [team: WorkbenchTeamDetail]
}>()
const loading = ref(false)
const saving = ref(false)
const status = ref<WorkbenchTeamManagementTokenStatus | null>(null)
const source = ref<WorkbenchTeamMemberCandidates | null>(null)
const matchTeamName = ref(false)
const selectedIds = ref<number[]>([])
const token = ref('')
const loadError = ref('')
const submitError = ref('')
let requestId = 0
const availableCandidates = computed(() => {
  const current = new Set(props.team.members.map(member => member.userId))
  return (source.value?.members ?? []).filter(candidate => !current.has(candidate.userId))
})

const load = async () => {
  if (!props.mode || loading.value) return
  const id = ++requestId
  const { mode, team } = props
  loading.value = true
  loadError.value = ''
  try {
    const next = await getWorkbenchTeamManagementTokenStatus(team.id)
    if (id !== requestId) return
    status.value = next
    if (mode === 'members' && next.configured) {
      const available = await getWorkbenchTeamMemberCandidates(team.id, matchTeamName.value)
      if (id !== requestId) return
      if (!available?.projectId || !available.versionNo) {
        throw new Error('请更新后端服务后再按 CODING 项目添加成员')
      }
      source.value = available
    }
  } catch (error) {
    if (id === requestId) loadError.value = error instanceof Error ? error.message : '加载失败，请重试'
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch(() => [props.team.id, props.mode], () => {
  requestId++
  loading.value = false
  saving.value = false
  status.value = null
  source.value = null
  matchTeamName.value = false
  selectedIds.value = []
  token.value = ''
  loadError.value = ''
  submitError.value = ''
  if (props.mode) void load()
}, { immediate: true })

const changeProjectSource = () => {
  if (loading.value || saving.value) return
  matchTeamName.value = !matchTeamName.value
  source.value = null
  selectedIds.value = []
  submitError.value = ''
  void load()
}

const close = (visible: boolean) => {
  if (!visible && !saving.value) emit('update:mode', null)
}

const submit = async (update: () => Promise<WorkbenchTeamDetail>, success: (next: WorkbenchTeamDetail) => string) => {
  if (saving.value || loading.value) return
  const id = requestId
  saving.value = true
  submitError.value = ''
  try {
    const next = await update()
    if (id !== requestId) return
    emit('updated', next)
    emit('update:mode', null)
    ElMessage.success(success(next))
  } catch (error) {
    if (id === requestId) submitError.value = error instanceof Error ? error.message : '保存失败，请重试'
  } finally {
    if (id === requestId) saving.value = false
  }
}

const saveToken = () => {
  const value = token.value.trim()
  if (!status.value || !value) return
  if (/\s/.test(value)) {
    submitError.value = '请粘贴一枚有效的 CODING PAT'
    return
  }
  const { id, versionNo } = props.team
  void submit(() => updateWorkbenchTeamManagementToken(id, versionNo, value), () => '管理令牌已保存')
}

const saveMembers = () => {
  if (!source.value) return
  const { projectId, versionNo } = source.value
  const selectable = new Set(availableCandidates.value.map(candidate => candidate.userId))
  const userIds = selectedIds.value.filter(userId => selectable.has(userId))
  if (!userIds.length) return
  void submit(() => addWorkbenchTeamMembers(props.team.id, versionNo, projectId, matchTeamName.value, userIds), next => {
    const needsRole = next.members.some(member => userIds.includes(member.userId) && !member.codingRole)
    return needsRole ? '成员已添加。开发成员补设角色后会纳入团队代码统计。' : '成员已添加'
  })
}
</script>

<style scoped>
.dialog-body { min-height: 82px; }
.token-status { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 18px; margin: 0; }
.token-status dt, .field-help { color: var(--el-text-color-secondary); }
.token-status dd { margin: 0; overflow-wrap: anywhere; }
.field-help { margin: 12px 0; font-size: 13px; }
.member-picker { width: 100%; }
.source-action { margin-bottom: 12px; }
.source-project { margin: 0 0 12px; overflow-wrap: anywhere; }
.source-project span { color: var(--el-text-color-secondary); margin-right: 6px; }
</style>
