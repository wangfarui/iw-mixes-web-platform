<template>
  <div class="code-kpi-grid">
    <div
      v-for="item in items"
      :key="item.label"
      class="code-kpi-card"
      :class="`tone-${item.tone || 'default'}`"
    >
      <span class="kpi-label">{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ZhaogangCodeStatsSelfSummary } from '@/types/zhaogangCodeStats'
import { formatCodeNumber, formatSignedNumber } from '../codeStatsPresentation'

const props = defineProps<{ summary: ZhaogangCodeStatsSelfSummary }>()

const items = computed(() => {
  const { commitCount, additions, deletions, netLines, activeDays, repoCount } = props.summary
  return [
    { label: '提交次数', value: formatCodeNumber(commitCount), tone: 'blue' },
    { label: '新增代码行', value: formatCodeNumber(additions), tone: 'green' },
    { label: '删除代码行', value: formatCodeNumber(deletions), tone: 'red' },
    { label: '净增代码行', value: formatSignedNumber(netLines), tone: netLines < 0 ? 'red' : 'default' },
    { label: '活跃天数', value: `${activeDays} 天` },
    { label: '涉及仓库', value: `${repoCount} 个` }
  ]
})
</script>

<style scoped>
.code-kpi-grid { display: grid; min-width: 0; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.code-kpi-card { display: grid; gap: 5px; box-sizing: border-box; min-width: 0; padding: 15px 16px; text-align: left; background: #fff; border: 1px solid #e4e9f1; border-radius: 10px; font: inherit; }
.kpi-label { color: #7b879a; font-size: 12px; }
.code-kpi-card strong { color: #26344a; font-size: 24px; line-height: 1.15; }
.tone-green strong { color: #2f9e55; }
.tone-red strong { color: #d84a4a; }
.tone-blue strong { color: #2468e8; }
</style>
