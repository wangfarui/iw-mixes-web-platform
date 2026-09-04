<template>
  <el-dialog v-model="visible" title="新建迭代" width="min(760px, calc(100% - 28px))" :close-on-click-modal="false">
    <el-form label-position="top">
      <div class="form-grid">
        <el-form-item label="迭代标题" required><el-input v-model="form.name" maxlength="128" placeholder="输入迭代标题" /></el-form-item>
        <el-form-item label="迭代状态" required><el-select v-model="form.stage" class="full-control"><el-option v-for="stage in stageOptions" :key="stage.value" :label="stage.label" :value="stage.value" /></el-select></el-form-item>
        <el-form-item label="开始日期"><el-date-picker v-model="form.startDate" value-format="YYYY-MM-DD" type="date" class="full-control" /></el-form-item>
        <el-form-item label="计划上线日期"><el-date-picker v-model="form.plannedReleaseDate" value-format="YYYY-MM-DD" type="date" class="full-control" /></el-form-item>
      </div>
      <el-form-item label="工作台团队" required>
        <el-select v-model="selectedTeamIds" multiple filterable class="full-control" placeholder="选择一个或多个工作台团队">
          <el-option v-for="team in teamOptions" :key="team.teamId" :label="team.teamName" :value="team.teamId" />
        </el-select>
      </el-form-item>
      <template v-for="teamId in selectedTeamIds" :key="teamId">
        <el-form-item :label="`${teamById.get(teamId)?.teamName || '工作台团队'}成员`" required>
          <el-select v-model="selectedByTeam[teamId]" multiple filterable class="full-control" placeholder="选择团队成员">
            <el-option v-for="member in teamById.get(teamId)?.members || []" :key="member.userId" :label="member.userName" :value="member.userId" />
          </el-select>
        </el-form-item>
      </template>
    </el-form>
    <el-table v-if="drafts.length" :data="drafts" border>
      <el-table-column label="团队" min-width="150"><template #default="scope"><el-tag effect="plain">{{ scope.row.teamName }}</el-tag></template></el-table-column>
      <el-table-column label="成员" min-width="180"><template #default="scope"><div class="member-cell"><el-avatar :size="28" :src="scope.row.user.avatar">{{ scope.row.user.userName.slice(0, 1) }}</el-avatar><span>{{ scope.row.user.userName }}</span><el-tag v-if="scope.row.user.userId === session?.userId" size="small" effect="plain">创建人</el-tag></div></template></el-table-column>
      <el-table-column label="角色（可选）" min-width="300"><template #default="scope"><el-select v-model="draftRoles[scope.row.key]" multiple clearable class="full-control" placeholder="可不选择角色"><el-option v-for="role in roleOptions" :key="role.value" :label="role.label" :value="role.value" /></el-select></template></el-table-column>
    </el-table>
    <el-alert v-if="!teamOptions.length && !membersLoading" class="role-alert" type="warning" :closable="false" show-icon title="请先创建或加入工作台团队" />
    <template #footer><el-button @click="visible = false">取消</el-button><el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">创建</el-button></template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref, watch, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createTeamIteration, getTeamIterationMemberOptions } from '@/api/zhaogangIteration'
import type { ZhaogangSessionStatus } from '@/types/zhaogang'
import type { TeamIterationRole, TeamIterationStage, TeamIterationTeamOption } from '@/types/zhaogangIteration'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean], created: [id: number] }>()
const sessionRef = inject<Ref<ZhaogangSessionStatus | null>>('zhaogangSession')
const session = computed(() => sessionRef?.value || null)
const visible = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const submitting = ref(false)
const membersLoading = ref(false)
const teamOptions = ref<TeamIterationTeamOption[]>([])
const selectedTeamIds = ref<number[]>([])
const selectedByTeam = reactive<Record<number, number[]>>({})
const draftRoles = reactive<Record<string, TeamIterationRole[]>>({})
const form = reactive({ name: '', stage: 'NOT_STARTED' as TeamIterationStage, startDate: '', plannedReleaseDate: '' })
const stageOptions: Array<{ value: TeamIterationStage, label: string }> = [
  { value: 'NOT_STARTED', label: '未开始' }, { value: 'DEVELOPING', label: '开发中' },
  { value: 'TESTING', label: '测试中' }, { value: 'RELEASED', label: '已上线' }
]
const roleOptions: Array<{ value: TeamIterationRole, label: string }> = [
  { value: 'PRODUCT', label: '产品' }, { value: 'BACKEND', label: '后端' }, { value: 'FRONTEND', label: '前端' }, { value: 'QA', label: '测试' }
]
const teamById = computed(() => new Map(teamOptions.value.map(team => [team.teamId, team])))
const memberKey = (teamId: number, userId: number) => `${teamId}:${userId}`
const drafts = computed(() => selectedTeamIds.value.flatMap(teamId => {
  const team = teamById.value.get(teamId)
  return (selectedByTeam[teamId] || []).map(userId => {
    const user = team?.members.find(member => member.userId === userId)
    if (!user || !team) return null
    const key = memberKey(teamId, userId)
    if (!draftRoles[key]) draftRoles[key] = []
    return { key, teamId, teamName: team.teamName, user, roles: draftRoles[key] }
  }).filter((item): item is { key: string, teamId: number, teamName: string, user: { userId: number, userName: string, avatar?: string }, roles: TeamIterationRole[] } => Boolean(item))
}))
const canSubmit = computed(() => Boolean(form.name.trim() && drafts.value.length))

watch(visible, async value => {
  if (!value) return
  Object.assign(form, { name: '', stage: 'NOT_STARTED', startDate: '', plannedReleaseDate: '' })
  selectedTeamIds.value = []
  Object.keys(selectedByTeam).forEach(key => delete selectedByTeam[Number(key)])
  Object.keys(draftRoles).forEach(key => delete draftRoles[key])
  membersLoading.value = true
  try {
    teamOptions.value = await getTeamIterationMemberOptions()
    if (teamOptions.value.length) {
      const first = teamOptions.value.find(team => session.value && team.members.some(member => member.userId === session.value?.userId)) || teamOptions.value[0]
      selectedTeamIds.value = [first.teamId]
      selectedByTeam[first.teamId] = session.value && first.members.some(member => member.userId === session.value?.userId) ? [session.value.userId] : []
    }
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '工作台团队成员加载失败') }
  finally { membersLoading.value = false }
})
watch(selectedTeamIds, ids => { Object.keys(selectedByTeam).forEach(key => { if (!ids.includes(Number(key))) delete selectedByTeam[Number(key)] }) })
const requestId = () => globalThis.crypto?.randomUUID?.() || `iteration-${Date.now()}-${Math.random().toString(16).slice(2)}`
const submit = async () => {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const detail = await createTeamIteration({ requestId: requestId(), name: form.name.trim(), stage: form.stage, startDate: form.startDate || undefined, plannedReleaseDate: form.plannedReleaseDate || undefined, members: drafts.value.map(item => ({ teamId: item.teamId, userId: item.user.userId, roles: item.roles })) })
    visible.value = false
    emit('created', detail.id)
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '迭代创建失败') }
  finally { submitting.value = false }
}
</script>
<style scoped>
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }.full-control { width: 100%; }.member-cell { display: flex; align-items: center; gap: 9px; }.role-alert { margin-top: 12px; }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
</style>
