<template>
  <div class="address-generator-page">
    <header class="address-topbar">
      <div class="topbar-title">
        <h1>地址生成器</h1>
        <el-tag type="success" effect="light">本地生成 / 可保存</el-tag>
        <span class="privacy-copy">生成的用户资料和地址仅用于测试，不代表真实身份或可投递地址。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button type="primary" :loading="generating" @click="handleGenerate">
          <el-icon><MagicStick /></el-icon>
          重新生成
        </el-button>
        <el-button :disabled="!profile" @click="saveCurrentProfile">
          <el-icon><Collection /></el-icon>
          保存当前资料
        </el-button>
        <el-button @click="openHistory">
          <el-icon><Clock /></el-icon>
          本地保存{{ historyRecords.length ? `(${historyRecords.length})` : '' }}
        </el-button>
        <el-dropdown trigger="click" :disabled="!profile" @command="handleExport">
          <el-button :disabled="!profile">
            <el-icon><Download /></el-icon>
            导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">JSON</el-dropdown-item>
              <el-dropdown-item command="csv">CSV</el-dropdown-item>
              <el-dropdown-item command="txt">TXT</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="danger" plain @click="clearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </header>

    <main class="address-workbench">
      <section class="config-panel">
        <div class="section-head">
          <div>
            <h2>生成配置</h2>
            <p>{{ selectedCountryLabel }} · {{ localeSummary }}</p>
          </div>
          <el-button text @click="resetSettings">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </div>

        <el-form label-position="top" class="config-form">
          <el-form-item label="国家 / 地区">
            <el-select v-model="settings.countryCode" filterable>
              <el-option label="全球随机" value="random" />
              <el-option
                v-for="country in countryOptions"
                :key="country.code"
                :label="`${country.localName} / ${country.name} · ${country.code}`"
                :value="country.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Locale">
            <el-select v-model="settings.localeCode" filterable>
              <el-option label="自动匹配国家 / 地区" value="auto" />
              <el-option
                v-for="locale in localeOptions"
                :key="locale.code"
                :label="locale.label"
                :value="locale.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="随机种子">
            <el-input
              v-model="settings.seed"
              clearable
              placeholder="可选；填写后可复现同一条资料"
            />
          </el-form-item>
          <el-form-item label="字段命名">
            <el-radio-group v-model="settings.fieldNaming">
              <el-radio-button label="camel">camelCase</el-radio-button>
              <el-radio-button label="snake">snake_case</el-radio-button>
              <el-radio-button label="chinese">中文</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="经纬度">
            <el-switch v-model="settings.includeCoordinates" active-text="生成" />
          </el-form-item>
        </el-form>

        <el-alert
          class="privacy-alert"
          type="info"
          :closable="false"
          show-icon
          title="本地保存只写入当前浏览器 localStorage，不上传、不跨设备同步。"
        />
      </section>

      <section class="profile-panel">
        <el-empty
          v-if="!profile"
          description="暂无地址资料"
        >
          <el-button type="primary" :loading="generating" @click="handleGenerate">生成一条资料</el-button>
        </el-empty>

        <template v-else>
          <div class="profile-hero">
            <el-avatar :src="profile.user.avatarUrl" :size="72">
              {{ profile.user.fullName.slice(0, 1) }}
            </el-avatar>
            <div class="profile-main">
              <div class="profile-title-row">
                <h2>{{ profile.user.fullName }}</h2>
                <el-tag effect="plain">{{ profile.address.countryLocalName }}</el-tag>
              </div>
              <p>{{ profile.user.username }} · {{ profile.user.jobTitle }} · {{ profile.user.company }}</p>
              <div class="profile-tags">
                <el-tag
                  v-for="tag in profile.user.tags"
                  :key="tag"
                  size="small"
                  type="success"
                  effect="plain"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </div>
            <div class="profile-actions">
              <el-button @click="copyText(profile.address.fullAddress, '完整地址已复制')">
                <el-icon><MapLocation /></el-icon>
                复制地址
              </el-button>
              <el-button @click="copyPreview">
                <el-icon><CopyDocument /></el-icon>
                复制当前格式
              </el-button>
            </div>
          </div>

          <div class="summary-strip">
            <div>
              <span>国家代码</span>
              <strong>{{ profile.address.countryCode }}</strong>
            </div>
            <div>
              <span>Locale</span>
              <strong>{{ profile.localeCode }}</strong>
            </div>
            <div>
              <span>年龄</span>
              <strong>{{ profile.user.age }}</strong>
            </div>
            <div>
              <span>生成时间</span>
              <strong>{{ formatDateTime(profile.generatedAt) }}</strong>
            </div>
          </div>

          <section class="detail-section">
            <div class="detail-head">
              <h3>基础资料</h3>
              <el-button text @click="copyText(profile.user.userId, '用户ID已复制')">
                <el-icon><CopyDocument /></el-icon>
                复制 ID
              </el-button>
            </div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="用户ID">{{ profile.user.userId }}</el-descriptions-item>
              <el-descriptions-item label="姓名">{{ profile.user.fullName }}</el-descriptions-item>
              <el-descriptions-item label="性别">{{ profile.user.genderLabel }}</el-descriptions-item>
              <el-descriptions-item label="生日">{{ profile.user.birthday }}</el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ profile.user.email }}</el-descriptions-item>
              <el-descriptions-item label="测试手机号">{{ profile.user.phone }}</el-descriptions-item>
              <el-descriptions-item label="公司">{{ profile.user.company }}</el-descriptions-item>
              <el-descriptions-item label="职位">{{ profile.user.jobTitle }}</el-descriptions-item>
            </el-descriptions>
          </section>

          <section class="detail-section">
            <div class="detail-head">
              <h3>地址信息</h3>
              <el-button text @click="copyText(profile.address.fullAddress, '完整地址已复制')">
                <el-icon><CopyDocument /></el-icon>
                复制完整地址
              </el-button>
            </div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="国家">{{ profile.address.countryLocalName }} / {{ profile.address.country }}</el-descriptions-item>
              <el-descriptions-item label="地区">{{ profile.address.region }}</el-descriptions-item>
              <el-descriptions-item label="省州地区">{{ profile.address.state || '-' }}</el-descriptions-item>
              <el-descriptions-item label="城市">{{ profile.address.city || '-' }}</el-descriptions-item>
              <el-descriptions-item label="区县区域">{{ profile.address.district || '-' }}</el-descriptions-item>
              <el-descriptions-item label="邮编">{{ profile.address.postalCode || '-' }}</el-descriptions-item>
              <el-descriptions-item label="街道地址" :span="2">{{ profile.address.streetAddress || '-' }}</el-descriptions-item>
              <el-descriptions-item label="完整地址" :span="2">{{ profile.address.fullAddress }}</el-descriptions-item>
              <el-descriptions-item v-if="profile.address.latitude && profile.address.longitude" label="经纬度" :span="2">
                {{ profile.address.latitude }}, {{ profile.address.longitude }}
              </el-descriptions-item>
            </el-descriptions>
          </section>
        </template>
      </section>
    </main>

    <section v-if="profile" class="preview-panel">
      <div class="preview-head">
        <div>
          <h2>复制导出</h2>
          <p>当前输出字段命名：{{ fieldNamingLabel }}</p>
        </div>
        <div class="preview-actions">
          <el-radio-group v-model="activePreviewFormat">
            <el-radio-button label="json">JSON</el-radio-button>
            <el-radio-button label="csv">CSV</el-radio-button>
            <el-radio-button label="txt">TXT</el-radio-button>
          </el-radio-group>
          <el-button @click="copyPreview">
            <el-icon><CopyDocument /></el-icon>
            复制
          </el-button>
        </div>
      </div>
      <pre class="preview-code">{{ activePreview }}</pre>
    </section>

    <el-drawer
      v-model="historyVisible"
      title="本地保存"
      size="420px"
      append-to-body
    >
      <div class="history-toolbar">
        <el-button :disabled="!historyRecords.length" @click="downloadHistory">
          <el-icon><Download /></el-icon>
          导出记录
        </el-button>
        <el-button type="danger" plain :disabled="!historyRecords.length" @click="clearHistory">
          <el-icon><Delete /></el-icon>
          清空保存
        </el-button>
      </div>

      <el-empty v-if="!historyRecords.length" description="暂无本地保存记录" />

      <div v-else class="history-list">
        <article
          v-for="record in historyRecords"
          :key="record.id"
          class="history-item"
        >
          <div class="history-item-head">
            <div>
              <h3>{{ record.title }}</h3>
              <p>{{ record.summary }} · {{ formatDateTime(record.createdAt) }}</p>
            </div>
            <el-tag size="small" effect="plain">{{ record.profile.address.countryCode }}</el-tag>
          </div>
          <p class="history-address">{{ record.profile.address.fullAddress }}</p>
          <div class="history-actions">
            <el-button size="small" @click="restoreHistory(record)">恢复</el-button>
            <el-button size="small" @click="copyText(record.profile.address.fullAddress, '完整地址已复制')">复制地址</el-button>
            <el-button size="small" type="danger" plain @click="deleteHistory(record.id)">删除</el-button>
          </div>
        </article>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowDown,
  Clock,
  Collection,
  CopyDocument,
  Delete,
  Download,
  MagicStick,
  MapLocation,
  RefreshRight
} from '@element-plus/icons-vue'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import type {
  AddressExportFormat,
  AddressHistoryRecord,
  GeneratedAddressProfile
} from '@/types/addressGenerator'
import {
  ADDRESS_COUNTRY_OPTIONS,
  ADDRESS_LOCALE_OPTIONS,
  createDefaultAddressGeneratorSettings,
  findAddressCountry
} from '@/utils/addressGenerator/config'
import { generateAddressProfile } from '@/utils/addressGenerator/generator'
import {
  downloadAddressProfile,
  formatAddressProfile
} from '@/utils/addressGenerator/exporters'
import {
  clearAddressHistoryRecords,
  createAddressHistoryRecord,
  deleteAddressHistoryRecord,
  exportAddressHistoryRecords,
  listAddressHistoryRecords,
  saveAddressHistoryRecord
} from '@/utils/addressGenerator/history'

const settings = reactive(createDefaultAddressGeneratorSettings())
const profile = ref<GeneratedAddressProfile | null>(null)
const activePreviewFormat = ref<AddressExportFormat>('json')
const historyVisible = ref(false)
const historyRecords = ref<AddressHistoryRecord[]>([])
const generating = ref(false)

const countryOptions = ADDRESS_COUNTRY_OPTIONS
const localeOptions = ADDRESS_LOCALE_OPTIONS

const selectedCountryLabel = computed(() => {
  if (settings.countryCode === 'random') {
    return '全球随机'
  }

  const country = findAddressCountry(settings.countryCode)
  return country ? `${country.localName} / ${country.name}` : '未匹配国家'
})

const localeSummary = computed(() => {
  if (settings.localeCode !== 'auto') {
    return settings.localeCode
  }

  if (settings.countryCode === 'random') {
    return 'Locale 自动'
  }

  const country = findAddressCountry(settings.countryCode)
  return country ? `Locale 自动：${country.localeCode}` : 'Locale 自动'
})

const fieldNamingLabel = computed(() => {
  if (settings.fieldNaming === 'snake') {
    return 'snake_case'
  }

  if (settings.fieldNaming === 'chinese') {
    return '中文'
  }

  return 'camelCase'
})

const activePreview = computed(() => {
  return profile.value
    ? formatAddressProfile(profile.value, activePreviewFormat.value, settings.fieldNaming)
    : ''
})

const refreshHistory = () => {
  historyRecords.value = listAddressHistoryRecords()
}

const handleGenerate = async () => {
  generating.value = true
  try {
    profile.value = await generateAddressProfile(settings)
  } catch {
    ElMessage.error('生成失败，请调整国家或 Locale 后重试')
  } finally {
    generating.value = false
  }
}

const resetSettings = () => {
  Object.assign(settings, createDefaultAddressGeneratorSettings())
  void handleGenerate()
}

const clearAll = () => {
  Object.assign(settings, createDefaultAddressGeneratorSettings())
  profile.value = null
  activePreviewFormat.value = 'json'
  ElMessage.success('已清空当前资料和配置')
}

const fallbackCopy = (text: string) => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

const copyText = async (text: string, message = '已复制') => {
  if (!text) {
    ElMessage.warning('没有可复制内容')
    return
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      fallbackCopy(text)
    }
    ElMessage.success(message)
  } catch {
    fallbackCopy(text)
    ElMessage.success(message)
  }
}

const copyPreview = () => {
  copyText(activePreview.value, '当前格式已复制')
}

const handleExport = (format: AddressExportFormat) => {
  if (!profile.value) {
    return
  }

  downloadAddressProfile(profile.value, format, settings.fieldNaming)
}

const saveCurrentProfile = () => {
  if (!profile.value) {
    return
  }

  const record = createAddressHistoryRecord(profile.value)
  saveAddressHistoryRecord(record)
  refreshHistory()
  ElMessage.success('已保存到当前浏览器')
}

const openHistory = () => {
  refreshHistory()
  historyVisible.value = true
}

const restoreHistory = (record: AddressHistoryRecord) => {
  profile.value = record.profile
  settings.countryCode = record.profile.address.countryCode
  settings.localeCode = record.profile.localeCode
  historyVisible.value = false
  ElMessage.success('已恢复保存资料')
}

const deleteHistory = (id: string) => {
  deleteAddressHistoryRecord(id)
  refreshHistory()
  ElMessage.success('已删除本地保存记录')
}

const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确定清空全部本地保存记录吗？此操作只影响当前浏览器。', '清空本地保存', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
    clearAddressHistoryRecords()
    refreshHistory()
    ElMessage.success('已清空本地保存')
  } catch {
    // user canceled
  }
}

const downloadText = (content: string, filename: string, mime = 'application/json') => {
  const blob = new Blob([content], {type: `${mime};charset=utf-8`})
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const downloadHistory = () => {
  if (!historyRecords.value.length) {
    ElMessage.warning('暂无本地保存记录')
    return
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  downloadText(exportAddressHistoryRecords(), `address-generator-history-${timestamp}.json`)
}

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString('zh-CN', {
    hour12: false
  })
}

onMounted(() => {
  refreshHistory()
  void handleGenerate()
})
</script>

<style scoped>
.address-generator-page {
  min-height: 100vh;
  padding: 24px;
  color: #1f2937;
  background: #f5f7fb;
}

.address-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  width: min(1320px, 100%);
  margin: 0 auto 18px;
  padding: 18px 0;
  border-bottom: 1px solid #dce3ee;
}

.topbar-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
}

.topbar-title h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.25;
}

.privacy-copy {
  color: #667085;
  font-size: 13px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.address-workbench {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 18px;
  width: min(1320px, 100%);
  margin: 0 auto;
}

.config-panel,
.profile-panel,
.preview-panel {
  min-width: 0;
  border: 1px solid #dfe6ef;
  border-radius: 8px;
  background: #fff;
}

.config-panel {
  align-self: start;
  padding: 18px;
}

.section-head,
.preview-head,
.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.section-head h2,
.preview-head h2,
.detail-head h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
}

.section-head p,
.preview-head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
}

.config-form :deep(.el-select),
.config-form :deep(.el-input) {
  width: 100%;
}

.privacy-alert {
  margin-top: 8px;
}

.profile-panel {
  padding: 20px;
}

.profile-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid #edf1f7;
}

.profile-main {
  min-width: 0;
}

.profile-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-title-row h2 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  word-break: break-word;
}

.profile-main p {
  margin: 8px 0;
  color: #667085;
  line-height: 1.5;
  word-break: break-word;
}

.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.profile-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.summary-strip > div {
  min-width: 0;
  padding: 12px;
  border: 1px solid #e5ebf3;
  border-radius: 8px;
  background: #f8fafc;
}

.summary-strip span {
  display: block;
  margin-bottom: 4px;
  color: #667085;
  font-size: 12px;
}

.summary-strip strong {
  display: block;
  overflow-wrap: anywhere;
  font-size: 15px;
}

.detail-section + .detail-section {
  margin-top: 18px;
}

.detail-head {
  align-items: center;
  margin-bottom: 10px;
}

.detail-section :deep(.el-descriptions__label) {
  width: 112px;
  color: #4b5563;
}

.detail-section :deep(.el-descriptions__content) {
  word-break: break-word;
}

.preview-panel {
  width: min(1320px, 100%);
  margin: 18px auto 0;
  padding: 18px;
}

.preview-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.preview-code {
  max-height: 360px;
  margin: 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #111827;
  background: #f8fafc;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.history-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.history-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.history-item h3 {
  margin: 0;
  font-size: 16px;
}

.history-item p {
  margin: 6px 0 0;
  color: #667085;
  line-height: 1.5;
}

.history-address {
  overflow-wrap: anywhere;
}

.history-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 980px) {
  .address-topbar {
    flex-direction: column;
  }

  .topbar-actions {
    justify-content: flex-start;
  }

  .address-workbench {
    grid-template-columns: 1fr;
  }

  .profile-hero {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .profile-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .summary-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .address-generator-page {
    padding: 16px;
  }

  .topbar-actions :deep(.el-button),
  .preview-actions :deep(.el-button) {
    min-width: 0;
  }

  .profile-hero {
    grid-template-columns: 1fr;
  }

  .summary-strip {
    grid-template-columns: 1fr;
  }

  .preview-head,
  .section-head {
    flex-direction: column;
  }
}
</style>
