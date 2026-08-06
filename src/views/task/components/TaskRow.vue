<template>
  <article
    class="task-row"
    :class="{
      'is-selected': selected,
      'is-completed': completed,
      [`priority-${task.priority ?? 0}`]: true
    }"
    :aria-current="selected ? 'true' : undefined"
    @click="$emit('select', task)"
    @contextmenu.prevent="$emit('contextmenu', $event, task)"
  >
    <button
      v-if="draggable"
      type="button"
      class="task-drag-handle"
      aria-label="拖动任务排序"
      title="拖动排序"
      @click.stop
    >
      <el-icon><Rank /></el-icon>
    </button>

    <el-checkbox
      :model-value="completed"
      :disabled="busy || trash"
      :aria-label="completed ? `恢复任务 ${task.taskName}` : `完成任务 ${task.taskName}`"
      @change="handleToggle"
      @click.stop
    />

    <div class="task-row-main">
      <div class="task-title-line">
        <span class="task-title" :title="task.taskName">{{ task.taskName }}</span>
        <el-icon v-if="task.isTop" class="top-marker" title="已置顶"><Top /></el-icon>
      </div>
      <div v-if="showGroup && task.taskGroupName" class="task-secondary">
        {{ task.taskGroupName }}
      </div>
    </div>

    <div class="task-meta">
      <span
        v-if="task.priority"
        class="priority-chip"
        :class="`priority-${task.priority}`"
        :title="priorityLabel"
      >
        <el-icon><Flag /></el-icon>
      </span>
      <span
        v-if="task.deadlineDate"
        class="deadline-chip"
        :class="`tone-${deadlineTone}`"
      >
        <el-icon><Calendar /></el-icon>
        {{ deadlineLabel }}
      </span>
    </div>

    <el-dropdown
      trigger="click"
      placement="bottom-end"
      :hide-on-click="true"
      @command="handleCommand"
      @click.stop
    >
      <button
        type="button"
        class="task-more-button"
        :aria-label="`打开任务 ${task.taskName} 的操作菜单`"
        title="更多操作"
        @click.stop
      >
        <el-icon><MoreFilled /></el-icon>
      </button>
      <template #dropdown>
        <el-dropdown-menu class="task-action-menu">
          <el-dropdown-item command="deadline-today"><Calendar />设为今天</el-dropdown-item>
          <el-dropdown-item command="deadline-tomorrow"><Calendar />设为明天</el-dropdown-item>
          <el-dropdown-item command="deadline-week"><Calendar />设为一周后</el-dropdown-item>
          <el-dropdown-item command="deadline-custom" divided><Calendar />选择截止日期…</el-dropdown-item>
          <el-dropdown-item command="priority-high"><Flag class="flag-high" />高优先级</el-dropdown-item>
          <el-dropdown-item command="priority-medium"><Flag class="flag-medium" />中优先级</el-dropdown-item>
          <el-dropdown-item command="priority-low"><Flag class="flag-low" />低优先级</el-dropdown-item>
          <el-dropdown-item command="priority-none"><Flag />清除优先级</el-dropdown-item>
          <el-dropdown-item command="move" divided><FolderOpened />移动到…</el-dropdown-item>
          <el-dropdown-item command="toggle-top"><Top />{{ task.isTop ? '取消置顶' : '置顶' }}</el-dropdown-item>
          <el-dropdown-item v-if="!trash" command="points"><Coin />设置积分</el-dropdown-item>
          <el-dropdown-item v-if="trash" command="restore"><Refresh />恢复任务</el-dropdown-item>
          <el-dropdown-item command="delete" divided class="danger-item"><Delete />{{ trash ? '永久删除' : '移入垃圾箱' }}</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Calendar, Coin, Delete, Flag, FolderOpened, MoreFilled, Rank, Refresh, Top } from '@element-plus/icons-vue'
import type { TaskBasicsVo } from '@/api/taskList'
import type { TaskActionCommand } from '@/views/task/taskWorkspace'
import {
  formatDeadlineLabel,
  getDeadlineTone,
  taskIsCompleted
} from '@/views/task/taskWorkspace'

const props = withDefaults(defineProps<{
  task: TaskBasicsVo
  selected?: boolean
  busy?: boolean
  trash?: boolean
  showGroup?: boolean
  draggable?: boolean
}>(), {
  selected: false,
  busy: false,
  trash: false,
  showGroup: false,
  draggable: false
})

const emit = defineEmits<{
  select: [task: TaskBasicsVo]
  toggle: [task: TaskBasicsVo, completed: boolean]
  action: [task: TaskBasicsVo, command: TaskActionCommand]
  contextmenu: [event: MouseEvent, task: TaskBasicsVo]
}>()

const completed = computed(() => taskIsCompleted(props.task))
const deadlineTone = computed(() => getDeadlineTone(props.task.deadlineDate, props.task.taskStatus ?? 0))
const deadlineLabel = computed(() => formatDeadlineLabel(props.task.deadlineDate))
const priorityLabel = computed(() => {
  if ((props.task.priority ?? 0) >= 30) return '高优先级'
  if ((props.task.priority ?? 0) >= 20) return '中优先级'
  return '低优先级'
})

const handleToggle = (value: boolean | string | number) => {
  emit('toggle', props.task, Boolean(value))
}

const handleCommand = (command: TaskActionCommand) => {
  emit('action', props.task, command)
}
</script>

<style scoped>
.task-row {
  --priority-color: transparent;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px 7px 10px;
  border: 1px solid transparent;
  border-left: 3px solid var(--priority-color);
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.task-row:hover {
  background: var(--el-fill-color-light);
}

.task-row.is-selected {
  border-color: var(--el-color-primary-light-7);
  border-left-color: var(--priority-color);
  background: var(--el-color-primary-light-9);
  box-shadow: 0 2px 10px rgb(64 158 255 / 8%);
}

.task-row.priority-30 { --priority-color: var(--el-color-danger); }
.task-row.priority-20 { --priority-color: var(--el-color-warning); }
.task-row.priority-10 { --priority-color: var(--el-color-primary); }

.task-row.is-completed .task-title {
  color: var(--el-text-color-secondary);
  text-decoration: line-through;
}

.task-drag-handle,
.task-more-button {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}

.task-drag-handle {
  width: 18px;
  opacity: 0;
  cursor: grab;
}

.task-row:hover .task-drag-handle,
.task-row:focus-within .task-drag-handle {
  opacity: 1;
}

.task-more-button:hover,
.task-more-button:focus-visible {
  background: var(--el-fill-color);
  color: var(--el-color-primary);
  outline: none;
}

.task-row-main {
  min-width: 0;
  flex: 1;
}

.task-title-line {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-title {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 14px;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-marker {
  flex: none;
  color: var(--el-color-warning);
}

.task-secondary {
  overflow: hidden;
  margin-top: 2px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

.priority-chip,
.deadline-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 5px;
  font-size: 12px;
}

.priority-chip.priority-30 { color: var(--el-color-danger); }
.priority-chip.priority-20 { color: var(--el-color-warning); }
.priority-chip.priority-10 { color: var(--el-color-primary); }

.deadline-chip {
  padding: 2px 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
}

.deadline-chip.tone-danger {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.deadline-chip.tone-warning {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
}

@media (max-width: 720px) {
  .task-drag-handle,
  .priority-chip {
    display: none;
  }
}
</style>

<style>
.task-action-menu .el-dropdown-menu__item svg {
  width: 15px;
  margin-right: 9px;
}

.task-action-menu .flag-high { color: var(--el-color-danger); }
.task-action-menu .flag-medium { color: var(--el-color-warning); }
.task-action-menu .flag-low { color: var(--el-color-primary); }
.task-action-menu .danger-item { color: var(--el-color-danger); }
</style>
