<template>
  <section v-loading="loading" class="secret-management">
    <div class="page-toolbar">
      <el-button type="primary" :icon="Plus" @click="openAddDrawer">新增密钥</el-button>
      <el-button :icon="Refresh" @click="searchPage">刷新</el-button>
    </div>

    <el-form class="search-form" :model="page.dto" inline @submit.prevent>
      <el-form-item label="关键词" class="keyword-filter">
        <el-input v-model="page.dto.keyword" placeholder="名称、服务或标签" clearable @keyup.enter="searchPage" />
      </el-form-item>
      <el-form-item label="类型" class="select-filter">
        <el-select v-model="page.dto.secretType" placeholder="全部类型" clearable>
          <el-option v-for="item in secretTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="环境" class="select-filter">
        <el-select v-model="page.dto.environment" placeholder="全部环境" clearable>
          <el-option v-for="item in environmentOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="有效状态" class="select-filter expiry-filter">
        <el-select v-model="page.dto.expiryStatus" placeholder="全部状态" clearable>
          <el-option label="有效" :value="1" />
          <el-option label="即将过期" :value="2" />
          <el-option label="已过期" :value="3" />
        </el-select>
      </el-form-item>
      <el-form-item class="filter-actions">
        <el-button type="primary" :icon="Search" @click="searchPage">查询</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="page.list" class="secret-table">
      <el-table-column prop="name" label="密钥名称" min-width="160" />
      <el-table-column prop="serviceName" label="所属服务" min-width="140" />
      <el-table-column label="类型" width="130">
        <template #default="{ row }">{{ secretTypeName(row.secretType) }}</template>
      </el-table-column>
      <el-table-column label="环境" width="100">
        <template #default="{ row }">
          <el-tag effect="plain" size="small">{{ environmentName(row.environment) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="fieldSummary" label="密钥字段" min-width="190" show-overflow-tooltip />
      <el-table-column label="到期时间" width="170">
        <template #default="{ row }">
          <span :class="expiryClass(row.expireTime)">{{ row.expireTime || '长期有效' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="标签" min-width="150">
        <template #default="{ row }">
          <el-tag v-for="tag in parseTags(row.tags)" :key="tag" class="tag-item" size="small">{{ tag }}</el-tag>
          <span v-if="parseTags(row.tags).length === 0">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="lastAccessTime" label="最后查看" width="170" />
      <el-table-column prop="updateTime" label="更新时间" width="170" />
      <el-table-column label="操作" fixed="right" width="170">
        <template #default="{ row }">
          <el-tooltip content="查看密钥" placement="top">
            <el-button circle :icon="View" @click="openDetailDrawer(row)" />
          </el-tooltip>
          <el-tooltip content="编辑" placement="top">
            <el-button circle type="primary" :icon="Edit" @click="openEditDrawer(row)" />
          </el-tooltip>
          <el-tooltip content="删除" placement="top">
            <el-button circle type="danger" :icon="Delete" @click="confirmDelete(row)" />
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page.dto.currentPage"
      v-model:page-size="page.dto.pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="page.total"
      layout="total, sizes, prev, pager, next"
      background
      class="pagination"
      @size-change="searchPage"
      @current-change="searchPage"
    />

    <el-drawer v-model="formDrawer.visible" :title="formDrawer.title" size="600px" :close-on-click-modal="false" @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="92px" class="secret-form">
        <el-form-item label="密钥名称" prop="name">
          <el-input v-model="form.name" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="所属服务" prop="serviceName">
          <el-input v-model="form.serviceName" placeholder="例如 OpenAI、阿里云、GitHub" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="密钥类型" prop="secretType">
          <el-select v-model="form.secretType" class="form-control" @change="applyTypeTemplate">
            <el-option v-for="item in secretTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="使用环境" prop="environment">
          <el-radio-group v-model="form.environment">
            <el-radio-button v-for="item in environmentOptions" :key="item.value" :value="item.value">{{ item.label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="服务地址" prop="address">
          <el-input v-model="form.address" placeholder="可选，例如 API 地址或控制台地址" maxlength="255" />
        </el-form-item>
        <el-form-item label="到期时间">
          <el-date-picker v-model="form.expireTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="未填写表示长期有效" class="form-control" />
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="form.tags" multiple filterable allow-create default-first-option placeholder="输入后回车添加" class="form-control" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>

        <div class="field-section">
          <div class="field-section-header">
            <span>密钥字段</span>
            <el-button :icon="Plus" text type="primary" @click="addCustomField">添加字段</el-button>
          </div>
          <div v-for="(field, index) in form.fields" :key="field.code" class="secret-field-row">
            <div class="field-header">
              <el-input v-model="field.label" placeholder="字段名称" maxlength="64" class="field-label" />
              <el-select v-model="field.inputType" class="field-input-type">
                <el-option label="单行" value="TEXT" />
                <el-option label="多行" value="TEXTAREA" />
              </el-select>
              <el-button :icon="Delete" circle text type="danger" :disabled="form.fields.length === 1" @click="confirmRemoveField(index)" />
            </div>
            <el-input
              v-if="field.inputType !== 'TEXTAREA'"
              v-model="field.value"
              type="password"
              show-password
              :placeholder="field.hasValue ? '已保存，留空则不修改' : '请输入密钥值'"
            />
            <el-input
              v-else
              v-model="field.value"
              type="textarea"
              :rows="4"
              :placeholder="field.hasValue ? '已保存，留空则不修改' : '请输入密钥值'"
            />
          </div>
        </div>
      </el-form>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="formDrawer.visible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
        </div>
      </template>
    </el-drawer>

    <el-drawer v-model="detailDrawer.visible" title="密钥详情" size="520px" @closed="clearRevealedValues">
      <template v-if="detailDrawer.data">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="密钥名称">{{ detailDrawer.data.name }}</el-descriptions-item>
          <el-descriptions-item label="所属服务">{{ detailDrawer.data.serviceName }}</el-descriptions-item>
          <el-descriptions-item label="密钥类型">{{ secretTypeName(detailDrawer.data.secretType) }}</el-descriptions-item>
          <el-descriptions-item label="使用环境">{{ environmentName(detailDrawer.data.environment) }}</el-descriptions-item>
          <el-descriptions-item label="服务地址">{{ detailDrawer.data.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="到期时间">{{ detailDrawer.data.expireTime || '长期有效' }}</el-descriptions-item>
          <el-descriptions-item label="标签">
            <el-tag v-for="tag in parseTags(detailDrawer.data.tags)" :key="tag" class="tag-item" size="small">{{ tag }}</el-tag>
            <span v-if="parseTags(detailDrawer.data.tags).length === 0">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注">{{ detailDrawer.data.remark || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最后查看">{{ detailDrawer.data.lastAccessTime || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-fields">
          <h3>密钥字段</h3>
          <div v-for="field in detailDrawer.data.fields" :key="field.code" class="detail-field-row">
            <div>
              <div class="detail-field-label">{{ field.label }}</div>
              <code v-if="revealedValues[field.code]">{{ revealedValues[field.code] }}</code>
              <span v-else class="masked-value">{{ field.hasValue ? '已保存的密钥值' : '未保存值' }}</span>
            </div>
            <div class="detail-field-actions">
              <el-tooltip content="查看" placement="top">
                <el-button circle :icon="View" :loading="isRevealing(field.code)" :disabled="!field.hasValue" @click="revealField(field.code)" />
              </el-tooltip>
              <el-tooltip content="复制" placement="top">
                <el-button circle :icon="CopyDocument" :loading="isCopying(field.code)" :disabled="!field.hasValue" @click="copyField(field.code)" />
              </el-tooltip>
            </div>
          </div>
        </div>
      </template>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CopyDocument, Delete, Edit, Plus, Refresh, Search, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  addManagedSecret,
  deleteManagedSecret,
  queryManagedSecretDetail,
  queryManagedSecretPage,
  revealManagedSecret,
  updateManagedSecret
} from '@/api/managedSecret'
import type {
  ManagedSecretDetail,
  ManagedSecretEnvironment,
  ManagedSecretField,
  ManagedSecretForm,
  ManagedSecretPageDto,
  ManagedSecretPageRecord,
  ManagedSecretPayload,
  ManagedSecretType
} from '@/types/managedSecret'

const secretTypeOptions: Array<{ label: string, value: ManagedSecretType }> = [
  { label: 'API Key', value: 'API_KEY' },
  { label: 'AccessKey / SecretKey', value: 'ACCESS_KEY_PAIR' },
  { label: 'Token', value: 'TOKEN' },
  { label: 'SSH 私钥', value: 'SSH_KEY' },
  { label: '证书密钥', value: 'CERTIFICATE' },
  { label: '自定义', value: 'CUSTOM' }
]

const environmentOptions: Array<{ label: string, value: ManagedSecretEnvironment }> = [
  { label: '生产', value: 'PROD' },
  { label: '测试', value: 'TEST' },
  { label: '开发', value: 'DEV' },
  { label: '其他', value: 'OTHER' }
]

const templates: Record<ManagedSecretType, ManagedSecretField[]> = {
  API_KEY: [{ code: 'apiKey', label: 'API Key', inputType: 'TEXT' }],
  ACCESS_KEY_PAIR: [
    { code: 'accessKeyId', label: 'Access Key ID', inputType: 'TEXT' },
    { code: 'secretAccessKey', label: 'Secret Access Key', inputType: 'TEXT' }
  ],
  TOKEN: [{ code: 'token', label: 'Token', inputType: 'TEXT' }],
  SSH_KEY: [
    { code: 'privateKey', label: 'SSH 私钥', inputType: 'TEXTAREA' },
    { code: 'passphrase', label: '私钥口令', inputType: 'TEXT' }
  ],
  CERTIFICATE: [
    { code: 'certificate', label: '证书内容', inputType: 'TEXTAREA' },
    { code: 'privateKey', label: '私钥', inputType: 'TEXTAREA' },
    { code: 'passphrase', label: '私钥口令', inputType: 'TEXT' }
  ],
  CUSTOM: [{ code: 'secret', label: '密钥值', inputType: 'TEXT' }]
}

const loading = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const revealedValues = reactive<Record<string, string>>({})
const revealingFieldCode = ref<string>()
const copyingFieldCode = ref<string>()
const page = reactive({
  dto: { currentPage: 1, pageSize: 10 } as ManagedSecretPageDto,
  total: 0,
  list: [] as ManagedSecretPageRecord[]
})

const createEmptyForm = (): ManagedSecretForm => ({
  name: '',
  serviceName: '',
  secretType: 'API_KEY',
  environment: 'PROD',
  address: '',
  fields: cloneTemplate('API_KEY'),
  expireTime: undefined,
  tags: [],
  remark: ''
})

const form = reactive<ManagedSecretForm>(createEmptyForm())
const formDrawer = reactive({ visible: false, title: '新增密钥', mode: 'ADD' as 'ADD' | 'EDIT' })
const detailDrawer = reactive<{ visible: boolean, data?: ManagedSecretDetail }>({ visible: false })

const formRules = computed<FormRules<ManagedSecretForm>>(() => ({
  name: [{ required: true, message: '请输入密钥名称', trigger: 'blur' }],
  serviceName: [{ required: true, message: '请输入所属服务', trigger: 'blur' }],
  secretType: [{ required: true, message: '请选择密钥类型', trigger: 'change' }],
  environment: [{ required: true, message: '请选择使用环境', trigger: 'change' }]
}))

onMounted(searchPage)

function cloneTemplate(type: ManagedSecretType): ManagedSecretField[] {
  return templates[type].map(field => ({ ...field, value: '', hasValue: false }))
}

function searchPage() {
  loading.value = true
  queryManagedSecretPage(page.dto).then(response => {
    page.total = response.data.total
    page.list = response.data.records
  }).finally(() => {
    loading.value = false
  })
}

function resetSearch() {
  page.dto.keyword = undefined
  page.dto.secretType = undefined
  page.dto.environment = undefined
  page.dto.expiryStatus = undefined
  page.dto.currentPage = 1
  searchPage()
}

function openAddDrawer() {
  resetForm()
  formDrawer.mode = 'ADD'
  formDrawer.title = '新增密钥'
  formDrawer.visible = true
}

function openEditDrawer(row: ManagedSecretPageRecord) {
  loading.value = true
  queryManagedSecretDetail(row.id).then(response => {
    assignForm(response.data)
    formDrawer.mode = 'EDIT'
    formDrawer.title = '编辑密钥'
    formDrawer.visible = true
  }).finally(() => {
    loading.value = false
  })
}

function openDetailDrawer(row: ManagedSecretPageRecord) {
  clearRevealedValues()
  loading.value = true
  queryManagedSecretDetail(row.id).then(response => {
    detailDrawer.data = response.data
    detailDrawer.visible = true
  }).finally(() => {
    loading.value = false
  })
}

function assignForm(detail: ManagedSecretDetail) {
  Object.assign(form, {
    id: detail.id,
    name: detail.name,
    serviceName: detail.serviceName,
    secretType: detail.secretType,
    environment: detail.environment,
    address: detail.address || '',
    fields: detail.fields.map(field => ({ ...field, value: '' })),
    expireTime: detail.expireTime,
    tags: parseTags(detail.tags),
    remark: detail.remark || ''
  })
}

function resetForm() {
  Object.assign(form, createEmptyForm())
  formRef.value?.clearValidate()
}

function applyTypeTemplate() {
  if (formDrawer.mode === 'ADD') {
    form.fields = cloneTemplate(form.secretType)
  }
}

function addCustomField() {
  const sequence = form.fields.length + 1
  form.fields.push({ code: `customField${Date.now()}${sequence}`, label: `自定义字段 ${sequence}`, inputType: 'TEXT', value: '', hasValue: false })
}

function removeField(index: number) {
  if (form.fields.length > 1) {
    form.fields.splice(index, 1)
  }
}

function confirmRemoveField(index: number) {
  const field = form.fields[index]
  if (!field || !field.hasValue) {
    removeField(index)
    return
  }
  ElMessageBox.confirm(`删除字段“${field.label}”将永久删除其已保存的密钥值，是否继续？`, '删除密钥字段', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => removeField(index)).catch(() => undefined)
}

function submitForm() {
  formRef.value?.validate(valid => {
    if (!valid || !validateFields()) {
      return
    }
    saving.value = true
    const payload = toPayload()
    const request = formDrawer.mode === 'ADD'
      ? addManagedSecret(payload)
      : updateManagedSecret({ ...payload, id: form.id as number })
    request.then(() => {
      ElMessage.success('保存成功')
      formDrawer.visible = false
      searchPage()
    }).finally(() => {
      saving.value = false
    })
  })
}

function validateFields() {
  const labels = new Set<string>()
  for (const field of form.fields) {
    const label = field.label.trim()
    if (!label) {
      ElMessage.warning('密钥字段名称不能为空')
      return false
    }
    if (labels.has(label)) {
      ElMessage.warning('密钥字段名称不能重复')
      return false
    }
    labels.add(label)
    if (formDrawer.mode === 'ADD' && !field.value?.trim()) {
      ElMessage.warning(`请填写${label}的值`)
      return false
    }
    if (formDrawer.mode === 'EDIT' && !field.hasValue && !field.value?.trim()) {
      ElMessage.warning(`请填写新增字段${label}的值`)
      return false
    }
  }
  return true
}

function toPayload(): ManagedSecretPayload {
  return {
    name: form.name.trim(),
    serviceName: form.serviceName.trim(),
    secretType: form.secretType,
    environment: form.environment,
    address: form.address?.trim() || undefined,
    expireTime: form.expireTime || undefined,
    tags: form.tags.length ? JSON.stringify(form.tags) : undefined,
    remark: form.remark?.trim() || undefined,
    fields: form.fields.map(field => ({
      code: field.code,
      label: field.label.trim(),
      inputType: field.inputType,
      value: field.value?.trim() || undefined,
      hasValue: field.hasValue
    }))
  }
}

async function revealField(fieldCode: string) {
  if (!detailDrawer.data) return
  revealingFieldCode.value = fieldCode
  try {
    const response = await revealManagedSecret({ id: detailDrawer.data.id, fieldCode })
    revealedValues[fieldCode] = response.data.value
    window.setTimeout(() => {
      delete revealedValues[fieldCode]
    }, 30_000)
  } finally {
    revealingFieldCode.value = undefined
  }
}

async function copyField(fieldCode: string) {
  if (!detailDrawer.data) return
  copyingFieldCode.value = fieldCode
  try {
    const response = await revealManagedSecret({ id: detailDrawer.data.id, fieldCode })
    await copyToClipboard(response.data.value)
    ElMessage.success('已复制到剪贴板')
  } finally {
    copyingFieldCode.value = undefined
  }
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function isRevealing(fieldCode: string) {
  return revealingFieldCode.value === fieldCode
}

function isCopying(fieldCode: string) {
  return copyingFieldCode.value === fieldCode
}

function clearRevealedValues() {
  Object.keys(revealedValues).forEach(key => delete revealedValues[key])
}

function confirmDelete(row: ManagedSecretPageRecord) {
  ElMessageBox.confirm(`将永久删除“${row.name}”及其中全部密钥值，是否继续？`, '删除密钥', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => deleteManagedSecret(row.id)).then(() => {
    ElMessage.success('删除成功')
    searchPage()
  }).catch(() => undefined)
}

function secretTypeName(type: ManagedSecretType) {
  return secretTypeOptions.find(item => item.value === type)?.label || type
}

function environmentName(environment: ManagedSecretEnvironment) {
  return environmentOptions.find(item => item.value === environment)?.label || environment
}

function parseTags(tags?: string) {
  if (!tags) return []
  try {
    const parsed = JSON.parse(tags)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return tags.split(',').map(item => item.trim()).filter(Boolean)
  }
}

function expiryClass(expireTime?: string) {
  if (!expireTime) return ''
  const expireAt = new Date(expireTime.replace(/-/g, '/')).getTime()
  const now = Date.now()
  if (expireAt <= now) return 'expiry-expired'
  if (expireAt <= now + 30 * 24 * 60 * 60 * 1000) return 'expiry-warning'
  return ''
}
</script>

<style scoped>
.secret-management {
  padding: 20px;
}

.page-toolbar,
.field-section-header,
.drawer-footer,
.detail-field-row,
.field-header {
  display: flex;
  align-items: center;
}

.page-toolbar {
  gap: 8px;
  margin-bottom: 16px;
}

.search-form {
  display: grid;
  grid-template-columns: minmax(360px, 1.7fr) minmax(150px, 0.8fr) minmax(150px, 0.8fr) minmax(170px, 0.9fr) auto;
  align-items: end;
  gap: 12px 16px;
  max-width: 1320px;
  margin-bottom: 16px;
}

.search-form :deep(.el-form-item) {
  min-width: 0;
  margin: 0;
}

.search-form :deep(.el-form-item__content) {
  min-width: 0;
}

.keyword-filter :deep(.el-form-item__content),
.select-filter :deep(.el-form-item__content) {
  flex: 1;
}

.keyword-filter :deep(.el-input),
.select-filter :deep(.el-select) {
  width: 100%;
}

.filter-actions :deep(.el-form-item__content) {
  flex-wrap: nowrap;
}

.secret-table {
  width: 100%;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

.tag-item {
  margin-right: 4px;
}

.expiry-warning {
  color: var(--el-color-warning);
}

.expiry-expired {
  color: var(--el-color-danger);
}

.form-control {
  width: 100%;
}

.field-section {
  margin: 18px 0 0 92px;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 12px;
}

.field-section-header {
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 10px;
}

.secret-field-row {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
}

.field-header {
  gap: 8px;
  margin-bottom: 8px;
}

.field-label {
  flex: 1;
}

.field-input-type {
  width: 100px;
}

.drawer-footer {
  justify-content: flex-end;
  gap: 8px;
}

.detail-fields {
  margin-top: 22px;
}

.detail-fields h3 {
  font-size: 14px;
  margin: 0 0 10px;
}

.detail-field-row {
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-field-label {
  font-weight: 600;
  margin-bottom: 6px;
}

.masked-value {
  color: var(--el-text-color-secondary);
}

.detail-field-row code {
  display: block;
  max-width: 340px;
  max-height: 120px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  padding: 4px 6px;
  background: var(--el-fill-color-light);
}

.detail-field-actions {
  display: flex;
  gap: 6px;
  flex: none;
}

@media (max-width: 768px) {
  .secret-management {
    padding: 12px;
  }

  .search-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-width: none;
  }

  .keyword-filter {
    grid-column: 1 / -1;
  }

  .field-section {
    margin-left: 0;
  }
}

@media (max-width: 520px) {
  .search-form {
    grid-template-columns: 1fr;
  }

  .keyword-filter {
    grid-column: auto;
  }
}
</style>
