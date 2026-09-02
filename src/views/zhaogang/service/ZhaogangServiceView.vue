<template>
  <section class="service-page">
    <header class="service-heading">
      <div class="heading-actions">
        <el-tag
          v-if="health"
          :type="agentOnline ? 'success' : 'warning'"
          effect="light"
        >{{ agentOnline ? "Agent 在线" : "Agent 等待连接" }}</el-tag
        ><el-tag v-if="health?.version" type="info" effect="light">v{{ health.version }}</el-tag
        ><el-tag v-if="health" :type="autostartEnabled ? 'success' : 'warning'" effect="light"
          >{{ autostartEnabled ? "开机自启已开启" : "开机自启未开启" }}</el-tag
        ><el-button v-if="health && !autostartEnabled" link type="warning" @click="toggleAutostart"
          >设置开机自启</el-button
        ><el-button :icon="QuestionFilled" @click="openInstallGuide">使用教程</el-button>
      </div>
      <div class="service-heading-right">
        <div class="environment-state">
          <el-tag
            :type="tokenConfigured ? 'success' : 'warning'"
            effect="plain"
            >{{ tokenConfigured ? "Token 已配置" : "Token 未配置" }}</el-tag
          >
          <el-button
            v-if="tokenConfigured"
            link
            type="primary"
            @click="tokenEditing = true"
            >更换 Token</el-button
          ><el-button
            v-if="tokenConfigured"
            link
            type="danger"
            @click="removeToken"
            >删除 Token</el-button
          >
        </div>
      </div>
    </header>
    <el-alert
      v-if="agentError"
      type="warning"
      :closable="false"
      show-icon
      class="service-alert"
      :title="agentError"
      ><template #default
        ><div class="alert-actions">
          <el-button link type="primary" @click="startAgent"
            >启动 zg-k8s-agent</el-button
          ><el-button link type="primary" @click="openDownload"
            >下载 Agent</el-button
          >
        </div></template
      ></el-alert
    ><el-alert
      v-if="updateCheckError"
      type="warning"
      :closable="false"
      show-icon
      class="service-alert"
      :title="updateCheckError"
      ><template #default
        ><el-button link type="primary" @click="openDownload">下载最新 Agent</el-button>
      </template></el-alert
    ><el-alert
      v-if="updateInfo?.updateAvailable"
      type="info"
      :closable="false"
      show-icon
      class="service-alert"
      :title="`zg-k8s-agent 有新版本 ${updateInfo.latestVersion}`"
      ><template #default
        ><span>{{ updateInfo.releaseNotes || "建议更新到最新版本。" }}</span
        ><el-button link type="primary" :loading="updating" @click="updateAgent"
          >立即更新</el-button
        ></template
      ></el-alert
    ><template v-if="health"
      ><div class="environment-tabs">
        <el-radio-group
          v-model="environment"
          :disabled="environmentLoading"
          @change="loadEnvironment"
          ><el-radio-button
            v-for="item in environments"
            :key="item"
            :value="item"
            >{{ environmentLabel(item) }}</el-radio-button
        ></el-radio-group
        >
        <div class="service-toolbar service-inline-toolbar">
          <el-input
            v-model="keyword"
            clearable
            class="service-search"
            name="zg-k8s-deployment-search"
            autocomplete="off"
            inputmode="search"
            placeholder="搜索 Deployment 或 Pod 名称"
          /><el-switch v-model="autoRefresh" active-text="自动刷新" /><el-select
            v-model="refreshInterval"
            :disabled="!autoRefresh"
            class="refresh-interval"
            aria-label="自动刷新间隔"
          ><el-option
              v-for="item in refreshIntervalOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            /></el-select><el-button
            :icon="Refresh"
            :loading="loading"
            @click="loadDeployments()"
            >刷新</el-button
          ><span class="updated-time">{{ updatedText }}</span>
        </div>
      </div>
      <el-card
        v-if="!tokenConfigured || tokenEditing"
        shadow="never"
        class="token-card"
        ><template #header
          ><strong>{{
            tokenConfigured
              ? `更新 ${environmentLabel(environment)} Token`
              : `配置 ${environmentLabel(environment)} Token`
          }}</strong></template
        >
        <div class="token-form">
          <el-input
            v-model="tokenInput"
            type="password"
            show-password
            clearable
            placeholder="粘贴 K8s Dashboard Token"
            @keyup.enter="saveToken"
          /><el-button
            type="primary"
            :loading="tokenSaving"
            :disabled="!tokenInput.trim()"
            @click="saveToken"
            >保存并连接</el-button
          ><el-button v-if="tokenConfigured" @click="tokenEditing = false"
            >取消</el-button
          >
        </div>
        <p class="muted-copy">
          Token 保存到当前找钢工作台账号，Agent
          重启后会自动恢复，不会保存到本机配置文件。
        </p></el-card
      >
      <el-alert
        v-if="errorMessage"
        type="error"
        :closable="false"
        show-icon
        class="service-alert"
        :title="errorMessage" />
      <el-table
        v-loading="loading || environmentLoading"
        :data="filteredDeployments"
        row-key="name"
        border
        class="deployment-table"
        empty-text="暂无 Deployment"
        @expand-change="handleExpandChange"
        ><el-table-column type="expand" width="48"
          ><template #default="scope"
            ><div class="pod-detail">
              <el-table
                v-loading="podLoading[scope.row.name]"
                :data="podDetails[scope.row.name] || []"
                size="small"
                border
                class="pod-table"
                empty-text="暂无 Pod"
                ><el-table-column
                  prop="name"
                  label="Pod 名称"
                  min-width="250"
                  show-overflow-tooltip
                /><el-table-column label="状态" width="110"
                  ><template #default="podScope"
                    ><el-tag
                      :type="podTagType(podScope.row.status)"
                      effect="light"
                      >{{ podScope.row.status || "Unknown" }}</el-tag
                    ></template
                  ></el-table-column
                ><el-table-column
                  prop="restarts"
                  label="重启次数"
                  width="95"
                /><el-table-column label="CPU 使用率" width="115"
                  ><template #default="podScope">{{
                    podScope.row.cpuUsage || "—"
                  }}</template></el-table-column
                ><el-table-column label="内存使用量" width="125"
                  ><template #default="podScope">{{
                    podScope.row.memoryUsage || "—"
                  }}</template></el-table-column
                ><el-table-column label="IP" width="140"
                  ><template #default="podScope">{{
                    podScope.row.podIp || "—"
                  }}</template></el-table-column
                ><el-table-column label="创建时间" min-width="170"
                  ><template #default="podScope">{{
                    formatDate(podScope.row.createdAt)
                  }}</template></el-table-column
                ></el-table
              >
            </div></template
          ></el-table-column
        ><el-table-column
          prop="name"
          label="服务名称"
          min-width="300"
          show-overflow-tooltip /><el-table-column label="Pods" width="120"
          ><template #default="scope"
            >{{ scope.row.podCount }} / {{ scope.row.replicas }}</template
          ></el-table-column
        ><el-table-column label="最后 Pod 创建时间" min-width="180"
          ><template #default="scope">{{
            formatDate(scope.row.lastPodCreatedAt)
          }}</template></el-table-column
        ><el-table-column label="状态" width="105"
          ><template #default="scope"
            ><el-tag :type="deploymentTagType(scope.row)" effect="light">{{
              deploymentStatus(scope.row)
            }}</el-tag></template
          ></el-table-column
        ><el-table-column label="跳转" width="90" fixed="right"
          ><template #default="scope"
            ><el-button
              link
              type="primary"
              :icon="TopRight"
              title="打开 K8s Dashboard"
              @click="
                openDashboard(scope.row.name)
              " />
            </template>
          </el-table-column>
        </el-table>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="pageSizeOptions"
        :total="total"
        background
        layout="total, sizes, prev, pager, next"
        class="service-pagination"
        @current-change="handlePageChange"
        @size-change="handlePageSizeChange"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { QuestionFilled, Refresh, TopRight } from "@element-plus/icons-vue";
import {
  deleteZhaogangK8sToken,
  getZhaogangK8sToken,
  getZhaogangK8sTokenStatus,
  saveZhaogangK8sToken,
} from "@/api/zhaogang";
import {
  getZgK8sAgentPort,
  resolveZgK8sAgentDownloadUrl,
  saveZgK8sAgentPort,
  zgK8sAgentClient,
  zgK8sAgentStartProtocol,
} from "@/services/zgK8sAgentClient";
import { zhaogangK8sDashboardUrl } from "@/services/zhaogangReleaseK8s";
import type {
  ZgK8sAgentHealth,
  ZgK8sAgentUpdateStatus,
  ZgK8sAgentUpdateInfo,
  ZgK8sDeployment,
  ZgK8sEnvironment,
  ZgK8sPod,
} from "@/types/zhaogangService";
import { ZgK8sAgentError } from "@/types/zhaogangService";

const environments: ZgK8sEnvironment[] = ["test", "uat", "prd"];
const namespaceCacheKey = "zhaogang:k8s-namespaces";
const autoRefreshCacheKey = "zhaogang:k8s-auto-refresh";
const refreshIntervalCacheKey = "zhaogang:k8s-refresh-interval";
const refreshIntervalOptions = [
  { label: "10 秒", value: 10 },
  { label: "30 秒", value: 30 },
  { label: "60 秒", value: 60 },
  { label: "3 分钟", value: 180 },
];
const pageSizeOptions = [10, 20, 50];
const readAutoRefreshPreference = () =>
  window.localStorage.getItem(autoRefreshCacheKey) !== "false";
const writeAutoRefreshPreference = (value: boolean) =>
  window.localStorage.setItem(autoRefreshCacheKey, String(value));
const readRefreshIntervalPreference = () => {
  const value = Number(window.localStorage.getItem(refreshIntervalCacheKey));
  return refreshIntervalOptions.some((item) => item.value === value) ? value : 30;
};
const writeRefreshIntervalPreference = (value: number) =>
  window.localStorage.setItem(refreshIntervalCacheKey, String(value));
const portInput = ref(getZgK8sAgentPort());
const health = ref<ZgK8sAgentHealth | null>(null);
const environment = ref<ZgK8sEnvironment>("test");
const tokenStatus = ref<Record<ZgK8sEnvironment, boolean>>({
  test: false,
  uat: false,
  prd: false,
});
const tokenInput = ref("");
const tokenEditing = ref(false);
const tokenSaving = ref(false);
const namespace = ref("");
const deployments = ref<ZgK8sDeployment[]>([]);
const podDetails = ref<Record<string, ZgK8sPod[]>>({});
const podLoading = ref<Record<string, boolean>>({});
const expandedDeploymentNames = ref<string[]>([]);
const keyword = ref("");
const agentError = ref("");
const updateCheckError = ref("");
const errorMessage = ref("");
const loading = ref(false);
const environmentLoading = ref(false);
const autoRefresh = ref(readAutoRefreshPreference());
const refreshInterval = ref(readRefreshIntervalPreference());
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const updatedAt = ref("");
const updating = ref(false);
const autostartEnabled = ref(false);
const updateInfo = ref<ZgK8sAgentUpdateInfo | null>(null);
const router = useRouter();
let pollTimer: number | undefined;
let environmentLoadSequence = 0;
let deploymentLoadSequence = 0;
const client = () =>
  zgK8sAgentClient(saveZgK8sAgentPort(Number(portInput.value)));
const tokenConfigured = computed(() => tokenStatus.value[environment.value]);
const agentOnline = computed(() => Boolean(health.value?.running));
const environmentAuthenticated = (target = environment.value) =>
  Boolean(health.value?.environments?.[target]);
const filteredDeployments = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  return text
    ? deployments.value.filter(
        (item) =>
          item.name.toLowerCase().includes(text) ||
          (item.podNames || []).some((podName) =>
            podName.toLowerCase().includes(text),
          ),
      )
    : deployments.value;
});
const updatedText = computed(() =>
  updatedAt.value
    ? `更新于 ${new Date(updatedAt.value).toLocaleTimeString("zh-CN", { hour12: false })}`
    : "尚未查询",
);
const environmentLabel = (value: ZgK8sEnvironment) =>
  value === "prd" ? "生产 PRD" : value === "uat" ? "预发 UAT" : "测试 TEST";
const readNamespaceCache = (): Record<string, string> => {
  try {
    return JSON.parse(
      window.localStorage.getItem(namespaceCacheKey) || "{}",
    ) as Record<string, string>;
  } catch {
    return {};
  }
};
const writeNamespaceCache = (value: Record<string, string>) =>
  window.localStorage.setItem(namespaceCacheKey, JSON.stringify(value));
const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
const deploymentStatus = (item: ZgK8sDeployment) =>
  item.podCount === item.replicas
    ? "正常"
    : item.podCount < item.replicas
      ? "异常"
      : "启动中";
const deploymentTagType = (item: ZgK8sDeployment) =>
  deploymentStatus(item) === "正常"
    ? "success"
    : deploymentStatus(item) === "启动中"
      ? "warning"
      : "danger";
const podTagType = (status: string) =>
  status === "Running"
    ? "success"
    : status === "Succeeded"
      ? "info"
      : status === "Pending"
        ? "warning"
        : "danger";
const updateCheckMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("invalid character '<'") || message.includes("响应格式错误"))
    return "Agent 更新清单暂不可用，请先发布最新 Agent 资源";
  return message ? `暂时无法检查 Agent 更新：${message}` : "暂时无法检查 Agent 更新";
};
const checkAgent = async () => {
  agentError.value = "";
  updateCheckError.value = "";
  updateInfo.value = null;
  try {
    health.value = await client().health();
    autostartEnabled.value = health.value.autostartEnabled;
    try {
      updateInfo.value = await client().checkUpdate();
    } catch (error) {
      updateCheckError.value = updateCheckMessage(error);
    }
    const status = await getZhaogangK8sTokenStatus();
    tokenStatus.value = status.configured;
    await loadEnvironment();
  } catch (error) {
    health.value = null;
    agentError.value =
      error instanceof ZgK8sAgentError
        ? error.message
        : error instanceof Error
          ? error.message
          : "未检测到 zg-k8s-agent，请确认程序已启动";
  }
};
const restoreEnvironmentSession = async (target: ZgK8sEnvironment) => {
  if (environmentAuthenticated(target)) return true;
  if (!tokenStatus.value[target]) return false;
  const stored = await getZhaogangK8sToken(target);
  await client().login(target, stored.token);
  health.value = await client().health();
  return true;
};
const loadEnvironment = async () => {
  const sequence = ++environmentLoadSequence;
  deploymentLoadSequence++;
  const target = environment.value;
  environmentLoading.value = true;
  loading.value = false;
  errorMessage.value = "";
  deployments.value = [];
  podDetails.value = {};
  podLoading.value = {};
  expandedDeploymentNames.value = [];
  total.value = 0;
  page.value = 1;
  updatedAt.value = "";
  try {
    const connected = await restoreEnvironmentSession(target);
    if (sequence !== environmentLoadSequence || target !== environment.value) return;
    if (!connected) return;
    const cached = readNamespaceCache();
    const namespaces = await client().namespaces(target);
    if (sequence !== environmentLoadSequence || target !== environment.value) return;
    namespace.value =
      cached[target] || namespaces[0]?.name || "application";
    if (!namespaces.some((item) => item.name === namespace.value))
      namespace.value = namespaces[0]?.name || "application";
    cached[target] = namespace.value;
    writeNamespaceCache(cached);
    await loadDeployments(target, sequence);
  } catch (error) {
    if (sequence === environmentLoadSequence && target === environment.value)
      errorMessage.value =
        error instanceof Error ? error.message : "K8s 服务查询失败";
  } finally {
    if (sequence === environmentLoadSequence) environmentLoading.value = false;
  }
};
const loadDeployments = async (
  target = environment.value,
  sequence?: number,
  silent = false,
) => {
  if (sequence !== undefined && sequence !== environmentLoadSequence) return;
  if (!environmentAuthenticated(target) || !namespace.value || loading.value) return;
  const requestSequence = ++deploymentLoadSequence;
  podDetails.value = {};
  podLoading.value = {};
  if (!silent) {
    loading.value = true;
    errorMessage.value = "";
  }
  try {
    const result = await client().deployments(target, namespace.value, page.value, pageSize.value);
    if (
      requestSequence !== deploymentLoadSequence ||
      target !== environment.value ||
      (sequence !== undefined && sequence !== environmentLoadSequence)
    )
      return;
    deployments.value = result.items || [];
    total.value = result.total || 0;
    updatedAt.value = result.updatedAt;
    for (const deploymentName of expandedDeploymentNames.value) {
      if (deployments.value.some((item) => item.name === deploymentName))
        void loadPodDetails(deploymentName);
    }
  } catch (error) {
    if (
      !silent &&
      requestSequence === deploymentLoadSequence &&
      target === environment.value
    )
      errorMessage.value =
        error instanceof Error ? error.message : "Deployment 查询失败";
  } finally {
    if (!silent && requestSequence === deploymentLoadSequence)
      loading.value = false;
  }
};
const loadPodDetails = async (deploymentName: string) => {
  if (podDetails.value[deploymentName] || podLoading.value[deploymentName]) return;
  const target = environment.value;
  const targetNamespace = namespace.value;
  podLoading.value = { ...podLoading.value, [deploymentName]: true };
  try {
    const result = await client().pods(target, targetNamespace, deploymentName);
    if (target !== environment.value || targetNamespace !== namespace.value) return;
    podDetails.value = { ...podDetails.value, [deploymentName]: result.items || [] };
  } catch (error) {
    if (target === environment.value && targetNamespace === namespace.value)
      ElMessage.error(error instanceof Error ? error.message : "Pod 查询失败");
  } finally {
    const next = { ...podLoading.value };
    delete next[deploymentName];
    podLoading.value = next;
  }
};
const handleExpandChange = (row: ZgK8sDeployment, expandedRows: ZgK8sDeployment[]) => {
  expandedDeploymentNames.value = expandedRows.map((item) => item.name);
  if (expandedRows.some((item) => item.name === row.name)) void loadPodDetails(row.name);
};
const handlePageChange = (value: number) => {
  page.value = value;
  expandedDeploymentNames.value = [];
  void loadDeployments();
};
const handlePageSizeChange = (value: number) => {
  pageSize.value = value;
  page.value = 1;
  expandedDeploymentNames.value = [];
  void loadDeployments();
};
const saveToken = async () => {
  if (!tokenInput.value.trim()) return;
  tokenSaving.value = true;
  errorMessage.value = "";
  try {
    const status = await saveZhaogangK8sToken(
      environment.value,
      tokenInput.value,
    );
    tokenStatus.value = status.configured;
    await client().login(environment.value, tokenInput.value.trim());
    tokenInput.value = "";
    tokenEditing.value = false;
    health.value = await client().health();
    await loadEnvironment();
    ElMessage.success(
      `${environmentLabel(environment.value)} Token 已保存并连接`,
    );
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Token 保存失败";
  } finally {
    tokenSaving.value = false;
  }
};
const removeToken = async () => {
  try {
    await ElMessageBox.confirm(
      `确定删除 ${environmentLabel(environment.value)} Token 吗？`,
      "删除 Token",
      { type: "warning" },
    );
    tokenStatus.value = (
      await deleteZhaogangK8sToken(environment.value)
    ).configured;
    await client().logout(environment.value);
    tokenEditing.value = false;
    deployments.value = [];
    health.value = await client().health();
    ElMessage.success("Token 已删除");
  } catch (error) {
    if (error !== "cancel")
      errorMessage.value =
        error instanceof Error ? error.message : "Token 删除失败";
  }
};
const openDashboard = (deploymentName: string) =>
  window.open(
    zhaogangK8sDashboardUrl(environment.value, namespace.value, deploymentName),
    "_blank",
    "noopener,noreferrer",
  );
const startAgent = () => zgK8sAgentStartProtocol();
const openInstallGuide = () => {
  const target = window.open(
    router.resolve("/zhaogang/services/install").href,
    "_blank",
    "noopener",
  );
  if (target) target.opener = null;
};
const openDownload = async () => {
  const url = await resolveZgK8sAgentDownloadUrl();
  const link = document.createElement("a");
  link.href = url;
  link.click();
};
const toggleAutostart = async () => {
  try {
    const result = await client().autostart(!autostartEnabled.value);
    autostartEnabled.value = result.enabled;
  } catch (error) {
    ElMessage.error(
      error instanceof Error ? error.message : "开机自启设置失败",
    );
  }
};
const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
const updateAgent = async () => {
  const targetVersion = updateInfo.value?.latestVersion;
  if (!targetVersion || updating.value) return;
  updating.value = true;
  updateCheckError.value = "";
  try {
    await client().startUpdate();
    const deadline = Date.now() + 120000;
    let status: ZgK8sAgentUpdateStatus | null = null;
    let restarted = false;
    while (Date.now() < deadline) {
      await wait(1500);
      status = await client().updateStatus().catch(() => null);
      if (status?.state === "FAILED")
        throw new Error(status.message || "Agent 更新失败");
      try {
        const refreshed = await client().health();
        health.value = refreshed;
        autostartEnabled.value = refreshed.autostartEnabled;
        if (refreshed.version === targetVersion) {
          restarted = true;
          break;
        }
      } catch {
        // The Agent briefly drops the loopback connection while restarting.
      }
    }
    if (!restarted)
      throw new Error(`Agent 更新超时，暂未检测到版本 ${targetVersion}`);

    await checkAgent();
    ElMessage.success(`zg-k8s-agent 已更新到 ${targetVersion}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新请求失败";
    updateCheckError.value = message;
    ElMessage.error(message);
  } finally {
    updating.value = false;
  }
};
const schedulePolling = () => {
  window.clearInterval(pollTimer);
  if (
    autoRefresh.value &&
    environmentAuthenticated() &&
    document.visibilityState === "visible"
  )
    pollTimer = window.setInterval(
      () => void loadDeployments(environment.value, undefined, true),
      refreshInterval.value * 1000,
    );
};
const handleVisibility = () => {
  if (document.visibilityState === "visible") {
    schedulePolling();
  } else window.clearInterval(pollTimer);
};
watch([autoRefresh, refreshInterval], ([autoRefreshValue, refreshIntervalValue]) => {
  writeAutoRefreshPreference(autoRefreshValue);
  writeRefreshIntervalPreference(refreshIntervalValue);
  schedulePolling();
});
watch(environment, schedulePolling);
onMounted(async () => {
  document.addEventListener("visibilitychange", handleVisibility);
  await checkAgent();
  schedulePolling();
});
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", handleVisibility);
  window.clearInterval(pollTimer);
});
</script>

<style scoped>
.service-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}
.service-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.service-heading-right {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}
.heading-actions,
.alert-actions,
.environment-tabs,
.environment-state,
.service-toolbar,
.token-form {
  display: flex;
  align-items: center;
  gap: 10px;
}
.service-alert {
  flex: 0 0 auto;
}
.alert-actions {
  margin-top: 5px;
}
.environment-tabs,
.service-toolbar {
  flex-wrap: wrap;
  padding: 12px;
  background: #fff;
  border: 1px solid #e3e9f2;
}
.environment-tabs {
  justify-content: space-between;
}
.service-inline-toolbar {
  padding: 0;
  background: transparent;
  border: 0;
  max-width: 100%;
  flex-wrap: nowrap;
  margin-left: auto;
}
.service-inline-toolbar :deep(.el-switch),
.service-inline-toolbar :deep(.el-switch__label),
.service-inline-toolbar :deep(.el-button),
.service-inline-toolbar :deep(.el-select) {
  flex-shrink: 0;
}
.service-inline-toolbar :deep(.el-switch__label) {
  white-space: nowrap;
}
.environment-state {
  margin-left: 0;
  color: #8490a4;
  font-size: 12px;
}
.token-card {
  border-color: #e3e9f2;
}
.token-form {
  max-width: 720px;
}
.token-form .el-input {
  flex: 1;
}
.muted-copy {
  margin: 10px 0 0;
  color: #7c899c;
  font-size: 13px;
}
.service-search {
  min-width: 220px;
  width: min(360px, 100%);
}
.refresh-interval {
  width: 110px;
  flex: 0 0 110px;
}
.updated-time {
  margin-left: auto;
  color: #8490a4;
  font-size: 12px;
  flex-shrink: 0;
  white-space: nowrap;
}
.deployment-table {
  min-height: 320px;
}
.pod-detail {
  padding: 5px 24px 14px;
}
.pod-table {
  width: 100%;
}
.service-pagination {
  justify-content: flex-end;
}
@media (max-width: 720px) {
  .service-heading {
    flex-direction: column;
  }
  .heading-actions {
    width: 100%;
    justify-content: space-between;
  }
  .service-heading-right {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }
  .service-inline-toolbar {
    align-items: stretch;
    width: 100%;
    flex-wrap: wrap;
    margin-left: 0;
  }
  .environment-state {
    width: 100%;
    margin-left: 0;
  }
  .token-form {
    align-items: stretch;
    flex-direction: column;
  }
  .token-form .el-input {
    width: 100%;
  }
  .service-search {
    min-width: 0;
    width: 100%;
  }
  .refresh-interval {
    width: 100%;
  }
  .updated-time {
    margin-left: 0;
  }
  .pod-detail {
    padding: 5px 0 14px;
  }
}
</style>
