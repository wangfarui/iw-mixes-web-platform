<template>
  <div
    v-if="visible && task"
    class="task-context-menu"
    :style="{ left: `${x}px`, top: `${y}px` }"
    role="menu"
    :aria-label="`任务 ${task.taskName} 的快捷菜单`"
    @click.stop
  >
    <button type="button" role="menuitem" @click="run('deadline-today')"><Calendar />设为今天</button>
    <button type="button" role="menuitem" @click="run('deadline-tomorrow')"><Calendar />设为明天</button>
    <button type="button" role="menuitem" @click="run('deadline-custom')"><Calendar />选择截止日期…</button>
    <span class="menu-divider" />
    <button type="button" role="menuitem" @click="run('priority-high')"><Flag class="flag-high" />高优先级</button>
    <button type="button" role="menuitem" @click="run('priority-none')"><Flag />清除优先级</button>
    <button type="button" role="menuitem" @click="run('move')"><FolderOpened />移动到…</button>
    <button type="button" role="menuitem" @click="run('toggle-top')"><Top />{{ task.isTop ? '取消置顶' : '置顶' }}</button>
    <button v-if="!trash" type="button" role="menuitem" @click="run('points')"><Coin />设置积分</button>
    <button v-if="trash" type="button" role="menuitem" @click="run('restore')"><Refresh />恢复任务</button>
    <span class="menu-divider" />
    <button type="button" role="menuitem" class="danger" @click="run('delete')"><Delete />{{ trash ? '永久删除' : '移入垃圾箱' }}</button>
  </div>
</template>

<script setup lang="ts">
import { Calendar, Coin, Delete, Flag, FolderOpened, Refresh, Top } from '@element-plus/icons-vue'
import type { TaskBasicsVo } from '@/api/taskList'
import type { TaskActionCommand } from '@/views/task/taskWorkspace'

const props = withDefaults(defineProps<{
  visible: boolean
  task: TaskBasicsVo | null
  x: number
  y: number
  trash?: boolean
}>(), {
  trash: false
})

const emit = defineEmits<{
  action: [task: TaskBasicsVo, command: TaskActionCommand]
  close: []
}>()

const run = (command: TaskActionCommand) => {
  if (props.task) emit('action', props.task, command)
  emit('close')
}
</script>

<style scoped>
.task-context-menu {
  position: fixed;
  z-index: 4000;
  width: 190px;
  padding: 6px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  background: #fff;
  box-shadow: var(--el-box-shadow-light);
}

.task-context-menu button {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;
  text-align: left;
}

.task-context-menu button:hover,
.task-context-menu button:focus-visible {
  background: var(--el-fill-color-light);
  outline: none;
}

.task-context-menu button svg {
  width: 15px;
  flex: none;
}

.task-context-menu .flag-high { color: var(--el-color-danger); }
.task-context-menu .danger { color: var(--el-color-danger); }

.menu-divider {
  display: block;
  height: 1px;
  margin: 5px 2px;
  background: var(--el-border-color-lighter);
}
</style>
