<template>
  <aside class="task-sidebar" :class="{ 'is-open': open }" aria-label="任务清单导航">
    <div class="sidebar-heading">
      <div>
        <span class="eyebrow">TASKS</span>
        <h2>任务清单</h2>
      </div>
      <button type="button" class="icon-button compact-close" aria-label="关闭清单导航" @click="$emit('close')">
        <el-icon><Close /></el-icon>
      </button>
    </div>

    <div v-if="loading" class="sidebar-loading">
      <el-skeleton :rows="6" animated />
    </div>

    <template v-else>
      <nav class="smart-groups" aria-label="智能清单">
        <button
          v-for="group in smartGroups"
          :key="group.id"
          type="button"
          class="group-button"
          :class="{ 'is-active': currentGroupId === group.id }"
          @click="selectGroup(group)"
        >
          <SvgIcon dir="task-list" :name="group.icon" />
          <span class="group-name">{{ group.name }}</span>
          <span class="group-count">{{ group.count }}</span>
        </button>
      </nav>

      <section class="custom-groups">
        <div class="section-heading">
          <span>我的清单</span>
          <button type="button" class="icon-button" aria-label="新建清单" title="新建清单" @click="$emit('add-list')">
            <el-icon><Plus /></el-icon>
          </button>
        </div>

        <div v-if="customGroups.length" class="custom-group-list">
          <button
            v-for="group in customGroups"
            :key="group.id"
            type="button"
            class="group-button custom-group-button"
            :class="{ 'is-active': currentGroupId === group.id }"
            @click="selectGroup(group)"
          >
            <SvgIcon dir="task-list" name="list" />
            <span class="group-name">{{ group.name }}</span>
            <span class="group-count">{{ group.count }}</span>
            <el-dropdown
              trigger="click"
              placement="bottom-end"
              @command="(command: 'rename' | 'delete') => handleGroupCommand(command, group)"
              @click.stop
            >
              <span class="group-more" :aria-label="`${group.name}清单操作`" @click.stop>
                <el-icon><MoreFilled /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="rename"><Edit />重命名</el-dropdown-item>
                  <el-dropdown-item command="delete" divided class="danger-item"><Delete />删除清单</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </button>
        </div>

        <button v-else type="button" class="empty-list-button" @click="$emit('add-list')">
          <el-icon><Plus /></el-icon>
          新建第一个清单
        </button>
      </section>

      <nav class="system-groups" aria-label="系统清单">
        <button
          v-for="group in systemGroups"
          :key="group.id"
          type="button"
          class="group-button"
          :class="{ 'is-active': currentGroupId === group.id }"
          @click="selectGroup(group)"
        >
          <SvgIcon dir="task-list" :name="group.icon" />
          <span class="group-name">{{ group.name }}</span>
          <span v-if="group.count" class="group-count">{{ group.count }}</span>
        </button>
      </nav>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { Close, Delete, Edit, MoreFilled, Plus } from '@element-plus/icons-vue'
import SvgIcon from '@/components/SvgIcon.vue'
import type { WorkspaceGroup } from '@/views/task/taskWorkspace'

withDefaults(defineProps<{
  smartGroups: WorkspaceGroup[]
  customGroups: WorkspaceGroup[]
  systemGroups: WorkspaceGroup[]
  currentGroupId?: string
  loading?: boolean
  open?: boolean
}>(), {
  currentGroupId: undefined,
  loading: false,
  open: false
})

const emit = defineEmits<{
  select: [group: WorkspaceGroup]
  close: []
  'add-list': []
  rename: [group: WorkspaceGroup]
  delete: [group: WorkspaceGroup]
}>()

const selectGroup = (group: WorkspaceGroup) => {
  emit('select', group)
  emit('close')
}

const handleGroupCommand = (command: 'rename' | 'delete', group: WorkspaceGroup) => {
  if (command === 'rename') emit('rename', group)
  else emit('delete', group)
}
</script>

<style scoped>
.task-sidebar {
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--el-border-color-lighter);
  background: #fbfcfe;
}

.sidebar-heading {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.sidebar-heading h2 {
  margin: 1px 0 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
  line-height: 24px;
}

.eyebrow {
  color: var(--el-color-primary);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.sidebar-loading {
  padding: 18px 16px;
}

.smart-groups,
.system-groups,
.custom-group-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.smart-groups,
.system-groups {
  padding: 10px;
}

.custom-groups {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
}

.group-button {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.group-button:hover {
  background: var(--el-fill-color-light);
}

.group-button.is-active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 600;
}

.group-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-count {
  min-width: 22px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  text-align: right;
}

.group-more {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: -4px -5px -4px 0;
  border-radius: 6px;
  color: var(--el-text-color-placeholder);
  opacity: 0;
}

.custom-group-button:hover .group-more,
.custom-group-button:focus-within .group-more,
.custom-group-button.is-active .group-more {
  opacity: 1;
}

.group-more:hover {
  background: rgb(255 255 255 / 75%);
  color: var(--el-color-primary);
}

.icon-button {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}

.icon-button:hover {
  background: var(--el-fill-color);
  color: var(--el-color-primary);
}

.empty-list-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 10px;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}

.compact-close {
  display: none;
}

@media (max-width: 1100px) {
  .task-sidebar {
    position: fixed;
    z-index: 2100;
    top: 0;
    bottom: 0;
    left: 64px;
    width: min(280px, calc(100vw - 64px));
    height: 100vh;
    box-shadow: 8px 0 30px rgb(31 45 61 / 15%);
    transform: translateX(calc(-100% - 70px));
    transition: transform 0.22s ease;
  }

  .task-sidebar.is-open {
    transform: translateX(0);
  }

  .compact-close {
    display: inline-flex;
  }
}
</style>

<style>
.el-dropdown-menu__item.danger-item {
  color: var(--el-color-danger);
}

.el-dropdown-menu__item > svg {
  width: 15px;
  margin-right: 8px;
}
</style>
