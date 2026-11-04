<template>
  <section class="scan-banner" :class="`banner-${bannerType}`">
    <div class="banner-main">
      <p v-if="scan.sync" class="banner-progress">
        回补起点 {{ scan.sync.from }} · {{ scan.sync.enabled ? '后台每 3 小时增量同步' : '尚未启用持续同步' }}
        <template v-if="scan.sync.enabled && scan.sync.nextSyncAt"> · 下次 {{ formatCodeClock(scan.sync.nextSyncAt) }}</template>
      </p>
      <div class="banner-title">
        <span class="stage-text">当前范围统计</span>
        <el-tag :type="scanStatusTagType(scan.aggregateStatus)" effect="light">{{ scanStatusText(scan.aggregateStatus) }}</el-tag>
        <span v-if="activeMonth" class="stage-text">{{ scanStageText(activeMonth.stage) }}</span>
        <span v-if="activeMonth" class="stage-text">{{ activeMonth.month }} · {{ activeMonth.mode === 'SYNC' ? '持续同步' : activeMonth.mode === 'INCREMENTAL' ? '增量更新' : activeMonth.mode === 'DIFF_BACKFILL' ? '补齐行数' : '全量扫描' }} · {{ formatCodeClock(activeMonth.startedAt) }} 开始</span>
        <span v-if="refreshing && !activeMonth" class="stage-text">后台刷新中，当前展示上次成功数据</span>
      </div>
      <p v-if="activeMonth" class="banner-progress">
        <template v-if="activeMonth.stage === 'COMMITS'">
          已发现 {{ value(activeMonth.progress.reposTotal) }} 个仓库、{{ value(activeMonth.progress.branchesTotal) }} 个分支
          · 本轮已写入 {{ value(activeMonth.progress.commitsDone) }} 条提交
        </template>
        <template v-else>
          仓库 {{ value(activeMonth.progress.reposDone) }}/{{ value(activeMonth.progress.reposTotal) }}
          · 分支 {{ value(activeMonth.progress.branchesDone) }}/{{ value(activeMonth.progress.branchesTotal) }}
          · 提交 {{ value(activeMonth.progress.commitsDone) }}/{{ value(activeMonth.progress.commitsTotal) }}
          · 行数 {{ value(activeMonth.progress.diffsDone) }}/{{ value(activeMonth.progress.diffsTotal) }}
        </template>
      </p>
      <el-progress v-if="activeMonth" :indeterminate="activeMonth.stage === 'COMMITS'" :percentage="activeMonth.stage === 'COMMITS' ? 50 : scanProgressPercent(activeMonth)" :stroke-width="8" :show-text="false" />
      <p v-else-if="scan.aggregateStatus === 'NOT_STARTED'" class="banner-progress">
        当前范围尚未完成同步。查看月份只读取本地数据，不会自动扫描；可点击“立即同步”回补。
      </p>
      <p v-else-if="lastError" class="banner-error">{{ lastError }}</p>
      <p v-else class="banner-progress">
        已统计 {{ coverage.repoCount }} 个仓库 · {{ coverage.branchCount }} 个分支 · 行数完整度 {{ formatCodePercent(coverage.diffCoverage) }}
        <template v-if="coverage.excludedMergeCommitCount"> · 排除合并提交 {{ coverage.excludedMergeCommitCount }} 次</template>
      </p>
      <p v-if="activeMonth?.stage === 'COMMITS'" class="banner-progress">
        正在遍历各分支，提交按仓库写入；发现全部分支不代表扫描完成。上方统计包含此前已保存的数据，此处显示本轮进度。
      </p>
      <p v-if="coverage.partial" class="banner-cooldown">
        <template v-if="coverage.repoIssues?.length">部分仓库读取失败（{{ coverage.repoIssues.length }} 个），</template>
        当前展示已成功读取的部分数据，提交及行数统计可能尚未完整。
      </p>
      <p v-if="syncWarning" class="banner-cooldown">{{ syncWarning }}。可查看后台同步失败明细。</p>
      <p v-if="cooldownText" class="banner-cooldown">{{ cooldownText }}</p>
    </div>
    <div class="banner-side">
      <el-button v-if="activeMonth" text type="warning" :loading="cancelling" @click="cancel">取消本轮同步</el-button>
      <el-button text type="primary" @click="$emit('show-scope')">查看扫描范围</el-button>
      <el-button v-if="hasIssues" text type="warning" @click="$emit('show-scope')">{{ coverage.partial ? '查看失败明细' : '查看后台同步告警' }}</el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { cancelCodeStatsScan } from '@/api/zhaogangCodeStats'
import type {
  ZhaogangCodeScanStatus,
  ZhaogangCodeStatsCoverage,
  ZhaogangCodeStatsScan
} from '@/types/zhaogangCodeStats'
import {
  activeScanMonth,
  codeSyncWarningText,
  formatCodeClock,
  formatCodeDuration,
  formatCodePercent,
  scanProgressPercent,
  scanStageText,
  scanStatusTagType,
  scanStatusText
} from '../codeStatsPresentation'

const props = defineProps<{
  scan: ZhaogangCodeStatsScan
  coverage: ZhaogangCodeStatsCoverage
  refreshing?: boolean
}>()

const emit = defineEmits<{ (event: 'show-scope'): void; (event: 'cancelled'): void }>()
const cancelling = ref(false)
const cancel = async () => {
  if (!activeMonth.value?.jobId) return
  cancelling.value = true
  try {
    await cancelCodeStatsScan(activeMonth.value.jobId)
    emit('cancelled')
    ElMessage.info('本轮同步已取消，已保存的数据和进度会保留；定时同步继续生效')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '取消同步失败')
  } finally { cancelling.value = false }
}

const activeMonth = computed(() => activeScanMonth(props.scan.months))
const lastError = computed(() => {
  const failed = [...props.scan.months].reverse().find(month => month.error)
  return failed?.error || ''
})
const syncWarning = computed(() => codeSyncWarningText(props.scan.sync))
const hasIssues = computed(() => (props.coverage.failedDiffCount || 0) > 0
  || (props.coverage.repoIssues?.length || 0) > 0
  || (props.coverage.memberIssues?.length || 0) > 0
  || props.coverage.partial || props.coverage.truncated || Boolean(syncWarning.value))
const bannerType = computed(() => {
  const status: ZhaogangCodeScanStatus = props.scan.aggregateStatus
  if (status === 'FAILED' || status === 'INTERRUPTED') return 'danger'
  if (status === 'PARTIAL' || hasIssues.value) return 'warning'
  if (status === 'RUNNING' || status === 'QUEUED') return 'running'
  return 'success'
})
const cooldownText = computed(() => {
  const retry = props.scan.sync?.retryAfterSeconds ?? props.scan.retryAfterSeconds
  if (!retry) return ''
  if (activeMonth.value) return ''
  return `同步冷却中，约 ${formatCodeDuration(retry)} 后可再次同步`
})
const value = (input: number) => Number(input || 0)
</script>

<style scoped>
.scan-banner { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 13px 16px; border: 1px solid #dbe5f2; border-radius: 10px; background: #f7faff; }
.scan-banner.banner-running { background: #f3f8ff; border-color: #bcd4f8; }
.scan-banner.banner-warning { background: #fffaf0; border-color: #f2d9a8; }
.scan-banner.banner-danger { background: #fff6f6; border-color: #f2c4c4; }
.scan-banner.banner-success { background: #f7fbf8; border-color: #cfe5d6; }
.banner-main { min-width: 0; flex: 1 1 auto; }
.banner-title { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.stage-text { color: #5d6c81; font-size: 13px; }
.banner-progress, .banner-cooldown, .banner-error { margin: 8px 0 0; color: #6f7d92; font-size: 12px; line-height: 1.6; }
.banner-cooldown { color: #a97616; }
.banner-error { color: #c24545; }
.banner-main :deep(.el-progress) { max-width: 560px; margin-top: 9px; }
.banner-side { display: flex; flex: 0 0 auto; flex-direction: column; align-items: flex-end; gap: 2px; }
@media (max-width: 760px) {
  .scan-banner { flex-direction: column; }
  .banner-side { width: 100%; align-items: flex-start; flex-direction: row; }
}
</style>
