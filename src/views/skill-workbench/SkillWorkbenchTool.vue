<template>
  <main class="skills-page">
    <header class="topbar">
      <div>
        <h1>Skill 工作台</h1>
        <span class="privacy"
          >本机扫描 · 内容不上传 ·
          {{ snapshot.packages.length }} 个安装位置</span
        >
      </div>
      <div class="top-actions">
        <el-tag :type="connected ? 'success' : 'info'">{{
          connected ? "本机助手已连接" : "本机助手未连接"
        }}</el-tag
        ><el-button @click="settingsVisible = true">连接设置</el-button
        ><ToolHomeButton />
      </div>
    </header>
    <section class="toolbar">
      <el-input
        v-model="keyword"
        clearable
        :prefix-icon="Search"
        placeholder="搜索名称、描述、正文、路径或个人标签"
        aria-label="搜索 Skills"
      /><el-select v-model="toolFilter" aria-label="工具筛选"
        ><el-option label="全部工具目录" value="all" /><el-option
          v-for="(label, key) in toolNames"
          :key="key"
          :label="label"
          :value="key" /></el-select
      ><el-button :disabled="busy || !connected" @click="scan"
        >刷新扫描</el-button
      ><el-button @click="sourceVisible = true">添加来源</el-button
      ><el-button :disabled="busy" @click="importVisible = true"
        >手动导入</el-button
      ><el-dropdown @command="exportData"
        ><el-button :disabled="!records.length"
          >导出 <el-icon><ArrowDown /></el-icon></el-button
        ><template #dropdown
          ><el-dropdown-menu
            ><el-dropdown-item command="json">清单 JSON</el-dropdown-item
            ><el-dropdown-item command="csv">清单 CSV</el-dropdown-item
            ><el-dropdown-item command="snapshot"
              >快照（包含已读取正文）</el-dropdown-item
            ><el-dropdown-item command="print"
              >打印当前清单</el-dropdown-item
            ></el-dropdown-menu
          ></template
        ></el-dropdown
      ><el-button :disabled="busy" @click="clearAll">清空</el-button>
    </section>
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      :closable="true"
      @close="error = ''"
    />
    <div v-if="busy" class="progress" role="status">
      <el-icon class="is-loading"><Loading /></el-icon
      ><span>{{ progress }}</span
      ><el-button size="small" @click="cancel">取消</el-button>
    </div>
    <el-alert
      v-if="stale"
      title="本机连接中断，当前结果可能已过时。可重新连接或手动导入。"
      type="warning"
      :closable="false"
    />
    <div class="workbench">
      <aside class="scope-panel" aria-label="Skill 范围">
        <nav class="scope-navigation" aria-label="Skills 分类">
          <button
            v-for="item in navigationScopes"
            :key="item.key"
            :class="{ active: scope === item.key }"
            @click="scope = item.key"
          >
            <span>{{ item.title }}</span
            ><small>{{ item.count }}</small>
          </button>
        </nav>
        <div class="scope-footer">
          <button @click="sourceManagementVisible = true">
            <el-icon><FolderOpened /></el-icon><span>来源管理</span
            ><small>{{ removableSources.length }}</small>
          </button>
        </div>
      </aside>
      <section class="list-panel" aria-label="Skill 列表">
        <div class="list-heading">
          <strong>{{ filtered.length }} 个 Skills</strong
          ><span>点击卡片查看详情</span>
        </div>
        <template v-if="!records.length && !busy"
          ><div class="onboarding">
            <el-icon :size="40"><FolderOpened /></el-icon>
            <h2>把本机 Skills 放到一个工作台里</h2>
            <p>
              连接助手，扫描全局目录和项目；也可以直接选择包含 SKILL.md 的目录。
            </p>
            <el-button type="primary" @click="settingsVisible = true"
              >连接本机助手</el-button
            ><el-button @click="importVisible = true">手动导入目录</el-button>
          </div></template
        >
        <el-empty
          v-else-if="!filtered.length"
          description="没有匹配的 Skills"
        />
        <div v-else class="skill-grid">
          <button
            v-for="record in pageRecords"
            :key="record.id"
            class="skill-card"
            :class="{ selected: detailVisible && selectedId === record.id }"
            :aria-label="`查看 ${annotations[record.annotationKey]?.alias || record.name} 详情`"
            aria-haspopup="dialog"
            @click="openDetail(record.id)"
          >
            <div class="card-heading">
              <strong>{{
                annotations[record.annotationKey]?.alias || record.name
              }}</strong>
            </div>
            <p>{{ record.description || "未填写描述" }}</p>
            <div class="card-meta">
              <span>{{
                record.scope === "global" ? "全局" : record.project
              }}</span
              ><span>{{ toolNames[record.tool] }}</span>
            </div>
          </button>
        </div>
        <el-pagination
          v-if="filtered.length > pageSize"
          v-model:current-page="page"
          :page-size="pageSize"
          :total="filtered.length"
          layout="prev, pager, next"
          small
        />
      </section>
    </div>
    <el-drawer
      v-model="detailVisible"
      title="Skill 详情"
      class="skill-drawer"
      size="var(--skill-drawer-width)"
      append-to-body
      destroy-on-close
    >
      <SkillDetail
        v-if="selected"
        :key="selected.id"
        :skill="selected"
        :annotation="selectedAnnotation"
        :locations="locations"
        :imported="selectedImported"
        :remember="remember"
        @copy="copyText"
        @open="openFile"
        @annotate="annotate"
      />
    </el-drawer>
    <section v-if="snapshot.warnings.length" class="scan-warnings">
      <el-collapse
        ><el-collapse-item :title="`扫描提示（${snapshot.warnings.length}）`"
          ><p v-for="warning in snapshot.warnings" :key="warning">
            {{ warning }}
          </p></el-collapse-item
        ></el-collapse
      >
    </section>
    <el-dialog
      v-model="settingsVisible"
      title="连接本机助手"
      width="min(620px, 94vw)"
      ><p>
        本机助手在你的电脑扫描文件，网页直接连接它。支持 macOS 和 Windows，需
        Node.js 20 或更高版本。
      </p>
      <div class="workspace-settings">
        <el-checkbox v-model="autoRefresh">文件变化后自动刷新</el-checkbox>
        <el-checkbox v-model="remember">记住我的工作台</el-checkbox>
        <p class="muted">
          开启后仅在当前浏览器保存来源、配对信息和备注，不保存 Skill 正文。
        </p>
        <el-button size="small" @click="clearSaved">清除本地设置</el-button>
        <p v-if="snapshot.generatedAt" class="muted">
          最近扫描：{{ new Date(snapshot.generatedAt).toLocaleString("zh-CN") }}
        </p>
      </div>
      <el-form label-position="top"
        ><el-form-item label="本机端口"
          ><el-input-number
            v-model="port"
            :min="1"
            :max="65535" /></el-form-item
        ><el-form-item label="配对令牌"
          ><el-input
            v-model="token"
            type="password"
            show-password
            placeholder="粘贴本机助手提供的配对令牌"
            autocomplete="off" /></el-form-item></el-form
      ><el-button type="primary" :loading="connecting" @click="connect"
        >连接并扫描</el-button
      >
      <p v-if="connectionMessage" role="status">{{ connectionMessage }}</p>
      <el-tabs
        ><el-tab-pane label="macOS"
          ><p>在 Web 项目目录执行，安装或升级助手：</p>
          <pre>
npm run ai-launcher:install
npm run ai-launcher:pair</pre></el-tab-pane
        ><el-tab-pane label="Windows"
          ><p>在 Web 项目目录用 PowerShell 执行：</p>
          <pre>
powershell -ExecutionPolicy Bypass -File .\scripts\aiLauncher.ps1 install
powershell -ExecutionPolicy Bypass -File .\scripts\aiLauncher.ps1 pair</pre>
          <p>
            安装后会启动，并设置当前用户登录时运行。也可执行
            start、status、uninstall。
          </p></el-tab-pane
        ></el-tabs
      >
      <p class="muted">
        已安装旧版助手时，重新执行安装命令升级。浏览器可能要求允许访问本地网络。令牌仅用于本机连接；开启“记住工作台”才保存到当前浏览器。
      </p></el-dialog
    >
    <el-dialog
      v-model="sourceVisible"
      title="添加扫描来源"
      width="min(580px, 94vw)"
      ><el-form label-position="top"
        ><el-form-item label="目录绝对路径"
          ><el-input
            v-model="sourceForm.path"
            placeholder="/Users/你/workspaces/project 或 C:\Users\你\project"
          >
            <template #append
              ><el-button
                :disabled="!connected || busy"
                @click="chooseDirectory"
                >选择目录</el-button
              ></template
            >
          </el-input></el-form-item
        ><el-form-item label="来源名称"
          ><el-input
            v-model="sourceForm.label"
            placeholder="例如：IW Web 项目" /></el-form-item
        ><el-form-item label="范围"
          ><el-radio-group v-model="sourceForm.scope"
            ><el-radio value="global">全局</el-radio
            ><el-radio value="project">项目</el-radio></el-radio-group
          ></el-form-item
        ></el-form
      >
      <p class="muted">
        仅扫描所选目录本身及当前项目的
        skills、.agents/skills、.codex/skills、.claude/skills、.cursor/skills，不扫描子项目。
      </p>
      <el-button
        type="primary"
        :disabled="!connected || busy || pickingDirectory"
        @click="addSource"
        >添加并扫描</el-button
      >
      <p v-if="!connected" class="muted">
        先连接本机助手；无需助手时可使用“手动导入”。
      </p>
    </el-dialog>
    <el-dialog
      v-model="sourceManagementVisible"
      title="来源管理"
      width="min(680px, 94vw)"
    >
      <div class="source-management-toolbar">
        <span>已添加 {{ removableSources.length }} 个来源</span>
        <el-button
          type="primary"
          :disabled="busy"
          @click="
            sourceManagementVisible = false;
            sourceVisible = true;
          "
          >添加来源</el-button
        >
      </div>
      <el-input
        v-model="sourceKeyword"
        clearable
        :prefix-icon="Search"
        placeholder="搜索来源名称或路径"
        aria-label="搜索来源"
      />
      <div class="source-management-list">
        <el-empty
          v-if="!managedSources.length"
          :description="
            removableSources.length ? '没有匹配的来源' : '还没有添加扫描来源'
          "
        />
        <div
          class="configured-source"
          v-for="source in managedSources"
          :key="source.id"
        >
          <div class="source-information">
            <div class="source-title">
              <strong>{{ source.label }}</strong
              ><el-tag
                size="small"
                :type="source.scope === 'global' ? 'info' : 'primary'"
                >{{ source.scope === "global" ? "全局" : "项目" }}</el-tag
              ><el-tag v-if="source.imported" size="small" type="info"
                >手动导入</el-tag
              >
            </div>
            <small>{{ source.path || "浏览器手动导入，无本机绝对路径" }}</small>
          </div>
          <el-button
            size="small"
            :disabled="busy"
            @click="removeSource(source.id)"
            >移除</el-button
          >
        </div>
      </div>
      <p class="muted">
        移除仅取消该来源及工作台中的扫描结果，不会删除本机文件。
      </p>
    </el-dialog>
    <el-dialog v-model="importVisible" title="手动导入" width="min(560px, 94vw)"
      ><p>在浏览器内读取选中的目录或扫描快照，不上传内容。</p>
      <el-form label-position="top"
        ><el-form-item label="来源名称"
          ><el-input
            v-model="importLabel"
            placeholder="例如：个人全局 Skills" /></el-form-item
        ><el-form-item label="范围"
          ><el-radio-group v-model="importScope"
            ><el-radio value="global">全局</el-radio
            ><el-radio value="project">项目</el-radio></el-radio-group
          ></el-form-item
        ></el-form
      ><el-button
        type="primary"
        :disabled="busy"
        @click="directoryInput?.click()"
        >选择目录</el-button
      ><el-button :disabled="busy" @click="snapshotInput?.click()"
        >导入快照 JSON</el-button
      >
      <p class="muted">
        选择包含 SKILL.md 的 Skills 目录。隐藏目录在 macOS 文件选择器中可用
        Command + Shift + . 显示。导入不自动监测文件变化。
      </p></el-dialog
    >
    <input
      ref="directoryInput"
      type="file"
      webkitdirectory
      multiple
      hidden
      @change="importDirectory"
    /><input
      ref="snapshotInput"
      type="file"
      accept="application/json,.json"
      hidden
      @change="importSnapshot"
    />
    <DirectoryBrowser
      v-model:visible="pickingDirectory"
      :initial-path="sourceForm.path"
      :browse="browseDirectory"
      @select="selectDirectory"
    />
  </main>
</template>
<script setup lang="ts">
import {
  computed,
  onMounted,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
  nextTick,
} from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowDown,
  FolderOpened,
  Loading,
  Search,
} from "@element-plus/icons-vue";
import ToolHomeButton from "../tools/components/ToolHomeButton.vue";
import SkillDetail from "./components/SkillDetail.vue";
import DirectoryBrowser from "./components/DirectoryBrowser.vue";
import { createSkillWorkbenchClient } from "../../services/skillWorkbenchClient";
import {
  buildSkillScopes,
  matchesSkillScope,
  projectNameFromPath,
  visibleSkills,
} from "../../utils/skillWorkbench/navigation";
import { getAiLauncherToken } from "../../services/aiLauncherClient";
import {
  blankSnapshot,
  exportSkillCsv,
  exportSkillList,
  LIMITS,
  mergeSnapshots,
  transferableSnapshot,
} from "../../utils/skillWorkbench/core";
import {
  emptyAnnotation,
  readWorkspaceSettings,
  saveWorkspaceSettings,
  STORAGE_KEY,
} from "../../utils/skillWorkbench/storage";
import type {
  SkillAnnotation,
  SkillRecord,
  SkillScope,
  SkillSnapshot,
  SkillSource,
} from "../../types/skillWorkbench";
const saved = readWorkspaceSettings();
const remember = ref(saved.enabled),
  annotations = ref<Record<string, SkillAnnotation>>(saved.annotations),
  configuredSources = ref<SkillSource[]>(saved.sources);
const port = ref(saved.port),
  token = ref(saved.token || getAiLauncherToken());
const snapshot = ref<SkillSnapshot>(blankSnapshot()),
  records = ref<SkillRecord[]>([]),
  selectedId = ref(""),
  detailVisible = ref(false);
const keyword = ref(""),
  scope = ref("all"),
  toolFilter = ref("all"),
  page = ref(1),
  pageSize = 60;
const connected = ref(false),
  connecting = ref(false),
  busy = ref(false),
  stale = ref(false),
  autoRefresh = ref(true),
  error = ref(""),
  progress = ref(""),
  connectionMessage = ref("");
const settingsVisible = ref(false),
  sourceVisible = ref(false),
  sourceManagementVisible = ref(false),
  sourceKeyword = ref(""),
  importVisible = ref(false);
const sourceForm = reactive({
  path: "",
  label: "",
  scope: "project" as SkillScope,
  kind: "project" as const,
});
const importLabel = ref(""),
  importScope = ref<SkillScope>("project"),
  directoryInput = ref<HTMLInputElement>(),
  snapshotInput = ref<HTMLInputElement>();
const toolNames = {
  shared: "共享目录 (.agents)",
  codex: "Codex 目录",
  claude: "Claude 目录",
  cursor: "Cursor 目录",
  unknown: "自定义 / 未知目录",
};
const navigationScopes = computed(() =>
  buildSkillScopes(snapshot.value.sources, records.value),
);
watch(navigationScopes, (items) => {
  if (!items.some((item) => item.key === scope.value)) scope.value = "all";
});
const client = () => createSkillWorkbenchClient(port.value, token.value);
let worker: Worker | undefined,
  rejectWorker: ((error: Error) => void) | undefined,
  jobId = "",
  generation = 0,
  timer: ReturnType<typeof setInterval> | undefined,
  polling = false,
  lastRevision = 0;
const selected = computed(() =>
  records.value.find((r) => r.id === selectedId.value),
);
const selectedAnnotation = computed(() =>
  selected.value
    ? annotations.value[selected.value.annotationKey] || emptyAnnotation()
    : emptyAnnotation(),
);
const selectedImported = computed(
  () =>
    snapshot.value.sources.find((s) => s.id === selected.value?.sourceId)
      ?.imported === true,
);
const locations = computed(() =>
  selected.value?.realPath && !selected.value.imported
    ? records.value.filter(
        (r) => !r.imported && r.realPath === selected.value?.realPath,
      )
    : selected.value
      ? [selected.value]
      : [],
);
const filtered = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  return visibleSkills(
    records.value.filter((record) => {
      if (!matchesSkillScope(record, scope.value)) return false;
      if (toolFilter.value !== "all" && record.tool !== toolFilter.value)
        return false;
      const annotation = annotations.value[record.annotationKey];
      if (
        query &&
        !`${record.searchText}\n${annotation?.alias || ""}\n${annotation?.tags.join(" ") || ""}\n${annotation?.note || ""}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      return true;
    }),
  );
});
const openDetail = (id: string) => {
  selectedId.value = id;
  detailVisible.value = true;
};
watch(selected, (record) => {
  if (!record) detailVisible.value = false;
});
const printing = ref(false);
const pageRecords = computed(() =>
  printing.value
    ? filtered.value
    : filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
watch([keyword, scope, toolFilter], () => {
  page.value = 1;
});
const persist = () => {
  try {
    saveWorkspaceSettings({
      enabled: remember.value,
      annotations: annotations.value,
      sources: configuredSources.value,
      token: token.value,
      port: port.value,
    });
  } catch {
    ElMessage.warning("浏览器本地存储不可用，当前数据仍可使用");
  }
};
watch([remember, annotations, configuredSources, token, port], persist, {
  deep: true,
});
const processSnapshot = (
  next: SkillSnapshot,
  files?: File[],
  source?: SkillSource,
  snapshotFile?: File,
) =>
  new Promise<void>((resolve, reject) => {
    worker = new Worker(
      new URL("../../workers/skillWorkbench.worker.ts", import.meta.url),
      { type: "module" },
    );
    rejectWorker = reject;
    worker.onmessage = ({ data }) => {
      worker?.terminate();
      worker = undefined;
      rejectWorker = undefined;
      if (data.error) {
        reject(new Error(data.error));
        return;
      }
      snapshot.value = data.snapshot;
      records.value = data.records;
      if (!records.value.some((r) => r.id === selectedId.value))
        selectedId.value = "";
      page.value = Math.min(
        page.value,
        Math.max(1, Math.ceil(filtered.value.length / pageSize)),
      );
      resolve();
    };
    worker.onerror = () => {
      worker?.terminate();
      worker = undefined;
      rejectWorker = undefined;
      reject(new Error("本地解析失败，请重试"));
    };
    const transferable = transferableSnapshot(next);
    try {
      worker.postMessage(
        files
          ? { kind: "import", files, source, base: transferable }
          : snapshotFile
            ? { kind: "snapshot", file: snapshotFile, base: transferable }
            : { kind: "normalize", snapshot: transferable },
      );
    } catch (e) {
      worker.terminate();
      worker = undefined;
      rejectWorker = undefined;
      reject(new Error(`传递本地数据失败：${(e as Error).message}`));
    }
  });
const scan = async () => {
  if (busy.value || !connected.value) return;
  if (!configuredSources.value.length) {
    sourceVisible.value = true;
    return;
  }
  const current = ++generation,
    agent = client();
  busy.value = true;
  error.value = "";
  progress.value = "正在扫描本机目录…";
  try {
    jobId = (await agent.scan(configuredSources.value)).id;
    while (current === generation) {
      const job = await agent.job(jobId);
      progress.value = `已检查 ${job.progress.visited} 个条目，找到 ${job.progress.skills} 个 Skills`;
      if (job.state === "succeeded" && job.snapshot) {
        const imported = snapshot.value.sources
          .filter((s) => s.imported)
          .map((s) => s.id);
        const base = {
          ...snapshot.value,
          sources: snapshot.value.sources.filter((s) => s.imported),
          packages: snapshot.value.packages.filter((p) =>
            imported.includes(p.sourceId),
          ),
        };
        await processSnapshot(mergeSnapshots(base, job.snapshot));
        stale.value = false;
        lastRevision = (await agent.changes()).revision;
        return;
      }
      if (job.state !== "running") throw new Error(job.message || "扫描已取消");
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } catch (e) {
    if (current === generation) error.value = (e as Error).message;
  } finally {
    if (current === generation) {
      busy.value = false;
      jobId = "";
    }
  }
};
const connect = async () => {
  if (connecting.value || busy.value) return;
  connecting.value = true;
  connectionMessage.value = "";
  error.value = "";
  try {
    const status = await client().status();
    if (!status.paired)
      throw new Error("令牌未配对，请执行 pair 命令并粘贴令牌");
    if (!status.capabilities?.includes("skills-current-directory"))
      throw new Error(
        "本机助手需升级至 1.5.3，升级后按当前目录扫描，不扫描子项目",
      );
    connected.value = true;
    stale.value = false;
    const discovered = (await client().discover()).sources;
    for (const source of discovered)
      if (!configuredSources.value.some((s) => s.path === source.path))
        configuredSources.value.push(source);
    connectionMessage.value = "连接成功";
    settingsVisible.value = false;
    await scan();
  } catch (e) {
    connected.value = false;
    connectionMessage.value = (e as Error).message;
    error.value = connectionMessage.value;
  } finally {
    connecting.value = false;
  }
};
const cancel = async () => {
  generation++;
  const id = jobId;
  jobId = "";
  worker?.terminate();
  worker = undefined;
  rejectWorker?.(new Error("处理已取消"));
  rejectWorker = undefined;
  if (id)
    try {
      await client().cancel(id);
    } catch {
      /* Local cancellation still releases the UI. */
    }
  busy.value = false;
  progress.value = "";
  ElMessage.info("已取消");
};
const pickingDirectory = ref(false);
const browseDirectory = (path = "", showHidden = false) =>
  client().directories(path, showHidden);
const chooseDirectory = () => {
  if (!connected.value || busy.value) return;
  pickingDirectory.value = true;
};
const selectDirectory = (path: string) => {
  sourceForm.path = path;
  if (!sourceForm.label.trim()) sourceForm.label = projectNameFromPath(path);
};
const addSource = async () => {
  if (!sourceForm.path.trim()) {
    ElMessage.warning("请输入目录绝对路径");
    return;
  }
  const path = sourceForm.path.trim(),
    label =
      sourceForm.label.trim() ||
      path.replace(/\\/g, "/").split("/").pop() ||
      "自定义目录";
  if (configuredSources.value.some((s) => s.path === path)) {
    ElMessage.warning("该目录已经添加");
    return;
  }
  configuredSources.value.push({
    ...sourceForm,
    path,
    label,
    id: crypto.randomUUID(),
    project: sourceForm.scope === "project" ? label : "",
  });
  sourceVisible.value = false;
  sourceForm.path = "";
  sourceForm.label = "";
  await scan();
};
const removableSources = computed(() => [
  ...configuredSources.value,
  ...snapshot.value.sources.filter((s) => s.imported),
]);
const managedSources = computed(() => {
  const query = sourceKeyword.value.trim().toLowerCase();
  return removableSources.value.filter(
    (source) =>
      !query || `${source.label}\n${source.path}`.toLowerCase().includes(query),
  );
});
const removeSource = async (id: string) => {
  if (busy.value) return;
  const source = removableSources.value.find((s) => s.id === id);
  configuredSources.value = configuredSources.value.filter((s) => s.id !== id);
  // Scanner IDs are based on paths; remove by path to also cover a source created by the form.
  const ids = new Set(
    snapshot.value.sources
      .filter(
        (s) =>
          s.id === id ||
          (!source?.imported && source?.path && s.path === source.path),
      )
      .map((s) => s.id),
  );
  await processSnapshot({
    ...snapshot.value,
    sources: snapshot.value.sources.filter((s) => !ids.has(s.id)),
    packages: snapshot.value.packages.filter((p) => !ids.has(p.sourceId)),
  });
  if (connected.value && !source?.imported) {
    try {
      await client().clear();
      if (configuredSources.value.length) await scan();
    } catch (e) {
      error.value = (e as Error).message;
    }
  }
};
const importDirectory = async (event: Event) => {
  const input = event.target as HTMLInputElement,
    files = Array.from(input.files || []);
  input.value = "";
  if (!files.length || busy.value) return;
  const current = ++generation,
    base = snapshot.value;
  busy.value = true;
  progress.value = `正在本地读取 ${files.length} 个文件…`;
  error.value = "";
  importVisible.value = false;
  const label =
    importLabel.value.trim() ||
    files[0].webkitRelativePath.split("/")[0] ||
    "导入目录";
  const source: SkillSource = {
    id: crypto.randomUUID(),
    path: "",
    label,
    scope: importScope.value,
    kind: "skills",
    project: importScope.value === "project" ? label : "",
    imported: true,
  };
  try {
    await processSnapshot(base, files, source);
  } catch (e) {
    if (current === generation) error.value = (e as Error).message;
  } finally {
    if (current === generation) busy.value = false;
  }
};
const importSnapshot = async (event: Event) => {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  input.value = "";
  if (!file || busy.value) return;
  busy.value = true;
  error.value = "";
  progress.value = "正在校验并读取快照…";
  try {
    if (file.size > LIMITS.totalBytes * 2) throw new Error("快照文件过大");
    await processSnapshot(snapshot.value, undefined, undefined, file);
    importVisible.value = false;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
};
const annotate = (value: SkillAnnotation) => {
  if (selected.value)
    annotations.value = {
      ...annotations.value,
      [selected.value.annotationKey]: value,
    };
};
const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.warning("浏览器未允许复制，请手动选择文本");
  }
};
const openFile = async (id: string, path: string) => {
  try {
    await client().open(id, path);
    ElMessage.success("已请求编辑器打开");
  } catch (e) {
    ElMessage.error((e as Error).message);
  }
};
const exportData = async (action: string) => {
  if (action === "print") {
    printing.value = true;
    await nextTick();
    try {
      window.print();
    } finally {
      printing.value = false;
    }
    return;
  }
  if (action === "snapshot")
    try {
      await ElMessageBox.confirm(
        "快照将包含已读取的 Skill 正文和文件路径，仅下载到本机。",
        "导出完整快照",
        { confirmButtonText: "下载快照", cancelButtonText: "取消" },
      );
    } catch {
      return;
    }
  const data =
    action === "csv"
      ? exportSkillCsv(filtered.value)
      : action === "snapshot"
        ? JSON.stringify(snapshot.value, null, 2)
        : exportSkillList(filtered.value);
  const url = URL.createObjectURL(
      new Blob([data], {
        type:
          action === "csv"
            ? "text/csv;charset=utf-8"
            : "application/json;charset=utf-8",
      }),
    ),
    link = document.createElement("a");
  link.href = url;
  link.download = `skills-${action}-${new Date().toISOString().slice(0, 10)}.${action === "csv" ? "csv" : "json"}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const clearAll = async () => {
  await cancel();
  snapshot.value = blankSnapshot();
  records.value = [];
  selectedId.value = "";
  keyword.value = "";
  scope.value = "all";
  error.value = "";
  stale.value = false;
  if (!remember.value) {
    annotations.value = {};
    configuredSources.value = [];
  }
  if (connected.value)
    try {
      await client().clear();
    } catch {
      /* Results have already been cleared locally. */
    }
};
const clearSaved = () => {
  remember.value = false;
  localStorage.removeItem(STORAGE_KEY);
  ElMessage.success("已清除保存的工作台设置；当前页面内容仍可使用");
};
onMounted(() => {
  if (token.value) void connect();
  timer = setInterval(async () => {
    if (!connected.value || busy.value || polling) return;
    polling = true;
    try {
      const changes = await client().changes();
      if (
        autoRefresh.value &&
        changes.watchActive &&
        changes.revision !== lastRevision
      )
        await scan();
    } catch {
      connected.value = false;
      stale.value = records.value.length > 0;
    } finally {
      polling = false;
    }
  }, 4000);
});
onBeforeUnmount(() => {
  generation++;
  if (timer) clearInterval(timer);
  worker?.terminate();
  if (jobId)
    void client()
      .cancel(jobId)
      .catch(() => {});
  rejectWorker?.(new Error("页面已关闭"));
});
</script>
<style scoped>
.skills-page {
  min-height: 100vh;
  background: #f5f7fb;
  color: #26354d;
  padding: 20px;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
h1 {
  font-size: 24px;
  margin: 0 0 7px;
}
.privacy {
  font-size: 12px;
  color: #7b8ba3;
}
.top-actions,
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.toolbar {
  margin-bottom: 16px;
}
.toolbar > .el-input {
  flex: 1;
  min-width: 260px;
}
.toolbar > .el-select {
  width: 190px;
}
.toolbar .el-button + .el-button,
.top-actions .el-button + .el-button {
  margin-left: 0;
}
.workbench {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  overflow: clip;
  min-height: calc(100vh - 180px);
  background: #fff;
  margin-top: 16px;
}
.scope-panel {
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 16px;
  align-self: start;
  box-sizing: border-box;
  height: calc(100vh - 184px);
  min-height: 260px;
  overflow-wrap: anywhere;
  padding: 16px;
  background: #f9fafc;
  border-right: 1px solid #e5eaf2;
}
.scope-navigation {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.scope-footer {
  border-top: 1px solid #e5eaf2;
  margin-top: 12px;
  padding-top: 12px;
}
.scope-footer button {
  justify-content: flex-start;
}
.scope-footer small {
  margin-left: auto;
}
.scope-panel button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: none;
  border: 0;
  border-radius: 6px;
  padding: 10px;
  text-align: left;
  color: #56657c;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.scope-panel button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scope-panel button.active {
  color: #2468eb;
  background: #e9f1ff;
  font-weight: 600;
}
.scope-panel button:hover {
  background: #edf2f9;
}

.muted {
  font-size: 12px;
  color: #8492a8;
  line-height: 1.7;
}

.list-panel {
  min-width: 0;
}
.list-heading {
  display: flex;
  justify-content: space-between;
  padding: 18px 16px;
  border-bottom: 1px solid #edf0f5;
  font-size: 13px;
}
.list-heading span {
  color: #8d9ab0;
  font-size: 11px;
}
.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(250px, 100%), 1fr));
  align-content: start;
  gap: 16px;
  padding: 20px;
  max-height: calc(100vh - 260px);
  overflow-y: auto;
}
.skill-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 210px;
  padding: 18px;
  text-align: left;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
  background: #fff;
  font: inherit;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.skill-card.selected,
.skill-card:hover {
  border-color: #8eb5f5;
  box-shadow: 0 4px 14px #284a7810;
}
.skill-card:focus-visible {
  outline: 2px solid #3578ed;
  outline-offset: 2px;
}
.card-heading {
  min-height: 44px;
}
.card-heading strong {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  font-size: 15px;
  line-height: 22px;
  color: #253651;
}
.skill-card p {
  color: #718097;
  font-size: 13px;
  line-height: 21px;
  margin: 8px 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.card-meta {
  display: flex;
  gap: 8px;
  margin-top: auto;
  font-size: 11px;
  line-height: 20px;
  color: #7990b2;
  min-width: 0;
}
.card-meta span {
  padding: 0 6px;
  background: #f3f6fb;
  border-radius: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
:global(.skill-drawer) {
  --skill-drawer-width: min(960px, 68vw);
}
:global(.skill-drawer .el-drawer__header) {
  padding: 20px 24px;
  margin-bottom: 0;
  border-bottom: 1px solid #edf0f5;
}
:global(.skill-drawer .el-drawer__body) {
  padding: 0;
}
.onboarding {
  padding: 60px 24px;
  text-align: center;
}
.onboarding > .el-icon {
  color: #6b96da;
}
.onboarding h2 {
  font-size: 17px;
  line-height: 1.5;
}
.onboarding p {
  color: #8794aa;
  font-size: 13px;
  line-height: 1.8;
}
.onboarding .el-button {
  margin: 8px 4px;
}
.progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  color: #4267a0;
}
.configured-source {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #edf0f5;
  padding: 12px 0;
}
.source-management-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  color: #718097;
  font-size: 13px;
}
.source-management-list {
  max-height: min(52vh, 460px);
  overflow-y: auto;
  margin-top: 12px;
}
.source-information {
  min-width: 0;
}
.source-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 14px;
}
.configured-source .el-button {
  flex-shrink: 0;
}
.configured-source .source-information {
  min-width: 0;
  overflow-wrap: anywhere;
}
.configured-source small {
  display: block;
  color: #8592a5;
  margin-top: 5px;
}
.scan-warnings {
  margin-top: 16px;
  font-size: 12px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #f5f7fb;
  padding: 14px;
  font:
    12px/1.8 ui-monospace,
    monospace;
}
.el-pagination {
  padding: 12px;
}
@media (max-width: 1150px) {
  .workbench {
    grid-template-columns: 180px minmax(0, 1fr);
  }
  .skills-page {
    padding: 14px;
  }
}
@media (max-width: 850px) {
  .workbench {
    grid-template-columns: 180px 1fr;
  }
  .topbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 760px) {
  :global(.skill-drawer) {
    --skill-drawer-width: 100vw;
  }
}
@media (max-width: 520px) {
  .skills-page {
    padding: 10px;
  }
  .workbench {
    display: block;
  }
  .scope-panel {
    position: static;
    height: auto;
    min-height: 0;
    border-right: 0;
    border-bottom: 1px solid #e5eaf2;
  }
  .scope-navigation button {
    display: inline-flex;
    width: auto;
    gap: 5px;
  }
  .scope-panel .el-checkbox {
    display: inline-flex;
    margin-right: 10px;
  }
  .toolbar > .el-input {
    min-width: 100%;
  }
  .top-actions {
    gap: 6px;
  }
}
@media print {
  .topbar,
  .toolbar,
  .scope-panel,
  .progress,
  .scan-warnings,
  .el-pagination {
    display: none !important;
  }
  .skills-page {
    padding: 0;
    background: white;
  }
  .workbench {
    display: block;
    border: 0;
  }
  .skill-grid {
    max-height: none;
    overflow: visible;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .skill-card {
    break-inside: avoid;
    height: auto;
  }
  .skill-card p {
    -webkit-line-clamp: unset;
  }
}
</style>
