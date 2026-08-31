<template>
  <section class="invitation-view" v-loading="loading">
    <div v-if="preview" class="invitation-panel">
      <el-avatar :size="54">{{ preview.teamName.slice(0, 1) }}</el-avatar>
      <div>
        <el-tag effect="plain">团队邀请</el-tag>
        <h2>{{ preview.teamName }}</h2>
        <p>{{ preview.codingTeamKey }} · {{ preview.memberCount }} 人</p>
      </div>
      <el-button v-if="preview.alreadyMember" type="primary" @click="enterTeam">进入团队</el-button>
      <el-button v-else type="primary" :loading="joining" @click="joinTeam">加入团队</el-button>
    </div>
    <el-result v-else-if="error" icon="error" title="无法使用此邀请" :sub-title="error">
      <template #extra><el-button @click="router.push('/zhaogang/teams')">返回团队</el-button></template>
    </el-result>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getWorkbenchTeamInvitation, joinWorkbenchTeam } from '@/api/zhaogangTeam'
import type { WorkbenchTeamInvitationPreview } from '@/types/zhaogangTeam'

const route = useRoute()
const router = useRouter()
const inviteCode = String(route.params.inviteCode || '')
const preview = ref<WorkbenchTeamInvitationPreview | null>(null)
const loading = ref(true)
const joining = ref(false)
const error = ref('')

const loadPreview = async () => {
  loading.value = true
  error.value = ''
  try { preview.value = await getWorkbenchTeamInvitation(inviteCode) } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '邀请不存在或团队已解散'
  } finally { loading.value = false }
}

const enterTeam = () => {
  if (preview.value) void router.push({ path: '/zhaogang/teams', query: { teamId: String(preview.value.teamId) } })
}

const joinTeam = async () => {
  if (joining.value) return
  joining.value = true
  try {
    const team = await joinWorkbenchTeam(inviteCode)
    ElMessage.success(`已加入“${team.name}”`)
    await router.push({ path: '/zhaogang/teams', query: { teamId: String(team.id) } })
  } catch (reason) {
    ElMessage.error(reason instanceof Error ? reason.message : '加入团队失败')
  } finally { joining.value = false }
}

onMounted(loadPreview)
</script>

<style scoped>
.invitation-view { display: grid; min-height: 480px; place-items: center; }.invitation-panel { display: grid; width: min(460px, 100%); justify-items: center; gap: 16px; padding: 36px; background: #fff; border: 1px solid #e2e7ef; border-radius: 8px; text-align: center; }.invitation-panel h2 { margin: 14px 0 7px; font-size: 24px; }.invitation-panel p { margin: 0; color: #7d899c; font-size: 13px; }
</style>
