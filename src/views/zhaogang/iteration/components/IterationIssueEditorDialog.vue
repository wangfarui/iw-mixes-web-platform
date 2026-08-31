<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="min(680px, calc(100% - 28px))"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form v-if="issue" label-position="top">
      <el-form-item :label="issue.issueCode ? '标题（保存后同步 CODING）' : '标题'" required>
        <el-input v-model="form.title" maxlength="256" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          class="markdown-input"
          type="textarea"
          :rows="6"
          resize="vertical"
          maxlength="4000"
          show-word-limit
          spellcheck="false"
          placeholder="支持 Markdown 格式，例如标题、列表、链接和代码块"
        />
      </el-form-item>

      <div v-if="issue.issueType !== 'REQUIREMENT' && issue.issueType !== 'TASK'" v-loading="optionsLoading" class="typed-fields">
        <template v-if="issue.issueType === 'USER_STORY'">
          <el-form-item label="开发团队" required>
            <el-select v-model="form.developmentTeam" filterable class="full-control">
              <el-option v-for="item in optionsFor('developmentTeams', form.developmentTeam)" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="DoD" required>
            <el-select v-model="form.definitionOfDone" filterable class="full-control">
              <el-option v-for="item in optionsFor('definitionsOfDone', form.definitionOfDone)" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </template>

        <template v-else-if="issue.issueType === 'SUB_TASK'">
          <el-form-item label="预估工时（小时）" required>
            <el-input-number v-model="form.estimatedHours" :min="0.01" :max="9999.99" :precision="2" :step="0.5" controls-position="right" class="full-control" />
          </el-form-item>
          <el-form-item label="任务类型" required>
            <el-select v-model="form.taskType" filterable class="full-control">
              <el-option v-for="item in optionsFor('taskTypes', form.taskType)" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </template>

        <template v-else-if="issue.issueType === 'DEFECT'">
          <el-form-item label="是否线上 Bug" required>
            <el-switch v-model="form.onlineBug" inline-prompt active-text="是" inactive-text="否" />
          </el-form-item>
          <el-form-item label="Bug 优先级" required>
            <el-select v-model="form.bugPriority" class="full-control">
              <el-option v-for="item in optionsFor('bugPriorities', form.bugPriority)" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </template>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!submitEnabled || optionsLoading" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getTeamIterationIssueEditOptions, updateTeamIterationIssue } from '@/api/zhaogangIteration'
import type {
  TeamIterationIssue, TeamIterationIssueCreationOptions, TeamIterationSelectionOption
} from '@/types/zhaogangIteration'

const props = defineProps<{
  modelValue: boolean
  iterationId: number
  issue?: TeamIterationIssue
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [issue: TeamIterationIssue]
}>()

type OptionKey = 'developmentTeams' | 'definitionsOfDone' | 'taskTypes' | 'bugPriorities'

const saving = ref(false)
const optionsLoading = ref(false)
const options = reactive<TeamIterationIssueCreationOptions>({
  issueType: 'REQUIREMENT', developmentTeams: [], definitionsOfDone: [], taskTypes: [], bugPriorities: []
})
const form = reactive({
  title: '', description: '', developmentTeam: '', definitionOfDone: '', estimatedHours: 1,
  taskType: '', onlineBug: false, bugPriority: ''
})

const typeLabels: Record<TeamIterationIssue['issueType'], string> = {
  REQUIREMENT: '需求', TASK: '任务', USER_STORY: '用户故事', SUB_TASK: '子工作项', DEFECT: '缺陷'
}
const typeLabel = computed(() => typeLabels[props.issue?.issueType || 'REQUIREMENT'])
const dialogTitle = computed(() => `编辑${typeLabel.value}`)
const submitEnabled = computed(() => {
  if (!form.title.trim() || !props.issue) return false
  if (props.issue.issueType === 'USER_STORY') return Boolean(form.developmentTeam && form.definitionOfDone)
  if (props.issue.issueType === 'SUB_TASK') return form.estimatedHours > 0 && Boolean(form.taskType)
  if (props.issue.issueType === 'DEFECT') return Boolean(form.bugPriority)
  return true
})

const resetOptions = () => Object.assign(options, {
  issueType: props.issue?.issueType || 'REQUIREMENT',
  developmentTeams: [], definitionsOfDone: [], taskTypes: [], bugPriorities: []
})

const loadOptions = async () => {
  if (!props.issue || props.issue.issueType === 'REQUIREMENT' || props.issue.issueType === 'TASK') return
  optionsLoading.value = true
  try { Object.assign(options, await getTeamIterationIssueEditOptions(props.iterationId, props.issue.id)) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '事项字段加载失败') }
  finally { optionsLoading.value = false }
}

const optionsFor = (key: OptionKey, current: string): TeamIterationSelectionOption[] => {
  const values = options[key]
  return current && !values.some(item => item.value === current)
    ? [{ value: current, label: current }, ...values]
    : values
}

const save = async () => {
  if (!props.issue || !submitEnabled.value) return
  saving.value = true
  try {
    const updated = await updateTeamIterationIssue(props.iterationId, props.issue.id, {
      title: form.title.trim(),
      description: form.description,
      developmentTeam: props.issue.issueType === 'USER_STORY' ? form.developmentTeam : undefined,
      definitionOfDone: props.issue.issueType === 'USER_STORY' ? form.definitionOfDone : undefined,
      estimatedHours: props.issue.issueType === 'SUB_TASK' ? form.estimatedHours : undefined,
      taskType: props.issue.issueType === 'SUB_TASK' ? form.taskType : undefined,
      onlineBug: props.issue.issueType === 'DEFECT' ? form.onlineBug : undefined,
      bugPriority: props.issue.issueType === 'DEFECT' ? form.bugPriority : undefined
    })
    emit('saved', updated)
    emit('update:modelValue', false)
    const codingBacked = props.issue.source === 'CODING' || props.issue.syncStatus === 'SYNCED'
    ElMessage.success(codingBacked ? `${typeLabel.value}已更新并同步 CODING` : `${typeLabel.value}已更新`)
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '事项保存失败') }
  finally { saving.value = false }
}

watch(() => [props.modelValue, props.issue?.id] as const, ([visible]) => {
  if (!visible || !props.issue) return
  Object.assign(form, {
    title: props.issue.title || '', description: props.issue.description || '',
    developmentTeam: props.issue.developmentTeam || '', definitionOfDone: props.issue.definitionOfDone || '',
    estimatedHours: props.issue.estimatedHours || 1, taskType: props.issue.taskType || '',
    onlineBug: props.issue.onlineBug ?? false, bugPriority: props.issue.bugPriority || ''
  })
  resetOptions()
  void loadOptions()
}, { immediate: true })
</script>

<style scoped>
.typed-fields { min-height: 44px; }
.full-control { width: 100%; }
.markdown-input :deep(.el-textarea__inner) {
  min-height: 144px;
  line-height: 1.6;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
