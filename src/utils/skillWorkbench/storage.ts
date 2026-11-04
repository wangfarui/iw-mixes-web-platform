import type {
  SkillAnnotation,
  SkillSource,
  SkillWorkspaceSettings,
} from "../../types/skillWorkbench";
export const STORAGE_KEY = "iw:skills:workspace:v1";
export const SOURCES_STORAGE_KEY = "iw:skills:sources:v1";
const MAX_CACHED_SOURCES = 30;
export const emptyAnnotation = (): SkillAnnotation => ({
  alias: "",
  tags: [],
  note: "",
});
const isCachedSource = (value: unknown): value is SkillSource => {
  if (!value || typeof value !== "object") return false;
  const source = value as SkillSource;
  return (
    typeof source.id === "string" &&
    source.id.length > 0 &&
    typeof source.path === "string" &&
    source.path.trim().length > 0 &&
    typeof source.label === "string" &&
    (source.scope === "global" || source.scope === "project") &&
    (source.kind === "skills" || source.kind === "project") &&
    typeof source.project === "string" &&
    source.imported !== true
  );
};
export const cachedSourcesFrom = (value: unknown): SkillSource[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const sources: SkillSource[] = [];
  for (const item of value) {
    if (!isCachedSource(item) || seen.has(item.path)) continue;
    seen.add(item.path);
    sources.push({
      id: item.id,
      path: item.path,
      label: item.label,
      scope: item.scope,
      kind: item.kind,
      project: item.project,
    });
    if (sources.length >= MAX_CACHED_SOURCES) break;
  }
  return sources;
};
export const readCachedSources = (): SkillSource[] => {
  try {
    const raw = localStorage.getItem(SOURCES_STORAGE_KEY);
    if (raw !== null) return cachedSourcesFrom(JSON.parse(raw));
  } catch {
    return [];
  }
  try {
    const workspace = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return cachedSourcesFrom(workspace?.sources);
  } catch {
    return [];
  }
};
export const saveCachedSources = (sources: SkillSource[]) => {
  localStorage.setItem(
    SOURCES_STORAGE_KEY,
    JSON.stringify(cachedSourcesFrom(sources)),
  );
};
const readAnnotations = (value: unknown): Record<string, SkillAnnotation> => {
  const annotations: Record<string, SkillAnnotation> = Object.create(null);
  for (const [key, annotation] of Object.entries(
    (value as Record<string, unknown>) || {},
  )) {
    const a = annotation as SkillAnnotation;
    if (
      a &&
      typeof a.alias === "string" &&
      typeof a.note === "string" &&
      Array.isArray(a.tags)
    )
      annotations[key] = {
        alias: a.alias,
        note: a.note,
        tags: a.tags.filter((t) => typeof t === "string"),
      };
  }
  return annotations;
};
export const readWorkspaceSettings = (): SkillWorkspaceSettings => {
  const fallback = {
    enabled: false,
    annotations: {},
    sources: readCachedSources(),
    token: "",
    port: 17321,
  };
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!value || value.enabled !== true) return fallback;
    return {
      enabled: true,
      annotations: readAnnotations(value.annotations),
      sources: readCachedSources(),
      token: typeof value.token === "string" ? value.token : "",
      port:
        Number.isInteger(value.port) && value.port > 0 && value.port < 65536
          ? value.port
          : 17321,
    };
  } catch {
    return fallback;
  }
};
export const saveWorkspaceSettings = (settings: SkillWorkspaceSettings) => {
  saveCachedSources(settings.sources);
  if (!settings.enabled) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  // Store only user settings and annotations; Skill file contents are never persisted.
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...settings,
      sources: cachedSourcesFrom(settings.sources),
    }),
  );
};
