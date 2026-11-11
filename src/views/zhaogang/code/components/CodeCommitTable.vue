<template>
  <section class="commit-table-card">
    <header class="commit-toolbar">
      <div class="commit-title">
        <h3>提交明细</h3>
        <span v-if="rangeLabel">{{ rangeLabel }}</span>
      </div>
      <div class="commit-filters">
        <el-select
          v-if="showRepositoryFilter"
          :model-value="depotId"
          class="repository-filter"
          filterable
          clearable
          placeholder="全部仓库"
          aria-label="筛选仓库"
          @update:model-value="$emit('depot-change', $event || null)"
        >
          <el-option
            v-for="repository in repositories"
            :key="repository.depotId"
            :value="repository.depotId"
            :label="`${repository.depotName}（${repository.projectDisplayName || repository.projectName}）`"
          />
        </el-select>
        <el-input
          v-model="keywordDraft"
          class="keyword-input"
          clearable
          placeholder="搜索提交说明"
          :maxlength="100"
          @keyup.enter="search"
          @clear="search"
        >
          <template #append><el-button :icon="Search" aria-label="搜索提交说明" @click="search" /></template>
        </el-input>
      </div>
    </header>
    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error">
      <template v-if="showRepositoryFilter" #default><el-button link type="primary" @click="$emit('retry')">重试</el-button></template>
    </el-alert>
    <el-table
      v-loading="loading"
      :data="items"
      :row-key="entryKey"
      :default-sort="sortable ? { prop: 'commitAt', order: 'descending' } : undefined"
      @sort-change="changeSort"
      border
      class="commit-table"
      :empty-text="emptyText"
    >
      <el-table-column label="时间" prop="commitAt" :sortable="sortable ? 'custom' : false" :sort-orders="['descending', 'ascending', null]" width="150">
        <template #default="scope">{{ formatCodeDateTime(scope.row.commitAt) }}</template>
      </el-table-column>
      <el-table-column label="仓库" min-width="170">
        <template #default="scope">
          <div class="repo-cell">
            <strong>{{ scope.row.depotName }}</strong>
            <small>{{ scope.row.projectDisplayName || scope.row.projectName }}</small>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分支" min-width="150">
        <template #default="scope">
          <div class="branch-cell">
            <span :title="scope.row.branches.join('、')">
              {{ branchSummary(scope.row) }}
            </span>
            <el-button
              v-if="scope.row.branchCount > 2"
              link
              type="primary"
              size="small"
              @click="toggleBranches(entryKey(scope.row))"
            >
              {{ expandedBranches.has(entryKey(scope.row)) ? '收起' : `等 ${scope.row.branchCount} 个` }}
            </el-button>
            <small v-if="expandedBranches.has(entryKey(scope.row))" class="branch-full">{{ scope.row.branches.join('、') }}</small>
            <small v-if="scope.row.branchTruncated" class="branch-truncated">分支名超过 50 个，仅展示前 50 个</small>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="提交说明" min-width="240">
        <template #default="scope">
          <span class="commit-message" :title="scope.row.message">{{ scope.row.message || '（无提交说明）' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="新增" prop="additions" :sortable="sortable ? 'custom' : false" :sort-orders="['descending', 'ascending', null]" :width="sortable ? 100 : 82" align="right">
        <template #default="scope">
          <span v-if="scope.row.additions !== null" class="add-text">+{{ formatCodeNumber(scope.row.additions) }}</span>
          <el-tooltip v-else :content="diffHint(scope.row.diffStatus)">
            <span class="muted">—</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="删除" prop="deletions" :sortable="sortable ? 'custom' : false" :sort-orders="['descending', 'ascending', null]" :width="sortable ? 100 : 82" align="right">
        <template #default="scope">
          <span v-if="scope.row.deletions !== null" class="delete-text">-{{ formatCodeNumber(scope.row.deletions) }}</span>
          <el-tooltip v-else :content="diffHint(scope.row.diffStatus)">
            <span class="muted">—</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="文件数" prop="filesChanged" :sortable="sortable ? 'custom' : false" :sort-orders="['descending', 'ascending', null]" :width="sortable ? 100 : 74" align="right">
        <template #default="scope">
          <span v-if="scope.row.filesChanged !== null">{{ scope.row.filesChanged }}</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="提交" width="100">
        <template #default="scope">
          <a
            v-if="scope.row.commitUrl"
            :href="scope.row.commitUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="commit-link"
          >{{ scope.row.shortSha }}</a>
          <span v-else class="commit-sha">{{ scope.row.shortSha }}</span>
        </template>
      </el-table-column>
    </el-table>
    <div v-if="page" class="commit-pagination">
      <span>共 {{ formatCodeNumber(page.totalRow) }} 次提交</span>
      <el-pagination
        :current-page="page.pageNumber"
        :page-size="page.pageSize"
        :total="page.totalRow"
        layout="prev, pager, next"
        background
        @current-change="$emit('page-change', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type {
  ZhaogangCodeStatsEntry,
  ZhaogangCodeStatsEntrySort,
  ZhaogangCodeStatsSortOrder,
  ZhaogangCodeStatsRepository,
  ZhaogangCodeStatsPage
} from '@/types/zhaogangCodeStats'
import { diffStatusText, formatCodeDateTime, formatCodeNumber } from '../codeStatsPresentation'

const props = withDefaults(defineProps<{
  items: ZhaogangCodeStatsEntry[]
  page: ZhaogangCodeStatsPage | null
  loading?: boolean
  error?: string
  rangeLabel?: string
  keyword?: string
  showRepositoryFilter?: boolean
  repositories?: ZhaogangCodeStatsRepository[]
  depotId?: number | null
  sortable?: boolean
  emptyText?: string
}>(), {
  loading: false,
  error: '',
  rangeLabel: '',
  keyword: '',
  showRepositoryFilter: false,
  repositories: () => [],
  depotId: null,
  sortable: false,
  emptyText: '当前范围没有已归属提交'
})

const emit = defineEmits<{
  (event: 'page-change', page: number): void
  (event: 'search', keyword: string): void
  (event: 'depot-change', depotId: number | null): void
  (event: 'sort-change', field: ZhaogangCodeStatsEntrySort, order: ZhaogangCodeStatsSortOrder): void
  (event: 'retry'): void
}>()

const changeSort = ({ prop, order }: { prop: string; order: string | null }) => {
  if (!props.sortable) return
  if (!order) {
    emit('sort-change', 'COMMIT_AT', 'DESC')
    return
  }
  const fields: Record<string, ZhaogangCodeStatsEntrySort> = {
    commitAt: 'COMMIT_AT', additions: 'ADDITIONS', deletions: 'DELETIONS', filesChanged: 'FILES_CHANGED'
  }
  if (fields[prop]) emit('sort-change', fields[prop], order === 'ascending' ? 'ASC' : 'DESC')
}

const keywordDraft = ref(props.keyword)
watch(() => props.keyword, value => { keywordDraft.value = value })
const expandedBranches = ref<Set<string>>(new Set())

const entryKey = (row: ZhaogangCodeStatsEntry) => `${row.depotId}:${row.sha}`

const branchSummary = (row: ZhaogangCodeStatsEntry) => row.branches.length
  ? row.branches.slice(0, 2).join('、')
  : '—'

const toggleBranches = (sha: string) => {
  const next = new Set(expandedBranches.value)
  if (next.has(sha)) next.delete(sha); else next.add(sha)
  expandedBranches.value = next
}

const diffHint = (status: string) => status === 'TOO_LARGE'
  ? 'diff 超过保护上限，未统计行数'
  : status === 'SKIPPED_MERGE' ? '合并提交不统计行数' : diffStatusText(status)

const search = () => emit('search', keywordDraft.value.trim())
</script>

<style scoped>
.commit-table-card { padding: 16px 18px; background: #fff; border: 1px solid #e4e9f1; border-radius: 10px; }
.commit-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
.commit-title { display: flex; align-items: baseline; gap: 10px; }
.commit-title h3 { margin: 0; color: #2b3a50; font-size: 16px; }
.commit-title span { color: #8490a4; font-size: 12px; }
.commit-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.keyword-input { width: 240px; }
.repository-filter { width: 260px; }
.commit-table { width: 100%; }
.repo-cell strong, .repo-cell small { display: block; }
.repo-cell small { margin-top: 2px; color: #96a1b2; font-size: 11px; }
.branch-cell > span { display: inline; color: #55647a; font-size: 12px; }
.branch-full { display: block; margin-top: 4px; color: #8490a4; font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; }
.branch-truncated { display: block; margin-top: 3px; color: #b07a18; font-size: 11px; }
.commit-message { display: block; overflow: hidden; color: #344158; text-overflow: ellipsis; white-space: nowrap; }
.add-text { color: #2f9e55; font-weight: 600; }
.delete-text { color: #d84a4a; font-weight: 600; }
.muted { color: #b1b9c6; }
.commit-link { color: #2468e8; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; text-decoration: none; }
.commit-link:hover { text-decoration: underline; }
.commit-sha { color: #6e7c92; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.commit-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 12px; color: #7b879a; font-size: 12px; }
@media (max-width: 760px) {
  .keyword-input, .repository-filter { width: 100%; }
  .commit-filters { width: 100%; }
  .commit-pagination { align-items: flex-start; flex-direction: column; }
}
</style>
