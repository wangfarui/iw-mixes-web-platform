<template>
  <el-empty v-if="!entries.items.length" description="当前范围暂无工时登记" :image-size="80" />
  <div v-else class="week-list">
    <a
      v-for="item in entries.items"
      :key="item.workLogId || `${item.project.name}-${item.issue.code}-${item.startAt}`"
      class="week-row"
      :class="{ 'week-row--team': scope === 'WORKBENCH_TEAM' }"
      :href="item.issueUrl"
      target="_blank"
      rel="noopener"
    >
      <time>{{ formatTime(item.startAt) }}</time>
      <div v-if="scope === 'WORKBENCH_TEAM'" class="member-cell">
        <el-avatar :size="28" :src="item.user.avatar">{{ item.user.name?.slice(0, 1) }}</el-avatar>
        <span>{{ item.user.name }}</span>
      </div>
      <strong class="hours-cell">{{ formatHours(item.hours) }}h</strong>
      <div class="issue-cell">
        <div class="issue-title">
          <el-tag size="small" effect="plain">{{ item.issue.typeName || '事项' }}</el-tag>
          <strong>#{{ item.issue.code }} {{ item.issue.title }}</strong>
        </div>
        <small>{{ item.project.displayName || item.project.name }}</small>
        <p v-if="item.workingDesc">{{ item.workingDesc }}</p>
      </div>
      <el-icon class="external-icon"><TopRight /></el-icon>
    </a>
  </div>
</template>

<script setup lang="ts">
import { TopRight } from '@element-plus/icons-vue'
import type { ZhaogangWorklogEntries, ZhaogangWorklogScope } from '@/types/zhaogang'

defineProps<{
  scope: ZhaogangWorklogScope
  entries: ZhaogangWorklogEntries
}>()

const formatHours = (hours: number) => Number(hours || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '—'
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}
</script>

<style scoped>
.week-list { max-height: 430px; overflow-y: auto; border-top: 1px solid #edf0f5; }
.week-row { display: grid; min-height: 70px; grid-template-columns: 104px 64px minmax(260px, 1fr) 24px; align-items: center; gap: 14px; padding: 12px 4px; color: inherit; border-bottom: 1px solid #edf0f5; text-decoration: none; }
.week-row--team { grid-template-columns: 104px minmax(120px, auto) 64px minmax(260px, 1fr) 24px; }
.week-row:hover { background: #f7faff; }
.week-row time { color: #65738a; font-size: 13px; }
.member-cell { display: flex; min-width: 120px; align-items: center; gap: 8px; color: #435169; font-size: 13px; }
.hours-cell { color: #245fbf; font-size: 15px; }
.issue-cell { min-width: 0; }
.issue-title { display: flex; min-width: 0; align-items: center; gap: 8px; }
.issue-title strong { min-width: 0; overflow: hidden; color: #26344a; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.issue-cell small { display: block; margin-top: 5px; color: #8793a6; }
.issue-cell p { margin: 5px 0 0; overflow: hidden; color: #66748a; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.external-icon { color: #7c8aa0; }
@media (max-width: 760px) {
  .week-row { grid-template-columns: 86px 56px minmax(0, 1fr) 20px; gap: 9px; }
  .member-cell { grid-column: 1 / -1; grid-row: 2; min-width: 0; }
  .issue-cell { grid-column: 3; grid-row: 1; }
  .external-icon { grid-column: 4; grid-row: 1; }
}
</style>
