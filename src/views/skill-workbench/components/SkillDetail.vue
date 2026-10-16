<template>
  <section class="skill-detail" aria-label="Skill 详情">
    <template v-if="skill">
      <header>
        <div>
          <span class="eyebrow">SKILL DETAILS</span>
          <h2>{{ annotation.alias || skill.name }}</h2>
        </div>
      </header>
      <p class="description">{{ skill.description || "未填写描述" }}</p>
      <div class="chips">
        <el-tag size="small">{{
          skill.scope === "global" ? "全局" : skill.project || "项目"
        }}</el-tag
        ><el-tag type="info" size="small">{{ skill.origin }}</el-tag>
      </div>
      <p class="muted">
        目录标签仅说明文件来源，不代表当前会话加载或实际启用。
      </p>
      <el-alert
        v-for="warning in skill.warnings"
        :key="warning"
        :title="warning"
        type="warning"
        :closable="false"
      />
      <el-tabs v-model="tab">
        <el-tab-pane label="说明预览" name="preview"
          ><div class="markdown" v-html="preview"></div
        ></el-tab-pane>
        <el-tab-pane label="原文" name="raw">
          <pre>{{
            activeFile?.content ??
            activeFile?.skipped ??
            "该文件为二进制或尚未读取"
          }}</pre>
        </el-tab-pane>
        <el-tab-pane label="文件结构" name="files">
          <el-tree
            :data="fileTree"
            node-key="id"
            default-expand-all
            @node-click="selectFile"
          />
          <p class="muted">
            {{ skill.files.length }} 个文件 ·
            {{ skill.complete ? "完整读取" : "部分文件未读取" }}
          </p>
        </el-tab-pane>
        <el-tab-pane label="安装位置" name="locations"
          ><article v-for="item in locations" :key="item.id" class="location">
            <strong>{{ item.sourceLabel }}</strong
            ><code>{{ item.location }}</code
            ><small v-if="item.realPath">真实目录：{{ item.realPath }}</small
            ><el-button size="small" @click="emit('copy', item.location)">{{
              imported ? "复制记录路径" : "复制路径"
            }}</el-button>
          </article>
          <p v-if="imported" class="muted">
            手动目录导入只提供相对路径；快照中的绝对路径来自导出记录，不代表本机可访问。
          </p></el-tab-pane
        >
        <el-tab-pane label="个人备注" name="notes">
          <el-form label-position="top">
            <el-form-item label="中文别名"
              ><el-input
                :model-value="annotation.alias"
                maxlength="100"
                @update:model-value="update({ alias: $event })"
            /></el-form-item>
            <el-form-item label="个人标签（逗号分隔）"
              ><el-input
                :model-value="annotation.tags.join(', ')"
                @change="updateTags"
            /></el-form-item>
            <el-form-item label="备注"
              ><el-input
                :model-value="annotation.note"
                type="textarea"
                :rows="5"
                maxlength="4000"
                @update:model-value="update({ note: $event })"
            /></el-form-item>
          </el-form>
          <p class="muted">
            {{
              remember
                ? "已开启浏览器本地保存，不修改 Skill 原文件。"
                : "仅当前页面保留；开启“记住工作台”后才保存。"
            }}
          </p>
        </el-tab-pane>
        <el-tab-pane label="元信息" name="metadata">
          <pre>{{ JSON.stringify(skill.metadata, null, 2) }}</pre>
        </el-tab-pane>
      </el-tabs>
      <div class="file-actions">
        <el-select v-model="activePath" aria-label="选择文件" filterable
          ><el-option
            v-for="file in skill.files"
            :key="file.path"
            :value="file.path"
            :label="file.path" /></el-select
        ><el-button
          :disabled="activeFile?.content === undefined"
          @click="emit('copy', activeFile?.content || '')"
          >复制内容</el-button
        ><el-button v-if="!imported" @click="emit('open', skill.id, activePath)"
          >编辑器打开</el-button
        >
      </div>
    </template>
    <el-empty v-else description="选择一个 Skill 查看说明、文件和安装位置" />
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type {
  SkillAnnotation,
  SkillRecord,
} from "../../../types/skillWorkbench";
const props = defineProps<{
  skill?: SkillRecord;
  annotation: SkillAnnotation;
  locations: SkillRecord[];
  imported: boolean;
  remember: boolean;
}>();
const emit = defineEmits<{
  copy: [text: string];
  open: [id: string, path: string];
  annotate: [value: SkillAnnotation];
}>();
const tab = ref("preview"),
  activePath = ref("SKILL.md");
watch(
  () => props.skill?.id,
  () => {
    activePath.value = "SKILL.md";
    tab.value = "preview";
  },
);
const activeFile = computed(() =>
  props.skill?.files.find((f) => f.path === activePath.value),
);
const preview = computed(() => {
  const content =
    activePath.value === "SKILL.md"
      ? props.skill?.body || ""
      : activeFile.value?.content || "";
  if (!/\.md$/i.test(activePath.value))
    return `<pre>${DOMPurify.sanitize(content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))}</pre>`;
  return DOMPurify.sanitize(marked.parse(content, { async: false }), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      "img",
      "iframe",
      "style",
      "video",
      "audio",
      "source",
      "form",
      "input",
    ],
    FORBID_ATTR: ["style"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i,
  });
});
interface FileNode {
  id: string;
  label: string;
  filePath?: string;
  children: FileNode[];
}
const fileTree = computed(() => {
  const roots: FileNode[] = [];
  for (const file of props.skill?.files || []) {
    let nodes = roots,
      prefix = "";
    for (const [index, name] of file.path.split("/").entries()) {
      prefix += `${name}/`;
      let node = nodes.find((n) => n.label === name);
      if (!node) {
        node = { id: prefix, label: name, children: [] };
        nodes.push(node);
      }
      if (index === file.path.split("/").length - 1) node.filePath = file.path;
      nodes = node.children;
    }
  }
  return roots;
});
const selectFile = (node: FileNode) => {
  if (node.filePath) {
    activePath.value = node.filePath;
    tab.value = /\.md$/i.test(node.filePath) ? "preview" : "raw";
  }
};
const update = (value: Partial<SkillAnnotation>) =>
  emit("annotate", { ...props.annotation, ...value });
const updateTags = (value: string) =>
  update({
    tags: [
      ...new Set(
        value
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ].slice(0, 20),
  });
</script>
<style scoped>
.skill-detail {
  min-width: 0;
  padding: 24px;
  overflow: auto;
  background: #fff;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
h2 {
  margin: 6px 0;
  font-size: 21px;
  overflow-wrap: anywhere;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.12em;
  color: #8999b0;
}
.description {
  color: #51627d;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.muted {
  color: #8591a4;
  font-size: 12px;
  line-height: 1.6;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font:
    12px/1.7 ui-monospace,
    monospace;
  padding: 14px;
  background: #f7f9fc;
}
.markdown {
  font-size: 14px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.markdown :deep(pre) {
  overflow: auto;
  background: #f7f9fc;
  padding: 14px;
  font-size: 12px;
}
.markdown :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}
.markdown :deep(td),
.markdown :deep(th) {
  border: 1px solid #dde4ef;
  padding: 6px;
}
.file-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px solid #edf0f5;
  padding-top: 16px;
}
.file-actions .el-select {
  width: 100%;
}
.location {
  padding: 12px 0;
  border-bottom: 1px solid #edf0f5;
  display: grid;
  gap: 8px;
}
.location code,
.location small {
  overflow-wrap: anywhere;
}
.location .el-button {
  justify-self: start;
}
@media print {
  .file-actions {
    display: none;
  }
}
</style>
