<template>
  <el-drawer
    :model-value="modelValue"
    title="未归属作者"
    size="min(720px, 100%)"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
    @open="load"
  >
    <div class="unmapped-content">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="未归属提交只计入提交次数，不统计代码行数。绑定身份后会自动补齐历史行数。"
      />
      <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-empty v-else-if="!pageData?.candidates.length" description="没有未归属作者" :image-size="70" />
      <div v-else class="candidate-list">
        <article v-for="candidate in pageData?.candidates || []" :key="candidate.identityKey" class="candidate-row">
          <div class="candidate-main">
            <div class="candidate-name">
              <strong>{{ candidate.authorName || '未知作者' }}</strong>
              <el-tag size="small" effect="plain">{{ candidate.identityType === 'EMAIL' ? '邮箱' : '作者名' }}</el-tag>
              <span>{{ candidate.commitCount }} 次提交 · {{ candidate.repoCount }} 个仓库</span>
            </div>
            <small>最近提交 {{ formatCodeDateTime(candidate.lastCommitAt) }}</small>
            <small v-if="candidate.suggestedMember">建议成员：{{ candidate.suggestedMember.name }}</small>
          </div>
          <div v-if="canManage" class="candidate-actions">
            <el-select
              :model-value="selectedMembers[candidate.identityKey] ?? candidate.suggestedMember?.id ?? null"
              class="member-select"
              filterable
              placeholder="选择成员"
              @update:model-value="selectedMembers[candidate.identityKey] = $event"
            >
              <el-option v-for="member in members" :key="member.user.id" :label="member.user.name" :value="member.user.id" />
            </el-select>
            <el-button
              type="primary"
              size="small"
              :loading="acting === candidate.identityKey"
              :disabled="!selectedMembers[candidate.identityKey] && !candidate.suggestedMember"
              @click="bind(candidate)"
            >
              绑定
            </el-button>
            <el-button size="small" :loading="acting === candidate.identityKey" @click="ignore(candidate)">忽略</el-button>
          </div>
          <span v-else class="readonly">只读</span>
        </article>
      </div>
      <el-pagination
        v-if="pageData && pageData.page.totalPage > 1"
        :current-page="pageData.page.pageNumber"
        :page-size="pageData.page.pageSize"
        :total="pageData.page.totalRow"
        layout="prev, pager, next"
        @current-change="changePage"
      />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createCodeStatsIdentity, getCodeStatsIdentities } from '@/api/zhaogangCodeStats'
import type {
  ZhaogangCodeStatsIdentityCandidate,
  ZhaogangCodeStatsIdentityPage,
  ZhaogangCodeStatsMember
} from '@/types/zhaogangCodeStats'
import { formatCodeDateTime } from '../codeStatsPresentation'

const props = defineProps<{
  modelValue: boolean
  workbenchTeamId: number | null
  members: ZhaogangCodeStatsMember[]
  canManage: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'changed'): void
}>()

const pageData = ref<ZhaogangCodeStatsIdentityPage | null>(null)
const loading = ref(false)
const error = ref('')
const acting = ref('')
const pageNumber = ref(1)
const pageSize = 50
const selectedMembers = reactive<Record<string, number | null>>({})

const load = async () => {
  if (!props.workbenchTeamId) return
  loading.value = true
  error.value = ''
  try {
    pageData.value = await getCodeStatsIdentities({
      scope: 'WORKBENCH_TEAM',
      workbenchTeamId: props.workbenchTeamId,
      pageNumber: pageNumber.value,
      pageSize
    })
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : '未归属作者加载失败'
  } finally {
    loading.value = false
  }
}

const changePage = (page: number) => {
  pageNumber.value = page
  void load()
}

const bind = async (candidate: ZhaogangCodeStatsIdentityCandidate) => {
  const memberId = selectedMembers[candidate.identityKey] ?? candidate.suggestedMember?.id
  if (!memberId || acting.value) return
  acting.value = candidate.identityKey
  error.value = ''
  try {
    await createCodeStatsIdentity({
      scope: 'WORKBENCH_TEAM',
      workbenchTeamId: props.workbenchTeamId,
      identityType: candidate.identityType,
      identityKey: candidate.identityKey,
      codingUserId: memberId,
      ignored: false,
      authorName: candidate.authorName
    })
    ElMessage.success('身份已绑定，正在补齐历史行数')
    await load()
    emit('changed')
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : '身份绑定失败'
  } finally {
    acting.value = ''
  }
}

const ignore = async (candidate: ZhaogangCodeStatsIdentityCandidate) => {
  if (acting.value) return
  acting.value = candidate.identityKey
  error.value = ''
  try {
    await createCodeStatsIdentity({
      scope: 'WORKBENCH_TEAM',
      workbenchTeamId: props.workbenchTeamId,
      identityType: candidate.identityType,
      identityKey: candidate.identityKey,
      ignored: true,
      authorName: candidate.authorName
    })
    ElMessage.success('作者已忽略')
    await load()
    emit('changed')
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : '忽略身份失败'
  } finally {
    acting.value = ''
  }
}
</script>

<style scoped>
.unmapped-content { display: grid; gap: 12px; }
.candidate-list { display: grid; gap: 8px; }
.candidate-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 13px; background: #fbfcff; border: 1px solid #e7edf6; border-radius: 9px; }
.candidate-main { min-width: 0; display: grid; gap: 4px; }
.candidate-name { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.candidate-name strong { color: #2f3e54; }
.candidate-name span { color: #7b879a; font-size: 12px; }
.candidate-main small { color: #8490a4; font-size: 12px; }
.candidate-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 7px; }
.member-select { width: 150px; }
.readonly { color: #96a1b2; font-size: 12px; }
@media (max-width: 760px) {
  .candidate-row { align-items: flex-start; flex-direction: column; }
  .candidate-actions { width: 100%; flex-wrap: wrap; }
  .member-select { flex: 1; width: auto; }
}
</style>
