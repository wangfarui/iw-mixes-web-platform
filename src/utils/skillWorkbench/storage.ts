import type {
  SkillAnnotation,
  SkillSource,
  SkillWorkspaceSettings,
} from "../../types/skillWorkbench";
export const STORAGE_KEY = "iw:skills:workspace:v1";
export const emptyAnnotation = (): SkillAnnotation => ({
  alias: "",
  tags: [],
  note: "",
});
export const readWorkspaceSettings = (): SkillWorkspaceSettings => {
  const fallback = {
    enabled: false,
    annotations: {},
    sources: [],
    token: "",
    port: 17321,
  };
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!value || value.enabled !== true) return fallback;
    const annotations: Record<string, SkillAnnotation> = Object.create(null);
    for (const [key, annotation] of Object.entries(value.annotations || {})) {
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
    return {
      enabled: true,
      annotations,
      sources: Array.isArray(value.sources)
        ? value.sources.filter(
            (s: SkillSource) => s && typeof s.path === "string" && !s.imported,
          )
        : [],
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
  if (!settings.enabled) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  // Store only user settings and annotations; Skill file contents are never persisted.
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...settings,
      sources: settings.sources.filter((s) => !s.imported),
    }),
  );
};
