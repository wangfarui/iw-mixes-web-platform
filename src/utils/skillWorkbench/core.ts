import { parseDocument } from "yaml";
import type {
  SkillFile,
  SkillPackage,
  SkillRecord,
  SkillSnapshot,
  SkillSource,
  SkillTool,
} from "../../types/skillWorkbench";

export const IGNORE_DIRECTORY_NAMES = [
  ".git",
  "node_modules",
  "target",
  "dist",
  "build",
  ".venv",
  "vendor",
  "miniprogram_npm",
  ".idea",
  ".vscode",
  ".next",
];
export const LIMITS = {
  fileBytes: 512 * 1024,
  totalBytes: 32 * 1024 * 1024,
  fileCount: 25000,
  skillCount: 2000,
};
export const blankSnapshot = (): SkillSnapshot => ({
  version: 1,
  generatedAt: "",
  sources: [],
  packages: [],
  warnings: [],
});
export const detectTool = (location: string): SkillTool => {
  const match = location
    .replace(/\\/g, "/")
    .match(/(?:^|\/)\.(agents|codex|claude|cursor)\/skills(?:\/|$)/);
  return match
    ? (
        {
          agents: "shared",
          codex: "codex",
          claude: "claude",
          cursor: "cursor",
        } as const
      )[match[1] as "agents" | "codex" | "claude" | "cursor"]
    : "unknown";
};
export const parseSkillManifest = (content: string, fallback: string) => {
  let metadata: Record<string, unknown> = {},
    body = content.replace(/^\uFEFF/, ""),
    warnings: string[] = [];
  const match = body.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (match) {
    body = body.slice(match[0].length);
    try {
      const document = parseDocument(match[1], { uniqueKeys: true });
      if (document.errors.length) throw document.errors[0];
      const value = document.toJS({ maxAliasCount: 50 });
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("元信息应为 YAML 对象");
      JSON.stringify(value); // Reject cyclic YAML aliases before Vue renders metadata.
      metadata = value;
    } catch (error) {
      warnings.push(`元信息解析失败：${(error as Error).message}`);
    }
  } else if (body.startsWith("---")) warnings.push("YAML 元信息缺少结束标记");
  return {
    name: typeof metadata.name === "string" ? metadata.name : fallback,
    description:
      typeof metadata.description === "string" ? metadata.description : "",
    metadata,
    body,
    warnings,
  };
};
const sha = async (buffer: BufferSource) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", buffer))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
export const normalizeSnapshot = (snapshot: SkillSnapshot): SkillRecord[] => {
  const sources = new Map(snapshot.sources.map((s) => [s.id, s]));
  const records = snapshot.packages.map((pkg): SkillRecord => {
    const source = sources.get(pkg.sourceId);
    const manifest = pkg.files.find((f) => f.path === "SKILL.md");
    const parsed = parseSkillManifest(
      manifest?.content || "",
      pkg.location.replace(/\\/g, "/").split("/").pop() || "未命名",
    );
    const tool = detectTool(pkg.location);
    const origin = /(?:^|[\\/])plugins[\\/]/.test(pkg.location)
      ? "插件目录（启用状态未知）"
      : /(?:^|[\\/])\.system(?:[\\/]|$)/.test(pkg.location)
        ? "工具内置目录"
        : "本地文件";
    const warnings = [
      ...pkg.warnings,
      ...parsed.warnings,
      ...(!manifest?.content ? ["SKILL.md 未读取或为空"] : []),
    ];
    return {
      ...pkg,
      ...parsed,
      imported: source?.imported === true,
      warnings,
      scope: source?.scope || "project",
      project: source?.project || "",
      sourceLabel: source?.label || "未知来源",
      tool,
      origin,
      annotationKey: `skill:${!source?.imported && pkg.realPath ? pkg.realPath : `${source?.label}:${pkg.location}`}`,
      searchText:
        `${parsed.name}\n${parsed.description}\n${manifest?.content || ""}\n${pkg.location}`.toLowerCase(),
    };
  });
  return records.sort((a, b) => a.name.localeCompare(b.name));
};

export const importDirectoryFiles = async (
  files: File[],
  source: SkillSource,
): Promise<SkillSnapshot> => {
  if (files.length > LIMITS.fileCount)
    throw new Error("目录文件超过 25000，请选择更小的 Skills 目录");
  const paths = files.map((file) => ({
    file,
    path: file.webkitRelativePath || file.name,
  }));
  const roots = paths
    .filter(
      (f) =>
        /(?:^|\/)SKILL\.md$/.test(f.path) &&
        !f.path.split("/").some((p) => IGNORE_DIRECTORY_NAMES.includes(p)),
    )
    .map((f) => f.path.slice(0, -"SKILL.md".length))
    .sort((a, b) => a.length - b.length)
    .filter(
      (root, index, all) =>
        !all.slice(0, index).some((parent) => root.startsWith(parent)),
    );
  if (roots.length > LIMITS.skillCount)
    throw new Error("Skills 超过 2000，请缩小目录");
  const snapshot = blankSnapshot();
  snapshot.generatedAt = new Date().toISOString();
  snapshot.sources = [{ ...source, imported: true }];
  let total = 0;
  for (const root of roots) {
    const pkg: SkillPackage = {
      id: `${source.id}:${root}`,
      sourceId: source.id,
      location: root.replace(/\/$/, ""),
      files: [],
      warnings: [],
      packageHash: "",
      complete: true,
    };
    for (const entry of paths.filter((item) => item.path.startsWith(root))) {
      const relative = entry.path.slice(root.length);
      if (relative.split("/").some((p) => IGNORE_DIRECTORY_NAMES.includes(p)))
        continue;
      if (
        entry.file.size > LIMITS.fileBytes ||
        total + entry.file.size > LIMITS.totalBytes
      ) {
        pkg.complete = false;
        pkg.files.push({
          path: relative,
          size: entry.file.size,
          skipped: "文件或导入总量超过限制",
        });
        continue;
      }
      const buffer = await entry.file.arrayBuffer();
      total += buffer.byteLength;
      const text =
        /\.(md|txt|json|ya?ml|toml|js|mjs|cjs|ts|py|sh|ps1|cmd|bat|html|css|xml|csv|sql|properties)$/i.test(
          relative,
        ) && !new Uint8Array(buffer).includes(0);
      pkg.files.push({
        path: relative,
        size: buffer.byteLength,
        content: text ? new TextDecoder().decode(buffer) : undefined,
        hash: await sha(buffer),
        modifiedAt: new Date(entry.file.lastModified).toISOString(),
      });
    }
    pkg.files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    if (pkg.complete)
      pkg.packageHash = await sha(
        new TextEncoder().encode(
          JSON.stringify(pkg.files.map((f) => [f.path, f.hash])),
        ),
      );
    snapshot.packages.push(pkg);
  }
  if (!roots.length) snapshot.warnings.push("所选目录中没有找到 SKILL.md");
  return snapshot;
};

export const validateSnapshot = (input: unknown): SkillSnapshot => {
  const value = input as SkillSnapshot;
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.sources) ||
    !Array.isArray(value.packages) ||
    !Array.isArray(value.warnings)
  )
    throw new Error("不是有效的 Skill 工作台快照");
  if (value.sources.length > 30 || value.packages.length > LIMITS.skillCount)
    throw new Error("快照超出来源或 Skills 数量限制");
  let bytes = 0,
    count = 0;
  const strings = (item: unknown) =>
    typeof item === "string" && item.length <= LIMITS.fileBytes;
  const sources = value.sources.map((s) => {
    if (
      !s ||
      !(["id", "path", "label", "project"] as const).every((k) =>
        strings(s[k]),
      ) ||
      !["global", "project"].includes(s.scope) ||
      !["skills", "project"].includes(s.kind)
    )
      throw new Error("快照来源格式错误");
    return {
      id: s.id,
      path: s.path,
      label: s.label,
      project: s.project,
      scope: s.scope,
      kind: s.kind,
      imported: true,
    } as SkillSource;
  });
  if (new Set(sources.map((s) => s.id)).size !== sources.length)
    throw new Error("快照来源 ID 重复");
  const ids = new Set(sources.map((s) => s.id)),
    packageIds = new Set<string>();
  const packages = value.packages.map((p) => {
    if (
      !p ||
      !strings(p.id) ||
      packageIds.has(p.id) ||
      !ids.has(p.sourceId) ||
      !strings(p.location) ||
      !Array.isArray(p.files) ||
      !Array.isArray(p.warnings)
    )
      throw new Error("快照 Skill 格式错误或 ID 重复");
    packageIds.add(p.id);
    const filePaths = new Set<string>();
    const files = p.files.map((f): SkillFile => {
      if (
        ++count > LIMITS.fileCount ||
        !f ||
        !strings(f.path) ||
        filePaths.has(f.path) ||
        f.path
          .replace(/\\/g, "/")
          .split("/")
          .some((part) => part === "..") ||
        /^[\\/]|^[A-Za-z]:/.test(f.path) ||
        !Number.isFinite(f.size) ||
        f.size < 0
      )
        throw new Error("快照文件格式错误");
      filePaths.add(f.path);
      if (
        f.content !== undefined &&
        (!strings(f.content) ||
          (bytes += new TextEncoder().encode(f.content).byteLength) >
            LIMITS.totalBytes)
      )
        throw new Error("快照内容超过限制");
      return {
        path: f.path,
        size: f.size,
        content: f.content,
        modifiedAt: typeof f.modifiedAt === "string" ? f.modifiedAt : undefined,
        hash: typeof f.hash === "string" ? f.hash : undefined,
        skipped: typeof f.skipped === "string" ? f.skipped : undefined,
      };
    });
    return {
      id: p.id,
      sourceId: p.sourceId,
      location: p.location,
      realPath: typeof p.realPath === "string" ? p.realPath : undefined,
      files,
      warnings: p.warnings.filter(strings),
      complete: p.complete === true,
      packageHash: typeof p.packageHash === "string" ? p.packageHash : "",
    };
  });
  return {
    version: 1,
    generatedAt: strings(value.generatedAt) ? value.generatedAt : "",
    sources,
    packages,
    warnings: value.warnings.filter(strings),
  };
};

const csv = (value: string) =>
  `"${(/^[=+@\-\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;
export const exportSkillCsv = (records: SkillRecord[]) =>
  "\uFEFF" +
  [
    ["名称", "描述", "范围", "项目", "来源", "路径"],
    ...records.map((r) => [
      r.name,
      r.description,
      r.scope === "global" ? "全局" : "项目",
      r.project,
      r.sourceLabel,
      r.location,
    ]),
  ]
    .map((row) => row.map(csv).join(","))
    .join("\r\n");
export const exportSkillList = (records: SkillRecord[]) =>
  JSON.stringify(
    records.map(
      ({ name, description, scope, project, sourceLabel, location }) => ({
        name,
        description,
        scope,
        project,
        sourceLabel,
        location,
      }),
    ),
    null,
    2,
  );
export const mergeSnapshots = (
  base: SkillSnapshot,
  next: SkillSnapshot,
): SkillSnapshot => {
  const ids = new Set(next.sources.map((s) => s.id));
  const merged: SkillSnapshot = {
    version: 1,
    generatedAt: next.generatedAt,
    sources: [...base.sources.filter((s) => !ids.has(s.id)), ...next.sources],
    packages: [
      ...base.packages.filter((p) => !ids.has(p.sourceId)),
      ...next.packages,
    ],
    warnings: [...next.warnings],
  };
  if (merged.sources.length > 30 || merged.packages.length > LIMITS.skillCount)
    throw new Error("工作台总量超过限制，请移除来源或清空后重新导入");
  let bytes = 0,
    files = 0;
  for (const pkg of merged.packages)
    for (const file of pkg.files) {
      files++;
      bytes +=
        file.content === undefined
          ? 0
          : new TextEncoder().encode(file.content).byteLength;
      if (files > LIMITS.fileCount || bytes > LIMITS.totalBytes)
        throw new Error("工作台文件或内容总量超过限制，请缩小来源");
    }
  return merged;
};

export const namespaceImportedSnapshot = (
  snapshot: SkillSnapshot,
  namespace: string,
): SkillSnapshot => {
  const sourceIds = new Map(
    snapshot.sources.map((s) => [s.id, `snapshot:${namespace}:${s.id}`]),
  );
  return {
    ...snapshot,
    sources: snapshot.sources.map((s) => ({
      ...s,
      imported: true,
      id: sourceIds.get(s.id)!,
      label: `${s.label}（快照）`,
    })),
    packages: snapshot.packages.map((p) => ({
      ...p,
      id: `snapshot:${namespace}:${p.id}`,
      sourceId: sourceIds.get(p.sourceId)!,
    })),
  };
};

// Vue wraps loaded data in proxies, which cannot be sent through postMessage.
export const transferableSnapshot = (
  snapshot: SkillSnapshot,
): SkillSnapshot => ({
  ...snapshot,
  sources: snapshot.sources.map((source) => ({ ...source })),
  packages: snapshot.packages.map((pkg) => ({
    ...pkg,
    files: pkg.files.map((file) => ({ ...file })),
    warnings: [...pkg.warnings],
  })),
  warnings: [...snapshot.warnings],
});
