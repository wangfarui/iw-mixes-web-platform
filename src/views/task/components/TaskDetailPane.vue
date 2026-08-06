<template>
  <aside class="task-detail-pane" aria-label="任务详情">
    <div v-if="loading" class="detail-loading">
      <el-skeleton :rows="8" animated />
    </div>

    <div v-else-if="task" class="detail-shell">
      <div class="detail-scroll">
        <section class="detail-section title-section">
          <div class="title-status-line">
            <el-input
              v-model="draft.taskName"
              class="title-input"
              maxlength="100"
              aria-label="任务名称"
              @change="saveName"
            />
            <el-switch
              class="task-status-switch"
              :model-value="completed"
              inline-prompt
              active-text="已完成"
              inactive-text="进行中"
              :disabled="busy"
              @change="handleCompletedChange"
            />
            <el-tag v-if="task.isTop" type="warning" effect="plain"><el-icon><Top /></el-icon> 已置顶</el-tag>
            <button type="button" class="close-button" aria-label="关闭任务详情" @click="$emit('close')">
              <el-icon><Close /></el-icon>
            </button>
          </div>
          <div v-if="hasPoints" class="title-points-summary">
            <span v-if="(task.rewardPoints ?? 0) > 0" class="reward"><el-icon><CirclePlus /></el-icon>奖励 {{ task.rewardPoints }}</span>
            <span v-if="(task.punishPoints ?? 0) > 0" class="punish"><el-icon><Remove /></el-icon>处罚 {{ task.punishPoints }}</span>
          </div>
        </section>

        <section class="detail-section notes-section">
          <h3>备注</h3>
          <el-input
            v-model="draft.taskRemark"
            class="notes-input"
            type="textarea"
            resize="vertical"
            placeholder="记录任务背景、验收标准或下一步…"
            @change="saveRemark"
          />
        </section>

        <section class="detail-section attachments-section">
          <div class="section-title-row">
            <div>
              <h3>附件</h3>
              <span class="section-hint">支持点击、拖拽或粘贴图片</span>
            </div>
            <el-upload
              action="#"
              :show-file-list="false"
              :before-upload="beforeUpload"
              accept="image/*"
            >
              <el-button :loading="uploading" type="primary" plain>
                <el-icon><Upload /></el-icon>上传图片
              </el-button>
            </el-upload>
          </div>

          <div
            class="attachment-dropzone"
            tabindex="0"
            @paste="handlePaste"
            @drop.prevent="handleDrop"
            @dragover.prevent
          >
            <div v-if="!task.fileList?.length" class="attachment-empty">
              <el-icon><Picture /></el-icon>
              <span>暂无图片附件</span>
              <small>可将图片拖到这里或直接粘贴</small>
            </div>
            <div v-else class="attachment-grid">
              <figure v-for="(file, index) in task.fileList" :key="file.id ?? file.fileUrl" class="attachment-item">
                <el-image
                  :src="file.fileUrl"
                  :preview-src-list="task.fileList.map((item) => item.fileUrl)"
                  :initial-index="index"
                  fit="cover"
                  preview-teleported
                />
                <button
                  type="button"
                  class="delete-file-button"
                  :aria-label="`删除附件 ${file.fileName ?? index + 1}`"
                  @click="$emit('delete-file', file)"
                >
                  <el-icon><Delete /></el-icon>
                </button>
              </figure>
            </div>
          </div>
        </section>
      </div>
    </div>

    <el-empty v-else description="选择一个任务后在这里查看和编辑详情" :image-size="96" />
  </aside>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { UploadRawFile } from 'element-plus'
import {
  CirclePlus,
  Close,
  Delete,
  Picture,
  Remove,
  Top,
  Upload
} from '@element-plus/icons-vue'
import type { TaskBasicsVo, TaskFileVo } from '@/api/taskList'
import { taskIsCompleted } from '@/views/task/taskWorkspace'

const props = withDefaults(defineProps<{
  task: TaskBasicsVo | null
  loading?: boolean
  busy?: boolean
  uploading?: boolean
}>(), {
  loading: false,
  busy: false,
  uploading: false
})

const emit = defineEmits<{
  close: []
  save: [task: TaskBasicsVo, patch: Partial<TaskBasicsVo>]
  toggle: [task: TaskBasicsVo, completed: boolean]
  upload: [file: File]
  'delete-file': [file: TaskFileVo]
}>()

const draft = reactive({
  taskName: '',
  taskRemark: ''
})

watch(
  () => props.task,
  (task) => {
    draft.taskName = task?.taskName ?? ''
    draft.taskRemark = task?.taskRemark ?? ''
  },
  { immediate: true, deep: true }
)

const completed = computed(() => props.task ? taskIsCompleted(props.task) : false)
const hasPoints = computed(() => (
  (props.task?.rewardPoints ?? 0) > 0 || (props.task?.punishPoints ?? 0) > 0
))

const saveName = () => {
  if (props.task && draft.taskName.trim() && draft.taskName.trim() !== props.task.taskName) {
    emit('save', props.task, { taskName: draft.taskName.trim() })
  }
}

const saveRemark = () => {
  if (props.task && draft.taskRemark !== (props.task.taskRemark ?? '')) {
    emit('save', props.task, { taskRemark: draft.taskRemark })
  }
}

const handleCompletedChange = (value: boolean | string | number) => {
  if (props.task) emit('toggle', props.task, Boolean(value))
}

const beforeUpload = (file: UploadRawFile) => {
  emit('upload', file)
  return false
}

const handlePaste = (event: ClipboardEvent) => {
  for (const item of Array.from(event.clipboardData?.items ?? [])) {
    if (!item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) emit('upload', file)
  }
}

const handleDrop = (event: DragEvent) => {
  for (const file of Array.from(event.dataTransfer?.files ?? [])) {
    if (file.type.startsWith('image/')) emit('upload', file)
  }
}
</script>

<style scoped>
.task-detail-pane {
  min-width: 0;
  height: 100%;
  overflow: hidden;
  background: #fff;
}

.detail-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.close-button {
  width: 32px;
  height: 32px;
  display: none;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}

.close-button:hover {
  background: var(--el-fill-color);
}

.detail-scroll {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px;
}

.detail-section {
  padding: 18px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-section:first-child { padding-top: 0; }
.detail-section:last-child { border-bottom: 0; }

.detail-section h3 {
  margin: 0 0 12px;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.title-input :deep(.el-input__wrapper) {
  padding: 0;
  box-shadow: none;
}

.title-input :deep(.el-input__inner) {
  height: 38px;
  color: var(--el-text-color-primary);
  font-size: 21px;
  font-weight: 650;
}

.title-status-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-input {
  min-width: 0;
  flex: 1;
}

.task-status-switch,
.title-status-line > .el-tag,
.close-button {
  flex: none;
}

.title-points-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 8px;
  font-size: 13px;
}

.title-points-summary span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.title-points-summary .reward { color: var(--el-color-success); }
.title-points-summary .punish { color: var(--el-color-danger); }

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title-row h3 { margin-bottom: 0; }

.notes-section {
  min-height: 280px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.notes-input {
  min-height: 240px;
  flex: 1;
}

.notes-input :deep(.el-textarea__inner) {
  min-height: 240px !important;
  height: 100%;
}

.section-hint {
  display: block;
  margin-top: 3px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.attachment-dropzone {
  min-height: 120px;
  margin-top: 14px;
  padding: 12px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  background: var(--el-fill-color-extra-light);
  outline: none;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.attachment-dropzone:hover,
.attachment-dropzone:focus-visible {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.attachment-empty {
  min-height: 94px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--el-text-color-secondary);
}

.attachment-empty > .el-icon {
  margin-bottom: 4px;
  color: var(--el-text-color-placeholder);
  font-size: 30px;
}

.attachment-empty small { color: var(--el-text-color-placeholder); }

.attachment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
}

.attachment-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  margin: 0;
  border-radius: 8px;
  background: #fff;
}

.attachment-item :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.delete-file-button {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: rgb(245 108 108 / 92%);
  color: #fff;
  cursor: pointer;
  opacity: 0;
}

.attachment-item:hover .delete-file-button,
.delete-file-button:focus-visible {
  opacity: 1;
}

.detail-loading {
  padding: 26px 22px;
}

.task-detail-pane > :deep(.el-empty) {
  height: 100%;
  margin: 0;
}

@media (max-width: 1439px) {
  .close-button { display: inline-flex; }
}
</style>
