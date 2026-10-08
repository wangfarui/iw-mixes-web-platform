<template>
  <template v-if="coverage.partial">
    <el-alert class="coverage-notice" type="warning" :closable="false" show-icon>
      <template #title>
        <div class="notice-content">
          <span>{{ title }}</span>
          <el-button v-if="coverage.memberIssues?.length" link type="warning" size="small" @click="detailsVisible = true">
            详情
          </el-button>
        </div>
      </template>
    </el-alert>
    <el-dialog v-model="detailsVisible" title="未完整取得工时的成员" width="min(640px, calc(100vw - 32px))" append-to-body>
      <el-table :data="coverage.memberIssues || []" size="small" stripe max-height="440">
        <el-table-column label="成员" min-width="120">
          <template #default="{ row }">{{ row.user.name || `用户 ${row.user.id}` }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" min-width="300" />
      </el-table>
    </el-dialog>
  </template>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ZhaogangWorklogCoverage } from '@/types/zhaogang'

defineProps<{
  coverage: ZhaogangWorklogCoverage
  title: string
}>()

const detailsVisible = ref(false)
</script>

<style scoped>
.coverage-notice { margin-bottom: 12px; }
.notice-content { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; }
</style>
