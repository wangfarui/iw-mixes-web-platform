<template>
  <el-empty v-if="!entries.items.length" description="当前范围暂无工时登记" :image-size="80" />
  <div v-else class="week-list" tabindex="0" aria-label="工时记录" @scroll.passive="onScroll">
    <a
      v-for="[key, item] in rows"
      :key="key"
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
    <div v-if="hasMore" class="page-status">
      <span v-if="moreError" role="status">{{ moreError }}</span>
      <el-button link type="primary" :loading="loadingMore" @click="emit('load-more')">
        {{ moreError ? '重试' : loadingMore ? '正在加载' : '加载更多' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TopRight } from '@element-plus/icons-vue'
import type { ZhaogangWorklogEntries, ZhaogangWorklogItem, ZhaogangWorklogScope } from '@/types/zhaogang'

const props = defineProps<{
  scope: ZhaogangWorklogScope
  entries: ZhaogangWorklogEntries
  hasMore: boolean
  loadingMore: boolean
  moreError: string
}>()

const emit = defineEmits<{ 'load-more': [] }>()

const rows = computed(() => {
  const unique = new Map<number | string, ZhaogangWorklogItem>()
  for (const item of props.entries.items) {
    const key = item.workLogId > 0 ? item.workLogId : JSON.stringify([
      item.project.name, item.issue.code, item.user.id, item.startAt, item.createdAt, item.hours
    ])
    if (!unique.has(key)) unique.set(key, item)
  }
  return [...unique]
})

const onScroll = (event: Event) => {
  if (!props.hasMore || props.loadingMore || props.moreError) return
  const list = event.currentTarget as HTMLElement
  if (list.scrollHeight - list.clientHeight - list.scrollTop <= 2) emit('load-more')
}

const formatHours = (hours: number) => Number(hours || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '—'
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}
</script>

<style scoped>
.week-list { max-height: 430px; overflow-y: auto; border-top: 1px solid #edf0f5; }
.page-status { display: flex; min-height: 36px; justify-content: center; align-items: center; gap: 8px; font-size: 13px; color: #64748b; }
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
