import { createDirectoryBrowser } from "../local-ai-launcher/skills/directoryBrowser.mjs";
import { createDirectoryPicker } from "../local-ai-launcher/skills/directoryPicker.mjs";
import { EventEmitter } from "node:events";
import { createSkillFileOpener } from "../local-ai-launcher/skills/openFile.mjs";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  symlink,
  rm,
  realpath,
} from "node:fs/promises";
import { File } from "node:buffer";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { reactive } from "vue";
import {
  SKIP,
  scanSkillSources,
  createSkillWorkbench,
  discoverSkillSources,
} from "../local-ai-launcher/skills/scanner.mjs";
import { createLauncherServer } from "../local-ai-launcher/server.mjs";
import { getLauncherPaths } from "../local-ai-launcher/constants.mjs";
import {
  getWindowsStartupPath,
  buildWindowsStartupScript,
} from "../local-ai-launcher/windowsInstallation.mjs";

const temp = await mkdtemp(path.join(os.tmpdir(), "iw-skills-test-"));
let launcher;
try {
  const outfile = path.join(temp, "core.mjs");
  await build({
    entryPoints: ["src/utils/skillWorkbench/core.ts"],
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    logLevel: "silent",
  });
  const core = await import(pathToFileURL(outfile).href);
  assert.deepEqual(new Set(core.IGNORE_DIRECTORY_NAMES), SKIP);
  const content =
    "---\nname: review\ndescription: >\n  中文审查\n  多行描述\n---\n# 审查\n正文测试";
  assert.equal(
    core.parseSkillManifest(content, "fallback").description,
    "中文审查 多行描述\n",
  );
  assert.match(
    core.parseSkillManifest("---\nname: [invalid\n---\nbody", "fallback")
      .warnings[0],
    /解析失败/,
  );
  assert.equal(
    core.detectTool("C:\\Users\\测试\\.cursor\\skills\\review"),
    "cursor",
  );
  assert.ok(
    core.parseSkillManifest("---\na: &a [*a]\n---\nbody", "fallback").warnings
      .length,
  );
  assert.equal(core.detectTool("/home/you/.agents/skills/review"), "shared");
  const root = path.join(temp, "中文 项目"),
    skills = path.join(root, ".agents", "skills");
  const makeSkill = async (name, script = "print(1)") => {
    const dir = path.join(skills, name);
    await mkdir(path.join(dir, "scripts"), { recursive: true });
    await writeFile(path.join(dir, "SKILL.md"), content);
    await writeFile(path.join(dir, "scripts", "test.py"), script);
    return dir;
  };
  const a = await makeSkill("a"),
    b = await makeSkill("b"),
    c = await makeSkill("c", "print(2)");
  await symlink(
    a,
    path.join(skills, "alias"),
    process.platform === "win32" ? "junction" : "dir",
  );
  const external = path.join(temp, "external-secret.txt");
  await writeFile(external, "secret must not be read");
  await symlink(external, path.join(c, "escaped.txt"));
  await mkdir(path.join(root, "node_modules", ".cursor", "skills", "ignored"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, "node_modules", ".cursor", "skills", "ignored", "SKILL.md"),
    content,
  );
  const sources = [
    { path: root, label: "测试项目", scope: "project", kind: "project" },
  ];
  const childSkill = path.join(
    root,
    "child-project",
    ".agents",
    "skills",
    "nested",
  );
  const backupSkill = path.join(skills, "backups", "old-review");
  for (const folder of [childSkill, backupSkill]) {
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, "SKILL.md"), content);
  }
  const result = await scanSkillSources(sources);
  assert.equal(result.snapshot.packages.length, 4);
  const normalized = core.normalizeSnapshot(result.snapshot);
  assert.ok(
    !result.snapshot.packages.some(
      (pkg) => pkg.location === childSkill || pkg.location === backupSkill,
    ),
  );
  const directSource = [{ ...sources[0], path: skills }];
  assert.equal(
    (await scanSkillSources(directSource)).snapshot.packages.length,
    4,
  );
  assert.equal(
    (await scanSkillSources([{ ...sources[0], path: a }])).snapshot.packages
      .length,
    1,
  );
  const singleCollectionRoot = path.join(temp, "single-collection-project");
  await mkdir(path.join(singleCollectionRoot, "skills"), { recursive: true });
  await writeFile(
    path.join(singleCollectionRoot, "skills", "SKILL.md"),
    content,
  );
  const singleCollectionResult = await scanSkillSources([
    { ...sources[0], path: singleCollectionRoot },
  ]);
  assert.equal(
    singleCollectionResult.snapshot.packages.length,
    1,
    "a collection containing its own manifest is scanned once",
  );
  const builtinRoot = path.join(temp, "builtin-skills");
  for (const relative of [
    ".system/creator",
    ".backups/old-review",
    "archive/nested-review",
  ]) {
    await mkdir(path.join(builtinRoot, relative), { recursive: true });
    await writeFile(path.join(builtinRoot, relative, "SKILL.md"), content);
  }
  const builtinResult = await scanSkillSources([
    { ...sources[0], kind: "skills", path: builtinRoot },
  ]);
  assert.equal(builtinResult.snapshot.packages.length, 1);
  assert.equal(
    builtinResult.snapshot.packages[0].location,
    path.join(builtinRoot, ".system/creator"),
  );
  const navigationFile = path.join(temp, "navigation.mjs");
  await build({
    entryPoints: ["src/utils/skillWorkbench/navigation.ts"],
    outfile: navigationFile,
    bundle: true,
    format: "esm",
    platform: "browser",
    logLevel: "silent",
  });
  const nav = await import(pathToFileURL(navigationFile).href);
  assert.equal(
    nav.projectNameFromPath("C:\\Users\\中文\\My Project\\.codex\\skills\\"),
    "My Project",
  );
  assert.equal(nav.projectNameFromPath("/work/project/skills"), "project");
  const projectSources = [
    { ...result.snapshot.sources[0], id: "alpha1", project: "Alpha" },
    { ...result.snapshot.sources[0], id: "alpha2", project: "Alpha" },
    { ...result.snapshot.sources[0], id: "beta", project: "Beta" },
  ];
  const navRecords = [
    ...normalized.map((r) => ({ ...r, project: "Alpha" })),
    {
      ...normalized[0],
      id: "global",
      scope: "global",
      realPath: "/global/review",
    },
  ];
  assert.deepEqual(nav.buildSkillScopes(projectSources, navRecords), [
    { key: "all", title: "全部 Skills", count: 4 },
    { key: "global", title: "全局 Skills", count: 1 },
    { key: "project:Alpha", title: "Alpha Skills", count: 3 },
    { key: "project:Beta", title: "Beta Skills", count: 0 },
  ]);
  assert.equal(
    nav.visibleSkills(
      navRecords.filter((r) => nav.matchesSkillScope(r, "project:Alpha")),
    ).length,
    3,
  );

  const escaped = normalized.find((r) => r.location === c);
  assert.equal(escaped.complete, false);
  assert.equal(escaped.packageHash, "");
  assert.ok(escaped.warnings.some((w) => /越界/.test(w)));
  assert.ok(!escaped.files.some((f) => f.content?.includes("secret must")));
  const discoveredHome = path.join(temp, "home");
  await mkdir(path.join(discoveredHome, ".claude", "skills"), {
    recursive: true,
  });
  assert.equal((await discoverSkillSources(discoveredHome))[0].scope, "global");
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => scanSkillSources(sources, { signal: controller.signal }),
    /取消/,
  );
  const importedFile = new File([content], "SKILL.md");
  Object.defineProperty(importedFile, "webkitRelativePath", {
    value: "skills/review/SKILL.md",
  });
  const importedScript = new File(["print(1)"], "test.py");
  Object.defineProperty(importedScript, "webkitRelativePath", {
    value: "skills/review/scripts/test.py",
  });
  const imported = await core.importDirectoryFiles(
    [importedFile, importedScript],
    {
      id: "import",
      path: "",
      label: "导入",
      scope: "global",
      kind: "skills",
      project: "",
    },
  );
  assert.equal(imported.packages.length, 1);
  assert.equal(
    imported.packages[0].packageHash,
    result.snapshot.packages.find((p) => p.location === b).packageHash,
  );
  assert.equal(core.validateSnapshot(imported).sources[0].imported, true);
  assert.equal(
    structuredClone(core.transferableSnapshot(reactive(imported))).packages
      .length,
    1,
  );
  const malformed = structuredClone(imported);
  malformed.packages[0].files[0].path = "../escape";
  assert.throws(() => core.validateSnapshot(malformed), /格式错误/);
  assert.equal(core.mergeSnapshots(imported, imported).packages.length, 1);
  const historical = core.namespaceImportedSnapshot(
    core.validateSnapshot(result.snapshot),
    "test",
  );
  const together = core.normalizeSnapshot(
    core.mergeSnapshots(result.snapshot, historical),
  );
  assert.equal(together.length, 8);
  assert.equal(together.filter((r) => r.imported).length, 4);
  const duplicateFile = structuredClone(imported);
  duplicateFile.packages[0].files.push(duplicateFile.packages[0].files[0]);
  assert.throws(() => core.validateSnapshot(duplicateFile), /格式错误/);
  assert.match(
    core.exportSkillCsv([{ ...normalized[0], name: "=cmd" }]),
    /"'=cmd"/,
  );
  assert.ok(!core.exportSkillList(normalized).includes("print(1)"));
  const winPaths = getLauncherPaths("C:\\Users\\中文 用户", "win32");
  assert.equal(
    winPaths.configPath,
    "C:\\Users\\中文 用户\\AppData\\Local\\IW AI Launcher\\config.json",
  );
  const startupPath = getWindowsStartupPath("C:\\Users\\中文 'quote'");
  const startup = buildWindowsStartupScript({
    nodePath: "C:\\Program Files\\nodejs\\node.exe",
    serverPath: "C:\\Users\\中文 'quote'\\server.mjs",
    configPath: "C:\\Users\\中文\\config.json",
    shortcutPath: startupPath,
  });
  assert.ok(startup.includes("中文 ''quote''"));
  assert.ok(startup.includes(".lnk"));
  assert.ok(!startup.includes("cmd.exe"));
  const editorCalls = [];
  const openWindows = createSkillFileOpener({
    platform: "win32",
    home: "C:\\Users\\测试",
    environment: {},
    spawnProcess(command, args) {
      editorCalls.push({ command, args });
      const child = new EventEmitter();
      child.unref = () => {};
      queueMicrotask(() =>
        command.endsWith("Code.exe")
          ? child.emit("error", new Error("missing"))
          : child.emit("spawn"),
      );
      return child;
    },
  });
  await openWindows("C:\\Users\\测试\\skill & sample\\SKILL.md");
  assert.equal(editorCalls.at(-1).command, "notepad.exe");
  assert.deepEqual(editorCalls.at(-1).args, [
    "C:\\Users\\测试\\skill & sample\\SKILL.md",
  ]);
  const nodeEntry = (name, directory) => ({
    name,
    isDirectory: () => directory,
    isSymbolicLink: () => false,
  });
  const windowsBrowser = createDirectoryBrowser({
    platform: "win32",
    home: "C:\\Users\\中文 用户",
    resolvePath: async (p) => p,
    readEntries: async () => [
      nodeEntry("技能 项目", true),
      nodeEntry(".agents", true),
      nodeEntry("secret.txt", false),
    ],
    inspect: async (p) => ({ isDirectory: () => p === "C:\\" }),
  });
  const windowsFolders = await windowsBrowser();
  assert.equal(windowsFolders.path, "C:\\Users\\中文 用户");
  assert.equal(windowsFolders.parent, "C:\\Users");
  assert.deepEqual(
    windowsFolders.entries.map((e) => e.path),
    ["C:\\Users\\中文 用户\\技能 项目"],
  );
  assert.ok(windowsFolders.roots.some((r) => r.path === "C:\\"));
  assert.ok(
    (await windowsBrowser({ showHidden: true })).entries.some(
      (e) => e.name === ".agents",
    ),
  );
  let pickerCommand, pickerArgs;
  const inspectDirectory = async () => ({ isDirectory: () => true });
  const pickWindows = createDirectoryPicker({
    platform: "win32",
    inspect: inspectDirectory,
    execute: async (command, args) => {
      pickerCommand = command;
      pickerArgs = args;
      return { stdout: "C:\\Users\\中文 用户\\技能 & 项目" };
    },
  });
  assert.deepEqual(await pickWindows(), {
    cancelled: false,
    path: "C:\\Users\\中文 用户\\技能 & 项目",
  });
  assert.equal(pickerCommand, "powershell.exe");
  assert.ok(pickerArgs.includes("-STA"));
  assert.match(
    Buffer.from(pickerArgs.at(-1), "base64").toString("utf16le"),
    /FolderBrowserDialog/,
  );
  const pickMac = createDirectoryPicker({
    platform: "darwin",
    inspect: inspectDirectory,
    execute: async () => ({ stdout: "/Users/中文 用户/技能 & 项目/\n" }),
  });
  assert.deepEqual(await pickMac(), {
    cancelled: false,
    path: "/Users/中文 用户/技能 & 项目",
  });
  const cancelMac = createDirectoryPicker({
    platform: "darwin",
    execute: async () => {
      throw { stderr: "用户已取消。 (-128)" };
    },
  });
  assert.deepEqual(await cancelMac(), { cancelled: true, path: "" });
  const cancelWindows = createDirectoryPicker({
    platform: "win32",
    execute: async () => ({ stdout: "" }),
  });
  assert.deepEqual(await cancelWindows(), { cancelled: true, path: "" });
  const invalidPicker = createDirectoryPicker({
    platform: "darwin",
    execute: async () => ({ stdout: "relative/path" }),
  });
  await assert.rejects(() => invalidPicker(), /绝对路径/);
  const failedPicker = createDirectoryPicker({
    platform: "darwin",
    execute: async () => {
      throw new Error("OS error");
    },
  });
  await assert.rejects(() => failedPicker(), /无法打开/);
  const unavailableGui = createDirectoryPicker({
    platform: "darwin",
    execute: async () => {
      throw {
        code: 69,
        stderr: "Connection invalid for com.apple.hiservices-xpcservice",
      };
    },
  });
  await assert.rejects(() => unavailableGui(), /系统窗口服务.*本机目录浏览/);
  let finishPicker;
  const concurrentPicker = createDirectoryPicker({
    platform: "darwin",
    execute: () =>
      new Promise((resolve) => {
        finishPicker = resolve;
      }),
  });
  const pendingPick = concurrentPicker();
  await assert.rejects(() => concurrentPicker(), /已经打开/);
  finishPicker({ stdout: "" });
  await pendingPick;
  let directoryPickerCalls = 0;
  let openedFile;
  const workbench = createSkillWorkbench({
    home: discoveredHome,
    openFile: async (file) => {
      openedFile = file;
    },
  });
  launcher = createLauncherServer({
    config: {
      token: "fixture-token",
      allowedOrigins: ["http://localhost:5173"],
    },
    host: "127.0.0.1",
    port: 0,
    skillWorkbench: workbench,
    directoryPicker: async () => {
      directoryPickerCalls++;
      return { cancelled: false, path: root };
    },
  });
  await launcher.listen();
  const base = `http://127.0.0.1:${launcher.server.address().port}/v1`;
  const request = (
    endpoint,
    body,
    token = "fixture-token",
    origin = "http://localhost:5173",
  ) =>
    fetch(base + endpoint, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "X-IW-Launcher-Token": token,
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  assert.equal((await request("/skills/discover", undefined, "")).status, 401);
  assert.equal(
    (
      await request(
        "/skills/discover",
        undefined,
        "fixture-token",
        "https://untrusted.example",
      )
    ).status,
    403,
  );
  assert.ok(
    (await (await request("/status")).json()).capabilities.includes("skills"),
  );
  assert.equal((await request("/skills/choose-directory", {}, "")).status, 401);
  assert.equal(
    (
      await request(
        "/skills/choose-directory",
        {},
        "fixture-token",
        "https://untrusted.example",
      )
    ).status,
    403,
  );
  assert.equal(directoryPickerCalls, 0);
  assert.deepEqual(
    await (await request("/skills/choose-directory", {})).json(),
    { cancelled: false, path: root },
  );
  assert.equal(directoryPickerCalls, 1);
  // Directory browsing must work even when the process cannot reach macOS GUI services.
  const folderResponse = await request("/skills/directories", {
    path: root,
    showHidden: true,
  });
  assert.equal(
    folderResponse.status,
    200,
    "directory selection must not depend on OS window services",
  );
  const folderListing = await folderResponse.json();
  assert.equal(folderListing.path, await realpath(root));
  assert.ok(folderListing.entries.some((entry) => entry.name === ".agents"));
  assert.ok(!folderListing.entries.some((entry) => entry.name === "SKILL.md"));
  assert.equal(
    directoryPickerCalls,
    1,
    "directory browsing must not launch an OS picker",
  );
  assert.equal(
    (await request("/skills/directories", { path: root }, "")).status,
    401,
  );
  assert.equal(
    (await request("/skills/directories", { path: "relative/path" })).status,
    400,
  );
  const job = await (await request("/skills/scan", { sources })).json();
  let completed;
  for (let index = 0; index < 100; index++) {
    completed = await (await request(`/skills/jobs/${job.id}`)).json();
    if (completed.state !== "running") break;
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.equal(completed.state, "succeeded");
  const pkg = completed.snapshot.packages.find((p) => p.location === b);
  assert.equal(
    (await request("/skills/open", { id: pkg.id, path: "SKILL.md" })).status,
    200,
  );
  assert.equal(openedFile, await realpath(path.join(b, "SKILL.md")));
  assert.equal(
    (
      await request("/skills/open", {
        id: pkg.id,
        path: "../../external-secret.txt",
      })
    ).status,
    400,
  );
  const changes = await (await request("/skills/changes")).json();
  assert.equal(typeof changes.revision, "number");
  if (changes.watchActive) {
    await writeFile(path.join(b, "scripts", "test.py"), "print(3)");
    let revision = changes.revision;
    for (let index = 0; index < 100 && revision === changes.revision; index++) {
      await new Promise((r) => setTimeout(r, 20));
      revision = (await (await request("/skills/changes")).json()).revision;
    }
    assert.ok(
      revision > changes.revision,
      "file changes must trigger a new revision",
    );
  }
  await request("/skills/clear", {});
  assert.equal(
    (await request("/skills/open", { id: pkg.id, path: "SKILL.md" })).status,
    400,
  );
  const cancelJob = await (await request("/skills/scan", { sources })).json();
  await request(`/skills/jobs/${cancelJob.id}/cancel`, {});

  const storageFile = path.join(temp, "storage.mjs");
  await build({
    entryPoints: ["src/utils/skillWorkbench/storage.ts"],
    outfile: storageFile,
    bundle: true,
    format: "esm",
    platform: "browser",
    logLevel: "silent",
  });
  const memory = new Map();
  globalThis.localStorage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
  const storage = await import(pathToFileURL(storageFile).href);
  const manualSource = {
    id: "source-1",
    path: "/Users/测试/project",
    label: "IW Web 项目",
    scope: "project",
    kind: "project",
    project: "IW Web 项目",
  };
  storage.saveWorkspaceSettings({
    enabled: false,
    annotations: { "skill:a": { alias: "别名", tags: ["审查"], note: "备注" } },
    sources: [
      manualSource,
      { ...manualSource, id: "duplicate" },
      { ...manualSource, id: "imported", imported: true, path: "/tmp/import" },
      { id: "bad" },
    ],
    token: "secret",
    port: 17321,
  });
  assert.equal(memory.has(storage.STORAGE_KEY), false);
  const cached = storage.readCachedSources();
  assert.deepEqual(cached, [manualSource]);
  assert.deepEqual(storage.readWorkspaceSettings().sources, [manualSource]);
  assert.equal(storage.readWorkspaceSettings().enabled, false);
  assert.equal(storage.readWorkspaceSettings().token, "");
  memory.set(
    storage.STORAGE_KEY,
    JSON.stringify({
      enabled: true,
      annotations: {},
      sources: [{ ...manualSource, id: "legacy", path: "/legacy/project" }],
      token: "kept",
      port: 17321,
    }),
  );
  memory.delete(storage.SOURCES_STORAGE_KEY);
  assert.equal(storage.readCachedSources()[0].path, "/legacy/project");
  storage.saveCachedSources([]);
  assert.deepEqual(storage.readCachedSources(), []);
  assert.equal(storage.readWorkspaceSettings().token, "kept");
  console.log(
    "Skill workbench tests passed: project navigation, current-directory scan boundaries, YAML, import, full-package hashes, symlinks, exclusions, cancellation, Windows paths/startup, pairing, file boundaries and GUI-independent macOS/Windows directory browsing",
  );
} finally {
  if (launcher) await launcher.close();
  await rm(temp, { recursive: true, force: true });
}
