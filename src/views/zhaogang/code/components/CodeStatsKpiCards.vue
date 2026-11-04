<template>
  <div class="code-kpi-grid">
    <component
      :is="item.clickable ? 'button' : 'div'"
      v-for="(item, index) in items"
      :key="item.label"
      class="code-kpi-card"
      :class="[`tone-${item.tone || 'default'}`, { clickable: item.clickable }]"
      :type="item.clickable ? 'button' : undefined"
      @click="item.clickable ? $emit('select', index) : undefined"
    >
      <span class="kpi-label">{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
      <small v-if="item.hint">{{ item.hint }}</small>
    </component>
  </div>
</template>

<script setup lang="ts">
export interface CodeStatsKpiItem {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'green' | 'red' | 'blue' | 'amber'
  clickable?: boolean
}

defineProps<{ items: CodeStatsKpiItem[] }>()
defineEmits<{ (event: 'select', index: number): void }>()
</script>

<style scoped>
.code-kpi-grid { display: grid; min-width: 0; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.code-kpi-card { display: grid; gap: 5px; box-sizing: border-box; min-width: 0; padding: 15px 16px; text-align: left; background: #fff; border: 1px solid #e4e9f1; border-radius: 10px; font: inherit; }
.code-kpi-card.clickable { cursor: pointer; }
.code-kpi-card.clickable:hover { border-color: #9bbcf7; box-shadow: 0 6px 16px rgb(53 96 173 / 8%); }
.kpi-label { color: #7b879a; font-size: 12px; }
.code-kpi-card strong { color: #26344a; font-size: 24px; line-height: 1.15; }
.code-kpi-card small { color: #8a96a9; font-size: 12px; }
.tone-green strong { color: #2f9e55; }
.tone-red strong { color: #d84a4a; }
.tone-blue strong { color: #2468e8; }
.tone-amber strong { color: #cf8c10; }
</style>
