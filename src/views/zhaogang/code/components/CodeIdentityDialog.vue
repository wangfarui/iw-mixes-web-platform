<template>
  <el-dialog
    :model-value="modelValue"
    :title="scope === 'SELF' ? '我的 Git 身份' : '团队代码身份映射'"
    width="min(820px, calc(100% - 32px))"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
    @open="load"
  >
    <div class="identity-dialog">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        :title="scope === 'SELF'
          ? '首次根据本人 PAT 初始化 CODING 作者名和邮箱；命中任一有效身份即计入统计，可新增或删除身份。邮箱只保存哈希。'
          : '团队统一使用成员本人维护的 Git 身份，邮箱或作者名命中即可；身份冲突的提交不重复归属。'"
      />
      <p v-if="scope === 'SELF'" class="readonly-hint">绑定按提交中的原始邮箱或作者名精确匹配，不支持通配符。新增身份后，查看的月份会重新读取提交；删除后立即从统计中排除，不会自动恢复。</p>
      <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />

      <el-form v-if="scope === 'SELF'" class="identity-form" inline @submit.prevent="createSelfIdentity">
        <el-form-item label="类型">
          <el-select v-model="form.type" class="type-select">
            <el-option label="邮箱" value="EMAIL" />
            <el-option label="作者名" value="NAME" />
          </el-select>
        </el-form-item>
        <el-form-item label="值">
          <el-input v-model="form.value" class="value-input" :placeholder="form.type === 'EMAIL' ? 'me@example.com' : 'Git 作者名'" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" :disabled="!form.value.trim()" @click="createSelfIdentity">绑定身份</el-button>
        </el-form-item>
      </el-form>

      <el-skeleton v-if="loading" :rows="4" animated />
      <el-table v-else :data="pageData?.mappings || []" border class="identity-table" empty-text="还没有绑定任何身份">
        <el-table-column label="类型" width="72">
          <template #default="{ row }">{{ row.identityType === 'EMAIL' ? '邮箱' : '作者名' }}</template>
        </el-table-column>
        <el-table-column label="身份" min-width="170">
          <template #default="{ row }">
            <span class="identity-value">{{ row.displayValue || row.authorName || '—' }}</span>
            <small v-if="scope === 'WORKBENCH_TEAM' && row.authorName && row.authorName !== row.displayValue" class="identity-author">{{ row.authorName }}</small>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="84">
          <template #default="{ row }">
            <el-tag size="small" effect="light" :type="row.source === 'AUTO' ? 'info' : 'success'">
              {{ row.source === 'DEFAULT' || row.source === 'AUTO' ? '默认' : row.source === 'SELF' ? '本人' : '手动' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="归属成员" min-width="240">
          <template #default="{ row }">
            <el-select
              v-if="scope === 'SELF' && canManage && !row.ignored"
              :model-value="row.member?.id ?? null"
              class="member-select"
              clearable
              filterable
              placeholder="选择成员"
              @update:model-value="changeMember(row, $event)"
            >
              <el-option v-for="member in memberOptions" :key="member.id" :label="memberLabel(member)" :value="member.id" />
            </el-select>
            <span v-else-if="row.ignored" class="muted">已忽略</span>
            <span v-else>{{ row.member ? memberLabel(row.member) : '未归属' }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="scope === 'SELF' && canManage" label="操作" width="172" align="right">
          <template #default="{ row }">
            <el-button v-if="!row.ignored" link type="warning" @click="toggleIgnore(row, true)">忽略</el-button>
            <el-button v-else link type="primary" @click="toggleIgnore(row, false)">取消忽略</el-button>
            <el-button link type="danger" @click="removeMapping(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <p v-if="scope === 'WORKBENCH_TEAM'" class="readonly-hint">团队身份由成员各自在“我的 Git 身份”中维护，个人统计与团队统计同步使用。</p>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createCodeStatsIdentity,
  deleteCodeStatsIdentity,
  getCodeStatsIdentities,
  updateCodeStatsIdentity
} from '@/api/zhaogangCodeStats'
import type {
  ZhaogangCodeIdentityType,
  ZhaogangCodeStatsIdentityMapping,
  ZhaogangCodeStatsIdentityPage,
  ZhaogangCodeStatsMember,
  ZhaogangCodeStatsUser,
  ZhaogangCodeStatsScope
} from '@/types/zhaogangCodeStats'

const props = defineProps<{
  modelValue: boolean
  scope: ZhaogangCodeStatsScope
  workbenchTeamId: number | null
  members: ZhaogangCodeStatsMember[]
  canManage: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'changed'): void
}>()

const pageData = ref<ZhaogangCodeStatsIdentityPage | null>(null)
// 个人视图不传团队成员列表，已绑定身份自身仍提供完整的 CODING 用户信息。
const memberOptions = computed(() => {
  const users = new Map<number, ZhaogangCodeStatsUser>()
  for (const mapping of pageData.value?.mappings || []) {
    if (mapping.member) users.set(mapping.member.id, mapping.member)
  }
  for (const member of props.members) users.set(member.user.id, member.user)
  return [...users.values()]
})
const memberLabel = (member: ZhaogangCodeStatsUser) => `${member.name || '未知用户'}（${member.id}）`

const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const form = reactive<{ type: ZhaogangCodeIdentityType; value: string }>({ type: 'EMAIL', value: '' })

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    pageData.value = await getCodeStatsIdentities({
      scope: props.scope,
      workbenchTeamId: props.scope === 'WORKBENCH_TEAM' ? props.workbenchTeamId : null,
      pageNumber: 1,
      pageSize: 100
    })
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : '身份映射加载失败'
  } finally {
    loading.value = false
  }
}

const createSelfIdentity = async () => {
  const value = form.value.trim()
  if (!value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    await createCodeStatsIdentity({
      scope: 'SELF',
      identityType: form.type,
      identityValue: value
    })
    form.value = ''
    ElMessage.success('Git 身份已绑定，当前月份将重新扫描')
    await load()
    emit('changed')
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : '身份绑定失败'
  } finally {
    submitting.value = false
  }
}

const changeMember = async (mapping: ZhaogangCodeStatsIdentityMapping, memberId: number | null) => {
  if (!memberId) return
  try {
    await updateCodeStatsIdentity(mapping.id, { codingUserId: memberId, ignored: false })
    ElMessage.success('身份归属已更新')
    await load()
    emit('changed')
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : '身份更新失败'
  }
}

const toggleIgnore = async (mapping: ZhaogangCodeStatsIdentityMapping, ignored: boolean) => {
  try {
    await updateCodeStatsIdentity(mapping.id, ignored ? { ignored: true } : { ignored: false })
    ElMessage.success(ignored ? '身份已忽略' : '身份已取消忽略')
    await load()
    emit('changed')
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : '身份更新失败'
  }
}

const removeMapping = async (mapping: ZhaogangCodeStatsIdentityMapping) => {
  try {
    await ElMessageBox.confirm('删除后不再统计仅由该身份命中的提交，该身份不会自动恢复。确定删除吗？', '删除身份映射', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteCodeStatsIdentity(mapping.id)
    ElMessage.success('身份映射已删除')
    await load()
    emit('changed')
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : '身份映射删除失败'
  }
}
</script>

<style scoped>
.identity-dialog { display: grid; gap: 12px; }
.identity-form { margin-top: 4px; }
.type-select { width: 106px; }
.value-input { width: 260px; }
.identity-table { width: 100%; }
.identity-value { color: #344158; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
.identity-author { display: block; margin-top: 3px; color: #96a1b2; font-size: 11px; }
.member-select { width: 100%; }
.muted { color: #8a96a9; }
.readonly-hint { margin: 0; color: #8490a4; font-size: 12px; }
</style>
