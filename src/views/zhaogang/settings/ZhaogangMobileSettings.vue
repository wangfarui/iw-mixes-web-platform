<template>
  <div>
    <dt><label for="zhaogang-mobile">手机号</label></dt>
    <dd class="mobile-settings">
      <div class="mobile-controls">
        <el-input id="zhaogang-mobile" v-model="draft" inputmode="tel" maxlength="11" clearable
          autocomplete="tel" placeholder="企微登记的11位手机号" :disabled="loading || saving"
          @blur="save" />
        <el-button v-if="error" text @click="load">重试</el-button>
      </div>
      <span v-if="error" class="mobile-error" role="alert">{{ error }}</span>
    </dd>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getWorkbenchMobile, updateWorkbenchMobile } from '@/api/zhaogangProfile'
const draft = ref('')
const saved = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
let active = true
const load = async () => {
  loading.value = true; error.value = ''
  try {
    const value = await getWorkbenchMobile()
    if (active) draft.value = saved.value = value.mobile ?? ''
  } catch (e) { if (active) error.value = e instanceof Error ? e.message : '手机号加载失败' }
  finally { if (active) loading.value = false }
}
const save = async () => {
  if (loading.value || saving.value || error.value || draft.value.trim() === saved.value) return
  const mobile = draft.value.trim()
  if (mobile && !/^1[3-9]\d{9}$/.test(mobile)) { ElMessage.warning('请输入有效的11位手机号，或留空清除'); return }
  saving.value = true
  try {
    const value = await updateWorkbenchMobile(mobile)
    if (active) { draft.value = saved.value = value.mobile ?? ''; ElMessage.success('手机号更新成功') }
  } catch (e) { if (active) ElMessage.error(e instanceof Error ? e.message : '手机号保存失败') }
  finally { if (active) saving.value = false }
}
onMounted(load)
onBeforeUnmount(() => { active = false })
</script>

<style scoped>
.mobile-settings { display: flex; margin: 0; flex: 1; min-width: 0; flex-direction: column; align-items: stretch; gap: 6px; }
dt { flex-shrink: 0; color: #7c899c; font-size: 13px; }
.mobile-controls { display: flex; width: 100%; align-items: center; justify-content: flex-end; gap: 8px; }
.mobile-controls :deep(.el-input) { width: min(100%, 160px); min-width: 0; }
.mobile-controls :deep(.el-input__inner) { text-align: left; }
.mobile-hint, .mobile-error { font-size: 12px; line-height: 1.6; }
.mobile-hint { color: #8490a4; }
.mobile-error { color: var(--el-color-danger); }
</style>
