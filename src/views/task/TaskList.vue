<template>
  <div class="task-list-container">
    <!-- 左侧任务清单分组 -->
    <div class="task-groups" :style="{ width: leftWidth + 'px' }">
      <!-- 固定分组 -->
      <div class="fixed-groups">
        <div class="group-item" 
          v-for="item in fixedGroups" 
          :key="item.id"
          :class="{ active: currentGroup?.id === item.id }"
          @click="switchGroup(item)">
          <el-icon><component :is="item.icon" /></el-icon>
          <span class="group-name">{{ item.name }}</span>
          <span class="task-count" v-if="item.count">{{ item.count }}</span>
        </div>
      </div>
      
      <!-- 用户自定义分组 -->
      <div class="custom-groups">
        <div class="custom-groups-header">
          <span class="section-title">清单</span>
          <el-icon class="add-icon" @click="openAddGroupDialog"><Plus /></el-icon>
        </div>
        <div class="group-item" 
          v-for="item in customGroups" 
          :key="item.id"
          :class="{ active: currentGroup?.id === item.id }"
          @click="switchGroup(item)">
          <el-icon><FolderOpened /></el-icon>
          <span class="group-name">{{ item.name }}</span>
          <span class="task-count" v-if="item.count">{{ item.count }}</span>
        </div>
      </div>

      <!-- 底部固定分组 -->
      <div class="bottom-groups">
        <div class="group-item" 
          v-for="item in bottomGroups" 
          :key="item.id"
          :class="{ active: currentGroup?.id === item.id }"
          @click="switchGroup(item)">
          <el-icon><component :is="item.icon" /></el-icon>
          <span class="group-name">{{ item.name }}</span>
          <span class="task-count" v-if="item.count">{{ item.count }}</span>
        </div>
      </div>
    </div>

    <!-- 左侧拖动条 -->
    <div class="resize-bar left-resize" 
      @mousedown="startResize($event, 'left')"
      :style="{ left: leftWidth + 'px' }">
    </div>

    <!-- 中间任务列表 -->
    <div class="tasks-content" :style="{ 
      left: leftWidth + 'px',
      width: middleWidth + 'px'
    }">
      <!-- 头部 -->
      <div class="content-header">
        <div class="header-left">
          <el-icon class="collapse-icon" @click="toggleLeftPanel">
            <component :is="isLeftCollapsed ? 'Expand' : 'Fold'" />
          </el-icon>
          <span class="group-title">{{ currentGroup?.name }}</span>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click">
            <el-icon class="more-icon"><MoreFilled /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="addGroup">
                  <el-icon><Plus /></el-icon>添加分组
                </el-dropdown-item>
                <el-dropdown-item @click="toggleHideCompleted">
                  <el-icon><View /></el-icon>{{ isHideCompleted ? '显示已完成' : '隐藏已完成' }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 添加任务输入框 -->
      <div class="add-task">
        <el-input
          v-model="newTaskName"
          placeholder="添加任务"
          @keyup.enter="addTask"
        >
          <template #append>
            <el-icon class="calendar-icon"><Calendar /></el-icon>
            <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 任务列表 -->
      <div class="tasks-list">
        <el-collapse v-model="activeCollapse" @change="handleCollapseChange">
          <el-collapse-item 
            v-for="group in subGroups" 
            :key="group.id" 
            :title="group.name"
            :name="group.id">
            <template #title>
              <div style="display: flex; align-items: center; width: 100%;">
                <span style="flex: 1; text-align: left; padding-left: 8px;">{{ group.name }}</span>
                <el-icon 
                  class="add-task-icon" 
                  @click.stop="showNewTaskInput(group.id)"
                  style="margin-right: 16px;"
                >
                  <Plus />
                </el-icon>
              </div>
            </template>
            <template #extra>
              <el-icon v-if="group.loading" class="is-loading"><Loading /></el-icon>
            </template>
            <!-- 新任务输入框 -->
            <div v-if="group.showNewTaskInput" class="task-item new-task-input">
              <el-checkbox disabled />
              <el-input
                v-model="group.newTaskName"
                placeholder="请输入任务名称"
                @keyup.enter="saveNewTask(group.id)"
                @blur="saveNewTask(group.id)"
                ref="newTaskInput"
                v-focus
              />
            </div>
            <div class="task-item" 
              v-for="task in group.tasks" 
              :key="task.id"
              @click="selectTask(task)">
              <el-checkbox 
                v-model="task.completed"
                @change="toggleTaskStatus(task)"
              />
              <span class="task-name" :class="{ completed: task.completed }">
                {{ task.taskName }}
              </span>
            </div>
            <div v-if="!group.loading && !group.showNewTaskInput && group.tasks.length === 0" class="no-tasks">
              暂无任务
            </div>
          </el-collapse-item>
        </el-collapse>

        <div v-if="loadingSubGroups" class="loading-groups">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>

        <div v-if="!loadingSubGroups && subGroups.length === 0" class="no-groups">
          暂无分组
        </div>
      </div>
    </div>

    <!-- 右侧拖动条 -->
    <div class="resize-bar right-resize" 
      @mousedown="startResize($event, 'right')"
      :style="{ left: (leftWidth + middleWidth) + 'px' }">
    </div>

    <!-- 右侧任务详情 -->
    <div class="task-detail" :style="{ 
      left: (leftWidth + middleWidth) + 'px',
      width: rightWidth + 'px'
    }">
      <div v-if="selectedTask" class="detail-content">
        <el-input
          type="textarea"
          v-model="selectedTask.notes" 
          placeholder="任务详情..."
          :autosize="{ minRows: 4, maxRows: 20 }"
          style="height: 100%"
          @change="updateTaskNotes"
        />
      </div>
      <div v-else class="no-task-selected">
        请选择一个任务查看详情
      </div>
    </div>

    <!-- 添加清单/分组弹框 -->
    <el-dialog
      v-model="addGroupDialogVisible"
      :title="addGroupForm.parentId ? '添加分组' : '添加清单'"
      width="400px"
      :close-on-click-modal="false"
      @close="resetAddGroupForm"
    >
      <el-form
        ref="addGroupFormRef"
        :model="addGroupForm"
        :rules="addGroupRules"
        label-width="80px"
      >
        <el-form-item :label="addGroupForm.parentId ? '分组名称' : '清单名称'" prop="groupName">
          <el-input 
            v-model="addGroupForm.groupName"
            :placeholder="addGroupForm.parentId ? '请输入分组名称' : '请输入清单名称'"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addGroupDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAddGroup">添加</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  Calendar,
  ArrowDown,
  Plus,
  View,
  MoreFilled,
  Fold,
  Expand,
  FolderOpened,
  Clock,
  Collection,
  Check,
  Delete,
  Loading
} from '@element-plus/icons-vue'
import type { TaskGroup } from '@/types/types'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { 
  addTaskGroup, 
  getTaskGroupList, 
  getTaskGroupStatistics, 
  getTaskList,
  addTask as addTaskApi,
  type TaskGroupListVo, 
  type StatisticsLatestTaskNumVo, 
  type TaskBasicsVo 
} from '@/api/taskList'

// 面板宽度控制
const leftWidth = ref(250)
const middleWidth = ref(400)
const rightWidth = ref(300)
const isLeftCollapsed = ref(false)

// 分组数据
const fixedGroups = ref<TaskGroup[]>([
  { id: 'today', name: '今天', icon: 'Clock', count: 0 },
  { id: 'week', name: '最近7天', icon: 'Calendar', count: 0 },
  { id: 'inbox', name: '收集箱', icon: 'Collection', count: 0 }
])

const customGroups = ref<TaskGroup[]>([])
const bottomGroups = ref<TaskGroup[]>([
  { id: 'completed', name: '已完成', icon: 'Check', count: 0 },
  { id: 'trash', name: '垃圾箱', icon: 'Delete', count: 0 }
])

// 当前选中的分组
const currentGroup = ref<TaskGroup | null>(null)

// 任务相关
const newTaskName = ref('')
const selectedTask = ref<TaskBasicsVo | null>(null)
const isHideCompleted = ref(false)
const activeCollapse = ref<(string | number)[]>([])

// 添加清单相关
const addGroupDialogVisible = ref(false)
const addGroupFormRef = ref<FormInstance>()
const addGroupForm = reactive({
  groupName: '',
  parentId: undefined as string | undefined
})
const addGroupRules: FormRules = {
  groupName: [
    { required: true, message: '请输入分组名称', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ]
}

// 子分组数据
interface SubGroup {
  id: string;
  name: string;
  tasks: TaskBasicsVo[];
  loading?: boolean;
  showNewTaskInput?: boolean;
  newTaskName?: string;
}

const subGroups = ref<SubGroup[]>([])
const loadingSubGroups = ref(false)

// 拖拽调整宽度
const startResize = (e: MouseEvent, type: 'left' | 'right') => {
  const startX = e.clientX
  const startLeftWidth = leftWidth.value
  const startMiddleWidth = middleWidth.value

  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - startX
    
    if (type === 'left') {
      const newLeftWidth = startLeftWidth + deltaX
      if (newLeftWidth >= 200 && newLeftWidth <= 400) {
        leftWidth.value = newLeftWidth
      }
    } else {
      const newMiddleWidth = startMiddleWidth + deltaX
      if (newMiddleWidth >= 300 && newMiddleWidth <= 600) {
        middleWidth.value = newMiddleWidth
      }
    }
  }

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 切换左侧面板显示/隐藏
const toggleLeftPanel = () => {
  isLeftCollapsed.value = !isLeftCollapsed.value
  if (isLeftCollapsed.value) {
    leftWidth.value = 0
  } else {
    leftWidth.value = 250
  }
}

// 切换分组
const switchGroup = async (group: TaskGroup) => {
  currentGroup.value = group
  activeCollapse.value = []
  subGroups.value = []
  
  // 如果是自定义分组，加载其子分组
  if (customGroups.value.find(g => g.id === group.id)) {
    await loadSubGroups(group.id)
  }
}

// 添加任务
const addTask = async () => {
  if (!newTaskName.value.trim()) return
  
  try {
    const taskGroupId = subGroups.value[0]?.id
    if (!taskGroupId) {
      ElMessage.warning('请先选择一个分组')
      return
    }

    await addTaskApi({
      taskName: newTaskName.value.trim(),
      taskGroupId: parseInt(taskGroupId)
    })
    
    newTaskName.value = ''
    // 重新加载任务列表
    await loadGroupTasks(taskGroupId)
    ElMessage.success('添加任务成功')
  } catch (error) {
    console.error('添加任务失败:', error)
    ElMessage.error('添加任务失败')
  }
}

// 切换任务状态
const toggleTaskStatus = async (task: TaskBasicsVo) => {
  try {
    // 模拟API调用
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        completed: task.completed
      })
    })
    
    // 重新加载任务列表
    if (task.id) {
      await loadGroupTasks(task.id.toString())
    }
  } catch (error) {
    console.error('更新任务状态失败:', error)
  }
}

// 选择任务
const selectTask = (task: TaskBasicsVo) => {
  selectedTask.value = task
}

// 更新任务备注
const updateTaskNotes = async () => {
  if (!selectedTask.value) return

  try {
    // 模拟API调用
    await fetch(`/api/tasks/${selectedTask.value.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        notes: selectedTask.value.notes
      })
    })
  } catch (error) {
    console.error('更新任务备注失败:', error)
  }
}

// 添加分组
const addGroup = () => {
  // 设置父分组ID
  if (currentGroup.value) {
    addGroupForm.parentId = currentGroup.value.id
  }
  addGroupDialogVisible.value = true
}

// 切换隐藏已完成任务
const toggleHideCompleted = () => {
  isHideCompleted.value = !isHideCompleted.value
}

// 打开添加清单弹框
const openAddGroupDialog = () => {
  // 清空父分组ID，因为点击清单旁边的加号时不需要父分组
  addGroupForm.parentId = undefined
  addGroupDialogVisible.value = true
}

// 重置添加清单表单
const resetAddGroupForm = () => {
  if (addGroupFormRef.value) {
    addGroupFormRef.value.resetFields()
  }
  addGroupForm.groupName = ''
  addGroupForm.parentId = undefined
}

// 加载自定义分组列表
const loadCustomGroups = async () => {
  try {
    const res = await getTaskGroupList()
    // 将后端返回的数据格式转换为前端使用的格式
    if (Array.isArray(res.data)) {
      customGroups.value = res.data.map((item: TaskGroupListVo) => ({
        id: item.id.toString(),
        name: item.groupName,
        count: item.taskNum,
        sort: item.sort,
        isTop: item.isTop
      }))
      // 根据置顶和排序进行排序
      customGroups.value.sort((a, b) => {
        if (a.isTop !== b.isTop) {
          return (b.isTop || 0) - (a.isTop || 0)
        }
        return (b.sort || 0) - (a.sort || 0)
      })
    }
  } catch (error) {
    console.error('加载自定义分组失败:', error)
    ElMessage.error('获取清单失败')
  }
}

// 提交添加清单/分组
const submitAddGroup = async () => {
  if (!addGroupFormRef.value) return
  
  await addGroupFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await addTaskGroup({
          groupName: addGroupForm.groupName,
          parentId: addGroupForm.parentId
        })
        
        ElMessage.success(addGroupForm.parentId ? '添加分组成功' : '添加清单成功')
        addGroupDialogVisible.value = false
        resetAddGroupForm()
        // 重新加载自定义分组
        await loadCustomGroups()
      } catch (error) {
        console.error(addGroupForm.parentId ? '添加分组失败:' : '添加清单失败:', error)
        ElMessage.error('添加失败')
      }
    }
  })
}

// 加载子分组
const loadSubGroups = async (parentId: string) => {
  try {
    loadingSubGroups.value = true
    const res = await getTaskGroupList(parentId)
    if (Array.isArray(res.data)) {
      subGroups.value = res.data.map(item => ({
        id: item.id.toString(),
        name: item.groupName,
        tasks: [],
        loading: false,
        showNewTaskInput: false,
        newTaskName: ''
      }))
    }
  } catch (error) {
    console.error('加载子分组失败:', error)
    ElMessage.error('加载子分组失败')
  } finally {
    loadingSubGroups.value = false
  }
}

// 加载分组下的任务
const loadGroupTasks = async (groupId: string) => {
  const group = subGroups.value.find(g => g.id === groupId)
  if (!group) return
  
  try {
    group.loading = true
    const res = await getTaskList(groupId)
    if (Array.isArray(res.data)) {
      group.tasks = res.data
    }
  } catch (error) {
    console.error('加载任务列表失败:', error)
    ElMessage.error('加载任务列表失败')
  } finally {
    group.loading = false
  }
}

// 切换分组展开状态
const handleCollapseChange = async (activeNames: (string | number)[]) => {
  // 将 activeNames 转换为字符串数组
  const activeNamesStr = Array.isArray(activeNames) ? activeNames.map(String) : [String(activeNames)]
  
  // 更新当前展开状态
  activeCollapse.value = activeNamesStr
  
  // 遍历所有展开的分组,重新加载数据
  for (const groupId of activeNamesStr) {
    await loadGroupTasks(groupId)
  }
}

// 显示新任务输入框
const showNewTaskInput = (groupId: string) => {
  const group = subGroups.value.find(g => g.id === groupId)
  if (group) {
    group.showNewTaskInput = true
    group.newTaskName = ''
  }
}

// 保存新任务
const saveNewTask = async (groupId: string) => {
  const group = subGroups.value.find(g => g.id === groupId)
  if (!group || !group.newTaskName?.trim()) {
    group && (group.showNewTaskInput = false)
    return
  }

  try {
    await addTaskApi({
      taskName: group.newTaskName.trim(),
      taskGroupId: parseInt(groupId)
    })
    
    // 重新加载任务列表
    await loadGroupTasks(groupId)
    ElMessage.success('添加任务成功')
  } catch (error) {
    console.error('添加任务失败:', error)
    ElMessage.error('添加任务失败')
  } finally {
    group.showNewTaskInput = false
    group.newTaskName = ''
  }
}

// 自动聚焦指令
const vFocus = {
  mounted: (el: HTMLElement) => {
    const input = el.querySelector('input')
    if (input) {
      input.focus()
    }
  }
}

// 初始化
onMounted(async () => {
  try {
    // 加载分组数量
    const res = await getTaskGroupStatistics()
    
    // 更新固定分组的数量
    fixedGroups.value = fixedGroups.value.map(group => ({
      ...group,
      count: group.id === 'today' ? res.data.todayNum :
             group.id === 'week' ? res.data.weekNum :
             group.id === 'inbox' ? res.data.noGroupNum : 0
    }))
    
    // 加载自定义分组
    await loadCustomGroups()

    // 默认选中今天分组
    switchGroup(fixedGroups.value[0])
  } catch (error) {
    console.error('初始化失败:', error)
    ElMessage.error('加载数据失败')
  }
})
</script>

<style scoped>
.task-list-container {
  height: 100%;
  position: relative;
  background-color: #fff;
  display: flex;
}

/* 左侧任务分组样式 */
.task-groups {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background-color: #f7f7f7;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
}

.fixed-groups,
.custom-groups,
.bottom-groups {
  padding: 8px 0;
}

.custom-groups {
  flex: 1;
  overflow-y: auto;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
}

.group-item {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #666;
}

.group-item:hover {
  background-color: #eee;
}

.group-item.active {
  background-color: #e6f4ff;
  color: #1890ff;
}

.group-item .el-icon {
  margin-right: 8px;
  font-size: 16px;
}

.group-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-count {
  margin-left: 8px;
  font-size: 12px;
  color: #999;
}

/* 拖动条样式 */
.resize-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: transparent;
  cursor: col-resize;
  transition: background-color 0.3s;
}

.resize-bar:hover {
  background-color: #1890ff;
}

/* 中间任务列表样式 */
.tasks-content {
  position: absolute;
  top: 0;
  bottom: 0;
  background-color: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.content-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-icon {
  margin-right: 8px;
  cursor: pointer;
  font-size: 18px;
}

.group-title {
  font-size: 16px;
  font-weight: 500;
}

.more-icon {
  cursor: pointer;
  font-size: 20px;
  color: #666;
}

.add-task {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.add-task :deep(.el-input-group__append) {
  padding: 0 8px;
  background-color: #fff;
}

.calendar-icon,
.dropdown-icon {
  margin: 0 4px;
  font-size: 16px;
  color: #666;
  cursor: pointer;
}

.tasks-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
}

.task-item:hover {
  background-color: #f5f5f5;
}

.task-name {
  margin-left: 8px;
  flex: 1;
}

.task-name.completed {
  color: #999;
  text-decoration: line-through;
}

/* 右侧任务详情样式 */
.task-detail {
  position: absolute;
  top: 0;
  bottom: 0;
  background-color: #fff;
  padding: 16px;
}

.detail-content {
  height: 100%;
}

.no-task-selected {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-collapse) {
  border: none;
}

:deep(.el-collapse-item__header) {
  font-size: 14px;
  color: #666;
  border: none;
}

:deep(.el-collapse-item__content) {
  padding: 0;
}

/* 自定义分组头部样式 */
.custom-groups-header {
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #666;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
}

.add-icon {
  cursor: pointer;
  font-size: 16px;
  color: #999;
  transition: color 0.3s;
}

.add-icon:hover {
  color: #1890ff;
}

.loading-groups,
.no-groups,
.no-tasks {
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.loading-groups {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.add-task-icon {
  font-size: 14px;
  color: #999;
  cursor: pointer;
  transition: color 0.3s;
}

.add-task-icon:hover {
  color: #1890ff;
}

.new-task-input {
  padding: 8px 0;
}

.new-task-input :deep(.el-input__wrapper) {
  box-shadow: none;
  padding-left: 0;
}

.new-task-input :deep(.el-input__inner) {
  height: 24px;
  line-height: 24px;
  border: none;
  padding: 0;
  background: transparent;
}

.new-task-input :deep(.el-input__inner):focus {
  box-shadow: none;
}
</style>