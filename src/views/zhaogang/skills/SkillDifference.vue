<template>
  <div class="skill-difference">
    <el-table :data="difference.files" max-height="200" empty-text="文件内容无变化">
      <el-table-column prop="path" label="文件" />
      <el-table-column label="变动" width="100">
        <template #default="{ row }">{{ labels[row.type as keyof typeof labels] }}</template>
      </el-table-column>
    </el-table>
    <pre v-if="changes?.length" class="diff-output" aria-label="SKILL.md 文本差异"><span v-for="(change, index) in changes" :key="index" :class="{ added: change.added, removed: change.removed }">{{ change.value }}</span></pre>
    <div v-else class="documents">
      <div v-if="difference.before"><strong>原 SKILL.md</strong><pre>{{ difference.before }}</pre></div>
      <div><strong>目标 SKILL.md</strong><pre>{{ difference.after }}</pre></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { diffLines } from 'diff'
import type { SkillDifference } from '@/api/zhaogangSkills'
const props = defineProps<{ difference: SkillDifference }>()
const changes = computed(() => props.difference.before && props.difference.before !== props.difference.after
  ? diffLines(props.difference.before, props.difference.after, { timeout: 100 })
  : undefined)
const labels = { added: '新增', removed: '删除', modified: '修改' }
</script>

<style scoped>
.documents { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 12px; margin-top: 12px; }
.documents > div { min-width: 0; }
pre { max-height: 240px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; background: #f5f7fa; padding: 12px; }
.diff-output .added { color: #116331; background: #def7e8; }
.diff-output .removed { color: #971c1c; background: #fde9e9; }
</style>
