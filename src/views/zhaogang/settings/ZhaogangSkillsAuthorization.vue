<template>
  <el-dialog
    :model-value="true"
    :title="pairCode ? '授权本机使用 Skills' : 'Skills 已授权设备'"
    width="min(500px, 94vw)"
    :close-on-click-modal="false"
    @close="emit('close')"
  >
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" :closable="false" />
    <div v-if="pairCode" v-loading="loading">
      <p v-if="candidate">允许 <strong>{{ candidate.label }}</strong> 使用当前工作台账号下载和发布 Skills。</p>
      <p v-else-if="loading">正在核对设备…</p>
    </div>
    <el-table v-else v-loading="loading" :data="devices" empty-text="暂无已授权设备">
      <el-table-column prop="label" label="设备" />
      <el-table-column label="授权时间" min-width="150">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80">
        <template #default="{ row }">
          <el-popconfirm title="撤销此设备的 Skills 权限？" @confirm="revoke(row.id)">
            <template #reference><el-button type="danger" text>撤销</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="emit('close')">{{ pairCode ? '取消' : '关闭' }}</el-button>
      <el-button v-if="pairCode" type="primary" :disabled="!candidate" :loading="approving" @click="approve">确认授权</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { approveSkillPair, listSkillDevices, previewSkillPair, revokeSkillDevice } from '@/api/zhaogangSkills'
import type { SkillDevice } from '@/api/zhaogangSkills'

const props = defineProps<{ pairCode?: string }>()
const emit = defineEmits<{ close: [] }>()
const candidate = ref<SkillDevice>()
const devices = ref<SkillDevice[]>([])
const loading = ref(false)
const approving = ref(false)
const errorMessage = ref('')
let sequence = 0
const message = (error: unknown) => error instanceof Error ? error.message : '操作失败'

async function load() {
  const requested = ++sequence
  const code = props.pairCode
  candidate.value = undefined
  errorMessage.value = ''
  loading.value = true
  try {
    if (code) {
      const result = await previewSkillPair(code)
      if (requested === sequence) candidate.value = result
    } else {
      const result = await listSkillDevices()
      if (requested === sequence) devices.value = result
    }
  } catch (error) {
    if (requested === sequence) errorMessage.value = message(error)
  } finally {
    if (requested === sequence) loading.value = false
  }
}

async function approve() {
  if (!props.pairCode || !candidate.value || approving.value) return
  approving.value = true
  errorMessage.value = ''
  try {
    await approveSkillPair(props.pairCode)
    ElMessage.success('已授权，可以返回 Agent 会话')
    emit('close')
  } catch (error) {
    errorMessage.value = message(error)
  } finally {
    approving.value = false
  }
}

async function revoke(id: string) {
  try {
    await revokeSkillDevice(id)
    await load()
  } catch (error) {
    ElMessage.error(message(error))
  }
}

watch(() => props.pairCode, load, { immediate: true })
</script>
