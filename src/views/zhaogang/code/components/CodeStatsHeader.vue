<template>
  <header class="code-stats-header">
    <div class="header-top">
      <div class="code-tabs" role="tablist" aria-label="代码统计视图">
        <button
          type="button"
          role="tab"
          :aria-selected="active === 'mine'"
          :class="{ active: active === 'mine' }"
          @click="openTab('/zhaogang/code/mine')"
        >
          我的代码
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="active === 'team'"
          :class="{ active: active === 'team' }"
          @click="openTab('/zhaogang/code/team')"
        >
          团队代码
        </button>
      </div>
      <div class="header-actions">
        <span v-if="refreshing" class="refreshing-tag">刷新中</span>
        <el-button
          v-if="scanDetails"
          link
          size="small"
          :type="scanDetailStatus && !syncInProgress ? 'warning' : 'primary'"
          :aria-expanded="scanDetailsVisible"
          :aria-controls="`${active}-code-scan-details`"
          @click="scanDetailsVisible = !scanDetailsVisible"
        >
          数据同步 {{ cacheTime || '—' }}<template v-if="scanDetailStatus"> · {{ scanDetailStatus }}</template>
          <span class="scan-detail-toggle">{{ scanDetailsVisible ? '收起详情' : '展开详情' }}</span>
        </el-button>
        <span v-else class="cache-time">数据同步 {{ cacheTime || '—' }}</span>
        <el-tooltip :content="rescanTip" :disabled="!rescanTip">
          <span>
            <el-button
              type="primary"
              plain
              size="small"
              :icon="Refresh"
              :loading="rescanLoading"
              :disabled="rescanDisabled"
              @click="$emit('rescan')"
            >
              立即同步
            </el-button>
          </span>
        </el-tooltip>
        <slot name="actions" />
      </div>
    </div>
    <div class="header-controls">
      <slot name="controls" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import type { ZhaogangCodeStatsCoverage, ZhaogangCodeStatsScan } from '@/types/zhaogangCodeStats'
import { activeScanMonth, hasCodeScanIssues, scanStatusText } from '../codeStatsPresentation'

const props = defineProps<{
  active: 'mine' | 'team'
  cacheTime: string
  scanDetails: { scan: ZhaogangCodeStatsScan; coverage: ZhaogangCodeStatsCoverage } | null
  rescanLoading?: boolean
  rescanDisabled?: boolean
  rescanTip?: string
  refreshing?: boolean
}>()

const scanDetailsVisible = defineModel<boolean>('scanDetailsVisible', { required: true })
defineEmits<{ (event: 'rescan'): void }>()

const activeMonth = computed(() => activeScanMonth(props.scanDetails?.scan.months))
const syncInProgress = computed(() => Boolean(activeMonth.value)
  || ['RUNNING', 'QUEUED'].includes(props.scanDetails?.scan.sync?.status || ''))
const scanDetailStatus = computed(() => {
  if (!props.scanDetails) return ''
  const { scan, coverage } = props.scanDetails
  if (syncInProgress.value) return scanStatusText(activeMonth.value?.status || scan.sync?.status)
  if (['FAILED', 'INTERRUPTED', 'CANCELLED'].includes(scan.aggregateStatus)) return scanStatusText(scan.aggregateStatus)
  return scan.aggregateStatus === 'PARTIAL' || hasCodeScanIssues(scan, coverage) ? '有告警' : ''
})

const router = useRouter()
const openTab = (path: string) => { void router.push(path) }
</script>

<style scoped>
.code-stats-header { display: grid; min-width: 0; gap: 12px; padding: 16px 18px; background: #fff; border: 1px solid #e4e9f1; border-radius: 10px; }
.header-top { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.code-tabs { display: inline-flex; padding: 3px; background: #f2f5fa; border-radius: 8px; }
.code-tabs button { padding: 7px 16px; color: #5c6b80; background: transparent; border: 0; border-radius: 6px; cursor: pointer; font: inherit; font-size: 14px; }
.code-tabs button.active { color: #2468e8; background: #fff; box-shadow: 0 1px 4px rgb(36 104 232 / 14%); font-weight: 600; }
.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cache-time, .refreshing-tag { color: #7b879a; font-size: 12px; white-space: nowrap; }
.scan-detail-toggle { margin-left: 6px; }
.refreshing-tag { padding: 2px 8px; color: #2468e8; background: #edf3ff; border-radius: 999px; }
.header-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
@media (max-width: 760px) {
  .header-top, .header-controls { align-items: flex-start; flex-direction: column; }
  .header-actions { width: 100%; }
}
</style>
