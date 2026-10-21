<template>
  <el-dialog
    :model-value="modelValue"
    title="填写需求原型链接"
    width="min(560px, calc(100% - 28px))"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="top" @submit.prevent="save">
      <el-form-item label="需求原型" required :error="inputError">
        <el-input v-model="url" maxlength="255" show-word-limit clearable :disabled="saving" placeholder="请输入完整的 HTTP/HTTPS 原型链接" />
      </el-form-item>
    </el-form>
    <p v-if="savedUrl" class="saved-link">
      链接已保存，浏览器未自动打开新标签页。
      <a :href="savedUrl" target="_blank" rel="noopener noreferrer">点击打开需求原型</a>
    </p>
    <template #footer>
      <el-button :disabled="saving" @click="emit('update:modelValue', false)">{{ savedUrl ? '关闭' : '取消' }}</el-button>
      <el-button type="primary" :loading="saving" :disabled="Boolean(inputError) || !url.trim()" @click="save">保存并跳转</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { updateTeamIterationIssuePrototypeUrl } from '@/api/zhaogangIteration'
import type { TeamIterationIssue } from '@/types/zhaogangIteration'
import { prototypeLinkError } from '../iterationPrototypeLink'

const props = defineProps<{ modelValue: boolean; iterationId: number; issue: TeamIterationIssue }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [url: string, issueId: number, iterationId: number]
}>()
const url = ref('')
const saving = ref(false)
const savedUrl = ref('')
let active = true
onBeforeUnmount(() => { active = false })
const inputError = computed(() => url.value ? prototypeLinkError(url.value, true) : '')

const save = async () => {
  if (saving.value || prototypeLinkError(url.value, true)) return
  const iterationId = props.iterationId
  const issueId = props.issue.id
  const prototypeUrl = url.value.trim()
  // Reserve a tab during the click so async persistence does not lose the browser's user gesture.
  const destination = window.open('about:blank', '_blank')
  if (destination) destination.opener = null
  saving.value = true
  savedUrl.value = ''
  try {
    const updated = await updateTeamIterationIssuePrototypeUrl(iterationId, issueId, prototypeUrl)
    if (active) {
      emit('saved', updated.prototypeUrl, issueId, iterationId)
      ElMessage.success('需求原型链接已保存')
    }
    if (destination && !destination.closed) {
      destination.location.replace(prototypeUrl)
      if (active) emit('update:modelValue', false)
    } else {
      savedUrl.value = updated.prototypeUrl
    }
  } catch (error) {
    destination?.close()
    if (active) ElMessage.error(error instanceof Error ? error.message : '需求原型链接保存失败')
  } finally { saving.value = false }
}

watch(() => props.modelValue, visible => {
  if (!visible) return
  url.value = props.issue.prototypeUrl || ''
  savedUrl.value = ''
}, { immediate: true })
</script>

<style scoped>
.saved-link { color: #69768a; line-height: 1.6; }
.saved-link a { color: #2878ed; }
</style>
