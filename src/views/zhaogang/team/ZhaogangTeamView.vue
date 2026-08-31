<template>
  <section class="team-view">
    <div class="team-layout">
      <aside class="team-list-panel">
        <header class="team-list-toolbar">
        <el-button type="primary" :icon="Plus" @click="openCreate">创建团队</el-button>
        <el-tooltip content="刷新团队"><el-button circle :icon="Refresh" :loading="loading" aria-label="刷新团队" @click="loadTeams" /></el-tooltip>
        </header>
        <div
          v-for="(team, index) in teams"
          :key="team.id"
          class="team-list-item"
          :class="{ active: team.id === selectedTeamId }"
        >
          <button type="button" class="team-select-button" @click="selectTeam(team.id)">
            <span class="team-summary">
              <span class="team-name-row">
                <strong>{{ team.name }}</strong>
                <el-tag v-if="index === 0" size="small" effect="plain">默认工时</el-tag>
              </span>
              <small>{{ team.codingTeamKey }}</small>
            </span>
            <span class="team-count">{{ team.memberCount }} 人</span>
          </button>
          <span v-if="teams.length > 1" class="order-actions">
            <el-tooltip content="上移">
              <el-button text circle :icon="ArrowUp" :disabled="index === 0 || ordering" aria-label="上移团队" @click="moveTeam(index, -1)" />
            </el-tooltip>
            <el-tooltip content="下移">
              <el-button text circle :icon="ArrowDown" :disabled="index === teams.length - 1 || ordering" aria-label="下移团队" @click="moveTeam(index, 1)" />
            </el-tooltip>
          </span>
        </div>
        <el-empty v-if="!loading && !teams.length" description="还没有加入团队" :image-size="72" />
      </aside>

      <section class="team-detail-panel" v-loading="detailLoading">
        <template v-if="detail">
          <header class="detail-heading">
            <div>
              <div class="detail-title-row">
                <h3>{{ detail.name }}</h3>
                <el-tag v-if="detail.permissions.administrator" type="primary" effect="plain">管理员</el-tag>
              </div>
              <p>{{ detail.codingTeamKey }} · {{ detail.members.length }} 人</p>
            </div>
            <el-button v-if="detail.permissions.canRename" :icon="EditPen" @click="openRename">重命名</el-button>
          </header>

          <div class="invite-section">
            <div><strong>邀请链接</strong><span>同一 CODING 团队的成员可通过此链接加入。</span></div>
            <el-input :model-value="inviteUrl" readonly>
              <template #append>
                <el-tooltip content="复制邀请链接">
                  <el-button :icon="DocumentCopy" aria-label="复制邀请链接" @click="copyInviteUrl" />
                </el-tooltip>
              </template>
            </el-input>
          </div>

          <div class="member-heading"><h4>成员</h4><span>{{ detail.members.length }} 人</span></div>
          <el-table :data="detail.members" row-key="userId" border class="member-table">
            <el-table-column label="成员" min-width="230">
              <template #default="scope">
                <div class="member-profile">
                  <el-avatar :size="34" :src="scope.row.avatar">{{ scope.row.userName.slice(0, 1) }}</el-avatar>
                  <strong>{{ scope.row.userName }}</strong>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="加入时间" min-width="155">
              <template #default="scope">{{ formatDate(scope.row.joinedAt) }}</template>
            </el-table-column>
            <el-table-column v-if="detail.permissions.canRemoveMembers" label="操作" width="150" fixed="right">
              <template #default="scope">
                <el-button v-if="!scope.row.administrator" link type="primary" @click="openTransfer(scope.row.userId)">转交管理员</el-button>
                <el-button v-if="!scope.row.administrator" link type="danger" @click="removeMember(scope.row)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <footer class="team-actions">
            <el-button
              v-if="detail.permissions.administrator && detail.permissions.canLeave"
              :icon="Sort"
              @click="openAdministratorLeave"
            >转交并退出</el-button>
            <el-button v-else-if="detail.permissions.canLeave" :icon="CircleClose" @click="leaveAsMember">退出团队</el-button>
            <el-button v-if="detail.permissions.canDissolve" type="danger" plain :icon="Delete" @click="dissolveTeam">解散团队</el-button>
          </footer>
        </template>
        <el-empty v-else-if="!detailLoading" description="选择一个团队查看成员" :image-size="86" />
      </section>
    </div>

    <el-dialog v-model="createVisible" title="创建团队" width="min(460px, calc(100% - 28px))" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="团队名称" required><el-input v-model="createName" maxlength="64" autofocus @keyup.enter="createTeam" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="createVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="createTeam">创建</el-button></template>
    </el-dialog>

    <el-dialog v-model="renameVisible" title="重命名团队" width="min(460px, calc(100% - 28px))" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="团队名称" required><el-input v-model="renameName" maxlength="64" @keyup.enter="renameTeam" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="renameVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="renameTeam">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="successorVisible" :title="successorMode === 'leave' ? '转交并退出' : '转交管理员'" width="min(460px, calc(100% - 28px))" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="继任管理员" required>
          <el-select v-model="successorUserId" class="full-control" placeholder="选择团队成员">
            <el-option v-for="member in successorOptions" :key="member.userId" :label="member.userName" :value="member.userId" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="successorVisible = false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!successorUserId" @click="confirmSuccessor">确认</el-button></template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, ArrowUp, CircleClose, Delete, DocumentCopy, EditPen, Plus, Refresh, Sort } from '@element-plus/icons-vue'
import {
  createWorkbenchTeam,
  dissolveWorkbenchTeam,
  getWorkbenchTeam,
  getWorkbenchTeams,
  leaveWorkbenchTeam,
  removeWorkbenchTeamMember,
  reorderWorkbenchTeams,
  renameWorkbenchTeam,
  transferWorkbenchTeamAdministrator
} from '@/api/zhaogangTeam'
import type { WorkbenchTeamDetail, WorkbenchTeamListItem, WorkbenchTeamMember } from '@/types/zhaogangTeam'

const route = useRoute()
const router = useRouter()
const teams = ref<WorkbenchTeamListItem[]>([])
const selectedTeamId = ref<number | null>(null)
const detail = ref<WorkbenchTeamDetail | null>(null)
const loading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const ordering = ref(false)
const createVisible = ref(false)
const createName = ref('')
const createRequestId = ref('')
const renameVisible = ref(false)
const renameName = ref('')
const successorVisible = ref(false)
const successorUserId = ref<number | null>(null)
const successorMode = ref<'transfer' | 'leave'>('transfer')

const inviteUrl = computed(() => detail.value
  ? `${window.location.origin}/zhaogang/invitations/${detail.value.inviteCode}`
  : '')
const successorOptions = computed(() => detail.value?.members.filter(member => !member.administrator) || [])

const loadTeams = async () => {
  loading.value = true
  try {
    teams.value = await getWorkbenchTeams()
    const queryTeamId = Number(route.query.teamId)
    const preferredId = Number.isInteger(queryTeamId) && teams.value.some(team => team.id === queryTeamId)
      ? queryTeamId
      : selectedTeamId.value
    const nextId = preferredId && teams.value.some(team => team.id === preferredId) ? preferredId : teams.value[0]?.id
    if (nextId) await selectTeam(nextId, false)
    else { selectedTeamId.value = null; detail.value = null }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '团队加载失败')
  } finally { loading.value = false }
}

const selectTeam = async (teamId: number, updateRoute = true) => {
  selectedTeamId.value = teamId
  detailLoading.value = true
  try {
    detail.value = await getWorkbenchTeam(teamId)
    if (updateRoute && Number(route.query.teamId) !== teamId) {
      await router.replace({ path: '/zhaogang/teams', query: { teamId: String(teamId) } })
    }
  } catch (error) {
    detail.value = null
    ElMessage.error(error instanceof Error ? error.message : '团队详情加载失败')
  } finally { detailLoading.value = false }
}

const moveTeam = async (index: number, offset: -1 | 1) => {
  const target = index + offset
  if (ordering.value || target < 0 || target >= teams.value.length) return
  const previous = [...teams.value]
  const reordered = [...teams.value]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(target, 0, moved)
  teams.value = reordered
  ordering.value = true
  try {
    teams.value = await reorderWorkbenchTeams(reordered.map(team => team.id))
  } catch (error) {
    teams.value = previous
    ElMessage.error(error instanceof Error ? error.message : '团队顺序保存失败')
  } finally { ordering.value = false }
}

const openCreate = () => {
  createName.value = ''
  createRequestId.value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  createVisible.value = true
}

const createTeam = async () => {
  if (!createName.value.trim() || saving.value) return
  saving.value = true
  try {
    const created = await createWorkbenchTeam(createRequestId.value, createName.value.trim())
    createVisible.value = false
    selectedTeamId.value = created.id
    detail.value = created
    await loadTeams()
    await router.replace({ path: '/zhaogang/teams', query: { teamId: String(created.id) } })
    ElMessage.success('团队已创建')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '团队创建失败') } finally { saving.value = false }
}

const openRename = () => {
  if (!detail.value) return
  renameName.value = detail.value.name
  renameVisible.value = true
}

const renameTeam = async () => {
  if (!detail.value || !renameName.value.trim() || saving.value) return
  saving.value = true
  try {
    detail.value = await renameWorkbenchTeam(detail.value.id, detail.value.versionNo, renameName.value.trim())
    renameVisible.value = false
    await loadTeams()
    ElMessage.success('团队名称已更新')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '团队重命名失败') } finally { saving.value = false }
}

const copyInviteUrl = async () => {
  await navigator.clipboard.writeText(inviteUrl.value)
  ElMessage.success('邀请链接已复制')
}

const openTransfer = (userId?: number) => {
  successorMode.value = 'transfer'
  successorUserId.value = userId || null
  successorVisible.value = true
}

const openAdministratorLeave = () => {
  successorMode.value = 'leave'
  successorUserId.value = null
  successorVisible.value = true
}

const confirmSuccessor = async () => {
  if (!detail.value || !successorUserId.value || saving.value) return
  saving.value = true
  try {
    if (successorMode.value === 'leave') {
      await leaveWorkbenchTeam(detail.value.id, detail.value.versionNo, successorUserId.value)
      successorVisible.value = false
      await removeCurrentSelection('已转交管理员并退出团队')
    } else {
      detail.value = await transferWorkbenchTeamAdministrator(detail.value.id, detail.value.versionNo, successorUserId.value)
      successorVisible.value = false
      await loadTeams()
      ElMessage.success('管理员已转交')
    }
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '管理员转交失败') } finally { saving.value = false }
}

const removeMember = async (member: WorkbenchTeamMember) => {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(`确定将“${member.userName}”移出团队吗？`, '移除成员', { type: 'warning' })
    detail.value = await removeWorkbenchTeamMember(detail.value.id, member.userId, detail.value.versionNo)
    await loadTeams()
    ElMessage.success('成员已移除')
  } catch (error) { if (error instanceof Error) ElMessage.error(error.message) }
}

const leaveAsMember = async () => {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(`确定退出“${detail.value.name}”吗？`, '退出团队', { type: 'warning' })
    await leaveWorkbenchTeam(detail.value.id, detail.value.versionNo)
    await removeCurrentSelection('已退出团队')
  } catch (error) { if (error instanceof Error) ElMessage.error(error.message) }
}

const dissolveTeam = async () => {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm('解散后全部成员关系和邀请链接将立即失效，且无法恢复。', `解散“${detail.value.name}”`, {
      type: 'error', confirmButtonText: '解散团队', confirmButtonClass: 'el-button--danger'
    })
    await dissolveWorkbenchTeam(detail.value.id, detail.value.versionNo)
    await removeCurrentSelection('团队已解散')
  } catch (error) { if (error instanceof Error) ElMessage.error(error.message) }
}

const removeCurrentSelection = async (message: string) => {
  selectedTeamId.value = null
  detail.value = null
  await router.replace('/zhaogang/teams')
  await loadTeams()
  ElMessage.success(message)
}

const formatDate = (value: string) => value?.replace('T', ' ').slice(0, 16) || '—'

onMounted(loadTeams)
</script>

<style scoped>
.team-view { display: grid; min-width: 0; gap: 16px; }
.team-list-toolbar,.detail-heading,.detail-title-row,.member-heading,.team-actions,.member-profile { display: flex; align-items: center; }
.team-list-toolbar { justify-content: space-between; margin: 2px 2px 10px; }
.team-layout { display: grid; min-height: 560px; grid-template-columns: 280px minmax(0, 1fr); background: #fff; border: 1px solid #e2e7ef; border-radius: 8px; overflow: hidden; }
.team-list-panel { min-width: 0; padding: 10px; background: #f7f9fc; border-right: 1px solid #e2e7ef; }.team-list-item { display: flex; width: 100%; min-height: 64px; align-items: center; gap: 4px; margin-bottom: 6px; color: #35445b; background: transparent; border: 1px solid transparent; border-radius: 6px; }.team-list-item:hover { background: #fff; border-color: #dfe6f1; }.team-list-item.active { color: #2468e8; background: #fff; border-color: #9dbcf0; }.team-select-button { display: flex; min-width: 0; flex: 1; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 4px 10px 12px; color: inherit; text-align: left; background: transparent; border: 0; cursor: pointer; }.team-summary { min-width: 0; }.team-name-row { display: flex; min-width: 0; align-items: center; gap: 6px; }.team-list-item strong,.team-list-item small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.team-name-row strong { min-width: 0; }.team-list-item small { margin-top: 5px; color: #8a96a8; font-size: 11px; }.team-count { flex: 0 0 auto; color: #7b879a; font-size: 12px; }.order-actions { display: grid; flex: 0 0 auto; padding-right: 4px; }.order-actions :deep(.el-button) { width: 24px; height: 24px; margin: 0; }
.team-detail-panel { min-width: 0; padding: 22px; }.detail-heading { justify-content: space-between; gap: 16px; padding-bottom: 18px; border-bottom: 1px solid #e8edf4; }.detail-title-row { gap: 9px; }.detail-heading h3 { margin: 0; font-size: 20px; }.detail-heading p { margin: 6px 0 0; color: #8490a4; font-size: 13px; }
.invite-section { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 20px; align-items: center; padding: 18px 0; border-bottom: 1px solid #edf0f5; }.invite-section strong,.invite-section span { display: block; }.invite-section span { margin-top: 5px; color: #8490a4; font-size: 12px; }.member-heading { justify-content: space-between; padding: 18px 0 10px; }.member-heading h4 { margin: 0; font-size: 16px; }.member-heading span { color: #8490a4; font-size: 12px; }.member-table { width: 100%; }.member-profile { gap: 10px; }.member-profile strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.team-actions { justify-content: flex-end; gap: 8px; padding-top: 18px; }.full-control { width: 100%; }
@media(max-width:800px){.team-layout{grid-template-columns:1fr}.team-list-panel{display:flex;gap:6px;overflow-x:auto;border-right:0;border-bottom:1px solid #e2e7ef}.team-list-toolbar{flex:0 0 auto;align-self:flex-start;margin:2px 0}.team-list-item{min-width:240px}.invite-section{grid-template-columns:1fr}.team-detail-panel{padding:16px}.team-actions{align-items:stretch;flex-direction:column}.team-actions :deep(.el-button){margin-left:0}}
</style>
