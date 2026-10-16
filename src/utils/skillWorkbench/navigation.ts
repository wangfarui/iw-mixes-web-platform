import type { SkillRecord, SkillSource } from "../../types/skillWorkbench";

export const projectNameFromPath = (path: string) => {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts[parts.length - 1]?.toLowerCase() === "skills") {
    parts.pop();
    if (/^\.(agents|codex|claude|cursor)$/i.test(parts[parts.length - 1] || ""))
      parts.pop();
  }
  return parts[parts.length - 1] || "自定义目录";
};
const projectName = (source: Pick<SkillSource, "project" | "label">) =>
  source.project || source.label || "未命名项目";
export const matchesSkillScope = (record: SkillRecord, scope: string) =>
  scope === "all" ||
  (scope === "global" && record.scope === "global") ||
  (record.scope === "project" &&
    scope ===
      `project:${record.project || record.sourceLabel || "未命名项目"}`);

// Multiple directory entries may point to one installed Skill through symlinks.
export const visibleSkills = (records: SkillRecord[]) => {
  const seen = new Set<string>();
  return records.filter((record) => {
    if (record.imported || !record.realPath) return true;
    if (seen.has(record.realPath)) return false;
    seen.add(record.realPath);
    return true;
  });
};
export const buildSkillScopes = (
  sources: SkillSource[],
  records: SkillRecord[],
) => {
  const projects = [
    ...new Set(sources.filter((s) => s.scope === "project").map(projectName)),
  ];
  return [
    { key: "all", title: "全部 Skills" },
    { key: "global", title: "全局 Skills" },
    ...projects.map((name) => ({
      key: `project:${name}`,
      title: `${name} Skills`,
    })),
  ].map((scope) => ({
    ...scope,
    count: visibleSkills(
      records.filter((record) => matchesSkillScope(record, scope.key)),
    ).length,
  }));
};
