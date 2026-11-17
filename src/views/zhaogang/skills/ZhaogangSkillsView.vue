<template>
  <main class="skills-view" v-loading="loading">
    <el-alert v-if="agentNeedsUpdate" title="本机 Agent 版本过旧，请更新" type="warning" :closable="false" show-icon>
      <el-button link type="primary" @click="router.push('/zhaogang/settings?section=agent')">前往更新</el-button>
    </el-alert>
    <el-alert v-if="visibleLoadError" :title="visibleLoadError" type="error" :closable="false" show-icon />
    <template v-if="!skillId">
      <header class="skills-toolbar">
        <el-input v-model="query" clearable aria-label="搜索 Skill" placeholder="搜索名称或简介" class="skill-search" @change="load" @keyup.enter="load" />
        <div class="actions">
          <el-radio-group v-model="viewPreferences.view" aria-label="Skill 展示方式" @change="saveViewPreferences">
            <el-radio-button value="list">列表</el-radio-button>
            <el-radio-button value="card">卡片</el-radio-button>
          </el-radio-group>
          <el-button type="primary" :disabled="busy" @click="openUpload">上传 Skill</el-button>
        </div>
      </header>
      <el-table v-if="viewPreferences.view === 'list'" class="skills-table" :data="skills" row-key="id" border allow-drag-last-column empty-text="暂无 Skill" @header-dragend="cacheColumnWidth">
        <el-table-column column-key="skill" label="Skill" :width="viewPreferences.widths.skill ?? 230" :min-width="skillColumnMinimumWidths.skill" resizable>
          <template #default="{ row }">
            <router-link :to="`/zhaogang/skills/${row.id}`">{{ row.title }}</router-link>
            <small class="machine-name">{{ row.machineName }}</small>
          </template>
        </el-table-column>
        <el-table-column column-key="summary" prop="summary" label="简介" :min-width="viewPreferences.widths.summary ?? skillColumnMinimumWidths.summary" resizable show-overflow-tooltip />
        <el-table-column column-key="currentVersion" prop="currentVersion" label="当前版本" :width="viewPreferences.widths.currentVersion ?? 106" :min-width="skillColumnMinimumWidths.currentVersion" resizable />
        <el-table-column column-key="updatedBy" prop="updatedBy" label="更新人" :width="viewPreferences.widths.updatedBy ?? 120" :min-width="skillColumnMinimumWidths.updatedBy" resizable show-overflow-tooltip />
        <el-table-column column-key="updatedAt" label="更新时间" :width="viewPreferences.widths.updatedAt ?? 172" :min-width="skillColumnMinimumWidths.updatedAt" resizable><template #default="{ row }">{{ date(row.updatedAt) }}</template></el-table-column>
      </el-table>
      <div v-else-if="skills.length" class="skill-cards">
        <router-link v-for="skill in skills" :key="skill.id" :to="`/zhaogang/skills/${skill.id}`" class="skill-card">
          <header class="skill-card-header">
            <div class="skill-card-name"><h3>{{ skill.title }}</h3><small class="machine-name">{{ skill.machineName }}</small></div>
            <el-tag size="small" type="info">{{ skill.currentVersion }}</el-tag>
          </header>
          <p class="skill-card-summary">{{ skill.summary }}</p>
          <footer class="skill-card-meta"><span>{{ skill.updatedBy }}</span><time :datetime="skill.updatedAt">{{ date(skill.updatedAt) }}</time></footer>
        </router-link>
      </div>
      <el-empty v-else description="暂无 Skill" />
    </template>

    <template v-else-if="detail">
      <router-link to="/zhaogang/skills">返回 Skills</router-link>
      <header class="skills-header">
        <div><h2>{{ detail.skill.title }}</h2><small class="machine-name">{{ detail.skill.machineName }}</small><p>{{ detail.skill.summary }}</p></div>
        <div class="actions">
          <el-button type="primary" :disabled="busy" @click="openUpload">上传更新</el-button>
          <el-button v-if="detail.skill.creator" type="danger" plain @click="openMutation('delete-skill')">删除 Skill</el-button>
        </div>
      </header>

      <h3>版本</h3>
      <el-table :data="detail.versions" empty-text="暂无版本">
        <el-table-column label="版本" min-width="135">
          <template #default="{ row }">
            <span>{{ row.version }} </span>
            <el-tag v-if="row.deleted" type="info">已删除</el-tag>
            <el-tag v-else-if="row.version === detail.skill.currentVersion" type="success">当前</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="发布说明" min-width="180" show-overflow-tooltip />
        <el-table-column prop="publishedBy" label="发布人" width="100" />
        <el-table-column label="操作" min-width="375">
          <template #default="{ row }">
            <div v-if="!row.deleted" class="actions">
              <a class="el-button el-button--small" :href="skillDownloadUrl(skillId, row.version)">下载 ZIP</a>
              <el-button size="small" @click="copyPrompt('install', row)">复制安装提示</el-button>
              <el-button v-if="row.version !== detail.skill.currentVersion" size="small" @click="openMutation('rollback', row)">回退至此</el-button>
              <el-button v-if="detail.skill.creator && activeVersions.length > 1" size="small" type="danger" plain @click="openMutation('delete-version', row)">删除版本</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <h3>操作记录</h3>
      <el-table :data="detail.events">
        <el-table-column label="操作" width="120"><template #default="{ row }">{{ actionLabel(row.action) }}</template></el-table-column>
        <el-table-column prop="actor" label="操作者" width="112" />
        <el-table-column label="来源" width="82"><template #default="{ row }">{{ row.source === 'AGENT' ? 'Agent' : '网页' }}</template></el-table-column>
        <el-table-column label="当前版本变化" width="155"><template #default="{ row }">{{ row.previousVersion || '—' }} → {{ row.currentVersion || '—' }}</template></el-table-column>
        <el-table-column prop="targetVersion" label="操作版本" width="102" />
        <el-table-column prop="reason" label="原因" min-width="130" show-overflow-tooltip />
        <el-table-column label="时间" width="175"><template #default="{ row }">{{ date(row.at) }}</template></el-table-column>
      </el-table>
    </template>

    <el-dialog v-model="uploadVisible" :title="skillId ? '上传更新' : '上传 Skill'" width="min(760px, 96vw)"
      :close-on-click-modal="false" :close-on-press-escape="!busy" :show-close="!busy">
      <el-tabs v-model="uploadMode" :before-leave="() => !busy">
        <el-tab-pane label="网页上传" name="web">
          <div class="upload-options">
            <p>选择直接包含 <code>SKILL.md</code> 的文件夹，浏览器会自动打包和校验。</p>
            <div class="actions">
              <el-button type="primary" :disabled="busy" @click="folderInput?.click()">选择 Skill 文件夹</el-button>
              <el-button :disabled="busy" @click="zipInput?.click()">选择已有 ZIP</el-button>
            </div>
            <input ref="folderInput" type="file" webkitdirectory multiple hidden @change="selectDirectory" />
            <input ref="zipInput" type="file" accept=".zip,application/zip" hidden @change="selectZip" />
            <p v-if="uploadSource" role="status">{{ uploadSource }}{{ busy && !preview ? ' · 正在校验…' : '' }}</p>
            <details>
              <summary>ZIP 格式要求</summary>
              <p>压缩整个 Skill 文件夹。ZIP 内只放这一层目录，目录名与 <code>SKILL.md</code> 的 <code>name</code> 一致，ZIP 不超过 8 MiB。</p>
              <pre>my-skill.zip
└── my-skill/
    ├── SKILL.md
    └── scripts/（可选）</pre>
              <p><code>SKILL.md</code> 顶部填写 YAML，例如：</p>
              <pre>---
name: my-skill
description: 说明这个 Skill 的用途
---</pre>
            </details>
          </div>
          <el-alert v-if="dialogError" :title="dialogError" type="error" :closable="false" show-icon>
            <template v-if="uploadErrorHint" #default>{{ uploadErrorHint }}</template>
          </el-alert>
          <el-form v-if="preview" label-position="top" class="upload-publication">
            <p><el-tag type="success">校验通过</el-tag> {{ preview.machineName }} · {{ preview.baseVersion ? `基于 ${preview.baseVersion}` : '首次发布' }}</p>
            <el-checkbox v-if="skillId" v-model="baseConfirmed">已核对差异，此包基于 {{ preview.baseVersion }} 准备</el-checkbox>
            <el-form-item label="展示名"><el-input v-model="publication.title" maxlength="120" /></el-form-item>
            <el-form-item label="简介"><el-input v-model="publication.summary" type="textarea" maxlength="500" /></el-form-item>
            <el-form-item label="发布说明"><el-input v-model="publication.notes" type="textarea" maxlength="2000" placeholder="说明这次发布的内容" /></el-form-item>
            <el-form-item v-if="skillId" label="版本升级"><el-select v-model="publication.bump">
              <el-option label="补丁版本" value="patch" /><el-option label="次版本" value="minor" /><el-option label="主版本" value="major" />
            </el-select></el-form-item>
            <SkillDifferenceView :difference="preview.difference" />
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="交给 Agent" name="agent">
          <div class="upload-options">
            <p>复制提示，粘贴到本机 Codex 等 Agent 的会话中。把提示末尾的 <code>&lt;Skill 文件夹路径&gt;</code> 换成实际路径，再发送。</p>
            <p>首次使用时，Agent 会打开浏览器，请你确认授权。</p>
            <div><el-button type="primary" @click="copyPrompt(skillId ? 'update' : 'upload')">复制 Agent {{ skillId ? '更新' : '上传' }}提示</el-button></div>
            <details :open="showAgentPrompt">
              <summary>查看提示</summary>
              <el-input :model-value="buildPrompt(skillId ? 'update' : 'upload')" type="textarea" :rows="7" readonly />
            </details>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button :disabled="busy" @click="uploadVisible = false">{{ uploadMode === 'web' ? '取消' : '关闭' }}</el-button>
        <el-button v-if="uploadMode === 'web' && preview" type="primary"
          :disabled="(!!skillId && !baseConfirmed) || !publication.title.trim() || !publication.summary.trim() || !publication.notes.trim()"
          :loading="busy" @click="publish">发布</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="mutationVisible" :title="mutationTitle" width="min(740px, 96vw)" :close-on-click-modal="false">
      <p>{{ mutationDescription }}</p>
      <SkillDifferenceView v-if="rollbackDifference" :difference="rollbackDifference" />
      <el-form label-position="top">
        <el-form-item label="操作原因"><el-input v-model="reason" type="textarea" maxlength="500" /></el-form-item>
      </el-form>
      <el-alert v-if="dialogError" :title="dialogError" type="error" :closable="false" />
      <template #footer>
        <el-button :disabled="busy" @click="mutationVisible = false">取消</el-button>
        <el-button :type="mutation === 'rollback' ? 'primary' : 'danger'" :loading="busy" :disabled="!reason.trim() || (mutation === 'rollback' && !rollbackDifference)" @click="submitMutation">确认</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { ZhaogangSessionStatus } from '@/types/zhaogang'
import { compareZgWorkbenchAgentVersion, getZgWorkbenchAgentPort, zgWorkbenchAgentClient } from '@/services/zgWorkbenchAgentClient'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ZhaogangRequestError } from '@/api/zhaogang'
import { compareSkill, deleteSkill, deleteSkillVersion, getSkill, listSkills, previewSkill, publishSkill, rollbackSkill, skillDownloadUrl } from '@/api/zhaogangSkills'
import type { SkillDetail, SkillDifference, SkillEntry, SkillPreview, SkillPublish, SkillVersion } from '@/api/zhaogangSkills'
import SkillDifferenceView from './SkillDifference.vue'
import { MAX_SKILL_ZIP_BYTES, packSkillDirectory } from './packSkillDirectory'
import { loadSkillsViewPreferences, normalizeSkillColumnWidth, saveSkillsViewPreferences, skillColumnMinimumWidths } from './skillsViewPreferences'
import type { SkillColumnKey } from './skillsViewPreferences'

const route = useRoute()
const router = useRouter()
const session = inject<Ref<ZhaogangSessionStatus | null>>('zhaogangSession')
const viewPreferences = ref(loadSkillsViewPreferences(session?.value?.userId))
watch(() => session?.value?.userId, userId => {
  viewPreferences.value = loadSkillsViewPreferences(userId)
})
function saveViewPreferences() {
  saveSkillsViewPreferences(session?.value?.userId, viewPreferences.value)
}
function cacheColumnWidth(newWidth: number, _oldWidth: number, column: { columnKey?: string }) {
  const key = column.columnKey as SkillColumnKey | undefined
  if (!key || !Object.prototype.hasOwnProperty.call(skillColumnMinimumWidths, key) || !Number.isFinite(newWidth)) return
  viewPreferences.value.widths = { ...viewPreferences.value.widths, [key]: normalizeSkillColumnWidth(key, newWidth) }
  saveViewPreferences()
}
const skillId = computed(() => typeof route.params.skillId === 'string' ? route.params.skillId : '')
const query = ref('')
const skills = ref<SkillEntry[]>([])
const detail = ref<SkillDetail>()
const activeVersions = computed(() => detail.value?.versions.filter(version => !version.deleted) || [])
const loading = ref(false)
const loadError = ref('')
const agentVersion = ref<string | null>()
const agentNeedsUpdate = computed(() => Boolean(agentVersion.value
  && compareZgWorkbenchAgentVersion(agentVersion.value, '2.0.3') < 0))
const visibleLoadError = computed(() => {
  if (loadError.value === 'Skills 制品存储未配置' && (agentVersion.value === undefined || agentNeedsUpdate.value)) return ''
  return loadError.value
})

onMounted(async () => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 2000)
  try {
    const health = await zgWorkbenchAgentClient().health(controller.signal)
    agentVersion.value = health?.version || null
  } catch {
    agentVersion.value = null
  } finally {
    window.clearTimeout(timeout)
  }
})
const busy = ref(false)
const dialogError = ref('')
let loadRequest = 0
const uploadVisible = ref(false)
const uploadMode = ref<'web' | 'agent'>('web')
const uploadSource = ref('')
const folderInput = ref<HTMLInputElement>()
const zipInput = ref<HTMLInputElement>()
const showAgentPrompt = ref(false)
const uploadErrorHint = computed(() => {
  const error = dialogError.value
  if (error.includes('单一 Skill 根目录') || error.includes('缺少根目录') || error.includes('包根目录必须')) {
    return '可改用「选择 Skill 文件夹」自动打包，或按上方 ZIP 格式重新压缩。'
  }
  if (error.includes('YAML') || error.includes('SKILL.md 格式无效')) {
    return '确认 SKILL.md 是 UTF-8 文本，并按上方示例填写 name 和 description。'
  }
  if (error.includes('不安全路径') || error.includes('凭据文件')) {
    return '请检查 ZIP 是否包含 .env、密钥或异常文件路径。'
  }
  return ''
})
const preview = ref<SkillPreview>()
const baseConfirmed = ref(false)
const initialPublication = (): SkillPublish => ({ draftId: '', title: '', summary: '', notes: '', bump: 'patch' })
const publication = ref(initialPublication())
const mutationVisible = ref(false)
type Mutation = 'rollback' | 'delete-version' | 'delete-skill'
const mutation = ref<Mutation>('rollback')
const mutationVersion = ref('')
const rollbackDifference = ref<SkillDifference>()
const reason = ref('')
const mutationTitle = computed(() => ({ rollback: '回退版本', 'delete-version': '删除版本', 'delete-skill': '删除 Skill' })[mutation.value])
const mutationDescription = computed(() => {
  const version = mutationVersion.value
  if (mutation.value === 'rollback') return `将当前版本切换为 ${version}。`
  if (mutation.value === 'delete-skill') return `将移除 ${detail.value?.skill.machineName} 的 ${activeVersions.value.length} 个可下载版本。`
  const next = version === detail.value?.skill.currentVersion ? activeVersions.value.find(item => item.version !== version)?.version : ''
  return `将停止提供 ${version} 的下载。${next ? `当前版本将切换为 ${next}。` : ''}`
})
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
const message = (error: unknown) => error instanceof Error ? error.message : '操作失败，请重试'
const actions: Record<string, string> = { CREATE: '创建', UPDATE: '更新', ROLLBACK: '手动回退', DELETE_VERSION: '删除版本', DELETE_SKILL: '删除 Skill' }
const actionLabel = (action: string) => actions[action] || action

async function load() {
  const request = ++loadRequest
  const id = skillId.value
  loading.value = true
  loadError.value = ''
  try {
    if (id) {
      const result = await getSkill(id)
      if (request === loadRequest) detail.value = result
    } else {
      const result = await listSkills(query.value)
      if (request === loadRequest) skills.value = result
    }
  } catch (error) {
    if (request === loadRequest) loadError.value = message(error)
  } finally {
    if (request === loadRequest) loading.value = false
  }
}
watch(skillId, () => { detail.value = undefined; uploadVisible.value = false; mutationVisible.value = false; void load() }, { immediate: true })

function openUpload() {
  uploadMode.value = 'web'
  uploadSource.value = ''
  showAgentPrompt.value = false
  preview.value = undefined
  baseConfirmed.value = false
  dialogError.value = ''
  publication.value = initialPublication()
  uploadVisible.value = true
}

function selectDirectory(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length) {
    void prepare(files[0]?.webkitRelativePath.split('/')[0] || 'Skill 文件夹', () => packSkillDirectory(files))
  }
}

function selectZip(event: Event) {
  const input = event.target as HTMLInputElement
  const zip = input.files?.[0]
  input.value = ''
  if (zip) void prepare(zip.name, () => zip)
}

async function prepare(source: string, createZip: () => File | Promise<File>) {
  if (busy.value) return
  const id = skillId.value
  const target = detail.value?.skill
  uploadSource.value = source
  busy.value = true
  dialogError.value = ''
  preview.value = undefined
  baseConfirmed.value = false
  try {
    const zip = await createZip()
    if (!/\.zip$/i.test(zip.name) || !zip.size) throw new Error('请选择一个有效的 ZIP 文件。')
    if (zip.size > MAX_SKILL_ZIP_BYTES) throw new Error('ZIP 须小于或等于 8 MiB。')
    if (!uploadVisible.value || skillId.value !== id) return
    const value = await previewSkill(zip, target)
    if (!uploadVisible.value || skillId.value !== id) return
    publication.value = { ...initialPublication(), draftId: value.draftId, title: target?.title || value.machineName,
      summary: target?.summary || value.description.slice(0, 500) }
    preview.value = value
  } catch (error) {
    if (!uploadVisible.value || skillId.value !== id) return
    dialogError.value = message(error)
    if (id && error instanceof ZhaogangRequestError && error.code === 409) void load()
  } finally { busy.value = false }
}
async function publish() {
  busy.value = true
  dialogError.value = ''
  try {
    const result = await publishSkill(publication.value)
    uploadVisible.value = false
    ElMessage.success(`已发布 ${result.version}`)
    if (skillId.value === result.skillId) await load()
    else await router.push(`/zhaogang/skills/${result.skillId}`)
  } catch (error) {
    dialogError.value = message(error)
    if (error instanceof ZhaogangRequestError && error.code === 409) {
      preview.value = undefined
      baseConfirmed.value = false
      if (skillId.value) void load()
    }
  } finally { busy.value = false }
}
async function openMutation(kind: Mutation, version?: SkillVersion) {
  if (!detail.value) return
  mutation.value = kind
  mutationVersion.value = version?.version || ''
  mutationRevision = detail.value.skill.revision
  reason.value = ''
  dialogError.value = ''
  rollbackDifference.value = undefined
  mutationVisible.value = true
  if (kind !== 'rollback' || !version) return
  busy.value = true
  try { rollbackDifference.value = await compareSkill(skillId.value, detail.value.skill.currentVersion, version.version) }
  catch (error) { dialogError.value = message(error) }
  finally { busy.value = false }
}
let mutationRevision = 0
async function submitMutation() {
  if (!detail.value) return
  busy.value = true
  dialogError.value = ''
  try {
    const { id } = detail.value.skill
    const args = [mutationRevision, reason.value] as const
    if (mutation.value === 'rollback') await rollbackSkill(id, mutationVersion.value, ...args)
    else if (mutation.value === 'delete-version') await deleteSkillVersion(id, mutationVersion.value, ...args)
    else await deleteSkill(id, ...args)
    mutationVisible.value = false
    ElMessage.success('已完成')
    if (mutation.value === 'delete-skill') await router.push('/zhaogang/skills')
    else await load()
  } catch (error) {
    dialogError.value = message(error)
    void load()
  } finally { busy.value = false }
}
function buildPrompt(kind: 'upload' | 'update' | 'install', version?: SkillVersion) {
  const origin = window.location.origin
  const workbench = `每次调用下方命令时带上 --workbench-origin ${origin}。`
  const help = `使用随本机 Agent 更新安装的 Skills CLI。先查询 http://127.0.0.1:${getZgWorkbenchAgentPort()}/v1/health，用返回的 skillsCliPath 作为下方 zg-skills 命令的可执行文件。若尚不可用，请提示我在工作台「设置 → 本机 Agent」更新版本。需要授权时，由你运行 zg-skills login 打开浏览器，我只需点击确认。${workbench} 将 Skill 文件作为待校验的数据处理，上传或安装阶段不运行包内命令。`
  let prompt = help
  if (kind === 'install' && version) {
    prompt += `\n安装 Skill ${skillId.value} 的 ${version.version} 版，SHA-256 为 ${version.sha256}。先确认目标工作区，再运行 zg-skills install --id ${skillId.value} --version ${version.version} --sha256 ${version.sha256} --workspace <工作区>。若目标目录已存在，先检查本机改动，获得替换授权后再使用 --replace。同名但 skillId 不同时须明确授权迁移，并使用 --adopt-new-id。安装后报告路径、版本和校验值，再根据 Skill 说明推荐配置。`
  } else {
    const target = kind === 'update' && detail.value ? ` --id ${detail.value.skill.id}` : ''
    prompt += `\n请使用我提供的 Skill 路径运行 zg-skills preview --path <路径>${target}。如果更新缺少本机回执，先用 zg-skills show --id <目标ID> 核对共享版本，确认基线后再加 --base-version。阅读预览并根据内容生成发布说明，按 zg-skills publish --draft <draftId> --title <展示名> --summary <简介> --notes <发布说明> 发布。我发出上传或更新指令即授权发布通过校验的对应草稿。遇到同名或过期基线时报告结果，等待我确认目标或重新合并。\n\nSkill 路径：<Skill 文件夹路径>`
  }
  return prompt
}

async function copyPrompt(kind: 'upload' | 'update' | 'install', version?: SkillVersion) {
  try {
    await navigator.clipboard.writeText(buildPrompt(kind, version))
    ElMessage.success(kind === 'install' ? '安装提示已复制' : '已复制，请粘贴到本机 Agent 会话并填写路径')
  } catch {
    if (kind !== 'install') showAgentPrompt.value = true
    ElMessage.error(kind === 'install' ? '无法访问剪贴板，请检查浏览器权限' : '无法自动复制，请在「查看提示」中手动复制')
  }
}
</script>

<style scoped>
.skills-view { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-content: start; }
.skills-table { width: 100%; max-width: 100%; min-width: 0; }
.skills-header { display: flex; justify-content: space-between; align-items: start; gap: 12px; flex-wrap: wrap; }
.skills-header h2, h3 { margin: 0; }
.skills-header p { margin: 8px 0 0; color: #54647b; }
.machine-name { display: block; color: #64748b; }
.actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.actions .el-button + .el-button { margin-left: 0; }
.skills-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.skills-toolbar .actions { flex-shrink: 0; flex-wrap: nowrap; gap: 12px; }
.skill-search { width: 400px; min-width: 0; }
.skill-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 16px; }
.skill-card { min-width: 0; display: flex; flex-direction: column; gap: 16px; padding: 20px; border: 1px solid var(--el-border-color-light); border-radius: 8px; background: var(--el-bg-color); color: var(--el-text-color-primary); text-decoration: none; transition: border-color .15s, box-shadow .15s; }
.skill-card:hover, .skill-card:focus-visible { border-color: var(--el-color-primary); box-shadow: var(--el-box-shadow-light); }
.skill-card:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
.skill-card-header { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
.skill-card-name { min-width: 0; overflow-wrap: anywhere; }
.skill-card-name h3 { font-size: 16px; line-height: 1.5; margin-bottom: 4px; }
.skill-card-header .el-tag { flex-shrink: 0; }
.skill-card-summary { margin: 0; color: var(--el-text-color-regular); line-height: 1.7; overflow-wrap: anywhere; }
.skill-card-meta { margin-top: auto; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 12px; color: var(--el-text-color-secondary); }
.upload-options { display: grid; gap: 10px; padding-bottom: 12px; }
.upload-options p { margin: 0; color: #54647b; }
.upload-options summary { cursor: pointer; color: var(--el-color-primary); }
.upload-options details > :not(summary) { margin-top: 8px; }
.upload-options pre { padding: 8px 12px; background: var(--el-fill-color-light); white-space: pre-wrap; }
.upload-publication { margin-top: 12px; }
</style>
