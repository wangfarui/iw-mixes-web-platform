<template>
  <div v-if="groups.length" class="scatter" role="group" aria-label="单次提交变更规模，横轴为变更文件数，纵轴为变更行数">
    <span class="axis-title axis-title--y">变更行数</span>
    <div class="plot">
      <div v-for="tick in yTicks" :key="tick.value" class="grid-y" :style="{ bottom: tick.position }">
        <span>{{ format.format(tick.value) }}</span>
      </div>
      <div v-for="tick in xTicks" :key="tick.value" class="grid-x" :style="{ left: tick.position }">
        <span>{{ format.format(tick.value) }}</span>
      </div>
      <CodeStatsChartTooltip v-for="group in groups" :key="group.key" :content="describe(group)" v-slot="{ pointerEvents }">
        <button
          type="button"
          class="point"
          :class="{ 'point--multiple': group.commits.length > 1 }"
          :style="{ left: position(group.files, xMax), bottom: position(group.lines, yMax) }"
          :aria-label="describe(group)"
          v-on="pointerEvents"
          @click="openGroup(group)"
        >{{ group.commits.length > 1 ? group.commits.length : '' }}</button>
      </CodeStatsChartTooltip>
    </div>
    <span class="axis-title axis-title--x">变更文件数</span>
  </div>
  <el-empty v-else description="所选范围暂无可绘制的提交" :image-size="70" />

  <el-dialog v-model="dialogVisible" title="提交详情" width="min(540px, 92vw)" append-to-body>
    <ul class="commit-list">
      <li v-for="commit in selectedGroup?.commits" :key="`${commit.depotId}:${commit.sha}`">
        <a v-if="commit.commitUrl" :href="commit.commitUrl" target="_blank" rel="noopener noreferrer">{{ commit.message || commit.sha.slice(0, 12) }}</a>
        <strong v-else>{{ commit.message || commit.sha.slice(0, 12) }}</strong>
        <span>{{ commit.depotName }} · {{ displayDate(commit.commitAt) }}</span>
        <span>{{ format.format(commit.filesChanged) }} 个文件 · 新增 {{ format.format(commit.additions) }} 行 · 删除 {{ format.format(commit.deletions) }} 行</span>
      </li>
    </ul>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ZhaogangCodeStatsCommitChange } from '@/types/zhaogangCodeStats'
import CodeStatsChartTooltip from './CodeStatsChartTooltip.vue'

interface PointGroup {
  key: string
  files: number
  lines: number
  commits: ZhaogangCodeStatsCommitChange[]
}

const props = defineProps<{ items: ZhaogangCodeStatsCommitChange[] }>()
const format = new Intl.NumberFormat('zh-CN')
const dialogVisible = ref(false)
const selectedGroup = ref<PointGroup | null>(null)

const groups = computed(() => {
  const byCoordinates = new Map<string, PointGroup>()
  for (const commit of props.items) {
    const files = commit.filesChanged
    const lines = commit.additions + commit.deletions
    const key = `${files}:${lines}`
    const group = byCoordinates.get(key)
    if (group) group.commits.push(commit)
    else byCoordinates.set(key, { key, files, lines, commits: [commit] })
  }
  return [...byCoordinates.values()]
})

const axisMax = (max: number) => {
  const step = Math.max(1, Math.ceil(max / 4))
  const magnitude = 10 ** Math.floor(Math.log10(step))
  const unit = [1, 2, 5, 10].find(candidate => candidate * magnitude >= step) || 10
  return unit * magnitude * 4
}
const xMax = computed(() => axisMax(groups.value.reduce((max, group) => Math.max(max, group.files), 0)))
const yMax = computed(() => axisMax(groups.value.reduce((max, group) => Math.max(max, group.lines), 0)))
const position = (value: number, max: number) => `${value / max * 100}%`
const ticks = (max: number) => Array.from({ length: 5 }, (_, index) => ({
  value: max * index / 4,
  position: position(index, 4)
}))
const xTicks = computed(() => ticks(xMax.value))
const yTicks = computed(() => ticks(yMax.value))
const displayDate = (date: string) => date.slice(0, 16).replace('T', ' ')
const describe = (group: PointGroup) => {
  const scale = `${format.format(group.files)} 个文件 · ${format.format(group.lines)} 行`
  if (group.commits.length > 1) return `${scale} · ${group.commits.length} 次提交，点击查看`
  const commit = group.commits[0]
  return `${commit.message.slice(0, 160) || commit.sha.slice(0, 12)} · ${commit.depotName} · ${displayDate(commit.commitAt)} · ${scale}（新增 ${format.format(commit.additions)} / 删除 ${format.format(commit.deletions)}）`
}
const openGroup = (group: PointGroup) => {
  if (group.commits.length === 1 && group.commits[0].commitUrl) {
    window.open(group.commits[0].commitUrl, '_blank', 'noopener,noreferrer')
    return
  }
  selectedGroup.value = group
  dialogVisible.value = true
}

watch(() => props.items, () => {
  dialogVisible.value = false
  selectedGroup.value = null
})
</script>

<style scoped>
.scatter { height: 248px; position: relative; }
.axis-title { position: absolute; font-size: 12px; color: #697990; }
.axis-title--y { top: 3px; left: 6px; }
.axis-title--x { bottom: 2px; right: 12px; }
.plot { position: absolute; inset: 29px 22px 44px 62px; border: solid #cbd6e5; border-width: 0 0 1px 1px; }
.grid-y, .grid-x { position: absolute; color: #718098; font-size: 11px; font-variant-numeric: tabular-nums; pointer-events: none; }
.grid-y { left: 0; width: 100%; border-top: 1px dashed #e2e9f3; }
.grid-y:first-child { border: 0; }
.grid-y span { position: absolute; right: calc(100% + 8px); transform: translateY(-50%); }
.grid-x { bottom: 0; height: 100%; }
.grid-x span { position: absolute; top: calc(100% + 6px); transform: translateX(-50%); }
.point { position: absolute; z-index: 1; display: grid; place-items: center; width: 14px; height: 14px; transform: translate(-50%, 50%); padding: 0; border: 2px solid #fbfcff; border-radius: 50%; background: #3288ed; color: #fff; font-size: 10px; line-height: 1; cursor: pointer; }
.point--multiple { min-width: 23px; width: auto; height: 23px; padding: 0 3px; background: #2165c1; border-radius: 12px; }
.point:hover, .point:focus-visible { z-index: 2; outline: 2px solid #2165c1; outline-offset: 1px; }
.commit-list { max-height: 50vh; overflow-y: auto; margin: 0; padding: 0; list-style: none; }
.commit-list li { display: grid; gap: 4px; padding: 10px 0; border-bottom: 1px solid #e8edf5; overflow-wrap: anywhere; }
.commit-list a { color: #2468cf; }
.commit-list span { font-size: 12px; color: #697990; }
</style>
