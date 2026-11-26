<script setup lang="ts">
import { computed } from 'vue'
import type { StatisticsMetric, StatisticsRanking } from '@/types/zhaogangStatistics'
import { formatDelta, formatMetric, metricLabels } from './statisticsPresentation'

const props = defineProps<{
  title: string
  color: 'blue' | 'teal'
  metrics: readonly StatisticsMetric[]
  metric: StatisticsMetric
  ranking: StatisticsRanking
  notice?: string
}>()
const emit = defineEmits<{ select: [metric: StatisticsMetric] }>()

const max = computed(() => Math.max(1, ...props.ranking.items.map(item => item.value)))
const tabName = (metric: StatisticsMetric) => ({
  UTILIZATION_RATE: '利用率', ADDITIONS: '新增行', DELETIONS: '删除行'
})[metric as 'UTILIZATION_RATE' | 'ADDITIONS' | 'DELETIONS'] ?? metricLabels[metric]
</script>

<template>
  <section class="ranking statistics-card" :class="color" :aria-label="title">
    <header>
      <div>
        <h2>{{ title }} <span class="top-label">Top 10</span></h2>
        <p>按{{ metricLabels[ranking.metric] }}降序 · {{ color === 'blue' ? '有效' : '开发成员' }} {{ ranking.coverage.sampleCount }} / {{ ranking.coverage.targetCount }} 人</p>
      </div>
      <div class="stats-segments" role="group" :aria-label="title + '指标'">
        <button v-for="item in metrics" :key="item" type="button" :aria-pressed="metric === item"
          @click="emit('select', item)">{{ tabName(item) }}</button>
      </div>
    </header>
    <p v-if="notice" class="ranking-notice" role="status">{{ notice }}</p>
    <ol v-if="ranking.items.length" class="ranking-list">
      <li v-for="item in ranking.items" :key="item.userId" :class="{ 'statistics-self': item.self }">
        <span class="statistics-rank" :class="!ranking.allZero && item.rank <= 3 ? 'rank-' + item.rank : ''">{{ item.rank }}</span>
        <span class="ranking-name">{{ item.name }} <span v-if="item.self" class="statistics-me">我</span></span>
        <span class="bar" aria-hidden="true"><i :style="{ width: item.value / max * 100 + '%' }" /></span>
        <strong>{{ formatMetric(ranking.metric, item.value, true) }}</strong>
      </li>
    </ol>
    <p v-else class="ranking-empty">暂无有效排名</p>
    <p v-if="ranking.cutoffTied" class="tied-note">第 10 条与其后成员并列</p>
    <footer class="statistics-self">
      <span>我的位置</span>
      <strong v-if="ranking.myPosition.rank != null">第 {{ ranking.myPosition.rank }} 名 / {{ ranking.coverage.sampleCount }} 人</strong>
      <span v-else class="position-unavailable">{{ ranking.myPosition.reason }}</span>
      <el-tooltip v-if="ranking.myPosition.rank != null" :disabled="!ranking.myPosition.comparisonReason"
        :content="ranking.myPosition.comparisonReason || ''" placement="top">
        <span class="position-delta" :class="{ up: (ranking.myPosition.rankDelta ?? 0) > 0, down: (ranking.myPosition.rankDelta ?? 0) < 0 }">
          较上期 {{ formatDelta(ranking.myPosition.rankDelta) }}
        </span>
      </el-tooltip>
    </footer>
  </section>
</template>

<style scoped>
.ranking { padding: 14px 15px 10px; min-width: 0; display: flex; flex-direction: column; }
header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
h2 { font-size: 17px; margin: 0 0 5px; line-height: 1.35; white-space: nowrap; }
p { margin: 0; color: var(--stats-muted); font-size: 12px; }
.top-label { color: #075eea; background: #e8f1ff; border: 1px solid #d7e6ff; border-radius: 10px; padding: 1px 7px; font-size: 11px; vertical-align: 2px; margin-left: 4px; }
.ranking-list { list-style: none; padding: 0; margin: 10px 0 8px; flex: 1; }
.ranking-notice { color: #905800; margin-top: 8px; }
li { display: grid; grid-template-columns: 23px minmax(52px, 100px) minmax(25px, 1fr) 78px; align-items: center; gap: 8px; min-height: 24px; padding: 0 4px; border-radius: 4px; }
li strong { text-align: right; font-size: 12px; white-space: nowrap; font-weight: 600; }
.ranking-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: 13px; }
.bar { height: 8px; background: #e6ebf4; border-radius: 3px; overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #5996ff, #0661f6); }
.teal .bar i { background: linear-gradient(90deg, #39cbb9, #02a792); }
.statistics-self .bar i { filter: saturate(1.45) brightness(.92); }
footer { margin-top: auto; display: flex; gap: 10px; align-items: center; border-radius: 5px; padding: 7px 9px; font-size: 12px; color: #075eea; font-weight: 600; }
footer strong { color: var(--stats-ink); }
footer .position-unavailable { font-weight: 400; color: var(--stats-muted); }
.position-delta { margin-left: auto; color: var(--stats-muted); }
.ranking-empty { display: grid; min-height: 138px; place-items: center; }
.tied-note { text-align: right; margin-bottom: 6px; }
@media (max-width: 420px) {
  li { grid-template-columns: 19px minmax(48px, 68px) minmax(16px, 1fr) 65px; gap: 5px; }
  footer { flex-wrap: wrap; }
}
</style>
