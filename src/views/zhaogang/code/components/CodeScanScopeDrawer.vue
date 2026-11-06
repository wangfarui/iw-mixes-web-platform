<template>
  <el-drawer
    :model-value="modelValue"
    title="扫描范围与失败明细"
    size="min(760px, 100%)"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="scope-content">
      <section>
        <h3>当前查询范围</h3>
        <div class="scope-month-list">
          <div v-for="month in scan.months" :key="month.month" class="scope-month">
            <div class="scope-month-head">
              <strong>{{ month.month }}</strong>
              <el-tag :type="scanStatusTagType(month.status)" size="small" effect="light">{{ scanStatusText(month.status) }}</el-tag>
              <span v-if="month.lastSuccessfulAt">上次成功 {{ formatCodeDateTime(month.lastSuccessfulAt) }}</span>
            </div>
            <p v-if="month.mode === 'SYNC'">以下进度为后台同步任务总进度，包含其他月份；本范围状态按所选日期计算。</p>
            <p>
              仓库 {{ month.progress.reposDone }}/{{ month.progress.reposTotal }}
              · 分支 {{ month.progress.branchesDone }}/{{ month.progress.branchesTotal }}
              · 提交 {{ month.progress.commitsDone }}/{{ month.progress.commitsTotal }}
              · 行数 {{ month.progress.diffsDone }}/{{ month.progress.diffsTotal }}
            </p>
            <p v-if="month.error" class="scope-error">{{ month.error }}</p>
          </div>
        </div>
      </section>

      <section>
        <h3>覆盖情况</h3>
        <dl class="scope-stats">
          <div><dt>扫描仓库</dt><dd>{{ coverage.repoCount }}</dd></div>
          <div><dt>扫描分支</dt><dd>{{ coverage.branchCount }}</dd></div>
          <div><dt>行数完整度</dt><dd>{{ formatCodePercent(coverage.diffCoverage) }}</dd></div>
          <div><dt>失败 diff</dt><dd>{{ coverage.failedDiffCount }}</dd></div>
          <div><dt>排除合并提交</dt><dd>{{ coverage.excludedMergeCommitCount }}</dd></div>
          <div><dt>身份冲突</dt><dd>{{ coverage.identityConflictCount }}</dd></div>
        </dl>
        <div v-if="coverage.memberIssues.length" class="scope-issues">
          <strong>成员覆盖提示</strong>
          <p v-for="issue in coverage.memberIssues" :key="`${issue.user.id}-${issue.reasonCode}`">
            {{ issue.user.name }}：{{ issue.reason }}
          </p>
        </div>
        <div v-if="coverage.repoIssues.length" class="scope-issues">
          <strong>仓库与分支同步告警</strong>
          <p v-for="issue in coverage.repoIssues" :key="`${issue.depotName}-${issue.reasonCode}`">
            {{ issue.depotName }}：{{ issue.reason }}
          </p>
        </div>
      </section>

      <section>
        <h3>失败明细（后台任务范围）</h3>
        <p v-if="failures?.from && failures?.to" class="failure-range">{{ failures.from }} ~ {{ failures.to }}，包含该同步范围的全部月份。</p>
        <p v-if="retryJob" class="failure-range">
          {{ retryActive ? '正在补算行数' : '补算结果' }}：已处理 {{ retryJob.done }}/{{ retryJob.total }}，仍未统计 {{ retryJob.failed }} 条
          <template v-if="retryJob.error && !retryActive"> · {{ retryJob.error }}</template>
          <el-button v-if="retryActive && retryError" text type="primary" @click="pollRetry">重新查询进度</el-button>
        </p>
        <p v-if="retryError" class="failure-range">{{ retryError }}</p>
        <el-alert v-if="failureError" type="warning" :closable="false" show-icon :title="failureError" />
        <el-skeleton v-else-if="failureLoading" :rows="3" animated />
        <template v-else-if="failures && (failures.repoFailures.length || failures.diffFailures.length)">
          <div v-if="failures.repoFailures.length" class="failure-block">
            <strong>仓库与分支告警（{{ failures.repoFailures.length }}）</strong>
            <div v-for="item in failures.repoFailures" :key="`${item.projectName}-${item.depotName}`" class="failure-row">
              <span>{{ item.projectName }} / {{ item.depotName }}</span>
              <small>{{ item.reason }}（{{ item.reasonCode }}）</small>
            </div>
          </div>
          <div v-if="failures.diffFailures.length" class="failure-block">
            <div class="failure-actions">
              <strong>diff 失败（{{ failures.page.totalRow }}）</strong>
              <el-button v-if="canRetry && failures.diffFailures.every(item => item.depotId)"
                text type="primary" :loading="retryStarting" :disabled="retryActive"
                @click="retryFailedDiffs()">{{ failures.page.totalRow <= maxRetrySize ? '补算失败行数' : '补算本页失败行数' }}</el-button>
            </div>
            <div v-for="item in failures.diffFailures" :key="`${item.depotId ?? item.projectName + '/' + item.depotName}/${item.sha}`" class="failure-row">
              <span>{{ item.depotName }} · {{ item.commitAt ? formatCodeDateTime(item.commitAt) + ' · ' : '' }}{{ item.authorName || '未知作者' }} · {{ item.sha.slice(0, 8) }}</span>
              <div class="failure-actions">
                <small>{{ item.reason }}（{{ item.reasonCode }}）</small>
                <el-button v-if="canRetry && item.depotId" text size="small" type="primary"
                  :disabled="retryStarting || retryActive" @click="retryFailedDiffs(item)"
                  :aria-label="`补算提交 ${item.sha.slice(0, 8)}（${item.depotName}）`">补算此提交</el-button>
              </div>
            </div>
            <el-pagination
              v-if="failures.page.totalPage > 1"
              :current-page="failurePage"
              :page-size="failurePageSize"
              :total="failures.page.totalRow"
              layout="prev, pager, next"
              small
              @current-change="changeFailurePage"
            />
          </div>
        </template>
        <el-empty v-else description="该后台任务范围没有失败明细" :image-size="70" />
      </section>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getCodeStatsDiffRetry, getCodeStatsFailures, retryCodeStatsDiffs } from '@/api/zhaogangCodeStats'
import type { ZhaogangCodeStatsCoverage, ZhaogangCodeStatsDiffFailure, ZhaogangCodeStatsDiffRetryJob, ZhaogangCodeStatsFailures, ZhaogangCodeStatsScan } from '@/types/zhaogangCodeStats'
import {
  formatCodeDateTime,
  formatCodePercent,
  scanStatusTagType,
  scanStatusText
} from '../codeStatsPresentation'

const props = defineProps<{
  modelValue: boolean
  scan: ZhaogangCodeStatsScan
  coverage: ZhaogangCodeStatsCoverage
  canRetry?: boolean
}>()

const emit = defineEmits<{ (event: 'update:modelValue', value: boolean): void; (event: 'retried'): void }>()

const failures = ref<ZhaogangCodeStatsFailures | null>(null)
const failureLoading = ref(false)
const failureError = ref('')
const failurePage = ref(1)
const failurePageSize = 20
const maxRetrySize = 100
const retryJob = ref<ZhaogangCodeStatsDiffRetryJob | null>(null)
const retryActive = computed(() => retryJob.value?.status === 'QUEUED' || retryJob.value?.status === 'RUNNING')
const retryStarting = ref(false)
const retryError = ref('')
let retryTimer: ReturnType<typeof setTimeout> | undefined
let retrySequence = 0
let sequence = 0

const jobId = computed(() => {
  const months = [...props.scan.months].sort((left, right) => (right.jobId || 0) - (left.jobId || 0))
  return months.find(month => month.jobId)?.jobId || 0
})

const loadFailures = async () => {
  const current = ++sequence
  failures.value = null
  failureError.value = ''
  if (!jobId.value) {
    failureLoading.value = false
    return
  }
  failureLoading.value = true
  failureError.value = ''
  try {
    const result = await getCodeStatsFailures(jobId.value, failurePage.value, failurePageSize)
    if (current === sequence) failures.value = result
  } catch (error) {
    if (current === sequence) failureError.value = error instanceof Error ? error.message : '失败明细加载失败'
  } finally {
    if (current === sequence) failureLoading.value = false
  }
}

const changeFailurePage = (page: number) => {
  failurePage.value = page
  void loadFailures()
}

const resetRetry = () => {
  retrySequence += 1
  clearTimeout(retryTimer)
  retryJob.value = null
  retryStarting.value = false
  retryError.value = ''
}

const pollRetry = async () => {
  if (!retryJob.value || !retryActive.value) return
  clearTimeout(retryTimer)
  const current = ++retrySequence
  retryError.value = ''
  try {
    const result = await getCodeStatsDiffRetry(retryJob.value.jobId)
    if (current !== retrySequence) return
    retryJob.value = result
    if (retryActive.value) {
      retryTimer = setTimeout(pollRetry, 2500)
    } else {
      failurePage.value = 1
      if (props.modelValue) void loadFailures()
      emit('retried')
    }
  } catch (error) {
    if (current === retrySequence) retryError.value = error instanceof Error ? error.message : '查询重试进度失败'
  }
}

const retryFailedDiffs = async (selected?: ZhaogangCodeStatsDiffFailure) => {
  const sourceJob = jobId.value
  const visibleFailures = failures.value
  if (!sourceJob || !visibleFailures || !props.canRetry || retryStarting.value || retryActive.value) return
  const current = ++retrySequence
  retryStarting.value = true
  retryError.value = ''
  try {
    const batch = selected ? [selected] : visibleFailures.page.totalRow <= maxRetrySize
      ? (await getCodeStatsFailures(sourceJob, 1, maxRetrySize)).diffFailures
      : visibleFailures.diffFailures
    if (current !== retrySequence || sourceJob !== jobId.value) return
    const targets = batch.flatMap(item => item.depotId ? [{ depotId: item.depotId, sha: item.sha }] : [])
    if (!targets.length || targets.length !== batch.length) {
      await loadFailures()
      return
    }
    const result = await retryCodeStatsDiffs(sourceJob, targets)
    if (current !== retrySequence) return
    retryJob.value = result
    retryTimer = setTimeout(pollRetry, 1000)
  } catch (error) {
    if (current === retrySequence) retryError.value = error instanceof Error ? error.message : '发起重试失败'
  } finally {
    if (current === retrySequence) retryStarting.value = false
  }
}

watch([() => props.scan.scope, () => props.scan.workbenchTeamId], resetRetry)
onBeforeUnmount(resetRetry)

watch([() => props.modelValue, jobId, () => props.scan.months.find(month => month.jobId === jobId.value)?.status], ([visible]) => {
  if (!visible) {
    sequence += 1
    return
  }
  failurePage.value = 1
  void loadFailures()
})
</script>

<style scoped>
.scope-content { display: grid; gap: 24px; }
.scope-content h3 { margin: 0 0 10px; color: #2c3b51; font-size: 16px; }
.scope-month-list { display: grid; gap: 8px; }
.scope-month { padding: 11px 13px; background: #f8faff; border: 1px solid #e6ecf5; border-radius: 8px; }
.scope-month-head { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.scope-month-head span { color: #8490a4; font-size: 12px; }
.scope-month p { margin: 7px 0 0; color: #6e7c92; font-size: 12px; }
.scope-error { color: #c24545 !important; }
.scope-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin: 0; }
.scope-stats > div { padding: 10px 12px; background: #f8faff; border: 1px solid #e6ecf5; border-radius: 8px; }
.scope-stats dt { color: #7b879a; font-size: 12px; }
.scope-stats dd { margin: 4px 0 0; color: #26344a; font-size: 18px; font-weight: 600; }
.scope-issues { margin-top: 10px; padding: 11px 13px; color: #5e6c80; background: #fffaf0; border: 1px solid #f2dfb6; border-radius: 8px; font-size: 13px; }
.scope-issues p { margin: 6px 0 0; }
.failure-range { color: #6e7c92; font-size: 13px; }
.failure-block { margin-bottom: 14px; }
.failure-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.failure-row { display: grid; gap: 3px; padding: 9px 0; border-bottom: 1px solid #edf0f5; font-size: 13px; }
.failure-row small { color: #8490a4; }
</style>
