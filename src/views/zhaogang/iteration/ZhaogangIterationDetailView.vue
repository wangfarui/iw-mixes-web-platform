<template>
  <section v-loading="loading" class="iteration-detail-view">
    <div v-if="loading && !detail" class="detail-loading-state" role="status" aria-live="polite">
      <el-skeleton :rows="8" animated />
      <p>正在加载迭代详情...</p>
    </div>
    <template v-else-if="detail">
      <header class="detail-header">
        <div class="detail-heading">
          <el-button class="back-button" link :icon="ArrowLeft" title="返回迭代看板" @click="router.push('/zhaogang/iterations')">返回</el-button>
          <div class="title-block">
            <div class="title-row">
              <h2>{{ detail.name }}</h2>
              <el-tag v-if="detail.version" effect="plain">{{ detail.version }}</el-tag>
            </div>
            <div class="detail-meta">
              <span><small>周期</small>{{ detail.startDate || '未设置' }} - {{ detail.plannedReleaseDate || '未设置' }}</span>
              <span><small>创建人</small>{{ detail.creator.userName }}</span>
              <button type="button" @click="openMemberViewer"><small>成员</small>{{ detail.members.length }} 人</button>
              <span><small>事项</small>{{ detail.issueCount }} 项</span>
              <span><small>更新</small>{{ formatDate(detail.updatedAt) }}</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <el-button :icon="UserFilled" @click="openMemberViewer">成员</el-button>
          <el-button v-if="releasePanelMode === 'drawer'" :icon="Expand" title="打开发布项目抽屉" @click="openReleaseDrawer">发布项目</el-button>
          <el-button v-if="detail.permissions.canEdit" :icon="Edit" @click="openEdit">编辑</el-button>
          <el-button v-if="detail.permissions.canDelete" type="danger" plain :icon="Delete" @click="removeIteration">删除</el-button>
        </div>
      </header>

      <section class="detail-section issue-section">
        <header class="section-header">
          <div><h3>迭代事项</h3><span>{{ detail.issueCount }} 项</span></div>
          <div class="section-toolbar">
            <el-select
              v-model="issueStatusFilters"
              multiple
              clearable
              filterable
              collapse-tags
              collapse-tags-tooltip
              :max-collapse-tags="1"
              class="issue-status-filter"
              placeholder="事项状态"
              aria-label="按事项类型和状态筛选"
            >
              <el-option-group v-for="group in issueStatusFilterGroups" :key="group.issueType" :label="group.label">
                <el-option
                  v-for="option in group.options"
                  :key="option.value"
                  :label="`${group.label} / ${option.label}`"
                  :value="option.value"
                ><span>{{ option.label }}</span></el-option>
              </el-option-group>
            </el-select>
            <span v-if="issueStatusFilters.length" class="filter-result">匹配 {{ issueStatusMatchCount }} 项</span>
            <div v-if="detail.permissions.canEdit" class="section-actions">
              <el-button type="danger" plain :icon="Delete" :loading="deletingIssues" :disabled="!selectedIssueIds.length" @click="removeSelectedIssues">批量移除</el-button>
              <el-button type="primary" plain :icon="RefreshRight" :loading="syncingCoding" @click="syncCodingIssues">同步 CODING 事项</el-button>
              <el-button type="primary" :icon="Link" @click="issueDialogVisible = true">关联 CODING 事项</el-button>
            </div>
          </div>
        </header>
        <div class="issue-table-viewport">
          <el-table
            v-if="filteredIssues.length"
            :data="filteredIssues"
            row-key="id"
            height="100%"
            border
            :expand-row-keys="visibleExpandedIssueKeys"
            :row-class-name="issueRowClass"
            :tree-props="{ children: 'children' }"
            @expand-change="handleIssueExpandChange"
            @selection-change="handleIssueSelectionChange"
          >
          <el-table-column v-if="detail.permissions.canEdit" type="selection" width="48" fixed="left" />
          <el-table-column label="类型" width="140" min-width="140" :resizable="false" class-name="issue-type-column">
            <template #default="scope"><el-tag :type="issueTagType(scope.row.issueType)" effect="light">{{ scope.row.issueTypeName }}</el-tag></template>
          </el-table-column>
          <el-table-column label="事项" min-width="330">
            <template #default="scope">
              <div class="issue-content" :style="{ paddingLeft: `${issueLevel(scope.row) * 14}px` }">
                <button v-if="scope.row.url" type="button" class="issue-link" @click="openCoding(scope.row.url)">
                  <strong>{{ scope.row.title || (scope.row.issueCode ? `#${scope.row.issueCode}` : '事项不可用') }}</strong>
                  <span>{{ scope.row.projectName }}<template v-if="scope.row.issueCode"> · #{{ scope.row.issueCode }}</template></span>
                </button>
                <div v-else class="issue-link static">
                  <strong>{{ scope.row.title }}</strong>
                  <span>{{ scope.row.projectName }}</span>
                </div>
                <p v-if="scope.row.description" class="issue-description">{{ scope.row.description }}</p>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="来源" width="130">
            <template #default="scope">
              <el-tag v-if="scope.row.source === 'CODING'" size="small" effect="plain">CODING</el-tag>
              <el-tag v-else-if="scope.row.syncStatus === 'SYNCED'" size="small" type="success" effect="plain">已同步</el-tag>
              <el-tag v-else-if="scope.row.syncStatus === 'SYNCING'" size="small" type="warning" effect="plain">同步中</el-tag>
              <el-tag v-else-if="scope.row.syncStatus === 'UNKNOWN'" size="small" type="warning" effect="plain">待核对</el-tag>
              <el-tag v-else-if="scope.row.syncStatus === 'FAILED'" size="small" type="danger" effect="plain">同步失败</el-tag>
              <el-tag v-else size="small" type="info" effect="plain">工作台</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="处理人" width="140">
            <template #default="scope"><span :class="{ 'muted-text': !scope.row.assigneeName }">{{ scope.row.assigneeName || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="CODING 状态" width="140">
            <template #default="scope">
              <el-select
                v-if="detail.permissions.canEdit && canModifyCoding(scope.row)"
                v-model="statusValueByIssue[scope.row.id]"
                :loading="statusLoadingIssueId === scope.row.id"
                :disabled="saving"
                :placeholder="scope.row.statusName || '未知'"
                class="status-select"
                @visible-change="onStatusDropdownVisible(scope.row, $event)"
                @change="onStatusChanged(scope.row, $event)"
              >
                <el-option v-for="item in statusOptionsByIssue[scope.row.id] || []" :key="item.value" :label="item.label" :value="Number(item.value)" />
              </el-select>
              <el-tag v-else-if="scope.row.issueCode && scope.row.available" effect="plain">{{ scope.row.statusName || '未知' }}</el-tag>
              <span v-else-if="scope.row.warning || scope.row.syncMessage" class="warning-text">{{ scope.row.warning || scope.row.syncMessage }}</span>
              <span v-else class="muted-text">-</span>
            </template>
          </el-table-column>
          <el-table-column label="事项字段 / 工时" min-width="260">
            <template #default="scope">
              <div class="issue-meta">
                <span v-if="scope.row.issueType === 'USER_STORY'">开发团队：{{ scope.row.developmentTeam || '-' }}</span>
                <span v-if="scope.row.issueType === 'USER_STORY'">DoD：{{ scope.row.definitionOfDone || '-' }}</span>
                <span v-if="scope.row.issueType === 'SUB_TASK'">预估：{{ scope.row.estimatedHours ?? '-' }} h</span>
                <span v-if="scope.row.issueType === 'SUB_TASK'">任务类型：{{ scope.row.taskType || '-' }}</span>
                <span v-if="scope.row.issueType === 'DEFECT'">线上 Bug：{{ scope.row.onlineBug === undefined || scope.row.onlineBug === null ? '-' : scope.row.onlineBug ? '是' : '否' }}</span>
                <span v-if="scope.row.issueType === 'DEFECT'">优先级：{{ scope.row.bugPriority || '-' }}</span>
                <template v-if="scope.row.issueType === 'SUB_TASK'">
                  <span>已登记：{{ worklogTotal(scope.row) }} h / {{ worklogCount(scope.row) }} 次</span>
                  <button v-for="worklog in failedWorklogs(scope.row)" :key="worklog.id" type="button" class="retry-link" @click="retryWorklog(scope.row, worklog.id)">重试 {{ formatDate(worklog.registeredAt) }} 的工时</button>
                </template>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="scope">
              <div v-if="detail.permissions.canEdit" class="issue-actions">
              <el-button link type="primary" :icon="Edit" @click="openIssueEditor(scope.row)">编辑</el-button>
              <el-button v-if="canAddChildren(scope.row)" link type="primary" @click="openChildEditor(scope.row)">+子事项</el-button>
              <el-dropdown trigger="click" @command="handleIssueCommand">
                <el-button link type="primary">更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="canSync(scope.row)" :command="`sync:${scope.row.id}`" :icon="RefreshRight">同步到 CODING</el-dropdown-item>
                    <el-dropdown-item v-if="canRegisterWorklog(scope.row)" :command="`worklog:${scope.row.id}`" :icon="Timer">登记工时</el-dropdown-item>
                    <el-dropdown-item v-if="scope.row.url" :command="`open:${scope.row.id}`" :icon="Link">跳转到 CODING</el-dropdown-item>
                    <el-dropdown-item divided :command="`remove:${scope.row.id}`" :icon="Delete">移除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              </div>
            </template>
          </el-table-column>
          </el-table>
          <el-empty v-else :description="detail.issues.length ? '暂无匹配事项' : '暂无迭代事项'" />
        </div>
      </section>

      <IterationReleasePanel
        ref="releasePanelRef"
        :iteration-id="id()"
        :release-plans="detail.releasePlans"
        :can-edit="detail.permissions.canEdit"
        @added="releasePlanAdded"
        @removed="releasePlanRemoved"
        @refresh="load"
        @mode-change="onReleasePanelModeChange"
      />
    </template>

    <el-dialog v-model="editVisible" title="编辑迭代" width="min(640px, calc(100% - 28px))">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="迭代标题" required><el-input v-model="editForm.name" maxlength="128" /></el-form-item>
          <el-form-item label="迭代状态" required><el-select v-model="editForm.stage" class="full-control"><el-option v-for="stage in stageOptions" :key="stage.value" :label="stage.label" :value="stage.value" /></el-select></el-form-item>
          <el-form-item label="开始日期"><el-date-picker v-model="editForm.startDate" value-format="YYYY-MM-DD" type="date" class="full-control" /></el-form-item>
          <el-form-item label="计划上线日期"><el-date-picker v-model="editForm.plannedReleaseDate" value-format="YYYY-MM-DD" type="date" class="full-control" /></el-form-item>
        </div>
      </el-form>
      <template #footer><el-button @click="editVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="memberDialogVisible" :title="memberEditing ? '维护迭代成员' : '迭代成员'" width="min(780px, calc(100% - 28px))">
      <template v-if="!memberEditing">
        <el-table :data="detail?.members || []" border>
          <el-table-column label="成员" min-width="210"><template #default="scope"><div class="member-cell"><el-avatar :size="30" :src="scope.row.user.avatar">{{ scope.row.user.userName.slice(0, 1) }}</el-avatar><strong>{{ scope.row.user.userName }}</strong><el-tag v-if="scope.row.user.userId === detail?.creator.userId" size="small" type="info">创建人</el-tag></div></template></el-table-column>
          <el-table-column label="团队" min-width="160"><template #default="scope">{{ scope.row.team.name || '-' }}</template></el-table-column>
          <el-table-column label="角色" min-width="220"><template #default="scope"><div class="role-list"><el-tag v-for="role in scope.row.roles" :key="role" size="small" effect="plain">{{ roleLabel(role) }}</el-tag><span v-if="!scope.row.roles.length" class="muted-text">未设置</span></div></template></el-table-column>
        </el-table>
      </template>
      <template v-else>
        <el-form label-position="top">
          <el-form-item label="工作台团队" required><el-select v-model="selectedTeamIds" multiple filterable class="full-control" placeholder="选择一个或多个工作台团队"><el-option v-for="team in teamOptions" :key="team.teamId" :label="team.teamName" :value="team.teamId" /></el-select></el-form-item>
          <template v-for="teamId in selectedTeamIds" :key="teamId"><el-form-item :label="`${teamById.get(teamId)?.teamName || '工作台团队'}成员`" required><el-select v-model="selectedByTeam[teamId]" multiple filterable class="full-control" placeholder="选择团队成员"><el-option v-for="member in teamById.get(teamId)?.members || []" :key="member.userId" :label="member.userName" :value="member.userId" :disabled="member.userId === detail?.creator.userId" /></el-select></el-form-item></template>
        </el-form>
        <el-table :data="memberDrafts" border class="member-editor-table">
          <el-table-column label="团队" min-width="150"><template #default="scope"><el-tag effect="plain">{{ scope.row.teamName }}</el-tag></template></el-table-column>
          <el-table-column label="成员" min-width="180"><template #default="scope">{{ scope.row.user.userName }}</template></el-table-column>
          <el-table-column label="角色（可选）" min-width="320"><template #default="scope"><el-select v-model="scope.row.roles" multiple clearable class="full-control" placeholder="可不选择角色"><el-option v-for="role in roleOptions" :key="role.value" :label="role.label" :value="role.value" /></el-select></template></el-table-column>
        </el-table>
        <el-alert v-if="!teamOptions.length && !membersLoading" type="warning" :closable="false" show-icon title="请先创建或加入工作台团队" />
      </template>
      <template #footer>
        <el-button @click="memberDialogVisible = false">关闭</el-button>
        <el-button v-if="!memberEditing && detail?.permissions.canManageMembers" type="primary" :icon="Edit" @click="startMemberEdit">维护成员</el-button>
        <el-button v-if="memberEditing" @click="memberEditing = false">返回查看</el-button>
        <el-button v-if="memberEditing" type="primary" :loading="saving" :disabled="!memberDrafts.length" @click="saveMembers">保存</el-button>
      </template>
    </el-dialog>

    <IterationIssueEditorDialog
      v-model="issueEditVisible"
      :iteration-id="id()"
      :issue="issueEditing"
      @saved="issueSaved"
    />

    <el-dialog v-model="issueDialogVisible" title="关联 CODING 事项" width="min(620px, calc(100% - 28px))">
      <el-form label-position="top"><el-form-item label="CODING 事项链接（可多条）" required><el-input v-model="codingUrl" type="textarea" :rows="5" maxlength="5000" :placeholder="codingIssueUrlPlaceholder" /></el-form-item></el-form>
      <template #footer><el-button @click="issueDialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!extractCodingIssueUrls(codingUrl).length" @click="saveCodingIssue">关联</el-button></template>
    </el-dialog>

    <el-dialog v-model="childDialogVisible" title="新增子事项" width="min(680px, calc(100% - 28px))">
      <el-form label-position="top">
        <el-form-item label="父事项"><el-input :model-value="childParent?.title" disabled /></el-form-item>
        <div class="child-entry-row">
          <el-form-item label="录入方式"><el-radio-group v-model="childMode"><el-radio-button value="CREATE">人工创建</el-radio-button><el-radio-button value="LINK">关联 CODING</el-radio-button></el-radio-group></el-form-item>
          <el-form-item v-if="childMode === 'CREATE'" label="CODING 同步" class="child-sync-field">
            <div class="child-sync-option">
              <el-switch
                v-model="childSyncToCoding"
                :disabled="!childAutoSyncAvailability.enabled"
                active-text="创建后同步 CODING"
              />
              <span v-if="!childAutoSyncAvailability.enabled" class="child-sync-reason">{{ childAutoSyncAvailability.reason }}</span>
            </div>
          </el-form-item>
        </div>
        <template v-if="childMode === 'LINK'">
          <el-form-item label="CODING 事项链接（可多条）" required><el-input v-model="childCodingUrl" type="textarea" :rows="5" maxlength="5000" :placeholder="codingIssueUrlPlaceholder" /></el-form-item>
        </template>
        <template v-else>
          <el-form-item v-if="childIssueTypeOptions.length > 1" label="事项类型" required><el-select v-model="childForm.issueType" class="issue-type-select"><el-option v-for="item in childIssueTypeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
          <el-form-item label="标题" required><el-input v-model="childForm.title" maxlength="256" /></el-form-item>
          <el-form-item label="描述"><el-input v-model="childForm.description" class="markdown-input" type="textarea" :rows="6" resize="vertical" maxlength="4000" show-word-limit spellcheck="false" placeholder="支持 Markdown 格式，例如标题、列表、链接和代码块" /></el-form-item>
          <div v-loading="creationOptionsLoading" class="typed-fields">
            <template v-if="childForm.issueType === 'USER_STORY'">
              <div class="story-field-row">
                <el-form-item label="开发团队" required><el-select v-model="childForm.developmentTeam" filterable><el-option v-for="item in creationOptions.developmentTeams" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
                <el-form-item label="DoD" required><el-select v-model="childForm.definitionOfDone" filterable><el-option v-for="item in creationOptions.definitionsOfDone" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
              </div>
            </template>
            <template v-if="childForm.issueType === 'SUB_TASK'">
              <div class="sub-task-field-row">
                <el-form-item label="预估工时（小时）" required><el-input-number v-model="childForm.estimatedHours" :min="0.1" :max="9999.9" :precision="1" :step="0.1" controls-position="right" class="hours-control" /></el-form-item>
                <el-form-item label="任务类型" required><el-select v-model="childForm.taskType" filterable class="task-type-control"><el-option v-for="item in creationOptions.taskTypes" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
              </div>
            </template>
          </div>
        </template>
      </el-form>
      <template #footer><el-button @click="childDialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!childSubmitEnabled" @click="saveChildIssue">{{ childMode === 'LINK' ? '关联' : '创建' }}</el-button></template>
    </el-dialog>

    <el-dialog v-model="worklogDialogVisible" title="登记工时" width="min(520px, calc(100% - 28px))">
      <el-form label-position="top">
        <el-form-item label="子工作项"><el-input :model-value="worklogIssue?.title" disabled /></el-form-item>
        <el-form-item label="使用工时（小时）" required><el-input-number v-model="worklogForm.spendHours" :min="0.01" :max="9999.99" :precision="2" :step="0.5" controls-position="right" class="full-control" /></el-form-item>
        <el-form-item label="登记时间" required><el-date-picker v-model="worklogForm.registeredAt" type="datetime" format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DDTHH:mm" class="full-control" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="worklogDialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!worklogForm.spendHours || !worklogForm.registeredAt" @click="saveWorklog">登记</el-button></template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Delete, Edit, Expand, Link, RefreshRight, Timer, UserFilled } from '@element-plus/icons-vue'
import {
  addTeamIterationChildIssue, addTeamIterationCodingIssue, deleteTeamIteration, getTeamIteration,
  getTeamIterationIssueCreationOptions, getTeamIterationIssueStatusOptions, getTeamIterationMemberOptions, registerTeamIterationIssueWorklog,
  removeTeamIterationIssue, removeTeamIterationIssues, replaceTeamIterationMembers, retryTeamIterationIssueWorklog,
  syncTeamIterationCodingIssues, syncTeamIterationIssue, updateTeamIteration, updateTeamIterationIssueStatus
} from '@/api/zhaogangIteration'
import type {
  TeamIterationDetail, TeamIterationIssue, TeamIterationIssueCreationOptions, TeamIterationIssueType, TeamIterationRole,
  TeamIterationReleasePlan, TeamIterationSelectionOption, TeamIterationStage, TeamIterationTeamOption, TeamIterationUser
} from '@/types/zhaogangIteration'
import type { ZhaogangPreferences } from '@/types/zhaogang'
import IterationIssueEditorDialog from './components/IterationIssueEditorDialog.vue'
import IterationReleasePanel from './components/IterationReleasePanel.vue'
import {
  formatCodingIssueAssociationResult,
  type CodingIssueAssociationFailure
} from './codingIssueAssociationFeedback'
import {
  canAddChildIssues, canSyncWorkbenchIssueType, childIssueAutoSyncAvailability,
  defaultManualChildIssueType, manualChildIssueTypes
} from './iterationIssueHierarchy'
import {
  buildIterationIssueStatusFilterGroups, filterIterationIssueTree, iterationIssueExpandRowKeys,
  iterationIssueParentIds,
  retainExpandedIterationIssueIds,
  iterationIssueStatusMatchCount as countIterationIssueStatusMatches
} from './iterationIssueStatusFilter'

const route = useRoute()
const router = useRouter()
const preferencesRef = inject<Ref<ZhaogangPreferences>>('zhaogangPreferences')
const loading = ref(false)
const saving = ref(false)
const syncingCoding = ref(false)
const deletingIssues = ref(false)
const detail = ref<TeamIterationDetail>()
const releasePanelRef = ref<{ openDrawer: () => void } | null>(null)
const releasePanelMode = ref<'bottom' | 'drawer'>('bottom')
const selectedIssues = ref<TeamIterationIssue[]>([])
const issueStatusFilters = ref<string[]>([])
const expandedIssueIds = ref<number[]>([])
const filterExpandedIssueIds = ref<number[]>([])
let expandedIterationId: number | undefined
const editVisible = ref(false)
const memberDialogVisible = ref(false)
const memberEditing = ref(false)
const issueDialogVisible = ref(false)
const issueEditVisible = ref(false)
const issueEditing = ref<TeamIterationIssue>()
const statusLoadingIssueId = ref<number>()
const statusOptionsByIssue = reactive<Record<number, TeamIterationSelectionOption[]>>({})
const statusValueByIssue = reactive<Record<number, number | undefined>>({})
const childDialogVisible = ref(false)
const childParent = ref<TeamIterationIssue>()
const childMode = ref<'CREATE' | 'LINK'>('CREATE')
const childCodingUrl = ref('')
const childSyncToCoding = ref(false)
const creationOptionsLoading = ref(false)
let creationOptionsRequestId = 0
const creationOptions = reactive<TeamIterationIssueCreationOptions>({ issueType: 'SUB_TASK', developmentTeams: [], definitionsOfDone: [], taskTypes: [], bugPriorities: [] })
const worklogDialogVisible = ref(false)
const worklogIssue = ref<TeamIterationIssue>()
const codingUrl = ref('')
const membersLoading = ref(false)
const teamOptions = ref<TeamIterationTeamOption[]>([])
const selectedTeamIds = ref<number[]>([])
const selectedByTeam = reactive<Record<number, number[]>>({})
const draftRoles = reactive<Record<string, TeamIterationRole[]>>({})
const editForm = reactive({ name: '', stage: 'NOT_STARTED' as TeamIterationStage, startDate: '', plannedReleaseDate: '' })
const childForm = reactive({ issueType: 'SUB_TASK' as TeamIterationIssueType, title: '', description: '', developmentTeam: '', definitionOfDone: '', estimatedHours: 1, taskType: '', onlineBug: false, bugPriority: '' })
const worklogForm = reactive({ spendHours: 1, registeredAt: '' })
const codingIssueUrlPlaceholder = '可粘贴多条链接，每条以 https:// 开始、detail 结尾\n例如：https://g-iijw5014.coding.net/p/.../issues/xxx/detail'
const stageOptions: Array<{ value: TeamIterationStage, label: string }> = [
  { value: 'NOT_STARTED', label: '未开始' }, { value: 'DEVELOPING', label: '开发中' },
  { value: 'TESTING', label: '测试中' }, { value: 'RELEASED', label: '已上线' }
]
const roleOptions: Array<{ value: TeamIterationRole, label: string }> = [
  { value: 'PRODUCT', label: '产品' }, { value: 'BACKEND', label: '后端' },
  { value: 'FRONTEND', label: '前端' }, { value: 'QA', label: '测试' }
]
const issueTypeOptions: Array<{ value: TeamIterationIssueType, label: string }> = [
  { value: 'USER_STORY', label: '用户故事' }, { value: 'SUB_TASK', label: '子工作项' }
]
const childIssueTypeOptions = computed(() => {
  const allowed = childParent.value ? manualChildIssueTypes(childParent.value.issueType) : []
  return issueTypeOptions.filter(item => allowed.includes(item.value))
})
const childAutoSyncAvailability = computed(() => childIssueAutoSyncAvailability(
  childParent.value,
  childForm.issueType,
  detail.value?.issues || []
))
const childSubmitEnabled = computed(() => {
  if (childMode.value === 'LINK') return extractCodingIssueUrls(childCodingUrl.value).length > 0
  if (!childForm.title.trim()) return false
  if (childForm.issueType === 'USER_STORY') return Boolean(childForm.developmentTeam && childForm.definitionOfDone)
  if (childForm.issueType === 'SUB_TASK') return childForm.estimatedHours > 0 && Boolean(childForm.taskType)
  return true
})
const teamById = computed(() => new Map(teamOptions.value.map(team => [team.teamId, team])))
const memberDrafts = computed(() => selectedTeamIds.value.flatMap(teamId => {
  const team = teamById.value.get(teamId)
  return (selectedByTeam[teamId] || []).map(userId => {
    const user = team?.members.find(member => member.userId === userId)
    if (!user || !team) return null
    const key = `${teamId}:${userId}`
    if (!draftRoles[key]) draftRoles[key] = []
    return { key, teamId, teamName: team.teamName, user, roles: draftRoles[key] }
  }).filter((item): item is { key: string, teamId: number, teamName: string, user: TeamIterationUser, roles: TeamIterationRole[] } => Boolean(item))
}))
const id = () => Number(route.params.iterationId)
const selectedIssueIds = computed(() => selectedIssues.value.map(issue => issue.id))
const issueStatusFilterGroups = computed(() => buildIterationIssueStatusFilterGroups(detail.value?.issues || []))
const availableIssueStatusFilterValues = computed(() => new Set(issueStatusFilterGroups.value.flatMap(group => group.options.map(option => option.value))))
const filteredIssues = computed(() => filterIterationIssueTree(detail.value?.issues || [], issueStatusFilters.value))
const issueStatusMatchCount = computed(() => countIterationIssueStatusMatches(detail.value?.issues || [], issueStatusFilters.value))
const visibleExpandedIssueKeys = computed(() => iterationIssueExpandRowKeys([
  ...expandedIssueIds.value,
  ...filterExpandedIssueIds.value
]))

const extractCodingIssueUrls = (value: string) => [...new Set(value.match(/https:\/\/[^\s]*?detail/g)?.map(url => url.trim()) || [])]

const associateCodingIssues = async (urls: string[], parentIssueId?: number) => {
  const failures: CodingIssueAssociationFailure[] = []
  for (const url of urls) {
    try {
      await addTeamIterationCodingIssue(id(), url, parentIssueId)
    } catch (error) {
      failures.push({ url, message: error instanceof Error ? error.message : '关联失败' })
    }
  }
  return { successCount: urls.length - failures.length, failures }
}

const showCodingIssueAssociationFailures = (failures: CodingIssueAssociationFailure[]) => {
  void ElMessageBox.alert(formatCodingIssueAssociationResult(failures), '关联结果', {
    type: 'warning',
    confirmButtonText: '知道了',
    customClass: 'coding-association-result-dialog'
  }).catch(() => undefined)
}

const load = async () => {
  const iterationId = id()
  const preserveExpansion = expandedIterationId === iterationId
  loading.value = true
  selectedIssues.value = []
  try {
    const loadedDetail = await getTeamIteration(iterationId)
    detail.value = loadedDetail
    expandedIssueIds.value = preserveExpansion
      ? retainExpandedIterationIssueIds(expandedIssueIds.value, loadedDetail.issues)
      : iterationIssueParentIds(loadedDetail.issues)
    filterExpandedIssueIds.value = preserveExpansion
      ? retainExpandedIterationIssueIds(filterExpandedIssueIds.value, loadedDetail.issues)
      : []
    expandedIterationId = iterationId
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '迭代详情加载失败')
  } finally { loading.value = false }
}

const openEdit = () => {
  if (!detail.value) return
  Object.assign(editForm, { name: detail.value.name, stage: detail.value.stage, startDate: detail.value.startDate || '', plannedReleaseDate: detail.value.plannedReleaseDate || '' })
  editVisible.value = true
}

const saveEdit = async () => {
  if (!detail.value || !editForm.name.trim()) return
  saving.value = true
  try {
    detail.value = await updateTeamIteration(id(), { versionNo: detail.value.versionNo, name: editForm.name.trim(), stage: editForm.stage, startDate: editForm.startDate || undefined, plannedReleaseDate: editForm.plannedReleaseDate || undefined })
    editVisible.value = false
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '迭代保存失败') } finally { saving.value = false }
}

const openMemberViewer = () => { memberEditing.value = false; memberDialogVisible.value = true }

const startMemberEdit = async () => {
  if (!detail.value) return
  Object.keys(selectedByTeam).forEach(key => delete selectedByTeam[Number(key)])
  Object.keys(draftRoles).forEach(key => delete draftRoles[key])
  membersLoading.value = true
  try {
    teamOptions.value = await getTeamIterationMemberOptions()
    const selected = new Set<number>()
    detail.value.members.forEach(member => {
      if (member.team.id <= 0) return
      selected.add(member.team.id)
      selectedByTeam[member.team.id] = [...(selectedByTeam[member.team.id] || []), member.user.userId]
      draftRoles[`${member.team.id}:${member.user.userId}`] = [...member.roles]
    })
    selectedTeamIds.value = [...selected]
    memberEditing.value = true
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '团队成员加载失败') }
  finally { membersLoading.value = false }
}

watch(selectedTeamIds, ids => { Object.keys(selectedByTeam).forEach(key => { if (!ids.includes(Number(key))) delete selectedByTeam[Number(key)] }) })

const saveMembers = async () => {
  if (!detail.value) return
  saving.value = true
  try {
    detail.value = await replaceTeamIterationMembers(id(), detail.value.versionNo, memberDrafts.value.map(item => ({ teamId: item.teamId, userId: item.user.userId, roles: item.roles })))
    memberEditing.value = false
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '成员保存失败') }
  finally { saving.value = false }
}

const saveCodingIssue = async () => {
  const urls = extractCodingIssueUrls(codingUrl.value)
  if (!urls.length) {
    ElMessage.error('请填写以 https:// 开始并以 detail 结尾的 CODING 链接')
    return
  }
  saving.value = true
  try {
    const result = await associateCodingIssues(urls)
    await load()
    if (!result.failures.length) {
      codingUrl.value = ''
      issueDialogVisible.value = false
      ElMessage.success(`已关联 ${result.successCount} 条 CODING 事项`)
    } else {
      codingUrl.value = result.failures.map(item => item.url).join('\n')
      showCodingIssueAssociationFailures(result.failures)
    }
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : 'CODING 事项关联失败') }
  finally { saving.value = false }
}

const openIssueEditor = (issue: TeamIterationIssue) => {
  issueEditing.value = issue
  issueEditVisible.value = true
}

const handleIssueExpandChange = (issue: TeamIterationIssue, expanded: boolean) => {
  const expandedIds = new Set(expandedIssueIds.value)
  if (expanded) expandedIds.add(issue.id)
  else expandedIds.delete(issue.id)
  expandedIssueIds.value = [...expandedIds]
  if (!expanded) filterExpandedIssueIds.value = filterExpandedIssueIds.value.filter(issueId => issueId !== issue.id)
}

const expandIssueAfterChildAdded = (issueId: number) => {
  if (!detail.value || !iterationIssueParentIds(detail.value.issues).includes(issueId)) return
  expandedIssueIds.value = [...new Set([...expandedIssueIds.value, issueId])]
}

const issueSaved = () => { void load() }

const releasePlanAdded = (releasePlan: TeamIterationReleasePlan) => {
  if (!detail.value || detail.value.releasePlans.some(item => item.id === releasePlan.id)) return
  detail.value.releasePlans = [...detail.value.releasePlans, releasePlan]
}

const releasePlanRemoved = (releasePlanId: number) => {
  if (!detail.value) return
  detail.value.releasePlans = detail.value.releasePlans.filter(item => item.id !== releasePlanId)
}

const openReleaseDrawer = () => { releasePanelRef.value?.openDrawer() }
const onReleasePanelModeChange = (mode: 'bottom' | 'drawer') => { releasePanelMode.value = mode }

const loadStatusOptions = async (issue: TeamIterationIssue) => {
  if (statusOptionsByIssue[issue.id]) return
  statusLoadingIssueId.value = issue.id
  try {
    const options = await getTeamIterationIssueStatusOptions(id(), issue.id)
    statusOptionsByIssue[issue.id] = options
    const current = options.find(item => item.label === issue.statusName)
    if (current) statusValueByIssue[issue.id] = Number(current.value)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'CODING 状态加载失败')
  } finally { statusLoadingIssueId.value = undefined }
}

const onStatusDropdownVisible = (issue: TeamIterationIssue, visible: boolean) => {
  if (visible) void loadStatusOptions(issue)
}

const onStatusChanged = (issue: TeamIterationIssue, value: string | number) => {
  void saveIssueStatus(issue, Number(value))
}

const saveIssueStatus = async (issue: TeamIterationIssue, statusId: number) => {
  if (!statusId) return
  saving.value = true
  try {
    await updateTeamIterationIssueStatus(id(), issue.id, statusId)
    await load()
    ElMessage.success('CODING 状态已更新')
  } catch (error) {
    statusValueByIssue[issue.id] = undefined
    ElMessage.error(error instanceof Error ? error.message : 'CODING 状态同步失败')
  }
  finally { saving.value = false }
}

const openChildEditor = (issue: TeamIterationIssue) => {
  childParent.value = issue
  childMode.value = 'CREATE'
  childCodingUrl.value = ''
  const defaultType = defaultManualChildIssueType(issue.issueType)
  if (!defaultType) return
  Object.assign(childForm, { issueType: defaultType, title: '', description: '', developmentTeam: '', definitionOfDone: '', estimatedHours: 1, taskType: '', onlineBug: false, bugPriority: '' })
  childSyncToCoding.value = Boolean(preferencesRef?.value.autoSyncCreatedChildIssue
    && childIssueAutoSyncAvailability(issue, defaultType, detail.value?.issues || []).enabled)
  childDialogVisible.value = true
  void loadCreationOptions()
}

const saveChildIssue = async () => {
  if (!childParent.value || !childSubmitEnabled.value) return
  const parentIssueId = childParent.value.id
  const shouldExpandParent = !visibleExpandedIssueKeys.value.includes(String(parentIssueId))
  saving.value = true
  try {
    if (childMode.value === 'LINK') {
      const urls = extractCodingIssueUrls(childCodingUrl.value)
      const result = await associateCodingIssues(urls, parentIssueId)
      await load()
      if (result.successCount && shouldExpandParent) expandIssueAfterChildAdded(parentIssueId)
      if (!result.failures.length) {
        childCodingUrl.value = ''
        childDialogVisible.value = false
        ElMessage.success(`已关联 ${result.successCount} 条 CODING 子事项`)
      } else {
        childCodingUrl.value = result.failures.map(item => item.url).join('\n')
        showCodingIssueAssociationFailures(result.failures)
      }
    } else {
      const syncRequested = childSyncToCoding.value
      const created = await addTeamIterationChildIssue(id(), parentIssueId, {
        issueType: childForm.issueType, title: childForm.title.trim(), description: childForm.description || undefined,
        developmentTeam: childForm.issueType === 'USER_STORY' ? childForm.developmentTeam : undefined,
        definitionOfDone: childForm.issueType === 'USER_STORY' ? childForm.definitionOfDone : undefined,
        estimatedHours: childForm.issueType === 'SUB_TASK' ? childForm.estimatedHours : undefined,
        taskType: childForm.issueType === 'SUB_TASK' ? childForm.taskType : undefined,
        onlineBug: childForm.issueType === 'DEFECT' ? childForm.onlineBug : undefined,
        bugPriority: undefined,
        syncToCoding: syncRequested
      })
      childDialogVisible.value = false
      await load()
      if (shouldExpandParent) expandIssueAfterChildAdded(parentIssueId)
      if (!syncRequested) ElMessage.success('子事项已创建')
      else if (created.syncStatus === 'SYNCED') ElMessage.success('子事项已创建并同步 CODING')
      else if (created.syncStatus === 'UNKNOWN') ElMessage.warning(created.syncMessage || '子事项已创建，CODING 同步结果不确定，请先核对后再处理')
      else ElMessage.warning(created.syncMessage || '子事项已创建，但自动同步 CODING 失败，可通过更多操作重试')
    }
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '子事项创建失败') }
  finally { saving.value = false }
}

const loadCreationOptions = async () => {
  if (!childParent.value || childMode.value !== 'CREATE') return
  const parentIssueId = childParent.value.id
  const issueType = childForm.issueType
  const requestId = ++creationOptionsRequestId
  Object.assign(creationOptions, { issueType, developmentTeams: [], definitionsOfDone: [], taskTypes: [], bugPriorities: [] })
  if (issueType === 'REQUIREMENT') return
  creationOptionsLoading.value = true
  try {
    const options = await getTeamIterationIssueCreationOptions(id(), parentIssueId, issueType)
    if (requestId !== creationOptionsRequestId || childMode.value !== 'CREATE'
      || childParent.value?.id !== parentIssueId || childForm.issueType !== issueType) return
    Object.assign(creationOptions, options)
    if (issueType === 'USER_STORY') {
      const normalizeLabel = (value: string) => value.trim().replace(/\s+/g, '').toLowerCase()
      const workbenchTeamNames = new Set((detail.value?.members || [])
        .filter(member => member.team.id > 0 && member.team.name)
        .map(member => normalizeLabel(member.team.name)))
      const matchingTeam = creationOptions.developmentTeams.find(item =>
        workbenchTeamNames.has(normalizeLabel(item.label)) || workbenchTeamNames.has(normalizeLabel(item.value)))
      const releasedDoD = creationOptions.definitionsOfDone.find(item =>
        normalizeLabel(item.label) === '上线完成' || normalizeLabel(item.value) === '上线完成')
      childForm.developmentTeam ||= matchingTeam?.value || creationOptions.developmentTeams[0]?.value || ''
      childForm.definitionOfDone ||= releasedDoD?.value || creationOptions.definitionsOfDone[0]?.value || ''
    } else if (issueType === 'SUB_TASK') {
      const roleTaskLabels: Record<TeamIterationRole, string> = {
        PRODUCT: '需求任务', BACKEND: '开发任务', FRONTEND: '开发任务', QA: '测试任务'
      }
      const targetLabel = preferencesRef?.value?.codingRole ? roleTaskLabels[preferencesRef.value.codingRole] : undefined
      const normalizeLabel = (value: string) => value.trim().replace(/\s+/g, '').toLowerCase()
      const preferredTaskType = targetLabel
        ? creationOptions.taskTypes.find(item => normalizeLabel(item.label) === normalizeLabel(targetLabel) || normalizeLabel(item.value) === normalizeLabel(targetLabel))
        : undefined
      childForm.taskType ||= preferredTaskType?.value || creationOptions.taskTypes[0]?.value || ''
    }
    else if (issueType === 'DEFECT') childForm.bugPriority ||= creationOptions.bugPriorities.find(item => item.label === '中')?.value || creationOptions.bugPriorities[0]?.value || ''
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : 'CODING 事项字段加载失败') }
  finally { if (requestId === creationOptionsRequestId) creationOptionsLoading.value = false }
}

watch(() => childForm.issueType, () => {
  Object.assign(childForm, { developmentTeam: '', definitionOfDone: '', estimatedHours: 1, taskType: '', onlineBug: false, bugPriority: '' })
  if (!childAutoSyncAvailability.value.enabled) childSyncToCoding.value = false
  if (childDialogVisible.value && childMode.value === 'CREATE') void loadCreationOptions()
})
watch(childMode, mode => { if (mode === 'CREATE') void loadCreationOptions() })
watch(availableIssueStatusFilterValues, availableValues => {
  const retainedFilters = issueStatusFilters.value.filter(value => availableValues.has(value))
  if (retainedFilters.length !== issueStatusFilters.value.length) issueStatusFilters.value = retainedFilters
})
watch(issueStatusFilters, filters => {
  filterExpandedIssueIds.value = filters.length ? iterationIssueParentIds(filteredIssues.value) : []
}, { deep: true })

const localMinute = () => {
  const value = new Date()
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const openWorklogEditor = (issue: TeamIterationIssue) => {
  worklogIssue.value = issue
  Object.assign(worklogForm, { spendHours: 1, registeredAt: localMinute() })
  worklogDialogVisible.value = true
}

const saveWorklog = async () => {
  if (!worklogIssue.value || !worklogForm.spendHours || !worklogForm.registeredAt) return
  saving.value = true
  try {
    await registerTeamIterationIssueWorklog(id(), worklogIssue.value.id, { ...worklogForm })
    worklogDialogVisible.value = false
    await load()
    ElMessage.success('工时已登记并同步 CODING')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '工时登记失败') }
  finally { saving.value = false }
}

const retryWorklog = async (issue: TeamIterationIssue, worklogId: number) => {
  saving.value = true
  try { await retryTeamIterationIssueWorklog(id(), issue.id, worklogId); await load(); ElMessage.success('工时同步成功') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '工时同步失败') }
  finally { saving.value = false }
}

const syncIssue = async (issue: TeamIterationIssue) => {
  try {
    await ElMessageBox.confirm(`确认将“${issue.title}”同步到 CODING？`, '同步事项', { type: 'warning' })
    saving.value = true
    await syncTeamIterationIssue(id(), issue.id)
    await load()
    ElMessage.success('同步成功')
  } catch (error) { if (error instanceof Error) ElMessage.error(error.message) }
  finally { saving.value = false }
}

const syncCodingIssues = async () => {
  try {
    await ElMessageBox.confirm('将以 CODING 最新数据覆盖当前迭代中已关联事项，并自动补齐父级关系。', '同步 CODING 事项', { type: 'warning' })
    syncingCoding.value = true
    const result = await syncTeamIterationCodingIssues(id())
    await load()
    const summary = `同步完成：成功 ${result.successCount} 项，失败 ${result.failureCount} 项`
    if (result.failureCount) {
      const details = result.failures.map(item => `· ${item.title}：${item.reason}`).join('\n')
      await ElMessageBox.alert(`${summary}\n\n${details}`, '同步结果', { type: 'warning' })
    } else {
      ElMessage.success(summary)
    }
  } catch (error) {
    if (error instanceof Error && error.message !== 'cancel') ElMessage.error(error.message)
  } finally { syncingCoding.value = false }
}

const handleIssueCommand = (command: string) => {
  const [action, rawId] = command.split(':')
  const issue = findIssue(detail.value?.issues || [], Number(rawId))
  if (!issue) return
  if (action === 'sync') void syncIssue(issue)
  else if (action === 'worklog') openWorklogEditor(issue)
  else if (action === 'open' && issue.url) openCoding(issue.url)
  else if (action === 'remove') void removeIssue(issue)
}

const findIssue = (issues: TeamIterationIssue[], issueId: number): TeamIterationIssue | undefined => {
  for (const issue of issues) {
    if (issue.id === issueId) return issue
    const nested = findIssue(issue.children, issueId)
    if (nested) return nested
  }
  return undefined
}

const handleIssueSelectionChange = (issues: TeamIterationIssue[]) => {
  selectedIssues.value = issues
}

const removeSelectedIssues = async () => {
  const issueIds = selectedIssueIds.value
  if (!issueIds.length) return
  try {
    await ElMessageBox.confirm(
      `确认删除已勾选的 ${issueIds.length} 个事项？若包含父事项，其子事项也会一起从工作台删除；不会删除 CODING 事项。`,
      '批量删除事项',
      { type: 'warning' }
    )
    deletingIssues.value = true
    await removeTeamIterationIssues(id(), issueIds)
    await load()
    ElMessage.success('已删除所选迭代事项')
  } catch (error) {
    if (error instanceof Error && error.message !== 'cancel') ElMessage.error(error.message)
  } finally {
    deletingIssues.value = false
  }
}

const removeIssue = async (issue: TeamIterationIssue) => {
  try {
    await ElMessageBox.confirm('移除后只删除工作台中的该事项及其子事项，不会删除 CODING 数据。', '移除事项', { type: 'warning' })
    await removeTeamIterationIssue(id(), issue.id)
    await load()
  } catch (error) { if (error instanceof Error) ElMessage.error(error.message) }
}

const removeIteration = async () => {
  try {
    await ElMessageBox.confirm('删除后该迭代将不再显示，CODING 事项不会被修改。', '删除迭代', { type: 'warning' })
    await deleteTeamIteration(id())
    await router.push('/zhaogang/iterations')
  } catch (error) { if (error instanceof Error) ElMessage.error(error.message) }
}

const canAddChildren = (issue: TeamIterationIssue) => canAddChildIssues(issue.issueType)
const canSync = (issue: TeamIterationIssue) => issue.source === 'WORKBENCH' && (issue.syncStatus === 'PENDING' || issue.syncStatus === 'FAILED') && canSyncWorkbenchIssueType(issue.issueType)
const canModifyCoding = (issue: TeamIterationIssue) => Boolean(issue.issueCode) && (issue.source === 'CODING' || issue.syncStatus === 'SYNCED')
const canRegisterWorklog = (issue: TeamIterationIssue) => issue.issueType === 'SUB_TASK' && canModifyCoding(issue)
const localWorklogTotal = (issue: TeamIterationIssue) => issue.worklogs.reduce((sum, item) => sum + Number(item.spendHours || 0), 0)
const worklogTotal = (issue: TeamIterationIssue) => Number(issue.recordedHours ?? localWorklogTotal(issue)).toFixed(2).replace(/\.00$/, '')
const worklogCount = (issue: TeamIterationIssue) => Number(issue.recordedWorklogCount ?? issue.worklogs.length)
const failedWorklogs = (issue: TeamIterationIssue) => issue.worklogs.filter(item => item.syncStatus === 'FAILED')
const issueLevels = computed(() => {
  const levels = new Map<number, number>()
  const visit = (issues: TeamIterationIssue[], level: number) => {
    issues.forEach(issue => {
      levels.set(issue.id, level)
      if (issue.children.length) visit(issue.children, level + 1)
    })
  }
  visit(detail.value?.issues || [], 0)
  return levels
})
const issueLevel = (issue: TeamIterationIssue) => issueLevels.value.get(issue.id) || 0
const issueRowClass = ({ row }: { row: TeamIterationIssue }) => `issue-level-${Math.min(issueLevel(row), 2)}`
const openCoding = (url: string) => window.open(url, '_blank', 'noopener')
const roleLabel = (value: TeamIterationRole) => roleOptions.find(item => item.value === value)?.label || value
const issueTagType = (value: TeamIterationIssueType) => value === 'DEFECT' ? 'danger' : value === 'USER_STORY' ? 'warning' : value === 'SUB_TASK' ? 'success' : value === 'TASK' ? 'info' : 'primary'
const formatDate = (value: string) => value?.replace('T', ' ').slice(0, 16) || '未设置'

onMounted(load)
watch(() => route.params.iterationId, load)
</script>

<style scoped>
.iteration-detail-view { display: flex; box-sizing: border-box; width: 100%; height: 100%; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; }
.detail-loading-state { min-height: 420px; padding: 28px 18px; background: #fff; border: 1px solid #e2e7ee; border-radius: 6px; }.detail-loading-state p { margin: 16px 0 0; color: #718097; font-size: 14px; text-align: center; }
.detail-header,.detail-heading,.title-row,.detail-meta,.header-actions,.section-header,.section-header>div,.member-cell,.role-list { display: flex; align-items: center; gap: 10px; }
.detail-header { align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 10px; }
.detail-heading,.title-block,.title-row { min-width: 0; }
.detail-heading { align-items: flex-start; flex: 1 1 auto; }
.back-button { flex: 0 0 auto; margin-top: 1px; }
.title-block { flex: 1 1 auto; }
.title-row h2 { min-width: 0; margin: 0; overflow: hidden; font-size: 22px; text-overflow: ellipsis; white-space: nowrap; }
.title-row :deep(.el-tag) { flex: 0 0 auto; }
.detail-meta { flex-wrap: wrap; gap: 5px 18px; margin-top: 7px; color: #617087; font-size: 12px; }
.detail-meta span,.detail-meta button { display: inline-flex; align-items: center; gap: 5px; padding: 0; color: inherit; line-height: 1.4; white-space: nowrap; background: transparent; border: 0; }
.detail-meta small { color: #98a2b2; font-size: 12px; }
.detail-meta button { cursor: pointer; }
.detail-meta button:hover { color: #2878ed; }
.header-actions { flex-wrap: wrap; justify-content: flex-end; }
.header-actions :deep(.el-select) { width: 130px; }
.detail-section { padding: 16px; margin-bottom: 14px; background: #fff; border: 1px solid #e2e7ee; border-radius: 6px; }
.issue-section { display: flex; min-height: 180px; flex: 1 1 auto; flex-direction: column; margin-bottom: 10px; overflow: hidden; }
.issue-table-viewport { min-height: 0; flex: 1 1 auto; overflow: hidden; }
.issue-table-viewport :deep(.el-empty) { height: 100%; padding: 0; }
.section-header { justify-content: space-between; margin-bottom: 14px; }
.section-toolbar { justify-content: flex-end; flex-wrap: wrap; }
.issue-status-filter { width: 280px; }
.filter-result { color: #7b8798; font-size: 12px; white-space: nowrap; }
.issue-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0; width: max-content; margin-left: auto; white-space: nowrap; }
.issue-actions :deep(.el-button) { margin: 0; padding-right: 1px; padding-left: 1px; }
.issue-actions :deep(.el-button > span) { margin-left: 2px; }
.section-actions { display: flex; align-items: center; gap: 8px; }
.section-header h3 { margin: 0; font-size: 17px; }
.section-header span { color: #8994a5; font-size: 12px; }
:deep(.issue-type-column .cell) { padding-right: 4px; padding-left: 8px; text-align: left; white-space: nowrap; }
:deep(.issue-level-1 .issue-type-column .el-table__indent) { padding-left: 6px !important; }
:deep(.issue-level-2 .issue-type-column .el-table__indent) { padding-left: 12px !important; }
:deep(.issue-type-column .el-table__expand-icon) { margin-right: 4px; }
.issue-content { min-width: 0; }
.issue-link { display: grid; gap: 5px; padding: 0; color: #27364b; text-align: left; background: transparent; border: 0; cursor: pointer; }
.issue-link.static { cursor: default; }
.issue-link span,.warning-text,.muted-text { color: #8994a5; font-size: 12px; }
.warning-text { line-height: 1.4; }
.status-select { width: 100%; }
.issue-description { max-width: 560px; margin: 7px 0 0; overflow: hidden; color: #69768a; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.issue-meta { display: grid; gap: 4px; color: #69768a; font-size: 12px; }
.retry-link { width: fit-content; padding: 0; color: #d14949; font-size: 12px; background: transparent; border: 0; cursor: pointer; }
.typed-fields { min-height: 44px; }
.child-entry-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: start; }
.child-sync-field { min-width: 260px; justify-self: end; }
.child-sync-option { display: grid; gap: 5px; }
.child-sync-reason { color: #8994a5; font-size: 12px; line-height: 1.4; }
.issue-type-select { width: 180px; }
.sub-task-field-row { display: grid; grid-template-columns: 140px minmax(0, 220px); gap: 16px; align-items: start; }
.hours-control { width: 140px; }
.task-type-control { width: 220px; }
.story-field-row { display: grid; grid-template-columns: repeat(2,minmax(0,220px)); gap: 16px; }
.story-field-row :deep(.el-select) { width: 100%; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.full-control { width: 100%; }
.markdown-input :deep(.el-textarea__inner) {
  min-height: 144px;
  line-height: 1.6;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.member-editor-table { margin-top: 14px; }
.role-list { flex-wrap: wrap; }
:global(.coding-association-result-dialog .el-message-box__message p) { overflow-wrap: anywhere; white-space: pre-wrap; }
@media(max-width:1100px){.detail-header{flex-wrap:wrap}.header-actions{width:100%;justify-content:flex-end}}
@media(max-width:640px){.detail-header{display:block}.detail-heading{gap:4px}.back-button{padding-right:4px;padding-left:0}.title-row h2{font-size:20px}.detail-meta{gap:4px 12px}.header-actions{width:auto;justify-content:flex-start;margin-top:12px}.issue-section{min-height:120px}.form-grid,.story-field-row,.sub-task-field-row,.child-entry-row{grid-template-columns:1fr}.child-sync-field{min-width:0;justify-self:stretch}.hours-control,.task-type-control{width:100%}}
@media(max-width:640px){.section-header{display:block}.section-toolbar{align-items:stretch;flex-direction:column;margin-top:10px}.issue-status-filter{width:100%}.section-actions{flex-wrap:wrap}}
</style>
