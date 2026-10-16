export type SkillScope = "global" | "project";
export type SkillTool = "shared" | "codex" | "claude" | "cursor" | "unknown";
export interface SkillSource {
  id: string;
  path: string;
  label: string;
  scope: SkillScope;
  kind: "skills" | "project";
  project: string;
  imported?: boolean;
}
export interface SkillFile {
  path: string;
  size: number;
  hash?: string;
  content?: string;
  modifiedAt?: string;
  skipped?: string;
}
export interface SkillPackage {
  id: string;
  sourceId: string;
  location: string;
  realPath?: string;
  files: SkillFile[];
  warnings: string[];
  packageHash: string;
  complete: boolean;
}
export interface SkillSnapshot {
  version: 1;
  generatedAt: string;
  sources: SkillSource[];
  packages: SkillPackage[];
  warnings: string[];
}
export interface SkillRecord extends SkillPackage {
  imported: boolean;
  name: string;
  description: string;
  body: string;
  metadata: Record<string, unknown>;
  scope: SkillScope;
  project: string;
  sourceLabel: string;
  tool: SkillTool;
  origin: string;
  annotationKey: string;
  searchText: string;
}
export interface SkillAnnotation {
  alias: string;
  tags: string[];
  note: string;
}
export interface SkillWorkspaceSettings {
  enabled: boolean;
  annotations: Record<string, SkillAnnotation>;
  sources: SkillSource[];
  token: string;
  port: number;
}
export interface SkillScanJob {
  id: string;
  state: "running" | "succeeded" | "failed" | "cancelled";
  progress: { visited: number; skills: number };
  snapshot?: SkillSnapshot;
  message?: string;
}
export interface SkillAgentStatus {
  version: string;
  paired: boolean;
  platform: string;
  capabilities?: string[];
}

export interface SkillDirectoryListing {
  path: string;
  parent: string;
  roots: { label: string; path: string }[];
  entries: { name: string; path: string; symbolicLink: boolean }[];
  truncated: boolean;
}
