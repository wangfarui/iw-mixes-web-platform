<template>
  <el-dialog
    :model-value="visible"
    title="选择本机目录"
    width="min(700px, 94vw)"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <div class="directory-shortcuts">
      <el-button
        v-for="root in listing.roots"
        :key="root.path"
        size="small"
        :disabled="loading"
        @click="load(root.path)"
        >{{ root.label }}</el-button
      ><el-button
        size="small"
        :disabled="loading || !listing.parent"
        @click="load(listing.parent)"
        >上一级</el-button
      ><el-checkbox v-model="showHidden" :disabled="loading"
        >显示隐藏目录</el-checkbox
      >
    </div>
    <div class="directory-address">
      <el-input
        v-model="address"
        aria-label="浏览目录路径"
        placeholder="输入绝对路径，或点击下方目录进入"
        @keyup.enter="load(address)"
      /><el-button :disabled="loading" @click="load(address)">前往</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-input
      v-model="keyword"
      clearable
      placeholder="筛选当前目录中的文件夹"
      aria-label="筛选文件夹"
      class="directory-search"
    />
    <div v-loading="loading" class="directory-entries">
      <button
        v-for="entry in pageEntries"
        :key="entry.path"
        type="button"
        class="directory-entry"
        :disabled="loading"
        :title="entry.path"
        @click="load(entry.path)"
      >
        <el-icon><FolderOpened /></el-icon><span>{{ entry.name }}</span
        ><small v-if="entry.symbolicLink">链接</small
        ><el-icon><ArrowRight /></el-icon></button
      ><el-empty
        v-if="!loading && !filtered.length"
        :description="keyword ? '没有匹配的目录' : '当前目录没有可进入的子目录'"
        :image-size="60"
      />
    </div>
    <el-pagination
      v-if="filtered.length > pageSize"
      v-model:current-page="page"
      :page-size="pageSize"
      :total="filtered.length"
      layout="prev, pager, next"
      small
    />
    <p v-if="listing.truncated" class="muted">
      仅显示前 2000 个目录，请输入更具体的路径。
    </p>
    <p class="muted">
      点击文件夹进入，确认后选择当前目录。只读取本机目录名称，不上传内容。
    </p>
    <template #footer
      ><div class="directory-footer">
        <code>{{ listing.path || "尚未选择目录" }}</code>
        <div>
          <el-button @click="emit('update:visible', false)">取消</el-button
          ><el-button
            type="primary"
            :disabled="loading || !listing.path"
            @click="confirm"
            >选择此目录</el-button
          >
        </div>
      </div></template
    >
  </el-dialog>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ArrowRight, FolderOpened } from "@element-plus/icons-vue";
import type { SkillDirectoryListing } from "../../../types/skillWorkbench";
const props = defineProps<{
  visible: boolean;
  initialPath: string;
  browse: (
    path?: string,
    showHidden?: boolean,
  ) => Promise<SkillDirectoryListing>;
}>();
const emit = defineEmits<{
  "update:visible": [value: boolean];
  select: [path: string];
}>();
const empty = (): SkillDirectoryListing => ({
  path: "",
  parent: "",
  roots: [{ label: "用户目录", path: "" }],
  entries: [],
  truncated: false,
});
const listing = ref(empty()),
  address = ref(""),
  loading = ref(false),
  showHidden = ref(false),
  error = ref(""),
  keyword = ref(""),
  page = ref(1),
  pageSize = 60;
let requestId = 0;
const filtered = computed(() =>
  listing.value.entries.filter((entry) =>
    entry.name.toLowerCase().includes(keyword.value.trim().toLowerCase()),
  ),
);
const pageEntries = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const load = async (path = "") => {
  const current = ++requestId;
  loading.value = true;
  error.value = "";
  try {
    const result = await props.browse(path, showHidden.value);
    if (current !== requestId || !props.visible) return;
    listing.value = result;
    address.value = result.path;
    keyword.value = "";
    page.value = 1;
  } catch (e) {
    if (current === requestId) error.value = (e as Error).message;
  } finally {
    if (current === requestId) loading.value = false;
  }
};
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      listing.value = empty();
      address.value = props.initialPath;
      keyword.value = "";
      void load(props.initialPath);
    } else {
      requestId++;
      loading.value = false;
    }
  },
);
watch(showHidden, () => {
  if (props.visible) void load(listing.value.path || props.initialPath);
});
watch(keyword, () => {
  page.value = 1;
});
const confirm = () => {
  if (!listing.value.path || loading.value) return;
  emit("select", listing.value.path);
  emit("update:visible", false);
};
</script>
<style scoped>
.directory-shortcuts {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.directory-shortcuts .el-button + .el-button {
  margin-left: 0;
}
.directory-address {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.directory-search {
  margin-top: 12px;
}
.directory-entries {
  min-height: 220px;
  max-height: 340px;
  overflow: auto;
  margin-top: 12px;
  border: 1px solid #e4eaf2;
  border-radius: 6px;
}
.directory-entry {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: 0;
  border-bottom: 1px solid #eef1f6;
  background: white;
  color: #40526c;
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.directory-entry:hover,
.directory-entry:focus-visible {
  background: #edf4ff;
}
.directory-entry span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.directory-entry > .el-icon:first-child {
  color: #6396e9;
}
.directory-entry small {
  color: #929fb1;
}
.directory-footer {
  display: grid;
  gap: 12px;
}
.directory-footer code {
  text-align: left;
  overflow-wrap: anywhere;
  font-size: 12px;
  color: #7486a0;
}
.muted {
  color: #8a98ac;
  font-size: 12px;
  line-height: 1.6;
}
.el-pagination {
  margin-top: 12px;
}
</style>
