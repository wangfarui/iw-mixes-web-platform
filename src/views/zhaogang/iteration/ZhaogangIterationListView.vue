<template>
  <section class="iteration-board-view">
    <header class="board-toolbar">
      <div class="toolbar-filters">
        <el-select
          v-model="memberUserId"
          clearable
          filterable
          remote
          :remote-method="searchMembers"
          :loading="membersLoading"
          placeholder="参与人"
          @change="reloadBoard"
        >
          <el-option v-for="member in memberOptions" :key="member.userId" :label="member.userName" :value="member.userId" />
        </el-select>
        <el-input v-model="keyword" clearable :prefix-icon="Search" placeholder="标题" @keyup.enter="reloadBoard" @clear="reloadBoard" />
        <el-button :icon="Search" @click="reloadBoard">筛选</el-button>
      </div>
      <div class="toolbar-actions">
        <el-button type="primary" :icon="Plus" @click="editorVisible = true">新建迭代</el-button>
      </div>
    </header>

    <div class="board-scroll">
      <section v-for="stage in stages" :key="stage.value" class="board-column">
        <header class="column-header">
          <div><span class="stage-mark" :class="stage.value.toLowerCase()" /><strong>{{ stage.label }}</strong><span>{{ columns[stage.value].total }}</span></div>
          <el-button circle text :icon="Refresh" :loading="columns[stage.value].loading" title="刷新" @click="loadColumn(stage.value, true)" />
        </header>
        <div class="column-body" @scroll="onColumnScroll($event, stage.value)">
          <draggable
            v-model="columns[stage.value].items"
            item-key="id"
            tag="div"
            class="iteration-card-list"
            :data-stage="stage.value"
            :group="{ name: 'iteration-stages', pull: true, put: true }"
            :sort="true"
            :move="canMoveIteration"
            :animation="160"
            ghost-class="iteration-card-ghost"
            chosen-class="iteration-card-chosen"
            @start="onDragStart($event, stage.value)"
            @add="onDrop($event, stage.value)"
            @update="onDrop($event, stage.value)"
            @end="onDragEnd"
          >
            <template #item="{ element: item }">
              <button
                type="button"
                :class="['iteration-card', { 'iteration-card-transitioning': transitioningIds.has(item.id) }]"
                :disabled="transitioningIds.has(item.id)"
                @click="openDetail(item.id)"
              >
                <header>
                  <strong>{{ item.name }}</strong>
                  <span v-if="item.version">{{ item.version }}</span>
                </header>
                <div class="card-meta">
                  <span>{{ item.startDate || '未设置' }} - {{ item.plannedReleaseDate || '未设置' }}</span>
                  <span><Link :size="14" />{{ item.issueCount }}</span>
                </div>
                <footer>
                  <el-avatar-group>
                    <el-avatar v-for="member in item.members.slice(0, 5)" :key="member.user.userId" :size="26" :src="member.user.avatar" :title="member.user.userName">
                      {{ member.user.userName.slice(0, 1) }}
                    </el-avatar>
                  </el-avatar-group>
                  <span>{{ item.creator.userName }} · {{ formatDate(item.updatedAt) }}</span>
                </footer>
              </button>
            </template>
          </draggable>
          <el-empty v-if="!columns[stage.value].loading && !columns[stage.value].items.length" :image-size="54" description="暂无迭代" />
          <div v-if="columns[stage.value].loading" class="column-state">加载中...</div>
          <div v-else-if="columns[stage.value].finished && columns[stage.value].items.length" class="column-state">已加载全部</div>
        </div>
      </section>
    </div>

    <IterationEditorDialog v-model="editorVisible" @created="created" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Link, Plus, Refresh, Search } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { getTeamIterations, getTeamIterationTeamMembers, transitionTeamIteration } from '@/api/zhaogangIteration'
import type { TeamIterationListItem, TeamIterationStage, TeamIterationUser } from '@/types/zhaogangIteration'
import IterationEditorDialog from './components/IterationEditorDialog.vue'

interface ColumnState { items: TeamIterationListItem[], total: number, pageNumber: number, loading: boolean, finished: boolean }
interface DragContext { sourceStage: TeamIterationStage, sourceIndex: number, item: TeamIterationListItem }
interface DragEvent { oldIndex?: number, newIndex?: number }

const router = useRouter()
const editorVisible = ref(false)
const keyword = ref('')
const memberUserId = ref<number>()
const membersLoading = ref(false)
const memberOptions = ref<TeamIterationUser[]>([])
const stages: Array<{ value: TeamIterationStage, label: string }> = [
  { value: 'NOT_STARTED', label: '未开始' },
  { value: 'DEVELOPING', label: '开发中' },
  { value: 'TESTING', label: '测试中' },
  { value: 'RELEASED', label: '已上线' }
]
const columns = reactive<Record<TeamIterationStage, ColumnState>>({
  NOT_STARTED: { items: [], total: 0, pageNumber: 0, loading: false, finished: false },
  DEVELOPING: { items: [], total: 0, pageNumber: 0, loading: false, finished: false },
  TESTING: { items: [], total: 0, pageNumber: 0, loading: false, finished: false },
  RELEASED: { items: [], total: 0, pageNumber: 0, loading: false, finished: false }
})
const transitioningIds = reactive(new Set<number>())
let dragContext: DragContext | undefined
const loadColumn = async (stage: TeamIterationStage, reset = false) => {
  const column = columns[stage]
  if (column.loading || (!reset && column.finished)) return
  if (reset) Object.assign(column, { items: [], total: 0, pageNumber: 0, finished: false })
  column.loading = true
  try {
    const pageNumber = column.pageNumber + 1
    const page = await getTeamIterations({
      stage, memberUserId: memberUserId.value, keyword: keyword.value.trim(), pageNumber, pageSize: 10
    })
    column.items.push(...page.items.filter(item => !column.items.some(current => current.id === item.id)))
    column.total = page.total
    column.pageNumber = pageNumber
    column.finished = column.items.length >= page.total || page.items.length < 10
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : `${stageLabel(stage)}加载失败`)
  } finally { column.loading = false }
}

const reloadBoard = async () => Promise.all(stages.map(stage => loadColumn(stage.value, true)))

const onColumnScroll = (event: Event, stage: TeamIterationStage) => {
  const target = event.currentTarget as HTMLElement
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 100) void loadColumn(stage)
}

const canMoveIteration = (event: { to?: HTMLElement, draggedContext?: { element?: TeamIterationListItem }, relatedContext?: { list?: TeamIterationListItem[] } }) => {
  if (transitioningIds.size > 0) return false
  const item = event.draggedContext?.element
  const targetItems = event.relatedContext?.list
  if (!item || !item.permissions.canEdit || !targetItems) return false
  const targetStage = event.to?.dataset.stage as TeamIterationStage | undefined
    || stages.find(stage => columns[stage.value].items === targetItems)?.value
  return Boolean(targetStage)
}

const onDragStart = (event: DragEvent, stage: TeamIterationStage) => {
  if (transitioningIds.size > 0) return
  if (event.oldIndex === undefined) return
  const item = columns[stage].items[event.oldIndex]
  if (item?.permissions.canEdit) dragContext = { sourceStage: stage, sourceIndex: event.oldIndex, item }
}

const onDrop = async (event: DragEvent, targetStage: TeamIterationStage) => {
  const context = dragContext
  if (!context) return
  const { item, sourceStage, sourceIndex } = context
  const targetItems = columns[targetStage].items
  const movedIndex = event.newIndex ?? targetItems.findIndex(current => current.id === item.id)
  const previousIterationId = movedIndex > 0 ? targetItems[movedIndex - 1]?.id : undefined
  const nextIterationId = movedIndex >= 0 ? targetItems[movedIndex + 1]?.id : undefined
  transitioningIds.add(item.id)
  try {
    const updated = await transitionTeamIteration(item.id, item.versionNo, targetStage,
      previousIterationId, nextIterationId)
    Object.assign(item, updated)
    if (sourceStage !== targetStage) {
      columns[sourceStage].total = Math.max(0, columns[sourceStage].total - 1)
      columns[targetStage].total += 1
      ElMessage.success(`已更新为${stageLabel(targetStage)}`)
    } else ElMessage.success('排序已保存')
  } catch (error) {
    const currentIndex = targetItems.findIndex(current => current.id === item.id)
    if (currentIndex >= 0) targetItems.splice(currentIndex, 1)
    columns[sourceStage].items.splice(Math.min(sourceIndex, columns[sourceStage].items.length), 0, item)
    ElMessage.error(error instanceof Error ? error.message : '迭代位置更新失败')
  } finally {
    transitioningIds.delete(item.id)
    dragContext = undefined
  }
}

const onDragEnd = () => {
  if (dragContext && !transitioningIds.has(dragContext.item.id)) dragContext = undefined
}

const searchMembers = async (keywordText: string) => {
  membersLoading.value = true
  try { memberOptions.value = await getTeamIterationTeamMembers(keywordText) } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '参与人加载失败')
  } finally { membersLoading.value = false }
}

const openDetail = (id: number) => router.push(`/zhaogang/iterations/${id}`)
const created = (id: number) => openDetail(id)
const stageLabel = (stage: TeamIterationStage) => stages.find(item => item.value === stage)?.label || stage
const formatDate = (value: string) => value?.replace('T', ' ').slice(0, 16) || ''

onMounted(async () => { await Promise.all([searchMembers(''), reloadBoard()]) })
</script>

<style scoped>
.iteration-board-view { display: flex; min-width: 0; height: calc(100vh - 82px); flex-direction: column; overflow: hidden; }
.board-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 12px; }
.toolbar-filters,.toolbar-actions { display: flex; align-items: center; gap: 10px; min-width: 0; }
.toolbar-filters :deep(.el-select) { width: 190px; }.toolbar-filters :deep(.el-input) { width: 240px; }
.board-scroll { display: flex; min-height: 0; flex: 1; gap: 12px; overflow-x: auto; overflow-y: hidden; }
.board-column { display: flex; min-width: 290px; flex: 1 0 290px; flex-direction: column; overflow: hidden; background: #f4f6f9; border: 1px solid #e1e6ee; border-radius: 6px; }
.column-header { display: flex; height: 48px; flex: 0 0 48px; align-items: center; justify-content: space-between; padding: 0 12px; border-bottom: 1px solid #e1e6ee; }
.column-header>div { display: flex; align-items: center; gap: 8px; }.column-header span:not(.stage-mark) { color: #8a96a8; font-size: 13px; }
.stage-mark { width: 8px; height: 8px; border-radius: 50%; background: #9aa5b5; }.stage-mark.developing { background: #2878ed; }.stage-mark.testing { background: #e79b20; }.stage-mark.released { background: #28a06a; }
.column-body { position: relative; min-height: 0; flex: 1; padding: 10px; overflow-y: auto; }
.iteration-card-list { min-height: 100%; }
.column-body > :deep(.el-empty) { position: absolute; inset: 42% 0 auto; pointer-events: none; }
.iteration-card { display: block; width: 100%; min-height: 124px; padding: 14px; margin-bottom: 10px; color: #26344a; text-align: left; background: #fff; border: 1px solid #e1e6ee; border-radius: 6px; cursor: pointer; }
.iteration-card:not(:disabled) { cursor: grab; }.iteration-card:not(:disabled):active { cursor: grabbing; }
.iteration-card:disabled { cursor: wait; opacity: 0.65; }
.iteration-card:hover { border-color: #9dbcf0; box-shadow: 0 2px 8px rgb(38 72 120 / 8%); }
.iteration-card-ghost { opacity: 0.35; }
.iteration-card-chosen { border-color: #6ea3f4; }
.iteration-card-transitioning { pointer-events: none; }
.iteration-card header,.iteration-card footer,.card-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.iteration-card header strong { min-width: 0; overflow: hidden; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }.iteration-card header span { color: #66758b; font-size: 12px; white-space: nowrap; }
.card-meta { margin-top: 18px; color: #7e8999; font-size: 12px; }.card-meta span { display: flex; align-items: center; gap: 4px; }
.iteration-card footer { padding-top: 12px; margin-top: 12px; color: #8994a4; font-size: 11px; border-top: 1px solid #edf0f4; }
.column-state { position: absolute; right: 0; bottom: 10px; left: 0; padding: 10px; color: #9aa4b3; font-size: 12px; text-align: center; pointer-events: none; }
@media(max-width:900px){.iteration-board-view{height:auto;min-height:calc(100vh - 120px)}.board-toolbar{align-items:stretch;flex-direction:column}.toolbar-filters,.toolbar-actions{flex-wrap:wrap}.board-scroll{min-height:620px}.toolbar-filters :deep(.el-select),.toolbar-filters :deep(.el-input){width:100%}}
</style>
