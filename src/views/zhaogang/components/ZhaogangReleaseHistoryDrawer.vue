<template>
  <el-drawer v-model="visible" title="更新日志" size="min(560px, 100%)" direction="rtl">
    <div class="release-history" aria-live="polite">
      <article v-for="release in sortedReleases" :key="release.id" class="release-entry">
        <header class="release-entry-header"><div><strong>v{{ release.version }}</strong><el-tag v-if="release.id === currentReleaseId" size="small" type="success">当前版本</el-tag></div><time>{{ formatDate(release.publishedAt) }}</time></header>
        <ul><li v-for="(item, index) in release.items" :key="`${release.id}-${index}`"><el-tag size="small" effect="plain" :type="typeTag(item.type)">{{ typeLabel(item.type) }}</el-tag><span>{{ item.text }}</span></li></ul>
      </article>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ZhaogangRelease, ZhaogangReleaseItemType } from '@/types/zhaogangRelease'

const props = defineProps<{ modelValue: boolean; releases: ZhaogangRelease[]; currentReleaseId: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const visible = computed({ get: () => props.modelValue, set: (value) => emit('update:modelValue', value) })
const sortedReleases = computed(() => [...props.releases].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)))
const typeLabel = (type: ZhaogangReleaseItemType) => ({ FEATURE: '新增', IMPROVEMENT: '优化', FIX: '修复' } as const)[type]
const typeTags: Record<ZhaogangReleaseItemType, 'success' | 'warning' | 'danger'> = { FEATURE: 'success', IMPROVEMENT: 'warning', FIX: 'danger' }
const typeTag = (type: ZhaogangReleaseItemType) => typeTags[type]
const formatDate = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
</script>

<style scoped>
.release-history { display: grid; gap: 18px; }
.release-entry { padding-bottom: 17px; border-bottom: 1px solid #e8edf4; }
.release-entry-header, .release-entry-header > div { display: flex; align-items: center; gap: 8px; }
.release-entry-header { justify-content: space-between; gap: 12px; }
.release-entry-header time { color: #8a96a8; font-size: 12px; white-space: nowrap; }
.release-entry ul { display: grid; gap: 8px; padding: 0; margin: 0; list-style: none; }
.release-entry li { display: flex; align-items: flex-start; gap: 8px; color: #526078; font-size: 13px; line-height: 1.6; }
.release-entry li :deep(.el-tag) { flex: 0 0 auto; }
</style>
