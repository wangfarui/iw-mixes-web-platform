<template>
  <el-dialog class="iteration-remove-dialog" top="8vh" :model-value="modelValue" :title="selectedIds.length > 1 ? '批量移除事项' : '移除事项'"
    width="min(620px, calc(100% - 28px))" :close-on-click-modal="!submitting" :close-on-press-escape="!submitting"
    :show-close="!submitting" @update:model-value="(value: boolean) => !submitting && emit('update:modelValue', value)">
    <div style="max-height: calc(84vh - 145px); overflow: auto">
      <p v-if="selectedIds.length === 1">确认移除「{{ rows.find(row => row.selected)?.issue.title }}」{{ rows.length > 1 ? '及其子事项' : '' }}？</p>
      <p>已选择 {{ selectedIds.length }} 个事项，包含其子事项后，共移除 <strong>{{ rows.length }}</strong> 个事项。</p>
      <p class="muted">其中 {{ codingCount }} 个已关联 CODING，{{ rows.filter(row => !row.issue.issueCode).length }} 个仅存在于 Dev Hub。</p>
      <el-collapse v-if="rows.length" class="scope-collapse">
        <el-collapse-item title="查看事项清单" name="scope">
          <div class="scope-list">
            <div v-for="row in rows" :key="row.issue.id" class="scope-row" :style="{ paddingLeft: `${Math.min(row.depth, 6) * 16}px` }">
              <el-tag size="small" type="info">{{ row.issue.issueTypeName }}</el-tag>
              <span class="scope-title">{{ row.issue.issueCode ? `#${row.issue.issueCode} ` : '' }}{{ row.issue.title }}</span>
              <span class="scope-origin">{{ row.selected ? '已选' : '随父事项移除' }}</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
      <el-checkbox v-model="deleteCoding" :disabled="submitting || !codingCount">同时删除 CODING 事项</el-checkbox>
      <p v-if="deleteCoding" class="danger">将同时删除上述事项关联的 {{ codingCount }} 个 CODING 事项。</p>
      <p v-else class="muted">仅从 Dev Hub 移除事项及其子事项，保留 CODING 数据。</p>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    </div>
    <template #footer>
      <el-button :disabled="submitting" @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="danger" :loading="submitting" :disabled="!rows.length" @click="emit('confirm', deleteCoding, rows.map(row => row.issue.id))">确认移除</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TeamIterationIssue } from '@/types/zhaogangIteration'
import { iterationRemovalScope, removalCodingCount } from '../iterationRemovalScope'
const props = defineProps<{ modelValue: boolean; issues: TeamIterationIssue[]; selectedIds: number[]; submitting: boolean; error: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; confirm: [deleteCoding: boolean, expectedIssueIds: number[]] }>()
const deleteCoding = ref(false)
const rows = computed(() => iterationRemovalScope(props.issues, props.selectedIds))
const codingCount = computed(() => removalCodingCount(rows.value))
watch(() => props.modelValue, visible => { if (visible) deleteCoding.value = false })
</script>

<style scoped>
:global(.iteration-remove-dialog) { display: flex; flex-direction: column; max-height: 84vh; }
:global(.iteration-remove-dialog .el-dialog__body) { overflow: auto; min-height: 0; }
:global(.iteration-remove-dialog .el-dialog__header), :global(.iteration-remove-dialog .el-dialog__footer) { flex-shrink: 0; }

p { line-height: 1.65; margin: 0 0 12px; }
.muted { color: var(--el-text-color-secondary); font-size: 13px; }
.danger { color: var(--el-color-danger); font-size: 13px; }
.scope-collapse { margin-bottom: 16px; }
.scope-list { max-height: 280px; overflow: auto; }
.scope-row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
.scope-title { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.scope-origin { color: var(--el-text-color-secondary); font-size: 12px; flex-shrink: 0; }
@media (max-width: 480px) { .scope-origin { max-width: 60px; } }
</style>
