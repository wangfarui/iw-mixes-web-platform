<template>
  <div
    class="horizontal-chart"
    :class="{ 'horizontal-chart--scroll': scrollRows }"
    :style="scrollRows ? { '--visible-rows': scrollRows } : undefined"
    :role="scrollRows ? 'region' : undefined"
    :tabindex="scrollRows && items.length > scrollRows ? 0 : undefined"
  >
    <div v-if="!items.length" class="horizontal-empty">当前范围没有数据</div>
    <template v-else>
      <CodeStatsChartTooltip
        v-for="item in visibleItems"
        :key="item.key"
        :content="itemDetails(item)"
        v-slot="{ pointerEvents }"
      >
        <div v-on="pointerEvents" class="horizontal-row" tabindex="0" :aria-label="itemDetails(item)">
          <div class="horizontal-label">
            <strong>{{ item.label }}</strong>
            <small v-if="item.sublabel">{{ item.sublabel }}</small>
          </div>
          <div class="horizontal-track">
            <span class="horizontal-bar" :style="{ width: `${barWidth(item.value)}%` }" />
          </div>
          <div class="horizontal-value">
            <b>{{ item.value }}</b>
            <small v-if="item.detail">{{ item.detail }}</small>
          </div>
        </div>
      </CodeStatsChartTooltip>
      <el-button v-if="expandable && !scrollRows && items.length > maxItems" text type="primary" size="small" @click="expanded = !expanded">
        {{ expanded ? '收起' : `查看全部 ${items.length} 项` }}
      </el-button>
    </template>
  </div>
</template>

<script setup lang="ts">
import CodeStatsChartTooltip from './CodeStatsChartTooltip.vue'
import { computed, ref } from 'vue'
import { formatCodeNumber } from '../codeStatsPresentation'

export interface CodeStatsHorizontalItem {
  key: string | number
  label: string
  sublabel?: string
  value: number
  detail?: string
}

const props = withDefaults(defineProps<{
  items: CodeStatsHorizontalItem[]
  maxItems?: number
  expandable?: boolean
  scrollRows?: number
}>(), {
  maxItems: 10,
  expandable: false
})

const expanded = ref(false)
const maxValue = computed(() => Math.max(1, ...props.items.map(item => item.value)))
const visibleItems = computed(() => props.scrollRows || expanded.value ? props.items : props.items.slice(0, props.maxItems))
const itemDetails = (item: CodeStatsHorizontalItem) =>
  [item.label, item.sublabel, `提交 ${formatCodeNumber(item.value)} 次`, item.detail].filter(Boolean).join(' · ')
const barWidth = (value: number) => Math.max(2, Math.round(value / maxValue.value * 100))
</script>

<style scoped>
.horizontal-chart { --row-gap: 7px; display: grid; gap: var(--row-gap); }
.horizontal-chart--scroll {
  --row-height: clamp(42px, calc(3vw + 7px), 59px);
  max-block-size: calc(var(--visible-rows) * var(--row-height) + (var(--visible-rows) - 1) * var(--row-gap));
  grid-auto-rows: max-content;
  overflow: hidden auto;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: #a9b7cb transparent;
}
.horizontal-row { display: grid; grid-template-columns: minmax(0, 34%) minmax(20px, 1fr) auto; align-items: center; gap: 10px; box-sizing: border-box; width: 100%; padding: 6px 8px; color: inherit; text-align: left; background: transparent; border: 1px solid transparent; border-radius: 7px; font: inherit; }
.horizontal-chart--scroll .horizontal-row { block-size: var(--row-height); padding-block: 3px; line-height: 16px; }
.horizontal-row:hover, .horizontal-row:focus-visible { background: #f4f8ff; border-color: #d8e5fb; }
.horizontal-label { min-width: 0; }
.horizontal-label strong, .horizontal-label small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.horizontal-label strong { color: #344158; font-size: 13px; }
.horizontal-label small { margin-top: 2px; color: #96a1b2; font-size: 11px; }
.horizontal-track { height: 9px; overflow: hidden; background: #eef1f6; border-radius: 999px; }
.horizontal-bar { display: block; height: 100%; background: #409EFF; border-radius: 999px; }
.horizontal-value { min-width: 54px; text-align: right; }
.horizontal-value b { color: #344158; font-size: 13px; }
.horizontal-value small { display: block; margin-top: 2px; color: #96a1b2; font-size: 10px; white-space: nowrap; }
.horizontal-empty { padding: 28px 0; color: #96a1b2; text-align: center; font-size: 13px; }
</style>
