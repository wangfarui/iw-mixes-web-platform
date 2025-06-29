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
          <el-icon><SvgIcon dir="task-list" :name="item.icon" /></el-icon>
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
          <el-icon><SvgIcon dir="task-list" name="list" /></el-icon>
          <span class="group-name">{{ item.name }}</span>
          <span class="task-count" v-if="item.count">{{ item.count }}</span>
          <el-dropdown trigger="click" @click.stop>
            <el-icon class="more-icon" @click.stop><MoreFilled /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="renameGroup(item)">
                  <el-icon><Edit /></el-icon>重命名
                </el-dropdown-item>
                <el-dropdown-item @click="deleteGroup(item)">
                  <el-icon><Delete /></el-icon>删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 底部固定分组 -->
      <div class="bottom-groups">
        <div class="group-item" 
          v-for="item in bottomGroups" 
          :key="item.id"
          :class="{ active: currentGroup?.id === item.id }"
          @click="switchGroup(item)">
          <el-icon><SvgIcon dir="task-list" :name="item.icon" /></el-icon>
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
      left: (leftWidth + 10) + 'px',
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
                <el-dropdown-item 
                  v-if="!['today', 'week', 'inbox', 'deadline', 'completed', 'trash'].includes(currentGroup?.id || '')"
                  @click="addGroup">
                  <el-icon><Plus /></el-icon>添加分组
                </el-dropdown-item>
                <el-dropdown-item @click="toggleHideCompleted">
                  <el-icon><View /></el-icon>{{ isHideCompleted ? '显示已完成' : '隐藏已完成' }}
                </el-dropdown-item>
                <el-dropdown-item 
                  v-if="currentGroup?.id === 'trash'"
                  @click="clearTrash">
                  <el-icon><Delete /></el-icon>清空垃圾箱
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 添加任务输入框 -->
      <div class="add-task" v-if="currentGroup?.id !== 'completed' && currentGroup?.id !== 'trash'">
        <el-input
          v-model="newTaskName"
          placeholder="添加任务"
          @keyup.enter="addTask"
        />
      </div>

      <!-- 任务列表 -->
      <div class="tasks-list">
        <!-- 固定清单（今天、最近7天、收集箱、截止任务）和已完成清单、垃圾箱的任务列表 -->
        <template v-if="['today', 'week', 'inbox', 'deadline', 'completed', 'trash'].includes(currentGroup?.id || '')">
          <draggable
            v-if="subGroups[0]"
            v-model="subGroups[0].tasks"
            :disabled="currentGroup?.id === 'completed' || currentGroup?.id === 'trash'"
            @end="(evt) => handleDragEnd(evt, subGroups[0].id)"
            item-key="id"
            handle=".task-item"
            ghost-class="ghost"
          >
            <template #item="{ element: task }">
              <div class="task-item" 
                :data-task-id="task.id"
                @click="selectTask(task)"
                @contextmenu.prevent="showTaskContextMenu($event, task)"
                :class="{ 'active': activeTask?.id === task.id }">
                <el-checkbox 
                  v-model="task.completed"
                  @change="toggleTaskStatus(task)"
                  @click.stop
                />
                <span class="task-name" :class="{ 
                  completed: task.completed && currentGroup?.id === 'completed',
                  'fixed-list': ['today', 'week', 'inbox', 'deadline', 'completed', 'trash'].includes(currentGroup?.id || '')
                }">
                  {{ task.taskName }}
                  <span v-if="task.taskGroupName && !['inbox', 'deadline'].includes(currentGroup?.id || '')" class="task-group-name">
                    ({{ task.taskGroupName }})
                  </span>
                </span>
                <span v-if="task.deadlineDate" class="deadline-date" :class="{
                  'deadline-urgent': isUrgentDeadline(task.deadlineDate, task.taskStatus || 0),
                  'deadline-warning': isWarningDeadline(task.deadlineDate, task.taskStatus || 0)
                }">
                  {{ formatDeadlineDisplay(task.deadlineDate) }}
                </span>
                <el-dropdown trigger="click" @click.stop>
                  <el-icon class="more-icon" @click.stop="activeTask = task"><MoreFilled /></el-icon>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item class="submenu-item">
                        <div class="context-menu-item">
                          <el-icon><Calendar /></el-icon>
                          <span>截止日期</span>
                          <div class="quick-actions">
                            <el-icon 
                              class="quick-action-icon" 
                              @click.stop="setTaskDeadline(task, 'today')"
                              title="今天"
                            ><SvgIcon dir="task-list" name="today" /></el-icon>
                            <el-icon 
                              class="quick-action-icon" 
                              @click.stop="setTaskDeadline(task, 'tomorrow')"
                              title="明天"
                            ><SvgIcon dir="task-list" name="tomorrow" /></el-icon>
                            <el-icon 
                              class="quick-action-icon" 
                              @click.stop="setTaskDeadline(task, 'nextWeek')"
                              title="下周"
                            ><SvgIcon dir="task-list" name="last-week" /></el-icon>
                            <el-icon 
                              class="quick-action-icon" 
                              @click.stop="showDatePicker($event, task)"
                              title="自定义"
                            ><SvgIcon dir="task-list" name="custom-date" /></el-icon>
                          </div>
                        </div>
                      </el-dropdown-item>
                      <el-dropdown-item class="submenu-item">
                        <div class="context-menu-item">
                          <el-icon><Flag /></el-icon>
                          <span>优先级</span>
                          <div class="quick-actions">
                            <el-icon 
                              class="quick-action-icon priority-high" 
                              @click.stop="setTaskPriority(task, 30)"
                              title="高"
                            ><Flag /></el-icon>
                            <el-icon 
                              class="quick-action-icon priority-medium" 
                              @click.stop="setTaskPriority(task, 20)"
                              title="中"
                            ><Flag /></el-icon>
                            <el-icon 
                              class="quick-action-icon priority-low" 
                              @click.stop="setTaskPriority(task, 10)"
                              title="低"
                            ><Flag /></el-icon>
                            <el-icon 
                              class="quick-action-icon priority-none" 
                              @click.stop="setTaskPriority(task, 0)"
                              title="无"
                            ><Flag /></el-icon>
                          </div>
                        </div>
                      </el-dropdown-item>
                      <el-dropdown-item class="submenu-item move-to-wrapper" 
                        @mouseenter="showMoveToMenu = true" 
                        @mouseleave="handleMoveToMenuLeave"
                      >
                        <div class="context-menu-item">
                          <el-icon><FolderOpened /></el-icon>
                          <span>移动到</span>
                          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
                          <!-- 移动到菜单 -->
                          <div v-show="showMoveToMenu" class="move-to-menu">
                            <div class="search-box">
                              <el-input v-model="moveToSearchText" placeholder="搜索" clearable />
                            </div>
                            <!-- 收集箱选项 -->
                            <div class="menu-item" @click="moveTask(contextMenuTask!, 0)">
                              <el-icon><SvgIcon dir="task-list" name="inbox" /></el-icon>
                              <span>收集箱</span>
                            </div>
                            <!-- 自定义清单列表 -->
                            <template v-for="list in filteredMoveList" :key="list.id">
                              <div class="menu-item">
                                <el-icon><SvgIcon dir="task-list" name="list" /></el-icon>
                                <span>{{ list.groupName }}</span>
                                <el-icon class="arrow-icon"><ArrowRight /></el-icon>
                                <!-- 分组子菜单 -->
                                <div class="move-to-submenu">
                                  <div 
                                    v-for="subGroup in list.subGroupList" 
                                    :key="subGroup.id" 
                                    class="menu-item"
                                    @click="moveTask(contextMenuTask!, subGroup.id)"
                                  >
                                    <el-icon><SvgIcon dir="task-list" name="folder" /></el-icon>
                                    <span>{{ subGroup.groupName }}</span>
                                  </div>
                                </div>
                              </div>
                            </template>
                          </div>
                        </div>
                      </el-dropdown-item>
                      <el-dropdown-item class="normal-item" @click="toggleTaskTop(task)">
                        <el-icon><Top /></el-icon>
                        <span>{{ task.isTop ? '取消置顶' : '置顶' }}</span>
                      </el-dropdown-item>
                      <el-dropdown-item  v-if="currentGroup?.id !== 'trash'" class="normal-item" @click="openPointsDialog(task)">
                            <el-icon><Coin /></el-icon>
                            <span>积分</span>
                          </el-dropdown-item>
                      <el-dropdown-item 
                        v-if="currentGroup?.id === 'trash'"
                        class="normal-item" 
                        @click="restoreTask(task)">
                        <el-icon><Refresh /></el-icon>
                        <span>恢复</span>
                      </el-dropdown-item>
                      <el-dropdown-item class="normal-item" @click="deleteTask(task)">
                        <el-icon><Delete /></el-icon>
                        <span>删除任务</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </draggable>
          <div v-if="!loadingSubGroups && (!subGroups[0]?.tasks || subGroups[0].tasks.length === 0)" class="no-tasks">
            {{ currentGroup?.id === 'completed' ? '暂无已完成任务' : 
               currentGroup?.id === 'trash' ? '暂无已删除任务' : '暂无任务' }}
          </div>
          <!-- 添加查看更多按钮 -->
          <div v-if="currentGroup?.id === 'completed'" class="view-more">
            <template v-if="hasMore">
              <el-button type="primary" link @click="loadMoreCompletedTasks">
                查看更多
              </el-button>
            </template>
            <template v-else-if="subGroups[0]?.tasks?.length > 0">
              <span class="no-more">到底了~</span>
            </template>
          </div>
        </template>

        <!-- 其他清单的任务列表 -->
        <template v-else>
          <template v-if="subGroups.length === 1 && subGroups[0].name === '未分组'">
            <draggable
              v-model="subGroups[0].tasks"
              @end="(evt) => handleDragEnd(evt, subGroups[0].id)"
              item-key="id"
              handle=".task-item"
              ghost-class="ghost"
            >
              <template #item="{ element: task }">
                <div class="task-item" 
                  :data-task-id="task.id"
                  @click="selectTask(task)"
                  @contextmenu.prevent="showTaskContextMenu($event, task)"
                  :class="{ 'active': activeTask?.id === task.id }">
                  <el-checkbox 
                    v-model="task.completed"
                    @change="toggleTaskStatus(task)"
                    @click.stop
                  />
                  <span class="task-name" :class="{ 
                    completed: task.completed && currentGroup?.id === 'completed',
                    'fixed-list': ['today', 'week', 'inbox', 'deadline', 'completed', 'trash'].includes(currentGroup?.id || '')
                  }">
                    {{ task.taskName }}
                  </span>
                  <span v-if="task.deadlineDate" class="deadline-date" :class="{
                    'deadline-urgent': isUrgentDeadline(task.deadlineDate, task.taskStatus || 0),
                    'deadline-warning': isWarningDeadline(task.deadlineDate, task.taskStatus || 0)
                  }">
                    {{ formatDeadlineDisplay(task.deadlineDate) }}
                  </span>
                  <el-dropdown trigger="click" @click.stop>
                    <el-icon class="more-icon" @click.stop="activeTask = task"><MoreFilled /></el-icon>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item class="submenu-item">
                          <div class="context-menu-item">
                            <el-icon><Calendar /></el-icon>
                            <span>截止日期</span>
                            <div class="quick-actions">
                              <el-icon 
                                class="quick-action-icon" 
                                @click.stop="setTaskDeadline(task, 'today')"
                                title="今天"
                              ><SvgIcon dir="task-list" name="today" /></el-icon>
                              <el-icon 
                                class="quick-action-icon" 
                                @click.stop="setTaskDeadline(task, 'tomorrow')"
                                title="明天"
                              ><SvgIcon dir="task-list" name="tomorrow" /></el-icon>
                              <el-icon 
                                class="quick-action-icon" 
                                @click.stop="setTaskDeadline(task, 'nextWeek')"
                                title="下周"
                              ><SvgIcon dir="task-list" name="last-week" /></el-icon>
                              <el-icon 
                                class="quick-action-icon" 
                                @click.stop="showDatePicker($event, task)"
                                title="自定义"
                              ><SvgIcon dir="task-list" name="custom-date" /></el-icon>
                            </div>
                          </div>
                        </el-dropdown-item>
                        <el-dropdown-item class="submenu-item">
                          <div class="context-menu-item">
                            <el-icon><Flag /></el-icon>
                            <span>优先级</span>
                            <div class="quick-actions">
                              <el-icon 
                                class="quick-action-icon priority-high" 
                                @click.stop="setTaskPriority(task, 30)"
                                title="高"
                              ><Flag /></el-icon>
                              <el-icon 
                                class="quick-action-icon priority-medium" 
                                @click.stop="setTaskPriority(task, 20)"
                                title="中"
                              ><Flag /></el-icon>
                              <el-icon 
                                class="quick-action-icon priority-low" 
                                @click.stop="setTaskPriority(task, 10)"
                                title="低"
                              ><Flag /></el-icon>
                              <el-icon 
                                class="quick-action-icon priority-none" 
                                @click.stop="setTaskPriority(task, 0)"
                                title="无"
                              ><Flag /></el-icon>
                            </div>
                          </div>
                        </el-dropdown-item>
                        <el-dropdown-item class="submenu-item move-to-wrapper" 
                          @mouseenter="showMoveToMenu = true" 
                          @mouseleave="handleMoveToMenuLeave"
                        >
                          <div class="context-menu-item">
                            <el-icon><FolderOpened /></el-icon>
                            <span>移动到</span>
                            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
                            <!-- 移动到菜单 -->
                            <div v-show="showMoveToMenu" class="move-to-menu">
                              <div class="search-box">
                                <el-input v-model="moveToSearchText" placeholder="搜索" clearable />
                              </div>
                              <!-- 收集箱选项 -->
                              <div class="menu-item" @click="moveTask(contextMenuTask!, 0)">
                                <el-icon><SvgIcon dir="task-list" name="inbox" /></el-icon>
                                <span>收集箱</span>
                              </div>
                              <!-- 自定义清单列表 -->
                              <template v-for="list in filteredMoveList" :key="list.id">
                                <div class="menu-item">
                                  <el-icon><SvgIcon dir="task-list" name="list" /></el-icon>
                                  <span>{{ list.groupName }}</span>
                                  <el-icon class="arrow-icon"><ArrowRight /></el-icon>
                                  <!-- 分组子菜单 -->
                                  <div class="move-to-submenu">
                                    <div 
                                      v-for="subGroup in list.subGroupList" 
                                      :key="subGroup.id" 
                                      class="menu-item"
                                      @click="moveTask(contextMenuTask!, subGroup.id)"
                                    >
                                      <el-icon><SvgIcon dir="task-list" name="folder" /></el-icon>
                                      <span>{{ subGroup.groupName }}</span>
                                    </div>
                                  </div>
                                </div>
                              </template>
                            </div>
                          </div>
                        </el-dropdown-item>
                        <el-dropdown-item class="normal-item" @click="toggleTaskTop(task)">
                          <el-icon><Top /></el-icon>
                          <span>{{ task.isTop ? '取消置顶' : '置顶' }}</span>
                        </el-dropdown-item>
                        <el-dropdown-item class="normal-item" @click="openPointsDialog(task)">
                            <el-icon><Coin /></el-icon>
                            <span>积分</span>
                          </el-dropdown-item>
                        <el-dropdown-item class="normal-item" @click="deleteTask(task)">
                          <el-icon><Delete /></el-icon>
                          <span>删除任务</span>
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </template>
            </draggable>
            <div v-if="!loadingSubGroups && subGroups[0].tasks.length === 0" class="no-tasks">
              暂无任务
            </div>
          </template>
          <el-collapse v-else v-model="activeCollapse" @change="handleCollapseChange">
            <el-collapse-item 
              v-for="group in subGroups" 
              :key="group.id" 
              :title="group.name"
              :name="group.id">
              <template #title>
                <div style="display: flex; align-items: center; width: 100%;">
                  <span style="flex: 1; text-align: left; padding-left: 8px;">
                    <span style="font-weight: bold;">{{ group.name }}</span>
                    <span style="color: #999; font-size: 12px; margin-left: 8px;">{{ group.taskNum || 0 }}</span>
                  </span>
                  <el-icon 
                    class="add-task-icon" 
                    @click.stop="showNewTaskInput(group.id)"
                    style="margin-right: 8px;"
                  >
                    <Plus />
                  </el-icon>
                  <el-dropdown trigger="click" @click.stop>
                    <el-icon 
                      class="more-icon"
                      style="margin-right: 16px;"
                      @click.stop
                    >
                      <MoreFilled />
                    </el-icon>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="renameGroup(group)">
                          <el-icon><Edit /></el-icon>重命名
                        </el-dropdown-item>
                        <el-dropdown-item @click="deleteGroup(group)">
                          <el-icon><Delete /></el-icon>删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
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
              <draggable
                v-model="group.tasks"
                @end="(evt) => handleDragEnd(evt, group.id)"
                item-key="id"
                handle=".task-item"
                ghost-class="ghost"
              >
                <template #item="{ element: task }">
                  <div class="task-item" 
                    :data-task-id="task.id"
                    @click="selectTask(task)"
                    @contextmenu.prevent="showTaskContextMenu($event, task)"
                    :class="{ 'active': activeTask?.id === task.id }">
                    <el-checkbox 
                      v-model="task.completed"
                      @change="toggleTaskStatus(task)"
                      @click.stop
                    />
                    <span class="task-name" :class="{ 
                      completed: task.completed && currentGroup?.id === 'completed',
                      'fixed-list': ['today', 'week', 'inbox', 'deadline', 'completed', 'trash'].includes(currentGroup?.id || '')
                    }">
                      {{ task.taskName }}
                    </span>
                    <span v-if="task.deadlineDate" class="deadline-date" :class="{
                      'deadline-urgent': isUrgentDeadline(task.deadlineDate, task.taskStatus || 0),
                      'deadline-warning': isWarningDeadline(task.deadlineDate, task.taskStatus || 0)
                    }">
                      {{ formatDeadlineDisplay(task.deadlineDate) }}
                    </span>
                    <el-dropdown trigger="click" @click.stop>
                      <el-icon class="more-icon" @click.stop="activeTask = task"><MoreFilled /></el-icon>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item class="submenu-item">
                            <div class="context-menu-item">
                              <el-icon><Calendar /></el-icon>
                              <span>截止日期</span>
                              <div class="quick-actions">
                                <el-icon 
                                  class="quick-action-icon" 
                                  @click.stop="setTaskDeadline(task, 'today')"
                                  title="今天"
                                ><SvgIcon dir="task-list" name="today" /></el-icon>
                                <el-icon 
                                  class="quick-action-icon" 
                                  @click.stop="setTaskDeadline(task, 'tomorrow')"
                                  title="明天"
                                ><SvgIcon dir="task-list" name="tomorrow" /></el-icon>
                                <el-icon 
                                  class="quick-action-icon" 
                                  @click.stop="setTaskDeadline(task, 'nextWeek')"
                                  title="下周"
                                ><SvgIcon dir="task-list" name="last-week" /></el-icon>
                                <el-icon 
                                  class="quick-action-icon" 
                                  @click.stop="showDatePicker($event, task)"
                                  title="自定义"
                                ><SvgIcon dir="task-list" name="custom-date" /></el-icon>
                              </div>
                            </div>
                          </el-dropdown-item>
                          <el-dropdown-item class="submenu-item">
                            <div class="context-menu-item">
                              <el-icon><Flag /></el-icon>
                              <span>优先级</span>
                              <div class="quick-actions">
                                <el-icon 
                                  class="quick-action-icon priority-high" 
                                  @click.stop="setTaskPriority(task, 30)"
                                  title="高"
                                ><Flag /></el-icon>
                                <el-icon 
                                  class="quick-action-icon priority-medium" 
                                  @click.stop="setTaskPriority(task, 20)"
                                  title="中"
                                ><Flag /></el-icon>
                                <el-icon 
                                  class="quick-action-icon priority-low" 
                                  @click.stop="setTaskPriority(task, 10)"
                                  title="低"
                                ><Flag /></el-icon>
                                <el-icon 
                                  class="quick-action-icon priority-none" 
                                  @click.stop="setTaskPriority(task, 0)"
                                  title="无"
                                ><Flag /></el-icon>
                              </div>
                            </div>
                          </el-dropdown-item>
                          <el-dropdown-item class="submenu-item move-to-wrapper" 
                            @mouseenter="showMoveToMenu = true" 
                            @mouseleave="handleMoveToMenuLeave"
                          >
                            <div class="context-menu-item">
                              <el-icon><FolderOpened /></el-icon>
                              <span>移动到</span>
                              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
                              <!-- 移动到菜单 -->
                              <div v-show="showMoveToMenu" class="move-to-menu">
                                <div class="search-box">
                                  <el-input v-model="moveToSearchText" placeholder="搜索" clearable />
                                </div>
                                <!-- 收集箱选项 -->
                                <div class="menu-item" @click="moveTask(contextMenuTask!, 0)">
                                  <el-icon><SvgIcon dir="task-list" name="inbox" /></el-icon>
                                  <span>收集箱</span>
                                </div>
                                <!-- 自定义清单列表 -->
                                <template v-for="list in filteredMoveList" :key="list.id">
                                  <div class="menu-item">
                                    <el-icon><SvgIcon dir="task-list" name="list" /></el-icon>
                                    <span>{{ list.groupName }}</span>
                                    <el-icon class="arrow-icon"><ArrowRight /></el-icon>
                                    <!-- 分组子菜单 -->
                                    <div class="move-to-submenu">
                                      <div 
                                        v-for="subGroup in list.subGroupList" 
                                        :key="subGroup.id" 
                                        class="menu-item"
                                        @click="moveTask(contextMenuTask!, subGroup.id)"
                                      >
                                        <el-icon><SvgIcon dir="task-list" name="folder" /></el-icon>
                                        <span>{{ subGroup.groupName }}</span>
                                      </div>
                                    </div>
                                  </div>
                                </template>
                              </div>
                            </div>
                          </el-dropdown-item>
                          <el-dropdown-item class="normal-item" @click="toggleTaskTop(task)">
                            <el-icon><Top /></el-icon>
                            <span>{{ task.isTop ? '取消置顶' : '置顶' }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item  v-if="currentGroup?.id !== 'trash'" class="normal-item" @click="openPointsDialog(task)">
                            <el-icon><Coin /></el-icon>
                            <span>积分</span>
                          </el-dropdown-item>
                          <el-dropdown-item 
                            v-if="currentGroup?.id === 'trash'"
                            class="normal-item" 
                            @click="restoreTask(task)">
                            <el-icon><Refresh /></el-icon>
                            <span>恢复</span>
                          </el-dropdown-item>
                          <el-dropdown-item class="normal-item" @click="deleteTask(task)">
                            <el-icon><Delete /></el-icon>
                            <span>删除任务</span>
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </template>
              </draggable>
              <div v-if="!group.loading && !group.showNewTaskInput && group.tasks.length === 0" class="no-tasks">
                暂无任务
              </div>
            </el-collapse-item>
          </el-collapse>
        </template>

        <div v-if="loadingSubGroups" class="loading-groups">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>

        <div v-if="!loadingSubGroups && subGroups.length === 0 && currentGroup?.id !== 'completed'" class="no-groups">
          暂无分组
        </div>
      </div>
    </div>

    <!-- 右侧拖动条 -->
    <div class="resize-bar right-resize" 
      @mousedown="startResize($event, 'right')"
      :style="{ left: (leftWidth + middleWidth + 10) + 'px' }">
    </div>

    <!-- 右侧任务详情 -->
    <div class="task-detail" :style="{ 
      left: (leftWidth + middleWidth + 20) + 'px',
      width: (rightWidth - 20) + 'px'
    }">
      <div v-if="selectedTask" class="detail-content">
        <!-- 任务名称 -->
        <el-input
          v-model="selectedTask.taskName"
          class="task-name-input"
          @blur="updateTaskDetail('taskName')"
        />
        <!-- 添加积分显示 -->
        <div class="task-points" v-if="selectedTask.rewardPoints || selectedTask.punishPoints">
          <span v-if="selectedTask.rewardPoints" class="reward-points">
            <el-icon><Coin /></el-icon>
            奖励积分：{{ selectedTask.rewardPoints }}
          </span>
          <span v-if="selectedTask.punishPoints" class="punish-points">
            <el-icon><Coin /></el-icon>
            惩罚积分：{{ selectedTask.punishPoints }}
          </span>
        </div>
        <!-- 任务详情 -->
        <el-input
          type="textarea"
          v-model="selectedTask.taskRemark"
          class="task-notes-input"
          placeholder="添加备注..."
          :autosize="{ minRows: 4 }"
          @blur="updateTaskDetail('taskRemark')"
        />
        
        <!-- 添加图片上传区域 -->
        <div class="task-images">
          <div class="images-header">
            <h3>任务图片</h3>
            <el-upload
              class="image-uploader"
              action="/auth-service/file/upload"
              name="file"
              :show-file-list="false"
              :before-upload="(file) => {
                handleImageUpload(file)
                return false
              }"
            >
              <el-button type="primary" :loading="isUploading">
                <el-icon><Upload /></el-icon>
                上传图片
              </el-button>
            </el-upload>
          </div>
          
          <div 
            class="images-container"
            @paste="handlePaste"
            @drop="handleDrop"
            @dragover="handleDragOver"
          >
            <div v-if="!selectedTask.fileList?.length" class="empty-tip">
              <el-icon><Picture /></el-icon>
              <p>支持拖拽图片、粘贴图片或点击上传</p>
              <el-upload
                class="image-uploader"
                action="/auth-service/file/upload"
                name="file"
                :show-file-list="false"
                :before-upload="(file) => {
                  handleImageUpload(file)
                  return false
                }"
              >
              </el-upload>
            </div>
            
            <div v-else class="image-list">
              <div v-for="(file, index) in selectedTask.fileList" :key="index" class="image-item">
                <el-image 
                  :src="file.fileUrl" 
                  :preview-src-list="selectedTask.fileList.map(f => f.fileUrl)"
                  :initial-index="index"
                  fit="cover"
                />
                <div class="image-actions">
                  <el-button 
                    type="danger" 
                    size="small" 
                    circle
                    @click="handleDeleteFile(file)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
      @opened="handleDialogOpened"
      class="add-group-dialog"
    >
      <el-form
        ref="addGroupFormRef"
        :model="addGroupForm"
        :rules="addGroupRules"
        label-width="80px"
        @submit.prevent="submitAddGroup"
      >
        <el-form-item :label="addGroupForm.parentId ? '分组名称' : '清单名称'" prop="groupName">
          <el-input 
            v-model="addGroupForm.groupName"
            :placeholder="addGroupForm.parentId ? '请输入分组名称' : '请输入清单名称'"
            maxlength="20"
            show-word-limit
            ref="groupNameInput"
            @keyup.enter.prevent="submitAddGroup"
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

    <!-- 重命名分组对话框 -->
    <el-dialog
      v-model="renameDialogVisible"
      title="重命名分组"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="renameFormRef"
        :model="renameForm"
        :rules="addGroupRules"
        label-width="80px"
      >
        <el-form-item label="分组名称" prop="groupName">
          <el-input 
            v-model="renameForm.groupName"
            placeholder="请输入分组名称"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="renameDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitRename">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 右键菜单 -->
    <div 
      v-if="contextMenuVisible"
      class="context-menu"
      :class="{ 'menu-top': contextMenuDirection === 'top' }"
      :style="{ 
        left: contextMenuX + 'px', 
        top: contextMenuY + 'px'
      }"
      @click="closeContextMenu"
    >
      <!-- 截止日期快捷选项 -->
      <div class="context-menu-item">
        <el-icon><Calendar /></el-icon>
        <span>截止日期</span>
        <div class="quick-actions">
          <el-icon 
            class="quick-action-icon" 
            @click.stop="contextMenuTask && setTaskDeadline(contextMenuTask, 'today')"
            title="今天"
          ><SvgIcon dir="task-list" name="today" /></el-icon>
          <el-icon 
            class="quick-action-icon" 
            @click.stop="contextMenuTask && setTaskDeadline(contextMenuTask, 'tomorrow')"
            title="明天"
          ><SvgIcon dir="task-list" name="tomorrow" /></el-icon>
          <el-icon 
            class="quick-action-icon" 
            @click.stop="contextMenuTask && setTaskDeadline(contextMenuTask, 'nextWeek')"
            title="下周"
          ><SvgIcon dir="task-list" name="last-week" /></el-icon>
          <el-icon 
            class="quick-action-icon" 
            @click.stop="showDatePicker($event, contextMenuTask)"
            title="自定义"
          ><SvgIcon dir="task-list" name="custom-date" /></el-icon>
        </div>
      </div>
      <!-- 优先级快捷选项 -->
      <div class="context-menu-item">
        <el-icon><Flag /></el-icon>
        <span>优先级</span>
        <div class="quick-actions">
          <el-icon 
            class="quick-action-icon priority-high" 
            @click.stop="contextMenuTask && setTaskPriority(contextMenuTask, 30)"
            title="高"
          ><Flag /></el-icon>
          <el-icon 
            class="quick-action-icon priority-medium" 
            @click.stop="contextMenuTask && setTaskPriority(contextMenuTask, 20)"
            title="中"
          ><Flag /></el-icon>
          <el-icon 
            class="quick-action-icon priority-low" 
            @click.stop="contextMenuTask && setTaskPriority(contextMenuTask, 10)"
            title="低"
          ><Flag /></el-icon>
          <el-icon 
            class="quick-action-icon priority-none" 
            @click.stop="contextMenuTask && setTaskPriority(contextMenuTask, 0)"
            title="无"
          ><Flag /></el-icon>
        </div>
      </div>
      <!-- 移动到选项 -->
      <div class="context-menu-item move-to-wrapper" 
        @mouseenter="showMoveToMenu = true" 
        @mouseleave="handleMoveToMenuLeave"
      >
        <el-icon><FolderOpened /></el-icon>
        <span>移动到</span>
        <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        <!-- 移动到菜单 -->
        <div v-show="showMoveToMenu" class="move-to-menu">
          <div class="search-box">
            <el-input v-model="moveToSearchText" placeholder="搜索" clearable />
          </div>
          <!-- 收集箱选项 -->
          <div class="menu-item" @click="moveTask(contextMenuTask!, 0)">
            <el-icon><SvgIcon dir="task-list" name="inbox" /></el-icon>
            <span>收集箱</span>
          </div>
          <!-- 自定义清单列表 -->
          <template v-for="list in filteredMoveList" :key="list.id">
            <div class="menu-item">
              <el-icon><SvgIcon dir="task-list" name="list" /></el-icon>
              <span>{{ list.groupName }}</span>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
              <!-- 分组子菜单 -->
              <div class="move-to-submenu">
                <div 
                  v-for="subGroup in list.subGroupList" 
                  :key="subGroup.id" 
                  class="menu-item"
                  @click="moveTask(contextMenuTask!, subGroup.id)"
                >
                  <el-icon><SvgIcon dir="task-list" name="folder" /></el-icon>
                  <span>{{ subGroup.groupName }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="contextMenuTask && toggleTaskTop(contextMenuTask)">
        <el-icon><Top /></el-icon>
        <span>{{ contextMenuTask?.isTop ? '取消置顶' : '置顶' }}</span>
      </div>
      <div class="context-menu-item"  v-if="currentGroup?.id !== 'trash'" @click="contextMenuTask && openPointsDialog(contextMenuTask)">
        <el-icon><Coin /></el-icon>
        <span>积分</span>
      </div>
      <div 
        v-if="currentGroup?.id === 'trash'"
        class="context-menu-item" 
        @click="contextMenuTask && restoreTask(contextMenuTask)">
        <el-icon><Refresh /></el-icon>
        <span>恢复</span>
      </div>
      <div class="context-menu-item" @click="contextMenuTask && deleteTask(contextMenuTask)">
        <el-icon><Delete /></el-icon>
        <span>删除任务</span>
      </div>
    </div>

    <!-- 修改日期选择器弹窗 -->
    <div 
      v-if="datePickerVisible" 
      class="date-picker-popup"
      :style="{ 
        left: datePickerPosition.x + 'px', 
        top: datePickerPosition.y + 'px' 
      }"
      @click.stop
    >
      <div class="date-picker-header">
        <el-icon class="arrow-icon" @click="prevMonth"><ArrowLeft /></el-icon>
        <span class="current-date">{{ currentYear }}年 {{ currentMonth + 1 }}月</span>
        <el-icon class="arrow-icon" @click="nextMonth"><ArrowRight /></el-icon>
      </div>
      <div class="date-picker-content">
        <div class="weekdays">
          <span v-for="day in weekDays" :key="day">{{ day }}</span>
        </div>
        <div class="days">
          <div 
            v-for="day in calendarDays" 
            :key="day.key"
            class="day"
            :class="{
              'other-month': !day.currentMonth,
              'today': isToday(day.date),
              'selected': isSelected(day.date)
            }"
            @click="selectDate(day.date)"
          >
            {{ day.dayOfMonth }}
          </div>
        </div>
      </div>
      <div class="date-picker-footer">
        <el-button size="small" @click="selectToday">今天</el-button>
        <el-button size="small" @click="selectTomorrow">明天</el-button>
        <el-button size="small" @click="selectNextWeek">一周后</el-button>
      </div>
    </div>

    <!-- 积分弹框 -->
    <el-dialog
      v-model="pointsDialogVisible"
      title="设置积分"
      width="400px"
      :close-on-click-modal="false">
      <el-form :model="pointsForm" :rules="pointsRules" label-width="80px">
        <el-form-item label="奖励积分" prop="rewardPoints">
          <el-input-number 
            v-model="pointsForm.rewardPoints"
            :min="0"
            :precision="0"
            placeholder="请输入奖励积分"/>
        </el-form-item>
        <el-form-item label="处罚积分" prop="punishPoints">
          <el-input-number 
            v-model="pointsForm.punishPoints"
            :min="0"
            :precision="0"
            placeholder="请输入处罚积分"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="pointsDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePoints">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, onUnmounted, computed } from 'vue'
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
  Loading,
  Edit,
  ArrowRight,
  Flag,
  Top,
  Position,
  ArrowLeft,
  Refresh,
  Coin,
  Bottom,
  Upload,
  Picture
} from '@element-plus/icons-vue'
import type { TaskGroup } from '@/types/types'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api/request'
import { 
  addTaskGroup, 
  getTaskGroupList, 
  getTaskGroupStatistics, 
  getTaskList,
  addTask as addTaskApi,
  updateTask,
  renameTaskGroup,
  deleteTaskGroup,
  getTaskGroupMoveList,
  type TaskGroupListVo, 
  type StatisticsLatestTaskNumVo, 
  type TaskBasicsVo,
  type TaskGroupMoveListVo 
} from '@/api/taskList'
import SvgIcon from '@/components/SvgIcon.vue'
import draggable from 'vuedraggable'

// 面板宽度控制
const leftWidth = ref(250)
const middleWidth = ref(400)
const rightWidth = ref(650)
const isLeftCollapsed = ref(false)

// 分组数据
const fixedGroups = ref<TaskGroup[]>([
  { id: 'today', name: '今天', icon: 'today', count: 0 },
  { id: 'week', name: '最近7天', icon: 'last-7day', count: 0 },
  { id: 'deadline', name: '截止任务', icon: 'deadline', count: 0 },
  { id: 'inbox', name: '收集箱', icon: 'box', count: 0 }
])

const customGroups = ref<TaskGroup[]>([])
const bottomGroups = ref<TaskGroup[]>([
  { id: 'completed', name: '已完成', icon: 'done', count: 0 },
  { id: 'trash', name: '垃圾箱', icon: 'deleted', count: 0 }
])

// 当前选中的分组
const currentGroup = ref<TaskGroup | null>(null)

// 任务相关
const newTaskName = ref('')
const selectedTask = ref<TaskBasicsVo | null>(null)
const isHideCompleted = ref(false)
const activeCollapse = ref<(string | number)[]>([])
const activeTask = ref<TaskBasicsVo | null>(null)

// 添加清单相关
const addGroupDialogVisible = ref(false)
const addGroupFormRef = ref<FormInstance>()
const addGroupForm = reactive({
  groupName: '',
  parentId: undefined as string | undefined
})
const addGroupRules: FormRules = {
  groupName: [
    { required: true, message: '请输入分组名称', trigger: 'submit' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'submit' }
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
  taskNum?: number;
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
  selectedTask.value = null  // 清空选中的任务
  activeTask.value = null   // 清空高亮的任务
  
  // 如果是已完成分组，加载已完成任务列表
  if (group.id === 'completed') {
    try {
      loadingSubGroups.value = true
      currentPage.value = 1 // 重置页码
      hasMore.value = true // 重置加载更多状态
      const res = await request.get(`/points-service/points/task/basics/doneList?currentPage=${currentPage.value}`)
      if (Array.isArray(res.data)) {
        subGroups.value = [{
          id: 'completed',
          name: '已完成',
          tasks: res.data.map(task => ({
            ...task,
            completed: true
          })),
          loading: false,
          showNewTaskInput: false,
          newTaskName: '',
          taskNum: res.data.length
        }]
        // 如果返回的数据少于10条，说明没有更多数据了
        hasMore.value = res.data.length >= 10
      }
    } catch (error) {
      console.error('加载已完成任务失败:', error)
      ElMessage.error('加载已完成任务失败')
    } finally {
      loadingSubGroups.value = false
    }
    return
  }

  // 如果是垃圾箱分组，加载已删除任务列表
  if (group.id === 'trash') {
    try {
      loadingSubGroups.value = true
      const res = await request.get('/points-service/points/task/basics/deletedList')
      if (Array.isArray(res.data)) {
        subGroups.value = [{
          id: 'trash',
          name: '垃圾箱',
          tasks: res.data.map(task => ({
            ...task,
            completed: false
          })),
          loading: false,
          showNewTaskInput: false,
          newTaskName: '',
          taskNum: res.data.length
        }]
      }
    } catch (error) {
      console.error('加载已删除任务失败:', error)
      ElMessage.error('加载已删除任务失败')
    } finally {
      loadingSubGroups.value = false
    }
    return
  }

  // 如果是固定清单（今天、最近7天、收集箱），加载对应的任务列表
  if (['today', 'week', 'inbox', 'deadline'].includes(group.id)) {
    try {
      loadingSubGroups.value = true
      let startDeadlineDate: string | undefined
      let endDeadlineDate: string | undefined
      const today = new Date()
      const todayStr = formatDate(today)

      switch (group.id) {
        case 'today':
          // startDeadlineDate = todayStr
          endDeadlineDate = todayStr
          break
        case 'week':
          // startDeadlineDate = todayStr
          const nextWeek = new Date(today)
          nextWeek.setDate(nextWeek.getDate() + 7)
          endDeadlineDate = formatDate(nextWeek)
          break
        case 'inbox':
          // 收集箱不需要时间范围
          break
        case 'deadline':
          // 截止任务不需要时间范围
          break
      }

      const res = await getTaskList(group.id === 'inbox' ? '0' : '', startDeadlineDate, endDeadlineDate, group.id === 'deadline')
      if (Array.isArray(res.data)) {
        subGroups.value = [{
          id: group.id,
          name: group.name,
          tasks: res.data,
          loading: false,
          showNewTaskInput: false,
          newTaskName: '',
          taskNum: res.data.length
        }]
      }
    } catch (error) {
      console.error('加载任务列表失败:', error)
      ElMessage.error('加载任务列表失败')
    } finally {
      loadingSubGroups.value = false
    }
    return
  }
  
  // 如果是自定义分组，加载其子分组
  if (customGroups.value.find(g => g.id === group.id)) {
    await loadSubGroups(group.id)
  }
}

// 添加任务
const addTask = async () => {
  if (!newTaskName.value.trim()) return
  
  try {
    let deadlineDate: string | null = null
    let taskGroupId = 0

    // 根据当前清单设置截止日期和任务分组ID
    if (currentGroup.value) {
      switch (currentGroup.value.id) {
        case 'today':
          deadlineDate = formatDate(new Date())
          taskGroupId = 0
          break
        case 'week':
          const nextWeek = new Date()
          nextWeek.setDate(nextWeek.getDate() + 7)
          deadlineDate = formatDate(nextWeek)
          taskGroupId = 0
          break
        case 'inbox':
          deadlineDate = null
          taskGroupId = 0
          break
        case 'deadline':
          const nextMonth = new Date()
          nextMonth.setDate(nextMonth.getDate() + 30)
          deadlineDate = formatDate(nextMonth)
          taskGroupId = 0
          break
        default:
          // 如果是自定义清单，检查是否有分组
          if (subGroups.value.length === 0) {
            // 如果没有分组，先创建默认分组
            const res = await addTaskGroup({
              groupName: '未分组',
              parentId: currentGroup.value.id
            })
            if (res.data) {
              taskGroupId = res.data
              // 刷新分组列表
              await loadSubGroups(currentGroup.value.id)
            }
          } else {
            // 如果有分组，使用第一个分组的ID
            taskGroupId = subGroups.value[0]?.id ? parseInt(subGroups.value[0].id) : 0
          }
      }
    }

    await addTaskApi({
      taskName: newTaskName.value.trim(),
      taskGroupId,
      deadlineDate
    })

    // 更新当前分组的任务列表
    if (currentGroup.value && ['today', 'week', 'inbox', 'deadline'].includes(currentGroup.value.id)) {
      let startDeadlineDate: string | undefined
      let endDeadlineDate: string | undefined
      const today = new Date()
      const todayStr = formatDate(today)

      switch (currentGroup.value.id) {
        case 'today':
          startDeadlineDate = todayStr
          endDeadlineDate = todayStr
          break
        case 'week':
          startDeadlineDate = todayStr
          const nextWeek = new Date(today)
          nextWeek.setDate(nextWeek.getDate() + 7)
          endDeadlineDate = formatDate(nextWeek)
          break
        case 'inbox':
          // 收集箱不需要时间范围
          break
        case 'deadline':
          // 截止任务不需要时间范围
          break
      }

      const res = await getTaskList(currentGroup.value.id === 'inbox' ? '0' : '', startDeadlineDate, endDeadlineDate, currentGroup.value.id === 'deadline')
      if (Array.isArray(res.data)) {
        subGroups.value = [{
          id: currentGroup.value.id,
          name: currentGroup.value.name,
          tasks: res.data,
          loading: false,
          showNewTaskInput: false,
          newTaskName: '',
          taskNum: res.data.length
        }]
      }
    } else if (currentGroup.value && !['today', 'week', 'inbox', 'deadline', 'completed', 'trash'].includes(currentGroup.value.id)) {
      // 如果是自定义清单，只刷新第一个分组的任务列表
      if (subGroups.value.length > 0) {
        await loadGroupTasks(subGroups.value[0].id)
        // 更新第一个分组的任务数量
        subGroups.value[0].taskNum = (subGroups.value[0].taskNum || 0) + 1
      }
    }
    
    newTaskName.value = ''
    
    // 更新固定分组和清单列表的任务数量
    await updateTaskCounts()

    ElMessage.success('添加任务成功')
  } catch (error) {
    console.error('添加任务失败:', error)
    ElMessage.error('添加任务失败')
  }
}

// 切换任务状态
const toggleTaskStatus = async (task: TaskBasicsVo) => {
  try {
    await request.put('/points-service/points/task/basics/updateStatus', {
      id: task.id,
      taskStatus: task.completed ? 1 : 0
    })
    
    // 更新本地任务数据
    const group = subGroups.value.find(g => g.id === task.taskGroupId?.toString())
    if (group) {
      const taskIndex = group.tasks.findIndex(t => t.id === task.id)
      if (taskIndex > -1) {
        // 添加动画效果
        const taskElement = document.querySelector(`[data-task-id="${task.id}"]`) as HTMLElement
        if (taskElement && task.completed) {
          taskElement.style.transition = 'all 0.3s ease-out'
          taskElement.style.opacity = '0'
          taskElement.style.transform = 'translateX(20px)'
          
          // 等待动画完成后移除任务
          setTimeout(() => {
            group.tasks.splice(taskIndex, 1)
            group.taskNum = (group.taskNum || 1) - 1
          }, 300)
        } else {
          group.tasks[taskIndex] = {
            ...group.tasks[taskIndex],
            completed: task.completed
          }
        }
      }
    }

    // 更新固定分组和清单列表的任务数量
    await updateTaskCounts()
    
    // 如果是已完成清单中的任务，取消完成状态后需要重新加载已完成任务列表
    if (currentGroup.value?.id === 'completed') {
      const res = await request.get('/points-service/points/task/basics/doneList')
      if (Array.isArray(res.data)) {
        subGroups.value = [{
          id: 'completed',
          name: '已完成',
          tasks: res.data.map(t => ({
            ...t,
            completed: true
          })),
          loading: false,
          showNewTaskInput: false,
          newTaskName: '',
          taskNum: res.data.length
        }]
      }
    }
    
    ElMessage.success(task.completed ? '任务已完成' : '任务已恢复')
  } catch (error) {
    console.error('更新任务状态失败:', error)
    ElMessage.error('更新任务状态失败')
  }
}

// 选择任务
const selectTask = async (task: TaskBasicsVo) => {
  selectedTask.value = task
  isTaskDetailVisible.value = true
  
  // 获取任务详情
  await handleTaskDetail(task.id)
}

const handleTaskDetail = async (taskId: number) => {
  const res = await request.get(`/points-service/points/task/basics/detail?id=${taskId}`)
  selectedTask.value = {
    ...selectedTask.value,
    taskRemark: res.data.taskRemark,
    rewardPoints: res.data.rewardPoints,
    punishPoints: res.data.punishPoints,
    fileList: res.data.fileList
  }
}

// 更新任务详情
const updateTaskDetail = async (field: 'taskName' | 'taskRemark') => {
  if (!selectedTask.value) return

  try {
    const group = subGroups.value.find(g => g.tasks.some(t => t.id === selectedTask.value?.id))
    if (!group) return

    await updateTask({
      id: selectedTask.value.id,
      taskName: selectedTask.value.taskName,
      taskRemark: selectedTask.value.taskRemark,
      taskGroupId: selectedTask.value.taskGroupId
    })

    // 更新列表中的任务名称
    if (field === 'taskName') {
      const task = group.tasks.find(t => t.id === selectedTask.value?.id)
      if (task) {
        task.taskName = selectedTask.value.taskName
      }
    }
  } catch (error) {
    console.error('更新任务失败:', error)
    ElMessage.error('更新任务失败')
  }
}

// 打开添加清单弹框
const openAddGroupDialog = () => {
  // 清空父分组ID，因为点击清单旁边的加号时不需要父分组
  addGroupForm.parentId = undefined
  addGroupDialogVisible.value = true
  nextTick(() => {
    // 使用更精确的选择器
    const input = document.querySelector('.add-group-dialog .el-input__inner') as HTMLInputElement
    if (input) {
      input.focus()
    }
  })
}

// 添加分组
const addGroup = () => {
  // 设置父分组ID
  if (currentGroup.value) {
    addGroupForm.parentId = currentGroup.value.id
  }
  addGroupDialogVisible.value = true
  nextTick(() => {
    // 使用更精确的选择器
    const input = document.querySelector('.add-group-dialog .el-input__inner') as HTMLInputElement
    if (input) {
      input.focus()
    }
  })
}

// 切换隐藏已完成任务
const toggleHideCompleted = () => {
  isHideCompleted.value = !isHideCompleted.value
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
        
        // 如果是添加分组，刷新当前清单的分组列表
        if (currentGroup.value) {
          await loadSubGroups(currentGroup.value.id)
        }
        
        // 重新加载自定义分组和移动清单列表
        await loadCustomGroups()
        await loadMoveList()
      } catch (error) {
        console.error(addGroupForm.parentId ? '添加分组失败:' : '添加清单失败:', error)
        ElMessage.error('添加失败')
      }
    }
  })
}

// 加载子分组
const loadSubGroups = async (parentId: string) => {
  // 如果不是自定义清单，直接返回
  if (['today', 'week', 'inbox', 'deadline', 'completed', 'trash'].includes(parentId)) {
    return
  }

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
        newTaskName: '',
        taskNum: item.taskNum
      }))

      // 如果只有一个分组且分组名为"未分组"，自动加载其任务列表
      if (subGroups.value.length === 1 && subGroups.value[0].name === '未分组') {
        await loadGroupTasks(subGroups.value[0].id)
      }
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
const showNewTaskInput = async (groupId: string) => {
  // 如果分组未展开，先展开分组
  if (!activeCollapse.value.includes(groupId)) {
    activeCollapse.value = [...activeCollapse.value, groupId]
    // 加载任务列表
    await loadGroupTasks(groupId)
  }

  // 显示新任务输入框
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
    
    // 只刷新当前分组的任务列表
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

// 重命名分组对话框
const renameDialogVisible = ref(false)
const renameForm = reactive({
  id: 0,
  groupName: ''
})
const renameFormRef = ref<FormInstance>()

// 重命名分组
const renameGroup = (group: TaskGroup) => {
  renameForm.id = parseInt(group.id)
  renameForm.groupName = group.name
  renameDialogVisible.value = true
}

// 提交重命名
const submitRename = async () => {
  if (!renameFormRef.value) return

  await renameFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await renameTaskGroup({
          id: renameForm.id,
          groupName: renameForm.groupName
        })
        
        ElMessage.success('重命名成功')
        renameDialogVisible.value = false
        
        // 更新本地分组名称
        const group = subGroups.value.find(g => g.id === renameForm.id.toString())
        if (group) {
          group.name = renameForm.groupName
        }

        // 重新加载自定义分组列表和移动清单列表
        await loadCustomGroups()
        await loadMoveList()
      } catch (error) {
        console.error('重命名分组失败:', error)
        ElMessage.error('重命名失败')
      }
    }
  })
}

// 删除分组
const deleteGroup = async (group: TaskGroup) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该分组吗？删除后无法恢复，分组内的所有任务也将被删除。',
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteTaskGroup(parseInt(group.id))
    ElMessage.success('删除成功')

    // 重新加载自定义分组列表和移动清单列表
    await loadCustomGroups()
    await loadMoveList()

    // 如果分组是自定义清单，则刷新任务列表
    if (group.parentId && group.parentId === '0') {
      await loadSubGroups(group.parentId)
    }
    
    // 从列表中移除该分组
    const index = customGroups.value.findIndex(g => g.id === group.id)
    if (index > -1) {
      customGroups.value.splice(index, 1)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除分组失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 处理对话框打开完成事件
const handleDialogOpened = () => {
  nextTick(() => {
    const input = document.querySelector('.add-group-dialog .el-input__inner') as HTMLInputElement
    if (input) {
      input.focus()
    }
  })
}

// 格式化日期为yyyy-MM-dd
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 设置任务截止日期
const setTaskDeadline = async (task: TaskBasicsVo, type: 'today' | 'tomorrow' | 'nextWeek' | 'custom') => {
  let deadlineDate: string | null = null
  const now = new Date()
  
  switch (type) {
    case 'today':
      deadlineDate = formatDate(now)
      break
    case 'tomorrow':
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      deadlineDate = formatDate(tomorrow)
      break
    case 'nextWeek':
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      deadlineDate = formatDate(nextWeek)
      break
    case 'custom':
      // 自定义日期时，显示日期选择器
      showDatePicker(new MouseEvent('click'), task)
      return
  }

  try {
    await updateTask({
      id: task.id,
      taskName: task.taskName,
      taskRemark: task.taskRemark,
      taskGroupId: task.taskGroupId,
      deadlineDate,
      priority: task.priority || 0,
      isTop: task.isTop || 0
    })

    // 更新本地任务数据
    const group = subGroups.value.find(g => g.id === task.taskGroupId?.toString())
    if (group) {
      const taskIndex = group.tasks.findIndex(t => t.id === task.id)
      if (taskIndex > -1) {
        group.tasks[taskIndex] = {
          ...group.tasks[taskIndex],
          deadlineDate
        }
      }
    }

    // 更新固定分组和清单列表的任务数量
    await updateTaskCounts()
    
    ElMessage.success('设置截止日期成功')
    closeContextMenu() // 关闭菜单
  } catch (error) {
    console.error('设置截止日期失败:', error)
    ElMessage.error('设置截止日期失败')
  }
}

// 设置任务优先级
const setTaskPriority = async (task: TaskBasicsVo, priority: number) => {
  try {
    await updateTask({
      id: task.id,
      taskName: task.taskName,
      taskRemark: task.taskRemark,
      taskGroupId: task.taskGroupId,
      deadlineDate: task.deadlineDate,
      priority,
      isTop: task.isTop || 0
    })
    task.priority = priority
    ElMessage.success('设置优先级成功')
    closeContextMenu() // 关闭菜单
  } catch (error) {
    console.error('设置优先级失败:', error)
    ElMessage.error('设置优先级失败')
  }
}

// 切换任务置顶状态
const toggleTaskTop = async (task: TaskBasicsVo) => {
  const newIsTop = task.isTop === 1 ? 0 : 1
  try {
    await updateTask({
      id: task.id,
      taskName: task.taskName,
      taskRemark: task.taskRemark,
      taskGroupId: task.taskGroupId,
      deadlineDate: task.deadlineDate,
      priority: task.priority || 0,
      isTop: newIsTop
    })
    task.isTop = newIsTop
    ElMessage.success(newIsTop === 1 ? '置顶成功' : '取消置顶成功')
  } catch (error) {
    console.error('切换置顶状态失败:', error)
    ElMessage.error('操作失败')
  }
}

// 恢复任务
const restoreTask = async (task: TaskBasicsVo) => {
  try {
    await request.put('/points-service/points/task/basics/updateStatus', {
      id: task.id,
      taskStatus: 0
    })
    
    // 从列表中移除该任务并更新任务数量
    const group = subGroups.value.find(g => g.id === task.taskGroupId?.toString())
    if (group) {
      const index = group.tasks.findIndex(t => t.id === task.id)
      if (index > -1) {
        group.tasks.splice(index, 1)
        group.taskNum = (group.taskNum || 1) - 1
      }
    }
    
    // 更新固定分组和清单列表的任务数量
    await updateTaskCounts()
    
    // 如果是垃圾箱清单，刷新任务列表
    if (currentGroup.value?.id === 'trash') {
      const res = await request.get('/points-service/points/task/basics/deletedList')
      if (Array.isArray(res.data)) {
        subGroups.value = [{
          id: 'trash',
          name: '垃圾箱',
          tasks: res.data.map(t => ({
            ...t,
            completed: false
          })),
          loading: false,
          showNewTaskInput: false,
          newTaskName: '',
          taskNum: res.data.length
        }]
      }
    }
    
    ElMessage.success('恢复任务成功')
    closeContextMenu() // 关闭右键菜单
  } catch (error) {
    console.error('恢复任务失败:', error)
    ElMessage.error('恢复任务失败')
  }
}

// 删除任务
const deleteTask = async (task: TaskBasicsVo) => {
  try {
    // 根据当前清单类型显示不同的确认提示
    const confirmMessage = currentGroup.value?.id === 'trash' 
      ? '确定要永久删除该任务吗？删除后将无法恢复。'
      : '确定要删除该任务吗？删除后任务将进入垃圾箱。'

    await ElMessageBox.confirm(
      confirmMessage,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 根据当前清单类型调用不同的删除接口
    if (currentGroup.value?.id === 'trash') {
      // 垃圾箱清单下使用永久删除接口
      await request.delete('/points-service/points/task/basics/delete?id=' + task.id)
    } else {
      // 其他清单下使用更新状态接口
      await request.put('/points-service/points/task/basics/updateStatus', {
        id: task.id,
        taskStatus: 3
      })
    }
    
    // 从列表中移除该任务并更新任务数量
    const group = subGroups.value.find(g => g.id === task.taskGroupId?.toString())
    if (group) {
      const index = group.tasks.findIndex(t => t.id === task.id)
      if (index > -1) {
        group.tasks.splice(index, 1)
        group.taskNum = (group.taskNum || 1) - 1
      }
    }
    
    // 更新固定分组和清单列表的任务数量
    await updateTaskCounts()
    
    // 如果是垃圾箱清单或固定清单，刷新任务列表
    if (currentGroup.value && ['trash', 'today', 'week', 'inbox', 'deadline'].includes(currentGroup.value.id)) {
      let startDeadlineDate: string | undefined
      let endDeadlineDate: string | undefined
      const today = new Date()
      const todayStr = formatDate(today)

      switch (currentGroup.value.id) {
        case 'trash':
          const res = await request.get('/points-service/points/task/basics/deletedList')
          if (Array.isArray(res.data)) {
            subGroups.value = [{
              id: 'trash',
              name: '垃圾箱',
              tasks: res.data.map(t => ({
                ...t,
                completed: false
              })),
              loading: false,
              showNewTaskInput: false,
              newTaskName: '',
              taskNum: res.data.length
            }]
          }
          break
        case 'today':
          startDeadlineDate = todayStr
          endDeadlineDate = todayStr
          break
        case 'week':
          startDeadlineDate = todayStr
          const nextWeek = new Date(today)
          nextWeek.setDate(nextWeek.getDate() + 7)
          endDeadlineDate = formatDate(nextWeek)
          break
        case 'inbox':
          // 收集箱不需要时间范围
          break
      }

      if (currentGroup.value.id !== 'trash') {
        const res = await getTaskList(currentGroup.value.id === 'inbox' ? '0' : '', startDeadlineDate, endDeadlineDate, currentGroup.value.id === 'deadline')
        if (Array.isArray(res.data)) {
          subGroups.value = [{
            id: currentGroup.value.id,
            name: currentGroup.value.name,
            tasks: res.data,
            loading: false,
            showNewTaskInput: false,
            newTaskName: '',
            taskNum: res.data.length
          }]
        }
      }
    }
    
    ElMessage.success('删除成功')
    closeContextMenu() // 关闭右键菜单
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除任务失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 右键菜单相关
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTask = ref<TaskBasicsVo | null>(null)
const contextMenuDirection = ref<'top' | 'bottom'>('bottom')

// 显示右键菜单
const showTaskContextMenu = (event: MouseEvent, task: TaskBasicsVo) => {
  event.preventDefault()
  contextMenuTask.value = task
  activeTask.value = task
  contextMenuX.value = event.clientX
  
  // 计算菜单高度（每个菜单项高度约40px，分隔线高度约8px）
  const menuHeight = 40 * 4 + 8 // 4个菜单项 + 1个分隔线
  
  // 获取视窗高度
  const windowHeight = window.innerHeight
  
  // 计算点击位置到视窗底部的距离
  const distanceToBottom = windowHeight - event.clientY
  
  // 如果点击位置到视窗底部的距离小于菜单高度，则向上展示
  if (distanceToBottom < menuHeight) {
    contextMenuDirection.value = 'top'
    // 从鼠标位置开始向上展示
    contextMenuY.value = event.clientY - menuHeight
  } else {
    contextMenuDirection.value = 'bottom'
    contextMenuY.value = event.clientY
  }
  
  contextMenuVisible.value = true
}

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenuVisible.value = false
  contextMenuTask.value = null
  activeTask.value = null
}

// 点击其他地方关闭右键菜单和高亮效果
onMounted(() => {
  document.addEventListener('click', () => {
    closeContextMenu()
    activeTask.value = null
  })
})

onUnmounted(() => {
  document.removeEventListener('click', () => {
    closeContextMenu()
    activeTask.value = null
  })
})

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
             group.id === 'inbox' ? res.data.noGroupNum :
             group.id === 'deadline' ? res.data.withDeadlineNum : 0
    }))
    
    // 加载自定义分组
    await loadCustomGroups()
    
    // 加载移动清单列表
    await loadMoveList()

    // 默认选中今天分组
    switchGroup(fixedGroups.value[0])
  } catch (error) {
    console.error('初始化失败:', error)
    ElMessage.error('加载数据失败')
  }
})

const datePickerVisible = ref(false)
const datePickerPosition = reactive({
  x: 0,
  y: 0
})
const currentTask = ref<TaskBasicsVo | null>(null)

// 显示日期选择器
const showDatePicker = (event: MouseEvent, task: TaskBasicsVo | null) => {
  if (!task) return
  
  event.stopPropagation()
  currentTask.value = task
  
  // 计算日期选择器的位置
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  datePickerPosition.x = rect.right + 8 // 在点击位置右侧显示
  datePickerPosition.y = rect.top // 与点击位置顶部对齐
  
  // 检查是否超出视窗右边界
  const pickerWidth = 280 // 日期选择器的宽度
  if (datePickerPosition.x + pickerWidth > window.innerWidth) {
    datePickerPosition.x = rect.left - pickerWidth - 8 // 在左侧显示
  }
  
  // 检查是否超出视窗底部
  const pickerHeight = 320 // 日期选择器的高度
  if (datePickerPosition.y + pickerHeight > window.innerHeight) {
    datePickerPosition.y = window.innerHeight - pickerHeight - 8 // 向上偏移
  }
  
  datePickerVisible.value = true
}

// 关闭日期选择器
const closeDatePicker = () => {
  datePickerVisible.value = false
  currentTask.value = null
}

// 点击其他地方关闭日期选择器
onMounted(() => {
  document.addEventListener('click', () => {
    closeContextMenu()
    closeDatePicker()
    activeTask.value = null
  })
})

onUnmounted(() => {
  document.removeEventListener('click', () => {
    closeContextMenu()
    closeDatePicker()
    activeTask.value = null
  })
})

// 选择日期
const handleDateSelect = async (date: Date) => {
  if (!currentTask.value) return
  
  try {
    // 使用新的格式化方法
    const formattedDate = formatDate(date)
    
    await updateTask({
      id: currentTask.value.id,
      taskName: currentTask.value.taskName,
      taskRemark: currentTask.value.taskRemark,
      taskGroupId: currentTask.value.taskGroupId,
      deadlineDate: formattedDate,
      priority: currentTask.value.priority || 0,
      isTop: currentTask.value.isTop || 0
    })

    // 更新本地任务数据
    if (['today', 'week', 'inbox', 'deadline', 'completed', 'trash'].includes(currentGroup.value?.id || '')) {
      // 对于固定清单和特殊清单，重新加载整个任务列表
      let startDeadlineDate: string | undefined
      let endDeadlineDate: string | undefined
      const today = new Date()
      const todayStr = formatDate(today)

      switch (currentGroup.value?.id) {
        case 'today':
          startDeadlineDate = todayStr
          endDeadlineDate = todayStr
          break
        case 'week':
          startDeadlineDate = todayStr
          const nextWeek = new Date(today)
          nextWeek.setDate(nextWeek.getDate() + 7)
          endDeadlineDate = formatDate(nextWeek)
          break
        case 'inbox':
          // 收集箱不需要时间范围
          break
        case 'completed':
          const res = await request.get('/points-service/points/task/basics/doneList')
          if (Array.isArray(res.data)) {
            subGroups.value = [{
              id: 'completed',
              name: '已完成',
              tasks: res.data.map(t => ({
                ...t,
                completed: true
              })),
              loading: false,
              showNewTaskInput: false,
              newTaskName: '',
              taskNum: res.data.length
            }]
          }
          return
        case 'trash':
          const trashRes = await request.get('/points-service/points/task/basics/deletedList')
          if (Array.isArray(trashRes.data)) {
            subGroups.value = [{
              id: 'trash',
              name: '垃圾箱',
              tasks: trashRes.data.map(t => ({
                ...t,
                completed: false
              })),
              loading: false,
              showNewTaskInput: false,
              newTaskName: '',
              taskNum: trashRes.data.length
            }]
          }
          return
      }

      const res = await getTaskList(currentGroup.value?.id === 'inbox' ? '0' : '', startDeadlineDate, endDeadlineDate, currentGroup.value?.id === 'deadline')
      if (Array.isArray(res.data)) {
        subGroups.value = [{
          id: currentGroup.value?.id || '',
          name: currentGroup.value?.name || '',
          tasks: res.data,
          loading: false,
          showNewTaskInput: false,
          newTaskName: '',
          taskNum: res.data.length
        }]
      }
    } else {
      // 对于自定义清单，只更新单个任务
      const group = subGroups.value.find(g => g.id === currentTask.value?.taskGroupId?.toString())
      if (group) {
        const taskIndex = group.tasks.findIndex(t => t.id === currentTask.value?.id)
        if (taskIndex > -1) {
          group.tasks[taskIndex] = {
            ...group.tasks[taskIndex],
            deadlineDate: formattedDate
          }
        }
      }
    }

    // 更新固定分组和清单列表的任务数量
    await updateTaskCounts()

    ElMessage.success('设置截止日期成功')
  } catch (error) {
    console.error('设置截止日期失败:', error)
    ElMessage.error('设置截止日期失败')
  } finally {
    closeDatePicker()
    closeContextMenu()
  }
}

const selectedDate = ref<Date | null>(null)
const dateShortcuts = [
  {
    text: '今天',
    value: new Date()
  },
  {
    text: '明天',
    value: () => {
      const date = new Date()
      date.setTime(date.getTime() + 3600 * 1000 * 24)
      return date
    }
  },
  {
    text: '一周后',
    value: () => {
      const date = new Date()
      date.setTime(date.getTime() + 3600 * 1000 * 24 * 7)
      return date
    }
  }
]

// 日期选择器相关
const currentDate = ref(new Date())
const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth())
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// 计算日历数据
const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days = []
  
  // 添加上个月的日期
  const firstDayWeekday = firstDay.getDay()
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    days.push({
      date,
      dayOfMonth: date.getDate(),
      currentMonth: false,
      key: date.toISOString() // 添加唯一key
    })
  }
  
  // 添加当前月的日期
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i)
    days.push({
      date,
      dayOfMonth: i,
      currentMonth: true,
      key: date.toISOString() // 添加唯一key
    })
  }
  
  // 添加下个月的日期
  const remainingDays = 42 - days.length // 保持6行
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i)
    days.push({
      date,
      dayOfMonth: date.getDate(),
      currentMonth: false,
      key: date.toISOString() // 添加唯一key
    })
  }
  
  return days
})

// 日期选择器方法
const prevMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1)
}

// 判断日期是否为今天
const isToday = (date: Date | string | null | undefined): boolean => {
  if (!date) return false
  const today = new Date()
  const taskDate = date instanceof Date ? date : new Date(date)
  return today.getDate() === taskDate.getDate() &&
         today.getMonth() === taskDate.getMonth() &&
         today.getFullYear() === taskDate.getFullYear()
}

// 判断日期是否为明天
const isTomorrow = (date: Date | string | null | undefined): boolean => {
  if (!date) return false
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const taskDate = date instanceof Date ? date : new Date(date)
  return tomorrow.getDate() === taskDate.getDate() &&
         tomorrow.getMonth() === taskDate.getMonth() &&
         tomorrow.getFullYear() === taskDate.getFullYear()
}

// 判断日期是否在一周内
const isWithinWeek = (date: Date | string | null | undefined): boolean => {
  if (!date) return false
  const today = new Date()
  const taskDate = date instanceof Date ? date : new Date(date)
  const diffTime = taskDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= 7
}

// 格式化日期显示
const formatDeadlineDisplay = (date: Date | string | null | undefined): string => {
  if (!date) return ''
  if (isToday(date)) return '今天'
  if (isTomorrow(date)) return '明天'
  return date instanceof Date ? formatDate(date) : date
}

// 修改日期选择器相关的方法
const isSelected = (date: Date) => {
  if (!selectedDate.value) return false
  return date.getDate() === selectedDate.value.getDate() &&
         date.getMonth() === selectedDate.value.getMonth() &&
         date.getFullYear() === selectedDate.value.getFullYear()
}

const selectDate = (date: Date) => {
  selectedDate.value = date
  handleDateSelect(date)
}

const selectToday = () => {
  const today = new Date()
  selectDate(today)
}

const selectTomorrow = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  selectDate(tomorrow)
}

const selectNextWeek = () => {
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  selectDate(nextWeek)
}

// 更新任务数量
const updateTaskCounts = async () => {
  try {
    // 更新固定分组的数量
    const res = await getTaskGroupStatistics()
    fixedGroups.value = fixedGroups.value.map(group => ({
      ...group,
      count: group.id === 'today' ? res.data.todayNum :
             group.id === 'week' ? res.data.weekNum :
             group.id === 'inbox' ? res.data.noGroupNum :
             group.id === 'deadline' ? res.data.withDeadlineNum : 0
    }))
    
    // 更新自定义分组列表
    await loadCustomGroups()
  } catch (error) {
    console.error('更新任务数量失败:', error)
  }
}

// 判断是否为紧急截止日期（今天或更早）
const isUrgentDeadline = (date: string, taskStatus: number): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(date)
  deadline.setHours(0, 0, 0, 0)
  return deadline <= today && taskStatus == 0
}

// 判断是否为警告截止日期（明天到一周内）
const isWarningDeadline = (date: string, taskStatus: number): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(date)
  deadline.setHours(0, 0, 0, 0)
  const diffTime = deadline.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 && diffDays <= 7 && taskStatus == 0
}

// 清空垃圾箱
const clearTrash = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空垃圾箱吗？此操作将永久删除所有已删除的任务，且无法恢复。',
      '清空确认',
      {
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await request.delete('/points-service/points/task/basics/clearDeletedList')
    
    // 重新加载垃圾箱的任务列表
    const res = await request.get('/points-service/points/task/basics/deletedList')
    if (Array.isArray(res.data)) {
      subGroups.value = [{
        id: 'trash',
        name: '垃圾箱',
        tasks: res.data.map(t => ({
          ...t,
          completed: false
        })),
        loading: false,
        showNewTaskInput: false,
        newTaskName: '',
        taskNum: res.data.length
      }]
    }
    
    // 更新固定分组和清单列表的任务数量
    await updateTaskCounts()
    
    ElMessage.success('清空垃圾箱成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空垃圾箱失败:', error)
      ElMessage.error('清空垃圾箱失败')
    }
  }
}

// 加载更多已完成任务
const loadMoreCompletedTasks = async () => {
  try {
    loadingSubGroups.value = true
    currentPage.value++ // 页码自增
    const res = await request.get(`/points-service/points/task/basics/doneList?currentPage=${currentPage.value}`)
    if (Array.isArray(res.data)) {
      // 将新数据追加到现有列表中
      if (subGroups.value[0]) {
        subGroups.value[0].tasks = [
          ...subGroups.value[0].tasks,
          ...res.data.map(task => ({
            ...task,
            completed: true
          }))
        ]
        // 如果返回的数据少于10条，说明没有更多数据了
        hasMore.value = res.data.length >= 10
      }
    }
  } catch (error) {
    console.error('加载更多已完成任务失败:', error)
    ElMessage.error('加载更多已完成任务失败')
  } finally {
    loadingSubGroups.value = false
  }
}

// 添加分页相关的响应式变量
const currentPage = ref(1)
const hasMore = ref(true)

// 添加拖拽排序相关的函数
const handleDragEnd = async (evt: any, groupId: string) => {
  const { oldIndex, newIndex } = evt
  if (oldIndex === newIndex) return

  const group = subGroups.value.find(g => g.id === groupId)
  if (!group) return

  const task = group.tasks[newIndex]
  const oldTask = group.tasks[oldIndex]

  try {
    let newSort = 0
    if (newIndex > oldIndex) {
      // 向下移动，使用上方任务的sort值减1，允许为负数
      const prevTask = group.tasks[newIndex - 1]
      newSort = (prevTask.sort || 0) - 1
    } else {
      // 向上移动
      const nextTask = group.tasks[newIndex + 1]
      newSort = nextTask.sort ? nextTask.sort + 1 : 1
    }

    // 调用更新任务接口
    await updateTask({
      id: task.id,
      taskName: task.taskName,
      taskRemark: task.taskRemark,
      taskGroupId: task.taskGroupId,
      deadlineDate: task.deadlineDate,
      priority: task.priority || 0,
      isTop: task.isTop || 0,
      sort: newSort
    })

    // 更新本地任务数据
    task.sort = newSort
  } catch (error) {
    console.error('更新任务排序失败:', error)
    ElMessage.error('更新任务排序失败')
  }
}

// 移动清单列表缓存
const moveListCache = ref<TaskGroupMoveListVo[]>([])

// 加载移动清单列表
const loadMoveList = async () => {
  try {
    const res = await getTaskGroupMoveList()
    if (Array.isArray(res.data)) {
      moveListCache.value = res.data
    }
  } catch (error) {
    console.error('加载移动清单列表失败:', error)
  }
}

// 移动任务
const moveTask = async (task: TaskBasicsVo, targetGroupId: number) => {
  try {
    // 调用更新任务接口
    await updateTask({
      id: task.id,
      taskName: task.taskName,
      taskRemark: task.taskRemark,
      taskGroupId: targetGroupId,
      deadlineDate: task.deadlineDate,
      priority: task.priority || 0,
      isTop: task.isTop || 0
    })

    // 重新加载固定清单列表和自定义清单列表
    await updateTaskCounts()
    await loadCustomGroups()

    // 如果当前在自定义清单下，重新加载任务分组列表
    if (currentGroup.value && !['today', 'week', 'inbox', 'deadline', 'completed', 'trash'].includes(currentGroup.value.id)) {
      await loadSubGroups(currentGroup.value.id)
    }

    // 获取移动前和移动后的分组所在的清单
    const sourceGroup = subGroups.value.find(g => g.id === task.taskGroupId?.toString())
    const targetGroup = subGroups.value.find(g => g.id === targetGroupId.toString())

    // 如果移动前的分组存在，重新加载其任务列表
    if (sourceGroup) {
      await loadGroupTasks(sourceGroup.id)
    }

    // 如果移动后的分组存在，且与移动前的分组在同一个清单下，重新加载其任务列表
    if (targetGroup && sourceGroup && targetGroup.parentId === sourceGroup.parentId) {
      await loadGroupTasks(targetGroup.id)
    }

    ElMessage.success('移动任务成功')
    closeContextMenu()
    showMoveToMenu.value = false
  } catch (error) {
    console.error('移动任务失败:', error)
    ElMessage.error('移动任务失败')
  }
}

const showMoveToMenu = ref(false)
const moveToSearchText = ref('')
const filteredMoveList = computed(() => {
  return moveListCache.value.filter(list => list.groupName.toLowerCase().includes(moveToSearchText.value.toLowerCase()))
})

// 处理移动到菜单的鼠标离开事件
const handleMoveToMenuLeave = (e: MouseEvent) => {
  // 检查鼠标是否移动到子菜单
  const target = e.relatedTarget as HTMLElement
  if (!target?.closest('.move-to-menu') && !target?.closest('.move-to-submenu')) {
    showMoveToMenu.value = false
  }
}

// 积分弹框相关
const pointsDialogVisible = ref(false)
const pointsForm = ref({
  rewardPoints: '',
  punishPoints: ''
})
const currentTaskForPoints = ref<TaskBasicsVo | null>(null)

// 打开积分弹框
const openPointsDialog = async (task: TaskBasicsVo) => {
  currentTaskForPoints.value = task
  // 先查询任务积分
  const res = await request.get(`/bookkeeping-service/points/task/relation/getByTaskId?taskId=${task.id}`)
  if (res.data) {
    pointsForm.value = {
      rewardPoints: res.data.rewardPoints?.toString() || '',
      punishPoints: res.data.punishPoints?.toString() || ''
    }
  } else {
    pointsForm.value = {
      rewardPoints: '',
      punishPoints: ''
    }
  }

  pointsDialogVisible.value = true
}

// 保存积分
const savePoints = async () => {
  if (!currentTaskForPoints.value) return
  
  try {
    const res = await request.post('/bookkeeping-service/points/task/relation/save', {
      taskId: currentTaskForPoints.value.id,
      rewardPoints: pointsForm.value.rewardPoints ? parseInt(pointsForm.value.rewardPoints) : 0,
      punishPoints: pointsForm.value.punishPoints ? parseInt(pointsForm.value.punishPoints) : 0
    })
    
    if (res.code === 200) {
      ElMessage.success('保存成功')
      pointsDialogVisible.value = false
      // 更新当前任务数据
      if (selectedTask.value?.id === currentTaskForPoints.value.id) {
        selectedTask.value = {
          ...selectedTask.value,
          rewardPoints: pointsForm.value.rewardPoints ? parseInt(pointsForm.value.rewardPoints) : 0,
          punishPoints: pointsForm.value.punishPoints ? parseInt(pointsForm.value.punishPoints) : 0
        }
      }
    } else {
      ElMessage.error(res.data.msg || '保存失败')
    }
  } catch (error) {
    console.error('保存积分失败:', error)
    ElMessage.error('保存失败')
  }
}

// 验证积分输入
const validatePoints = (rule: any, value: string, callback: any) => {
  if (value && (isNaN(Number(value)) || Number(value) < 0)) {
    callback(new Error('请输入大于等于0的数值'))
  } else {
    callback()
  }
}

const pointsRules = {
  rewardPoints: [{ validator: validatePoints, trigger: 'blur' }],
  punishPoints: [{ validator: validatePoints, trigger: 'blur' }]
}

// 移动任务到顶部
const moveTaskToTop = (task: TaskBasicsVo) => {
  const group = subGroups.value.find(g => g.tasks.some(t => t.id === task.id))
  if (group) {
    const taskIndex = group.tasks.findIndex(t => t.id === task.id)
    if (taskIndex > -1) {
      group.tasks.splice(taskIndex, 1)
      group.tasks.unshift(task)
      group.taskNum = (group.taskNum || 0) + 1
    }
  }
}

// 移动任务到底部
const moveTaskToBottom = (task: TaskBasicsVo) => {
  const group = subGroups.value.find(g => g.tasks.some(t => t.id === task.id))
  if (group) {
    const taskIndex = group.tasks.findIndex(t => t.id === task.id)
    if (taskIndex > -1) {
      group.tasks.splice(taskIndex, 1)
      group.tasks.push(task)
      group.taskNum = (group.taskNum || 0) + 1
    }
  }
}

// 在 setup 函数开始处添加
const isTaskDetailVisible = ref(false)

// 在 setup 函数中添加图片上传相关的响应式变量
const taskImages = ref<string[]>([])
const isUploading = ref(false)

// 添加图片上传相关的方法
const handleImageUpload = async (file: File) => {
  try {
    isUploading.value = true
    const formData = new FormData()
    formData.append('file', file)
    
    const uploadRes = await request.post('/auth-service/file/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    if (uploadRes.data) {
      const fileData = {
        fileName: uploadRes.data.fileName,
        fileUrl: uploadRes.data.fileUrl,
        taskId: selectedTask.value?.id
      }
      
      await request.post('/points-service/points/task/basics/addFile', fileData)
      
      // 重新获取任务详情以更新文件列表
      await handleTaskDetail(selectedTask.value?.id)
     
      ElMessage.success('图片上传成功')
    }
  } finally {
    isUploading.value = false
  }
}

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return
  
  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile()
      if (file) {
        await handleImageUpload(file)
      }
    }
  }
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  const files = event.dataTransfer?.files
  if (!files) return
  
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      await handleImageUpload(file)
    }
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

// 添加删除文件的方法
const handleDeleteFile = async (file: any) => {
  await request.post('/points-service/points/task/basics/deleteFile', {
    taskId: selectedTask.value?.id,
    fileUrl: file.fileUrl
  })
  
  // 重新获取任务详情以更新文件列表
  await handleTaskDetail(selectedTask.value?.id)
  
  ElMessage.success('删除成功')
}
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

.group-item .more-icon {
  opacity: 0;
  font-size: 14px;
  color: #999;
  cursor: pointer;
  transition: all 0.3s;
  margin-right: 0;
}

.group-item:hover .more-icon {
  opacity: 1;
}

.group-item:hover .more-icon:hover {
  color: #1890ff;
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
  font-size: 14px;
  color: #999;
  cursor: pointer;
  transition: color 0.3s;
}

.more-icon:hover {
  color: #1890ff;
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
  transition: all 0.3s ease-out;
  opacity: 1;
  transform: translateX(0);
}

.task-item:hover {
  background-color: #f5f5f5;
}

.task-item.active {
  background-color: #e6f4ff;
}

.task-item .more-icon {
  opacity: 0;
  font-size: 14px;
  color: #999;
  cursor: pointer;
  transition: all 0.3s;
  margin-right: 8px;
}

.task-item:hover .more-icon {
  opacity: 1;
}

.task-item:hover .more-icon:hover {
  color: #1890ff;
}

.task-name {
  margin-left: 8px;
  flex: 1;
}

.task-name.completed {
  color: #999;
}

.task-name.fixed-list {
  font-weight: normal;
}

/* 右侧任务详情样式 */
.task-detail {
  position: absolute;
  top: 0;
  bottom: 0;
  background-color: #fff;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.detail-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-name-input {
  font-size: 18px;
  font-weight: 500;
}

.task-name-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  padding: 0;
  background: transparent;
}

.task-name-input :deep(.el-input__inner) {
  border: none;
  padding: 0;
  height: 32px;
  color: #333;
}

.task-name-input :deep(.el-input__inner):focus {
  box-shadow: none;
}

.task-notes-input {
  flex: 1;
}

.task-notes-input :deep(.el-textarea__inner) {
  border: none;
  padding: 0;
  background: transparent;
  box-shadow: none !important;
  color: #666;
  font-size: 14px;
  resize: none;
}

.task-notes-input :deep(.el-textarea__inner):focus {
  box-shadow: none;
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

/* 下拉菜单样式 */
:deep(.el-dropdown-menu) {
  min-width: 160px !important;
  padding: 4px 0;
}

:deep(.el-dropdown-menu .el-dropdown-item) {
  padding: 0 !important;
  line-height: 1.5;
}

:deep(.el-dropdown-menu .el-dropdown-item .context-menu-item) {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #666;
  transition: background-color 0.3s;
}

:deep(.el-dropdown-menu .el-dropdown-item .context-menu-item:hover) {
  background-color: #f5f5f5;
}

:deep(.el-dropdown-menu .el-dropdown-item .context-menu-item .el-icon) {
  margin-right: 8px;
  font-size: 16px;
}

:deep(.el-dropdown-menu .el-dropdown-item .context-menu-item span) {
  flex: 1;
  text-align: left;
}

:deep(.el-dropdown-menu .el-dropdown-item .quick-actions) {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

:deep(.el-dropdown-menu .el-dropdown-item .quick-action-icon) {
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  padding: 4px;
  border-radius: 4px;
}

:deep(.el-dropdown-menu .el-dropdown-item .quick-action-icon:hover) {
  background-color: #f5f5f5;
  color: #1890ff;
}

:deep(.el-dropdown-menu .el-dropdown-item .quick-action-icon.priority-high) {
  color: #f56c6c;
}
:deep(.el-dropdown-menu .el-dropdown-item .quick-action-icon.priority-medium) {
  color: #e6a23c;
}
:deep(.el-dropdown-menu .el-dropdown-item .quick-action-icon.priority-low) {
  color: #409eff;
}
:deep(.el-dropdown-menu .el-dropdown-item .quick-action-icon.priority-none) {
  color: #909399;
}

:deep(.el-dropdown-menu .el-dropdown-item.normal-item) {
  padding: 8px 16px !important;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #666;
  transition: background-color 0.3s;
}

:deep(.el-dropdown-menu .el-dropdown-item.normal-item:hover) {
  background-color: #f5f5f5;
}

:deep(.el-dropdown-menu .el-dropdown-item.normal-item .el-icon) {
  margin-right: 8px;
  font-size: 16px;
}

:deep(.el-dropdown-menu .el-dropdown-item.normal-item span) {
  flex: 1;
  text-align: left;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 3000;
  min-width: 160px;
}

.context-menu.menu-top {
  transform: none; /* 移除向上偏移的transform */
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  position: relative;
}

.context-menu-item:hover {
  background-color: var(--el-color-primary-light-9);
}

.context-menu-item .el-icon {
  margin-right: 8px;
  font-size: 16px;
}

.context-menu-item span {
  flex: 1;
  text-align: left;
}

.context-menu-divider {
  height: 1px;
  background-color: #e0e0e0;
  margin: 4px 0;
}

/* 右键菜单快捷操作样式 */
.quick-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.quick-action-icon {
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  padding: 4px;
  border-radius: 4px;
}

.quick-action-icon:hover {
  background-color: #f5f5f5;
  color: #1890ff;
}

.quick-action-icon.priority-high {
  color: #f56c6c;
}
.quick-action-icon.priority-medium {
  color: #e6a23c;
}
.quick-action-icon.priority-low {
  color: #409eff;
}
.quick-action-icon.priority-none {
  color: #909399;
}

.date-picker-popup {
  position: fixed;
  z-index: 3001;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  width: 280px;
}

.date-picker-header {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
}

.arrow-icon {
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: color 0.3s;
}

.arrow-icon:hover {
  color: #1890ff;
}

.current-date {
  font-size: 14px;
  color: #333;
}

.date-picker-content {
  padding: 8px 12px;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 8px;
}

.weekdays span {
  font-size: 12px;
  color: #999;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}

.day:hover {
  background-color: #f5f5f5;
}

.day.other-month {
  color: #ccc;
}

.day.today {
  color: #1890ff;
  font-weight: bold;
}

.day.selected {
  background-color: #e6f4ff;
  color: #1890ff;
}

.date-picker-footer {
  padding: 8px 12px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 8px;
}

.date-picker-footer .el-button {
  flex: 1;
}

.deadline-date {
  margin-left: 8px;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f5f5f5;
}

.deadline-urgent {
  color: #ff4d4f;
  background-color: #fff1f0;
}

.deadline-warning {
  color: #faad14;
  background-color: #fffbe6;
}

.view-more {
  padding: 16px;
  text-align: center;
}

.no-more {
  color: #999;
  font-size: 14px;
}

.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  cursor: pointer;
  position: relative;
}

.menu-item:hover {
  background-color: var(--el-color-primary-light-9);
}

.menu-item .quick-actions {
  display: none;
  position: absolute;
  left: 100%;
  top: 0;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
}

.menu-item:hover .quick-actions {
  display: block;
}

.quick-action-icon {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 移除之前的 .quick-actions 相关样式 */

/* 移动到菜单样式 */
.move-to-menu {
  position: absolute;
  left: calc(100% - 4px);
  top: -4px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light);
  min-width: 200px;
  padding: 4px 0;
}

.move-to-menu .search-box {
  padding: 0 12px 8px;
}

.move-to-menu .search-box .el-input__inner {
  height: 32px;
}

.move-to-menu .menu-item {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 36px;
  cursor: pointer;
  position: relative;
}

.move-to-menu .menu-item:hover {
  background-color: var(--el-color-primary-light-9);
}

.move-to-menu .menu-item .el-icon {
  margin-right: 8px;
  font-size: 16px;
}

.move-to-menu .menu-item .arrow-icon {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.move-to-submenu {
  position: absolute;
  left: calc(100% - 4px);
  top: -4px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light);
  min-width: 160px;
  padding: 4px 0;
  display: none;
}

.move-to-menu .menu-item:hover .move-to-submenu {
  display: block;
}

.move-to-wrapper {
  position: relative;
}

.task-group-name {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}

/* 添加积分显示的样式 */
.task-points {
  display: flex;
  gap: 20px;
  margin: 10px 0;
  color: #666;
  font-size: 14px;
}

.reward-points {
  color: #67C23A;
}

.punish-points {
  color: #F56C6C;
}

.task-points .el-icon {
  margin-right: 4px;
}

.task-images {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.images-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.images-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.images-container {
  min-height: 200px;
  border: 2px dashed #dcdfe6;
  border-radius: 4px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.images-container:hover {
  border-color: #409eff;
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.empty-tip .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
}

.image-item .el-image {
  width: 100%;
  height: 100%;
}

.image-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-item:hover .image-actions {
  opacity: 1;
}

.task-content {
  margin-top: 20px;
}

.content-item {
  margin-bottom: 20px;
}

.item-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.images-container {
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  padding: 16px;
  transition: all 0.3s;
  background: #fafafa;
}

.images-container:hover {
  border-color: #409eff;
}

.empty-tip {
  text-align: center;
  color: #909399;
  padding: 20px 0;
}

.empty-tip .el-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-tip p {
  margin: 8px 0 16px;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
}

.image-item .el-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-item:hover .image-actions {
  opacity: 1;
}

.add-image {
  aspect-ratio: 1;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.add-image:hover {
  border-color: #409eff;
}

.upload-trigger {
  font-size: 24px;
  color: #909399;
}

.item-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.upload-button {
  display: inline-block;
}

.images-container {
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  transition: all 0.3s;
  background: #fafafa;
  min-height: 100px;
}

.empty-tip {
  text-align: center;
  color: #909399;
  padding: 20px 0;
}

.empty-tip .el-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-tip p {
  margin: 8px 0 16px;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.image-item .el-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-item:hover .image-actions {
  opacity: 1;
}
</style>
