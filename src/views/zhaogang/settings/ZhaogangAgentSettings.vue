<template>
  <div class="agent-settings-sections">
    <section v-if="props.activeSection === 'agent'" id="agent" class="settings-section">
      <header class="settings-heading">
        <div>
          <h3>本机 Agent</h3>
          <p>统一管理 K8s、AI 视觉、自更新和开机自启能力。</p>
        </div>
        <el-tag :type="agentState?.compatible ? 'success' : 'warning'" effect="light">
          {{ agentState?.compatible ? '可用' : '需处理' }}
        </el-tag>
      </header>
      <dl class="connection-details">
        <div><dt>状态</dt><dd>{{ agentState?.message || (agentState?.running ? '运行中' : '未运行') }}</dd></div>
        <div><dt>当前版本</dt><dd>{{ agentState?.health?.version ? `v${agentState.health.version}` : '未检测到' }}</dd></div>
        <div><dt>最新版本</dt><dd>{{ latestAgentVersionText }}</dd></div>
        <div><dt>能力</dt><dd>{{ agentCapabilities }}</dd></div>
        <div>
          <dt>端口</dt>
          <dd><el-input-number v-model="agentPort" :min="1" :max="65535" controls-position="right" @change="saveAgentPort" /></dd>
        </div>
      </dl>
      <div class="settings-actions">
        <el-button type="primary" :icon="Refresh" :loading="agentLoading" @click="refreshAgent">刷新状态</el-button>
        <el-button :icon="Promotion" @click="startAgent">启动</el-button>
        <el-button :icon="Reading" @click="openAgentGuide">安装与卸载教程</el-button>
        <el-button
          :icon="Upload"
          :loading="agentUpdating"
          :disabled="!agentUpdateAvailable"
          @click="updateAgent"
        >
          {{ updateInfo?.updateAvailable ? '更新到最新版' : '已是最新版' }}
        </el-button>
        <el-button :icon="Setting" :disabled="!agentState?.compatible" @click="toggleAutostart">
          {{ agentState?.health?.autostartEnabled ? '关闭开机自启' : '开启开机自启' }}
        </el-button>
      </div>
      <p v-if="updateCheckError" class="settings-hint settings-hint--error">版本检查失败：{{ updateCheckError }}</p>
    </section>

    <section v-if="props.activeSection === 'agent-k8s'" id="agent-k8s" class="settings-section">
      <header class="settings-heading">
        <div>
          <h3>K8s Dashboard Token</h3>
          <p>Token 按当前工作台账号和环境保存。新增或更换前会先通过本机 Agent 验证。</p>
        </div>
        <el-tag :type="configuredCount ? 'success' : 'info'" effect="light">已配置 {{ configuredCount }}/3</el-tag>
      </header>
      <div class="k8s-token-list">
        <div class="k8s-token-row k8s-token-row--header" aria-hidden="true">
          <span>环境</span>
          <span>配置状态</span>
          <span>操作</span>
        </div>
        <div
          v-for="item in environments"
          :key="item.value"
          class="k8s-token-row"
          :class="{ 'is-target': targetEnvironment === item.value }"
        >
          <strong>{{ item.label }}</strong>
          <el-tag :type="k8sConfigured[item.value] ? 'success' : 'info'" size="small" effect="light">
            {{ k8sConfigured[item.value] ? '已配置' : '未配置' }}
          </el-tag>
          <div class="k8s-token-actions">
            <el-button
              v-if="k8sConfigured[item.value]"
              link
              type="primary"
              :loading="k8sTesting[item.value]"
              :disabled="!agentState?.compatible"
              @click="testK8s(item.value)"
            >测试连接</el-button>
            <el-button
              link
              type="primary"
              @click="openK8sDialog(item.value)"
            >{{ k8sConfigured[item.value] ? '更换' : '配置' }}</el-button>
            <el-button
              v-if="k8sConfigured[item.value]"
              link
              type="danger"
              @click="deleteK8s(item.value)"
            >删除</el-button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="props.activeSection === 'agent-auth'" id="agent-auth" class="settings-section">
      <header class="settings-heading">
        <div>
          <h3>Agent 授权</h3>
          <p>供胖猫云 Skill 触发工作台构建。令牌永久有效，仅展示一次完整值，服务端只保存哈希。</p>
        </div>
        <el-tag :type="agentTokenStatus?.configured ? 'success' : 'info'" effect="light">
          {{ agentTokenStatus?.configured ? '已授权' : '未授权' }}
        </el-tag>
      </header>
      <dl class="connection-details agent-token-details">
        <div>
          <dt>当前令牌</dt>
          <dd><code>{{ agentTokenStatus?.configured ? agentTokenStatus.tokenHint : '尚未生成' }}</code></dd>
        </div>
        <div><dt>生成时间</dt><dd>{{ agentTokenStatus?.createdAt ? formatAgentTokenTime(agentTokenStatus.createdAt) : '—' }}</dd></div>
        <div><dt>最近使用</dt><dd>{{ agentTokenStatus?.lastUsedAt ? formatAgentTokenTime(agentTokenStatus.lastUsedAt) : '从未使用' }}</dd></div>
      </dl>
      <el-alert
        v-if="newAgentToken"
        type="warning"
        :closable="false"
        show-icon
        title="请立即复制并保存到胖猫云 Skill"
      >
        <template #default>
          <p class="new-agent-token-hint">完整令牌离开本页面后无法再次查看；重新生成会使旧令牌立即失效。</p>
          <div class="new-agent-token-row">
            <code>{{ newAgentToken }}</code>
            <el-button :icon="DocumentCopy" :loading="copyingAgentToken" @click="copyNewAgentToken">复制令牌</el-button>
          </div>
        </template>
      </el-alert>
      <div class="settings-actions">
        <el-button
          type="primary"
          :loading="agentTokenSaving"
          :disabled="agentTokenLoading"
          @click="createAgentToken"
        >{{ agentTokenStatus?.configured ? '重新生成' : '生成令牌' }}</el-button>
        <el-button
          :icon="DocumentCopy"
          :disabled="!newAgentToken"
          :loading="copyingAgentToken"
          @click="copyNewAgentToken"
        >复制当前令牌</el-button>
        <el-button
          v-if="agentTokenStatus?.configured"
          type="danger"
          plain
          :loading="agentTokenDeleting"
          @click="deleteAgentToken"
        >删除令牌</el-button>
      </div>
      <p class="settings-hint">Skill 请求地址：<code>https://api.itwray.com/external-service/api/zhaogang/agent-api</code></p>

      <section class="skill-package-section">
        <header class="skill-package-heading">
          <div>
            <h4>胖猫云工作台构建 Skill</h4>
            <p>下载后解压到工作区，或复制安装提示词交给 Agent 完成校验和安装。</p>
          </div>
          <el-button
            type="primary"
            :icon="Download"
            :disabled="!skillPackage.available"
            @click="downloadSkillPackage"
          >下载 Skill 安装包</el-button>
        </header>
        <dl class="connection-details skill-package-details">
          <div><dt>版本</dt><dd>{{ skillPackage.version }}</dd></div>
          <div><dt>文件名</dt><dd><code>{{ skillPackage.fileName }}</code></dd></div>
          <div><dt>SHA-256</dt><dd><code>{{ skillPackage.checksum }}</code></dd></div>
          <div><dt>安装目录</dt><dd><code>&lt;工作区&gt;/.agents/skills/pangmaoyun-workbench-build</code></dd></div>
        </dl>
        <el-alert
          v-if="!skillPackage.available"
          type="info"
          :closable="false"
          show-icon
          :title="skillPackage.unavailableReason"
        />
        <el-alert
          v-else
          type="success"
          :closable="false"
          show-icon
          title="压缩包根目录固定为 pangmaoyun-workbench-build/，不包含 Agent 令牌或本地状态。"
        />
        <div class="skill-install-steps">
          <h5>手工安装</h5>
          <ol>
            <li>下载并校验 ZIP 的 SHA-256。</li>
            <li>将压缩包根目录下的 <code>pangmaoyun-workbench-build/</code> 解压到目标工作区的 <code>.agents/skills/</code>。</li>
            <li>目标目录已存在时先停止；确认升级后再备份并替换，不能静默覆盖。</li>
            <li>安装后运行 Skill 测试，再按页面提示绑定 Agent 令牌，不把令牌写入压缩包或 Git。</li>
          </ol>
        </div>
        <div class="skill-prompt-row">
          <el-button
            :icon="DocumentCopy"
            :loading="copyingSkillPrompt"
            :disabled="!skillPackage.available"
            @click="copySkillInstallPrompt"
          >复制 Agent 安装提示词</el-button>
          <span>提示词会要求 Agent 先校验 SHA-256、检查根目录，并在目标已存在时停止。</span>
        </div>
      </section>
    </section>

    <section v-if="props.activeSection === 'ai'" id="ai" class="settings-section">
      <header class="settings-heading">
        <div>
          <h3>AI Agent 配置</h3>
        </div>
        <el-tag :type="aiConfig.configured ? 'success' : 'info'" effect="light">
          {{ aiConfig.configured ? '已配置' : '未配置' }}
        </el-tag>
      </header>
      <el-form label-position="top" class="preferences-form">
        <el-form-item label="API URL"><el-input v-model="aiForm.apiUrl" placeholder="https://host" /></el-form-item>
        <el-form-item label="API Key">
          <el-input
            v-model="aiForm.apiKey"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="aiConfig.apiKeyMasked || '请输入 API Key'"
          />
        </el-form-item>
        <el-form-item label="模型名称"><el-input v-model="aiForm.model" placeholder="gpt-5.6-terra" /></el-form-item>
        <el-form-item>
          <template #label>
            <span class="form-label-with-help">
              执行位置
              <el-tooltip placement="top" :show-after="200">
                <template #content>
                  <div class="execution-location-help">
                    <div><strong>AUTO</strong>：优先由服务器调用，仅网络不可达时尝试本机 Agent。</div>
                    <div><strong>SERVER</strong>：始终由工作台服务器访问 AI 服务。</div>
                    <div><strong>LOCAL_AGENT</strong>：通过本机 Agent 从当前电脑访问 AI，适合仅内网可达的服务。</div>
                  </div>
                </template>
                <el-icon class="label-help-icon" aria-label="查看执行位置说明" tabindex="0"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-radio-group v-model="aiForm.executionLocation">
            <el-radio-button value="AUTO">AUTO</el-radio-button>
            <el-radio-button value="SERVER">SERVER</el-radio-button>
            <el-radio-button value="LOCAL_AGENT">LOCAL_AGENT</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div class="settings-actions">
        <el-button :loading="aiTesting" @click="testAi">测试连接</el-button>
        <el-button type="primary" :loading="aiSaving" @click="saveAi">保存</el-button>
        <el-button type="danger" plain :loading="aiClearing" @click="clearAi">清除配置</el-button>
      </div>
    </section>

    <el-dialog
      v-model="k8sDialogVisible"
      :title="`${k8sConfigured[k8sDialogEnvironment] ? '更换' : '配置'} K8s Dashboard Token`"
      width="min(500px, calc(100% - 32px))"
      :close-on-click-modal="false"
      @closed="resetK8sDialog"
    >
      <el-form label-position="top">
        <el-form-item label="环境">
          <el-input :model-value="environmentLabel(k8sDialogEnvironment)" disabled />
        </el-form-item>
        <el-form-item label="Dashboard Token">
          <el-input
            v-model="k8sTokens[k8sDialogEnvironment]"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="粘贴 K8s Dashboard Token"
            @keyup.enter="saveK8s(k8sDialogEnvironment)"
          />
        </el-form-item>
      </el-form>
      <el-alert
        v-if="!agentState?.compatible"
        type="warning"
        :closable="false"
        show-icon
        title="本机 Agent 未就绪，需先完成安装、启动或更新后才能验证 Token。"
      />
      <template #footer>
        <el-button @click="k8sDialogVisible = false">取消</el-button>
        <el-button
          :loading="k8sTesting[k8sDialogEnvironment]"
          :disabled="!agentState?.compatible || !k8sTokens[k8sDialogEnvironment].trim()"
          @click="testK8s(k8sDialogEnvironment, true)"
        >测试连接</el-button>
        <el-button
          type="primary"
          :loading="k8sSaving[k8sDialogEnvironment]"
          :disabled="!agentState?.compatible || !k8sTokens[k8sDialogEnvironment].trim()"
          @click="saveK8s(k8sDialogEnvironment)"
        >{{ k8sConfigured[k8sDialogEnvironment] ? '验证并更换' : '验证并保存' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DocumentCopy, Download, Promotion, QuestionFilled, Reading, Refresh, Setting, Upload } from '@element-plus/icons-vue'
import {
  ZhaogangRequestError,
  clearZhaogangAiConfig,
  createZhaogangAgentToken,
  deleteZhaogangAgentToken,
  deleteZhaogangK8sToken,
  getZhaogangAgentToken,
  getZhaogangAiConfig,
  getZhaogangK8sToken,
  getZhaogangK8sTokenStatus,
  issueZhaogangAiTestTicket,
  saveZhaogangAiConfig,
  saveZhaogangK8sToken,
  testZhaogangAiConfig
} from '@/api/zhaogang'
import {
  checkZgWorkbenchAgent,
  getZgWorkbenchAgentPort,
  saveZgWorkbenchAgentPort,
  startZgWorkbenchAgentProtocol,
  zgWorkbenchAgentClient,
  type ZgWorkbenchAgentUpdateInfo
} from '@/services/zgWorkbenchAgentClient'
import { canStartZgWorkbenchAgentUpdate, shouldCheckZgWorkbenchAgentUpdate } from '@/services/zgWorkbenchAgentUpdate'
import { createZhaogangAiConnectionTestImage, runZhaogangAiConnectionTest } from '@/services/zhaogangAiConnectionTest'
import type { ZhaogangAiExecutionLocation } from '@/types/zhaogangAi'
import type { ZgK8sEnvironment } from '@/types/zhaogangService'
import type { ZhaogangAgentTokenStatus } from '@/types/zhaogang'

type ActiveSection = 'agent' | 'agent-k8s' | 'agent-auth' | 'ai' | null
type SummaryTagType = 'success' | 'warning' | 'info'
type AgentSettingsSummary = {
  agent: string
  agentType: SummaryTagType
  agentAuth: string
  agentAuthType: SummaryTagType
  k8s: string
  k8sType: SummaryTagType
  ai: string
  aiType: SummaryTagType
}

const props = defineProps<{ activeSection: ActiveSection }>()
const emit = defineEmits<{ 'summary-change': [summary: AgentSettingsSummary] }>()

const route = useRoute()
const router = useRouter()
const environments: Array<{ value: ZgK8sEnvironment; label: string }> = [
  { value: 'test', label: '测试 TEST' },
  { value: 'uat', label: '预发 UAT' },
  { value: 'prd', label: '生产 PRD' }
]
const emptyEnvironmentFlags = (): Record<ZgK8sEnvironment, boolean> => ({ test: false, uat: false, prd: false })
const emptyEnvironmentTokens = (): Record<ZgK8sEnvironment, string> => ({ test: '', uat: '', prd: '' })

const agentState = ref<Awaited<ReturnType<typeof checkZgWorkbenchAgent>> | null>(null)
const updateInfo = ref<ZgWorkbenchAgentUpdateInfo | null>(null)
const agentPort = ref(getZgWorkbenchAgentPort())
const agentLoading = ref(false)
const agentUpdating = ref(false)
const agentTokenStatus = ref<ZhaogangAgentTokenStatus | null>(null)
const newAgentToken = ref('')
const agentTokenLoading = ref(false)
const agentTokenSaving = ref(false)
const agentTokenDeleting = ref(false)
const copyingAgentToken = ref(false)
const copyingSkillPrompt = ref(false)
const updateCheckError = ref('')
const k8sConfigured = ref(emptyEnvironmentFlags())
const k8sTokens = ref(emptyEnvironmentTokens())
const k8sTesting = ref(emptyEnvironmentFlags())
const k8sSaving = ref(emptyEnvironmentFlags())
const targetEnvironment = ref<ZgK8sEnvironment | null>(null)
const k8sDialogVisible = ref(false)
const k8sDialogEnvironment = ref<ZgK8sEnvironment>('test')
const aiConfig = ref({ apiUrl: '', configured: false, apiKeyMasked: '', model: 'gpt-5.6-terra', executionLocation: 'AUTO' as ZhaogangAiExecutionLocation })
const aiForm = ref({ apiUrl: '', apiKey: '', model: 'gpt-5.6-terra', executionLocation: 'AUTO' as ZhaogangAiExecutionLocation })
const aiSaving = ref(false)
const aiTesting = ref(false)
const aiClearing = ref(false)

const configuredCount = computed(() => environments.filter(item => k8sConfigured.value[item.value]).length)
const agentCapabilities = computed(() => agentState.value?.health?.capabilities?.join('、') || '未检测到')
const agentUpdateAvailable = computed(() => canStartZgWorkbenchAgentUpdate(agentState.value, updateInfo.value))
const latestAgentVersionText = computed(() => {
  if (updateInfo.value?.latestVersion) return `v${updateInfo.value.latestVersion}`
  if (agentLoading.value) return '检测中'
  return updateCheckError.value ? '获取失败' : '暂未获取'
})
const settingsSummary = computed<AgentSettingsSummary>(() => {
  const agent = !agentState.value
    ? '检测中'
    : agentState.value.compatible
      ? updateInfo.value?.updateAvailable ? '需更新' : '可用'
      : agentState.value.running ? '版本过旧' : '未运行'
  return {
    agent,
    agentType: agent === '可用' ? 'success' : agent === '检测中' ? 'info' : 'warning',
    agentAuth: agentTokenStatus.value?.configured ? '已授权' : '未授权',
    agentAuthType: agentTokenStatus.value?.configured ? 'success' : 'info',
    k8s: `${configuredCount.value}/3`,
    k8sType: configuredCount.value === 3 ? 'success' : configuredCount.value ? 'warning' : 'info',
    ai: aiConfig.value.configured ? '已配置' : '未配置',
    aiType: aiConfig.value.configured ? 'success' : 'info'
  }
})
const client = () => zgWorkbenchAgentClient(agentPort.value)

watch(settingsSummary, summary => emit('summary-change', summary), { immediate: true })

const loadAgentTokenStatus = async () => {
  agentTokenLoading.value = true
  try {
    agentTokenStatus.value = await getZhaogangAgentToken()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Agent 授权状态加载失败')
  } finally {
    agentTokenLoading.value = false
  }
}

const createAgentToken = async () => {
  const configured = agentTokenStatus.value?.configured
  try {
    if (configured) {
      await ElMessageBox.confirm('重新生成会使旧令牌立即失效，已绑定的 Skill 需要更新令牌。确认继续？',
        '重新生成 Agent 令牌', { confirmButtonText: '重新生成', cancelButtonText: '取消', type: 'warning' })
    }
    agentTokenSaving.value = true
    const created = await createZhaogangAgentToken()
    newAgentToken.value = created.token
    agentTokenStatus.value = created.status
    ElMessage.success('Agent 令牌已生成，请立即复制')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    const message = error instanceof Error ? error.message : 'Agent 令牌生成失败'
    const codingCredentialMissing = error instanceof ZhaogangRequestError && error.code === 409
    ElMessage.error(codingCredentialMissing ? `${message}（请先在“通用设置”重新绑定 CODING 令牌）` : message)
  } finally {
    agentTokenSaving.value = false
  }
}

const deleteAgentToken = async () => {
  try {
    await ElMessageBox.confirm('删除后旧 Agent 令牌立即失效，确认继续？', '删除 Agent 令牌', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
    agentTokenDeleting.value = true
    agentTokenStatus.value = await deleteZhaogangAgentToken()
    newAgentToken.value = ''
    ElMessage.success('Agent 令牌已删除')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : 'Agent 令牌删除失败')
  } finally {
    agentTokenDeleting.value = false
  }
}

const copyNewAgentToken = async () => {
  if (!newAgentToken.value) return
  copyingAgentToken.value = true
  try {
    await writeClipboardText(newAgentToken.value)
    ElMessage.success('令牌已复制')
  } catch {
    ElMessage.error('复制失败，请手动选择令牌复制')
  } finally {
    copyingAgentToken.value = false
  }
}

const writeClipboardText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  let copied = false
  try {
    textarea.select()
    copied = document.execCommand('copy')
  } finally {
    textarea.remove()
  }
  if (!copied) throw new Error('当前浏览器不支持自动复制')
}

const skillPackageDownloadUrl = 'https://itwray.oss-cn-heyuan.aliyuncs.com/zg/pangmaoyun/agents/pangmaoyun-workbench-build-v1.0.0.zip'

const skillPackage = {
  available: Boolean(skillPackageDownloadUrl),
  unavailableReason: '安装包下载地址正在配置，请联系工作台维护人。',
  version: 'v1.0.0',
  fileName: 'pangmaoyun-workbench-build-v1.0.0.zip',
  checksum: '4f10aedaafd7ec3128b54fd82992fad53ddd120f5ce12369393d4f8ecaade67b',
  downloadUrl: skillPackageDownloadUrl
}

const skillInstallPrompt = `请将找钢工作台的胖猫云工作台构建 Skill 安装到我指定的目标工作区。

安装包地址：${skillPackage.downloadUrl || '【请先向工作台维护人获取下载地址】'}
安装包版本：${skillPackage.version}
文件名：${skillPackage.fileName}
SHA-256：${skillPackage.checksum}

执行要求：
1. 先确认我给出的目标工作区绝对路径，并确认该路径是可写目录。
2. 下载安装包后计算 SHA-256，必须与上面给出的值完全一致；不一致时停止，不得解压安装。
3. 检查压缩包只包含单一根目录 pangmaoyun-workbench-build/，拒绝绝对路径、../ 路径穿越和额外根目录。
4. 目标目录 <工作区>/.agents/skills/pangmaoyun-workbench-build 已存在时，先停止并说明现有内容；只有我明确确认升级后才能备份并替换，不能静默覆盖。
5. 安装到 <工作区>/.agents/skills/pangmaoyun-workbench-build/，不要修改工作区其它文件，不执行 Git 提交或推送。
6. 安装后检查 SKILL.md 和 scripts/pmy-workbench-build（入口脚本必须可执行）。
7. 在安装目录运行 Skill 的测试：python3 -m unittest discover -s tests -p 'test_*.py'。
8. 不读取、打印或复制完整 Agent 令牌；不要自动绑定令牌，也不要自动触发构建。安装完成后提示我回到工作台 Agent 授权页生成令牌，再执行 auth set。
9. 最后报告：安装路径、版本、SHA-256 是否匹配、测试结果，以及是否需要绑定 Agent 令牌。`

const copySkillInstallPrompt = async () => {
  if (!skillPackage.available) {
    ElMessage.info(skillPackage.unavailableReason)
    return
  }
  copyingSkillPrompt.value = true
  try {
    await writeClipboardText(skillInstallPrompt)
    ElMessage.success('Agent 安装提示词已复制')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '安装提示词复制失败')
  } finally {
    copyingSkillPrompt.value = false
  }
}

const downloadSkillPackage = () => {
  if (!skillPackage.available) return
  const link = document.createElement('a')
  link.href = skillPackage.downloadUrl
  link.download = skillPackage.fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const formatAgentTokenTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

const loadK8sStatus = async () => {
  try {
    const result = await getZhaogangK8sTokenStatus()
    k8sConfigured.value = { ...emptyEnvironmentFlags(), ...result.configured }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'K8s Token 状态加载失败')
  }
}

const loadAiConfig = async () => {
  try {
    aiConfig.value = await getZhaogangAiConfig()
    aiForm.value = {
      apiUrl: aiConfig.value.apiUrl,
      apiKey: '',
      model: aiConfig.value.model || 'gpt-5.6-terra',
      executionLocation: aiConfig.value.executionLocation || 'AUTO'
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'AI 配置加载失败')
  }
}

const refreshAgent = async () => {
  agentLoading.value = true
  updateInfo.value = null
  updateCheckError.value = ''
  try {
    agentState.value = await checkZgWorkbenchAgent()
    if (shouldCheckZgWorkbenchAgentUpdate(agentState.value)) {
      try {
        updateInfo.value = await client().updateCheck()
      } catch (error) {
        updateCheckError.value = error instanceof Error ? error.message : '无法读取 Agent 更新信息'
      }
    }
  } finally {
    agentLoading.value = false
  }
}

const saveAgentPort = (value: number | undefined) => {
  if (!value) return
  agentPort.value = saveZgWorkbenchAgentPort(value)
  void refreshAgent()
}

const startAgent = async () => {
  startZgWorkbenchAgentProtocol()
  await new Promise(resolve => window.setTimeout(resolve, 1200))
  await refreshAgent()
}

const openAgentGuide = () => {
  const guide = window.open(router.resolve('/zhaogang/settings/agent-guide').href, '_blank', 'noopener')
  if (guide) guide.opener = null
}

const updateAgent = async () => {
  agentUpdating.value = true
  try {
    await client().update()
    ElMessage.success('Agent 已开始更新')
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 2000))
      const status = await client().updateStatus().catch(() => null)
      if (status?.state === 'FAILED') throw new Error(status.message || 'Agent 更新失败')
      if (status?.state === 'IDLE') break
    }
    await refreshAgent()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Agent 更新失败')
  } finally {
    agentUpdating.value = false
  }
}

const toggleAutostart = async () => {
  try {
    const result = await client().autostart(!agentState.value?.health?.autostartEnabled)
    if (agentState.value?.health) agentState.value.health.autostartEnabled = result.enabled
    ElMessage.success(result.enabled ? '已开启开机自启' : '已关闭开机自启')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '开机自启设置失败')
  }
}

const environmentLabel = (environment: ZgK8sEnvironment) =>
  environments.find(item => item.value === environment)?.label || environment.toUpperCase()

const openK8sDialog = (environment: ZgK8sEnvironment) => {
  k8sDialogEnvironment.value = environment
  k8sTokens.value[environment] = ''
  k8sDialogVisible.value = true
}

const resetK8sDialog = () => {
  k8sTokens.value[k8sDialogEnvironment.value] = ''
}

const tokenForValidation = async (environment: ZgK8sEnvironment) => {
  const entered = k8sTokens.value[environment].trim()
  if (entered) return entered
  return (await getZhaogangK8sToken(environment)).token
}

const validateK8s = async (environment: ZgK8sEnvironment, token: string) => {
  const state = await checkZgWorkbenchAgent()
  agentState.value = state
  if (!state.compatible) throw new Error(state.message || '本机 Agent 未就绪')
  await client().login(environment, token)
  await client().namespaces(environment)
}

const testK8s = async (environment: ZgK8sEnvironment, requireEnteredToken = false) => {
  k8sTesting.value[environment] = true
  try {
    if (requireEnteredToken && !k8sTokens.value[environment].trim()) return
    const token = await tokenForValidation(environment)
    await validateK8s(environment, token)
    ElMessage.success(`${environmentLabel(environment)} 连接成功`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'K8s 连接失败')
  } finally {
    k8sTesting.value[environment] = false
  }
}

const saveK8s = async (environment: ZgK8sEnvironment) => {
  const token = k8sTokens.value[environment].trim()
  if (!token) return
  k8sSaving.value[environment] = true
  try {
    await validateK8s(environment, token)
    const result = await saveZhaogangK8sToken(environment, token)
    k8sConfigured.value = { ...emptyEnvironmentFlags(), ...result.configured }
    k8sTokens.value[environment] = ''
    k8sDialogVisible.value = false
    ElMessage.success('Token 已验证并保存')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Token 验证或保存失败')
  } finally {
    k8sSaving.value[environment] = false
  }
}

const deleteK8s = async (environment: ZgK8sEnvironment) => {
  try {
    await ElMessageBox.confirm('删除后该环境的 K8s 页面将无法查询，确认继续？', '删除 K8s Token', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const result = await deleteZhaogangK8sToken(environment)
    await client().logout(environment).catch(() => undefined)
    k8sConfigured.value = { ...emptyEnvironmentFlags(), ...result.configured }
    k8sTokens.value[environment] = ''
    ElMessage.success('Token 已删除')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : 'Token 删除失败')
  }
}

const testAi = async () => {
  aiTesting.value = true
  try {
    const command = { ...aiForm.value }
    const location = await runZhaogangAiConnectionTest(
      command.executionLocation,
      () => testZhaogangAiConfig(command),
      async () => {
        const state = await checkZgWorkbenchAgent()
        agentState.value = state
        if (!state.running || !state.compatible || !state.health?.capabilities?.includes('ai-vision')) {
          throw new Error('本机 Agent 未运行、版本过旧或不支持 AI 识别，请先处理本机 Agent')
        }
        const ticket = await issueZhaogangAiTestTicket(command)
        await client().aiVisionRecognize(ticket.ticket, createZhaogangAiConnectionTestImage())
      },
    )
    ElMessage.success(`AI 连接成功（${location === 'SERVER' ? '服务器' : '本机 Agent'}）`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'AI 连接失败')
  } finally {
    aiTesting.value = false
  }
}

const saveAi = async () => {
  aiSaving.value = true
  try {
    aiConfig.value = await saveZhaogangAiConfig({ ...aiForm.value })
    aiForm.value.apiKey = ''
    ElMessage.success('AI 配置已保存')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'AI 配置保存失败')
  } finally {
    aiSaving.value = false
  }
}

const clearAi = async () => {
  aiClearing.value = true
  try {
    await ElMessageBox.confirm('确认删除当前账号的 AI URL、API Key、模型和执行位置配置？', '清除 AI 配置', {
      confirmButtonText: '清除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    aiConfig.value = await clearZhaogangAiConfig()
    aiForm.value = { apiUrl: '', apiKey: '', model: 'gpt-5.6-terra', executionLocation: 'AUTO' }
    ElMessage.success('AI 配置已清除')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : 'AI 配置清除失败')
  } finally {
    aiClearing.value = false
  }
}

const syncTargetEnvironment = () => {
  const environment = typeof route.query.environment === 'string' ? route.query.environment : ''
  targetEnvironment.value = environment === 'test' || environment === 'uat' || environment === 'prd' ? environment : null
}

watch(() => route.query.environment, syncTargetEnvironment)
onMounted(async () => {
  await Promise.all([refreshAgent(), loadK8sStatus(), loadAgentTokenStatus(), loadAiConfig()])
  syncTargetEnvironment()
})
</script>

<style scoped>
.agent-settings-sections { min-width: 0; }
.settings-section { min-width: 0; padding: 20px; background: #fff; border: 1px solid #e4e9f1; border-radius: 8px; }
.settings-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #edf0f5; }
.settings-heading h3 { margin: 0; font-size: 17px; }
.settings-heading p { margin: 6px 0 0; color: #7d899c; font-size: 13px; line-height: 1.5; }
.connection-details { margin: 0 0 18px; }
.connection-details > div { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 11px 0; border-bottom: 1px solid #edf0f5; }
.connection-details dt { color: #7c899c; font-size: 13px; }
.connection-details dd { min-width: 0; margin: 0; color: #344158; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
.settings-actions { display: flex; gap: 9px; flex-wrap: wrap; }
.settings-hint { margin: 13px 0 0; color: #7c899c; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.settings-hint--error { color: #c45656; }
.settings-hint code, .agent-token-details code { overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.new-agent-token-hint { margin: 0; line-height: 1.6; }
.new-agent-token-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.new-agent-token-row code { min-width: 0; padding: 6px 8px; overflow-wrap: anywhere; color: #31527e; background: #fff; border-radius: 4px; }
.new-agent-token-row .el-button { flex: 0 0 auto; }
.skill-package-section { padding-top: 18px; margin-top: 18px; border-top: 1px solid #edf0f5; }
.skill-package-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.skill-package-heading h4 { margin: 0; color: #344158; font-size: 15px; }
.skill-package-heading p { margin: 6px 0 0; color: #7d899c; font-size: 13px; line-height: 1.5; }
.skill-package-heading .el-button { flex: 0 0 auto; }
.skill-package-details { margin-top: 12px; }
.skill-package-details code { padding: 2px 5px; color: #31527e; background: #f1f5fb; border-radius: 4px; }
.skill-package-section .el-alert { margin-top: 12px; }
.skill-install-steps { margin-top: 14px; }
.skill-install-steps h5 { margin: 0; color: #4f5e74; font-size: 13px; }
.skill-install-steps ol { display: grid; gap: 7px; padding-left: 20px; margin: 9px 0 0; color: #718097; font-size: 13px; line-height: 1.6; }
.skill-install-steps code { padding: 2px 5px; color: #31527e; background: #f1f5fb; border-radius: 4px; overflow-wrap: anywhere; }
.skill-prompt-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
.skill-prompt-row span { color: #8490a4; font-size: 12px; line-height: 1.5; }
.preferences-form { padding-top: 18px; }
.preferences-form :deep(.el-form-item) { padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid #edf0f5; }
.preferences-form :deep(.el-form-item__label) { color: #4f5e74; }
.form-label-with-help { display: inline-flex; align-items: center; gap: 5px; }
.label-help-icon { color: #909399; cursor: help; outline: none; }
.label-help-icon:hover, .label-help-icon:focus { color: #409eff; }
.execution-location-help { max-width: 360px; line-height: 1.7; }
.execution-location-help div + div { margin-top: 4px; }
.k8s-token-list { overflow: hidden; margin-top: 16px; border: 1px solid #e4e9f1; border-radius: 6px; }
.k8s-token-row { display: grid; min-height: 54px; grid-template-columns: minmax(130px, 1fr) minmax(110px, .8fr) minmax(220px, auto); align-items: center; gap: 16px; padding: 8px 14px; border-bottom: 1px solid #edf0f5; transition: background-color .2s; }
.k8s-token-row:last-child { border-bottom: 0; }
.k8s-token-row--header { min-height: 38px; color: #7d899c; background: #f7f9fc; font-size: 12px; }
.k8s-token-row.is-target { border-color: #7aa7f5; background: #f5f8ff; }
.k8s-token-row > strong { color: #344158; font-size: 14px; }
.k8s-token-row > .el-tag { justify-self: start; }
.k8s-token-actions { display: flex; align-items: center; gap: 4px; }
.k8s-token-actions { justify-content: flex-end; flex-wrap: wrap; }
@media (max-width: 900px) {
  .k8s-token-row { grid-template-columns: minmax(120px, 1fr) 100px minmax(200px, auto); }
}
@media (max-width: 640px) {
  .settings-section { padding: 16px; }
  .settings-heading { flex-direction: column; gap: 10px; }
  .skill-package-heading { flex-direction: column; }
  .connection-details > div { align-items: flex-start; flex-direction: column; gap: 7px; }
  .connection-details dd { width: 100%; text-align: left; }
  .k8s-token-row { grid-template-columns: minmax(92px, 1fr) auto; gap: 8px; padding: 10px 12px; }
  .k8s-token-row--header { display: none; }
  .k8s-token-actions { grid-column: 1 / -1; justify-content: flex-start; }
  .k8s-token-actions .el-button { margin-left: 0; }
}
</style>
