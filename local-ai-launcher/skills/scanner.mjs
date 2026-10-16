import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { watch } from "node:fs";
import os from "node:os";
import path from "node:path";

export const SKIP = new Set([
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
]);
const TOOLS = new Set([".agents", ".codex", ".claude", ".cursor"]);
const TEXT =
  /\.(md|txt|json|ya?ml|toml|js|mjs|cjs|ts|py|sh|ps1|cmd|bat|html|css|xml|csv|sql|properties)$/i;
export const SCAN_LIMITS = {
  files: 25000,
  skills: 2000,
  fileBytes: 512 * 1024,
  totalBytes: 32 * 1024 * 1024,
  depth: 10,
};
const inside = (root, file) => {
  const rel = path.relative(root, file);
  return (
    rel === "" ||
    (!rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel))
  );
};
const exists = async (p) => {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
};
const hash = (data) => createHash("sha256").update(data).digest("hex");
const abort = (signal) => {
  if (signal?.aborted)
    throw Object.assign(new Error("扫描已取消"), { code: "SCAN_CANCELLED" });
};

export const discoverSkillSources = async (home = os.homedir()) => {
  const result = [];
  for (const dir of TOOLS) {
    const root = path.join(home, dir, "skills");
    if (await exists(root))
      result.push({
        id: hash(root),
        path: root,
        label: `${dir}/skills`,
        scope: "global",
        kind: "skills",
        project: "",
      });
  }
  return result;
};

export const scanSkillSources = async (
  sources,
  { signal, onProgress = () => {} } = {},
) => {
  if (!Array.isArray(sources) || !sources.length || sources.length > 30)
    throw new Error("请选择 1 至 30 个扫描来源");
  const snapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: [],
    packages: [],
    warnings: [],
  };
  let visited = 0,
    bytes = 0;
  const watchRoots = new Set();
  const authorizedSkills = new Map();
  const tick = () => {
    abort(signal);
    if (++visited > SCAN_LIMITS.files)
      throw new Error("扫描条目超过 25000，请缩小来源目录");
    onProgress({ visited, skills: snapshot.packages.length });
  };
  const collect = async (
    directory,
    source,
    location,
    ancestors = new Set(),
    depth = 0,
    descend = true,
  ) => {
    tick();
    if (depth > SCAN_LIMITS.depth) {
      snapshot.warnings.push(`${location}：超过扫描深度限制`);
      return;
    }
    const resolved = await realpath(directory);
    if (ancestors.has(resolved)) {
      snapshot.warnings.push(`${location}：忽略循环软链接`);
      return;
    }
    const next = new Set([...ancestors, resolved]);
    const entries = (await readdir(directory, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
    const manifest = entries.find((e) => e.name === "SKILL.md");
    if (manifest) {
      if (snapshot.packages.length >= SCAN_LIMITS.skills)
        throw new Error("Skills 超过 2000，请缩小来源目录");
      const files = [],
        warnings = [];
      let complete = true;
      const walkFiles = async (
        dir,
        prefix = "",
        level = 0,
        seen = new Set(),
      ) => {
        const actual = await realpath(dir);
        if (!inside(resolved, actual)) {
          complete = false;
          warnings.push(`${prefix}：软链接指向 Skill 目录之外，已跳过`);
          return;
        }
        if (seen.has(actual) || level > SCAN_LIMITS.depth) {
          complete = false;
          warnings.push(`${prefix}：循环或目录过深，已跳过`);
          return;
        }
        const chain = new Set([...seen, actual]);
        for (const entry of (await readdir(dir, { withFileTypes: true })).sort(
          (a, b) => a.name.localeCompare(b.name),
        )) {
          abort(signal);
          if (SKIP.has(entry.name)) continue;
          tick();
          const file = path.join(dir, entry.name),
            relative = `${prefix}${entry.name}`;
          try {
            const actualFile = await realpath(file);
            if (!inside(resolved, actualFile)) {
              complete = false;
              warnings.push(`${relative}：越界软链接，已跳过`);
              continue;
            }
            const info = await stat(actualFile);
            if (info.isDirectory()) {
              await walkFiles(file, `${relative}/`, level + 1, chain);
              continue;
            }
            if (!info.isFile()) continue;
            if (
              info.size > SCAN_LIMITS.fileBytes ||
              bytes + info.size > SCAN_LIMITS.totalBytes
            ) {
              complete = false;
              files.push({
                path: relative,
                size: info.size,
                skipped: "文件或扫描总量超过限制",
              });
              continue;
            }
            const buffer = await readFile(actualFile);
            if (
              buffer.byteLength > SCAN_LIMITS.fileBytes ||
              bytes + buffer.byteLength > SCAN_LIMITS.totalBytes
            ) {
              complete = false;
              files.push({
                path: relative,
                size: buffer.byteLength,
                skipped: "读取时文件增长超过限制",
              });
              continue;
            }
            bytes += buffer.byteLength;
            const content =
              TEXT.test(relative) && !buffer.includes(0)
                ? buffer.toString("utf8")
                : undefined;
            files.push({
              path: relative,
              size: buffer.byteLength,
              hash: hash(buffer),
              content,
              modifiedAt: info.mtime.toISOString(),
            });
          } catch (error) {
            complete = false;
            warnings.push(`${relative}：${error.message}`);
          }
        }
      };
      await walkFiles(directory);
      files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
      const id = hash(`${source.id}:${location}`);
      authorizedSkills.set(id, {
        directory: resolved,
        files: new Set(files.map((f) => f.path)),
      });
      snapshot.packages.push({
        id,
        sourceId: source.id,
        location,
        realPath: resolved,
        files,
        warnings,
        packageHash: complete
          ? hash(JSON.stringify(files.map((f) => [f.path, f.hash])))
          : "",
        complete,
      });
      return;
    }
    if (!descend) return;
    for (const entry of entries) {
      if (
        SKIP.has(entry.name) ||
        (entry.name.startsWith(".") && entry.name !== ".system") ||
        (!entry.isDirectory() && !entry.isSymbolicLink())
      )
        continue;
      try {
        if ((await stat(path.join(directory, entry.name))).isDirectory())
          await collect(
            path.join(directory, entry.name),
            source,
            path.join(location, entry.name),
            next,
            depth + 1,
            entry.name === ".system",
          );
      } catch (error) {
        if (
          signal?.aborted ||
          visited > SCAN_LIMITS.files ||
          snapshot.packages.length >= SCAN_LIMITS.skills
        )
          throw error;
        snapshot.warnings.push(`${entry.name}：${error.message}`);
      }
    }
  };
  for (const input of sources) {
    abort(signal);
    if (typeof input.path !== "string" || !path.isAbsolute(input.path))
      throw new Error("来源必须是本机绝对路径");
    const root = path.normalize(input.path);
    const source = {
      id: hash(`${root}:${input.scope}:${input.kind}`),
      path: root,
      label: String(input.label || path.basename(root)),
      scope: input.scope === "global" ? "global" : "project",
      kind: input.kind === "project" ? "project" : "skills",
      project: String(
        input.project || (input.scope === "global" ? "" : path.basename(root)),
      ),
    };
    snapshot.sources.push(source);
    try {
      if (!(await exists(root))) throw new Error("目录不存在或不可访问");
      if (source.kind === "skills") {
        watchRoots.add(root);
        await collect(root, source, root);
      } else {
        // Only this directory and its own conventional collections are scanned.
        // Child projects are separate sources, even when nested in a workspace.
        const roots = [];
        const hasManifest = (
          await stat(path.join(root, "SKILL.md")).catch(() => null)
        )?.isFile();
        if (!hasManifest) {
          for (const relative of [
            "skills",
            ...[...TOOLS].map((tool) => path.join(tool, "skills")),
          ]) {
            const skills = path.join(root, relative);
            if (await exists(skills)) roots.push(skills);
          }
        }
        // With no conventional collection, treat the selected directory as a
        // Skills collection (or a single Skill); discovery still stops after one level.
        if (!roots.length) roots.push(root);
        for (const skills of roots) {
          watchRoots.add(skills);
          await collect(skills, source, skills);
        }
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      snapshot.warnings.push(`${source.label}：${error.message}`);
    }
  }
  return { snapshot, watchRoots: [...watchRoots], authorizedSkills };
};

export const createSkillWorkbench = ({
  home = os.homedir(),
  openFile = async () => {},
} = {}) => {
  const jobs = new Map(),
    authorized = new Map();
  let revision = 0,
    watchers = [],
    watchedPaths = [],
    watchActive = false;
  const stopWatching = () => {
    watchers.forEach((w) => w.close());
    watchers = [];
    watchActive = false;
  };
  const beginWatching = (roots) => {
    stopWatching();
    watchedPaths = roots;
    for (const root of roots.slice(0, 100)) {
      try {
        const watcher = watch(
          root,
          { recursive: true, persistent: false },
          () => {
            revision++;
          },
        );
        watcher.on("error", () => {
          watchActive = false;
        });
        watchers.push(watcher);
      } catch {
        /* Manual refresh remains available. */
      }
    }
    watchActive = watchers.length > 0;
  };
  return {
    discover: () => discoverSkillSources(home),
    status: () => ({ revision, watchActive, watchedPaths }),
    start(sources) {
      if ([...jobs.values()].some((job) => job.state === "running"))
        throw new Error("已有扫描正在进行");
      const id = randomUUID(),
        controller = new AbortController();
      const job = {
        id,
        state: "running",
        progress: { visited: 0, skills: 0 },
        controller,
        createdAt: Date.now(),
      };
      jobs.set(id, job);
      for (const [key, value] of jobs)
        if (value.state !== "running") jobs.delete(key);
      void scanSkillSources(sources, {
        signal: controller.signal,
        onProgress: (p) => {
          job.progress = p;
        },
      })
        .then((result) => {
          if (controller.signal.aborted) {
            job.state = "cancelled";
            return;
          }
          job.state = "succeeded";
          job.snapshot = result.snapshot;
          authorized.clear();
          result.authorizedSkills.forEach((value, key) =>
            authorized.set(key, value),
          );
          beginWatching(result.watchRoots);
        })
        .catch((error) => {
          job.state = controller.signal.aborted ? "cancelled" : "failed";
          job.message = error.message;
        });
      return { id };
    },
    job(id) {
      const job = jobs.get(id);
      if (!job) throw new Error("扫描任务不存在");
      const { controller, createdAt, ...publicJob } = job;
      return publicJob;
    },
    cancel(id) {
      jobs.get(id)?.controller.abort();
      return { cancelled: true };
    },
    async open(id, relative) {
      const skill = authorized.get(id);
      if (!skill || !skill.files.has(relative))
        throw new Error("文件不属于当前已扫描的 Skill");
      const target = await realpath(path.join(skill.directory, relative));
      if (!inside(skill.directory, target))
        throw new Error("文件已移到 Skill 目录之外");
      await openFile(target);
      return { opened: true };
    },
    clear() {
      for (const job of jobs.values()) job.controller.abort();
      jobs.clear();
      authorized.clear();
      stopWatching();
      return { cleared: true };
    },
    close() {
      for (const job of jobs.values()) job.controller.abort();
      stopWatching();
    },
  };
};
