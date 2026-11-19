// vite.config.ts
import { fileURLToPath, URL } from "node:url";
import { loadEnv } from "file:///Users/wangfarui/workspaces/wfr/iw-mixes_ai/iw-mixes-web-platform/node_modules/vite/dist/node/index.js";
import vue from "file:///Users/wangfarui/workspaces/wfr/iw-mixes_ai/iw-mixes-web-platform/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import svgLoader from "file:///Users/wangfarui/workspaces/wfr/iw-mixes_ai/iw-mixes-web-platform/node_modules/vite-svg-loader/index.js";

// scripts/localClaudeSessionDrafts.mjs
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
var __vite_injected_original_import_meta_url = "file:///Users/wangfarui/workspaces/wfr/iw-mixes_ai/iw-mixes-web-platform/scripts/localClaudeSessionDrafts.mjs";
var CLAUDE_PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");
var DEFAULT_LIMIT = 12;
function clampText(text, maxLength = 72) {
  if (!text) {
    return "";
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}...`;
}
function buildNumericId(sessionId) {
  let hash = 0;
  for (const char of sessionId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }
  return hash;
}
function extractTextContent(content) {
  if (!content) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    for (const item of content) {
      if (!item || typeof item !== "object") {
        continue;
      }
      if (item.type === "text" && typeof item.text === "string") {
        return item.text;
      }
      if (!item.type && typeof item.text === "string") {
        return item.text;
      }
    }
    return "";
  }
  if (typeof content === "object" && typeof content.text === "string") {
    return content.text;
  }
  return "";
}
function fallbackProjectPathFromFile(filePath) {
  const projectDirName = path.basename(path.dirname(filePath));
  return projectDirName.replace(/^-/, "/").replace(/-/g, "/");
}
async function collectJsonlFiles() {
  const projectDirs = await fsp.readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
  const files = [];
  for (const entry of projectDirs) {
    if (!entry.isDirectory()) {
      continue;
    }
    const projectDir = path.join(CLAUDE_PROJECTS_DIR, entry.name);
    const children = await fsp.readdir(projectDir, { withFileTypes: true });
    for (const child of children) {
      if (!child.isFile() || !child.name.endsWith(".jsonl")) {
        continue;
      }
      const fullPath = path.join(projectDir, child.name);
      const stat = await fsp.stat(fullPath);
      files.push({
        fullPath,
        mtimeMs: stat.mtimeMs
      });
    }
  }
  return files.sort((left, right) => right.mtimeMs - left.mtimeMs);
}
async function parseSessionFile(filePath, mtimeMs) {
  const input = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity
  });
  const sessionId = path.basename(filePath, ".jsonl");
  let cwd = "";
  let gitBranch = "";
  let firstPrompt = "";
  let lastUserText = "";
  let lastAssistantText = "";
  let modelName = "Claude Code";
  let createdAt = "";
  let lastActiveAt = new Date(mtimeMs).toISOString();
  try {
    for await (const line of rl) {
      if (!line.trim()) {
        continue;
      }
      let entry;
      try {
        entry = JSON.parse(line);
      } catch (error) {
        continue;
      }
      if (!cwd && typeof entry.cwd === "string") {
        cwd = entry.cwd;
      }
      if (!gitBranch && typeof entry.gitBranch === "string") {
        gitBranch = entry.gitBranch;
      }
      if (!createdAt && typeof entry.timestamp === "string") {
        createdAt = entry.timestamp;
      }
      if (typeof entry.timestamp === "string") {
        lastActiveAt = entry.timestamp;
      }
      if (entry.type === "user" && entry.userType === "external") {
        const userText = clampText(extractTextContent(entry.message?.content), 180);
        if (userText) {
          if (!firstPrompt) {
            firstPrompt = userText;
          }
          lastUserText = userText;
        }
      }
      if (entry.type === "assistant") {
        const assistantText = clampText(extractTextContent(entry.message?.content), 180);
        if (assistantText) {
          lastAssistantText = assistantText;
        }
        if (typeof entry.message?.model === "string") {
          modelName = entry.message.model;
        }
      }
    }
  } finally {
    rl.close();
    input.close();
  }
  const titleSource = firstPrompt || lastUserText || lastAssistantText || sessionId;
  const summarySource = lastAssistantText || lastUserText || firstPrompt || "\u68C0\u6D4B\u5230\u672C\u5730 Claude Code \u4F1A\u8BDD\uFF0C\u4F46\u6682\u65F6\u6CA1\u6709\u62BD\u53D6\u5230\u660E\u786E\u6458\u8981\u3002";
  const resolvedCwd = cwd || fallbackProjectPathFromFile(filePath);
  return {
    id: buildNumericId(sessionId),
    titleHint: clampText(titleSource, 48),
    toolType: "Claude Code",
    modelName,
    sessionKey: sessionId,
    resumeCommand: `claude --resume ${sessionId}`,
    cwd: resolvedCwd,
    gitBranch: gitBranch || "unknown",
    transcriptPath: filePath,
    currentSummary: summarySource,
    nextAction: "\u5BFC\u5165\u540E\u6309\u4F60\u7684\u4EFB\u52A1\u8BED\u4E49\u8865\u5145\u6807\u9898\u3001\u5F53\u524D\u8FDB\u5C55\u548C\u4E0B\u4E00\u6B65\u3002",
    lastActiveAt,
    createdAt: createdAt || lastActiveAt
  };
}
async function readLocalClaudeSessionDrafts(options = {}) {
  const limit = Number.isFinite(options.limit) ? Number(options.limit) : DEFAULT_LIMIT;
  const files = await collectJsonlFiles();
  const candidateFiles = files.slice(0, Math.max(limit * 3, DEFAULT_LIMIT));
  const drafts = [];
  for (const file of candidateFiles) {
    const draft = await parseSessionFile(file.fullPath, file.mtimeMs);
    drafts.push(draft);
    if (drafts.length >= limit) {
      break;
    }
  }
  return drafts.sort((left, right) => {
    return new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime();
  });
}
if (__vite_injected_original_import_meta_url === `file://${process.argv[1]}`) {
  const limitArg = process.argv.find((item) => item.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : DEFAULT_LIMIT;
  const drafts = await readLocalClaudeSessionDrafts({ limit });
  process.stdout.write(`${JSON.stringify(drafts, null, 2)}
`);
}

// scripts/localCodexSessionDrafts.mjs
import fs2 from "node:fs";
import fsp2 from "node:fs/promises";
import os2 from "node:os";
import path2 from "node:path";
import readline2 from "node:readline";
var __vite_injected_original_import_meta_url2 = "file:///Users/wangfarui/workspaces/wfr/iw-mixes_ai/iw-mixes-web-platform/scripts/localCodexSessionDrafts.mjs";
var CODEX_HOME_DIR = path2.join(os2.homedir(), ".codex");
var CODEX_SESSION_INDEX_FILE = path2.join(CODEX_HOME_DIR, "session_index.jsonl");
var CODEX_SESSIONS_DIR = path2.join(CODEX_HOME_DIR, "sessions");
var CODEX_ARCHIVED_SESSIONS_DIR = path2.join(CODEX_HOME_DIR, "archived_sessions");
var DEFAULT_LIMIT2 = 12;
function clampText2(text, maxLength = 72) {
  if (!text) {
    return "";
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}...`;
}
function buildNumericId2(sessionId) {
  let hash = 0;
  for (const char of sessionId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }
  return hash;
}
function extractTextFromMessageContent(content) {
  if (!content) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }
      if (typeof item.text === "string") {
        return item.text;
      }
      return "";
    }).filter(Boolean).join(" ");
  }
  if (typeof content === "object" && typeof content.text === "string") {
    return content.text;
  }
  return "";
}
function recordMessageText(target, text) {
  const normalizedText = clampText2(text, 180);
  if (!normalizedText) {
    return;
  }
  if (!target.firstText) {
    target.firstText = normalizedText;
  }
  target.lastText = normalizedText;
}
function extractSessionIdFromFileName(filePath) {
  const match = path2.basename(filePath).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] || "";
}
async function walkJsonlFiles(rootDir) {
  try {
    const entries = await fsp2.readdir(rootDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const fullPath = path2.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await walkJsonlFiles(fullPath));
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) {
        continue;
      }
      files.push(fullPath);
    }
    return files;
  } catch {
    return [];
  }
}
async function buildSessionFileMap() {
  const filePathList = [
    ...await walkJsonlFiles(CODEX_SESSIONS_DIR),
    ...await walkJsonlFiles(CODEX_ARCHIVED_SESSIONS_DIR)
  ];
  const sessionFileMap = /* @__PURE__ */ new Map();
  for (const filePath of filePathList) {
    const sessionId = extractSessionIdFromFileName(filePath);
    if (!sessionId) {
      continue;
    }
    if (!sessionFileMap.has(sessionId)) {
      sessionFileMap.set(sessionId, filePath);
    }
  }
  return sessionFileMap;
}
async function readSessionIndex() {
  const rawText = await fsp2.readFile(CODEX_SESSION_INDEX_FILE, "utf8");
  return rawText.split("\n").filter((line) => line.trim()).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean).sort((left, right) => {
    return new Date(right.updated_at || 0).getTime() - new Date(left.updated_at || 0).getTime();
  });
}
async function parseSessionFile2(filePath, sessionIndexEntry) {
  const input = fs2.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline2.createInterface({
    input,
    crlfDelay: Infinity
  });
  const sessionId = sessionIndexEntry.id;
  const userMessageState = {
    firstText: "",
    lastText: ""
  };
  const assistantMessageState = {
    firstText: "",
    lastText: ""
  };
  let cwd = "";
  let modelName = "Codex";
  let createdAt = sessionIndexEntry.updated_at || "";
  let lastActiveAt = sessionIndexEntry.updated_at || "";
  try {
    for await (const line of rl) {
      if (!line.trim()) {
        continue;
      }
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      if (typeof entry.timestamp === "string") {
        if (!createdAt) {
          createdAt = entry.timestamp;
        }
        lastActiveAt = entry.timestamp;
      }
      if (entry.type === "session_meta") {
        if (typeof entry.payload?.cwd === "string" && entry.payload.cwd) {
          cwd = entry.payload.cwd;
        }
        if (typeof entry.payload?.timestamp === "string" && entry.payload.timestamp) {
          createdAt = entry.payload.timestamp;
        }
        continue;
      }
      if (entry.type === "turn_context") {
        if (typeof entry.payload?.cwd === "string" && entry.payload.cwd) {
          cwd = entry.payload.cwd;
        }
        if (typeof entry.payload?.model === "string" && entry.payload.model) {
          modelName = entry.payload.model;
        }
        continue;
      }
      if (entry.type === "event_msg") {
        if (entry.payload?.type === "user_message" && typeof entry.payload?.message === "string") {
          recordMessageText(userMessageState, entry.payload.message);
        }
        if (entry.payload?.type === "agent_message" && typeof entry.payload?.message === "string") {
          recordMessageText(assistantMessageState, entry.payload.message);
        }
        continue;
      }
      if (entry.type === "response_item" && entry.payload?.type === "message") {
        const messageText = extractTextFromMessageContent(entry.payload.content);
        if (entry.payload.role === "user") {
          recordMessageText(userMessageState, messageText);
        }
        if (entry.payload.role === "assistant") {
          recordMessageText(assistantMessageState, messageText);
        }
      }
    }
  } finally {
    rl.close();
    input.close();
  }
  const titleSource = sessionIndexEntry.thread_name || userMessageState.firstText || userMessageState.lastText || assistantMessageState.lastText || sessionId;
  const summarySource = assistantMessageState.lastText || userMessageState.lastText || userMessageState.firstText || "\u68C0\u6D4B\u5230\u672C\u5730 Codex \u4F1A\u8BDD\uFF0C\u4F46\u6682\u65F6\u6CA1\u6709\u62BD\u53D6\u5230\u660E\u786E\u6458\u8981\u3002";
  return {
    id: buildNumericId2(sessionId),
    titleHint: clampText2(titleSource, 48),
    toolType: "Codex",
    modelName,
    sessionKey: sessionId,
    resumeCommand: `codex resume ${sessionId}`,
    cwd: cwd || "",
    gitBranch: "",
    transcriptPath: filePath,
    currentSummary: summarySource,
    nextAction: "\u5BFC\u5165\u540E\u6309\u4F60\u7684\u4EFB\u52A1\u8BED\u4E49\u8865\u5145\u6807\u9898\u3001\u5F53\u524D\u8FDB\u5C55\u548C\u4E0B\u4E00\u6B65\u3002",
    lastActiveAt: lastActiveAt || createdAt,
    createdAt: createdAt || lastActiveAt
  };
}
function buildFallbackDraft(sessionIndexEntry, transcriptPath) {
  const sessionId = sessionIndexEntry.id;
  return {
    id: buildNumericId2(sessionId),
    titleHint: clampText2(sessionIndexEntry.thread_name || sessionId, 48),
    toolType: "Codex",
    modelName: "Codex",
    sessionKey: sessionId,
    resumeCommand: `codex resume ${sessionId}`,
    cwd: "",
    gitBranch: "",
    transcriptPath: transcriptPath || "",
    currentSummary: "\u4EC5\u4ECE Codex \u7D22\u5F15\u4E2D\u8BFB\u53D6\u5230\u4F1A\u8BDD\u5143\u4FE1\u606F\uFF0C\u5EFA\u8BAE\u5BFC\u5165\u540E\u624B\u5DE5\u8865\u5145\u5F53\u524D\u8FDB\u5C55\u3002",
    nextAction: "\u5BFC\u5165\u540E\u6309\u4F60\u7684\u4EFB\u52A1\u8BED\u4E49\u8865\u5145\u6807\u9898\u3001\u5F53\u524D\u8FDB\u5C55\u548C\u4E0B\u4E00\u6B65\u3002",
    lastActiveAt: sessionIndexEntry.updated_at || "",
    createdAt: sessionIndexEntry.updated_at || ""
  };
}
async function readLocalCodexSessionDrafts(options = {}) {
  const limit = Number.isFinite(options.limit) ? Number(options.limit) : DEFAULT_LIMIT2;
  const sessionIndexList = await readSessionIndex();
  const sessionFileMap = await buildSessionFileMap();
  const drafts = [];
  for (const sessionIndexEntry of sessionIndexList) {
    if (!sessionIndexEntry?.id) {
      continue;
    }
    const transcriptPath = sessionFileMap.get(sessionIndexEntry.id);
    if (!transcriptPath) {
      drafts.push(buildFallbackDraft(sessionIndexEntry, ""));
    } else {
      drafts.push(await parseSessionFile2(transcriptPath, sessionIndexEntry));
    }
    if (drafts.length >= limit) {
      break;
    }
  }
  return drafts.sort((left, right) => {
    return new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime();
  });
}
if (__vite_injected_original_import_meta_url2 === `file://${process.argv[1]}`) {
  const limitArg = process.argv.find((item) => item.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : DEFAULT_LIMIT2;
  const drafts = await readLocalCodexSessionDrafts({ limit });
  process.stdout.write(`${JSON.stringify(drafts, null, 2)}
`);
}

// vite.config.ts
var __vite_injected_original_import_meta_url3 = "file:///Users/wangfarui/workspaces/wfr/iw-mixes_ai/iw-mixes-web-platform/vite.config.ts";
var registerLocalClaudeSessionApi = (middlewares) => {
  middlewares.use("/api/local/claude-sessions", async (req, res) => {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({
        message: "Method Not Allowed"
      }));
      return;
    }
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const limit = Number(url.searchParams.get("limit") || "12");
      const drafts = await readLocalClaudeSessionDrafts({ limit });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({
        source: "local-claude-files",
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        drafts
      }));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({
        message: error?.message || "Failed to read local Claude session files"
      }));
    }
  });
};
var registerLocalCodexSessionApi = (middlewares) => {
  middlewares.use("/api/local/codex-sessions", async (req, res) => {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({
        message: "Method Not Allowed"
      }));
      return;
    }
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const limit = Number(url.searchParams.get("limit") || "12");
      const drafts = await readLocalCodexSessionDrafts({ limit });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({
        source: "local-codex-files",
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        drafts
      }));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({
        message: error?.message || "Failed to read local Codex session files"
      }));
    }
  });
};
var localAiSessionPlugin = () => ({
  name: "local-ai-session-api",
  configureServer(server) {
    registerLocalClaudeSessionApi(server.middlewares);
    registerLocalCodexSessionApi(server.middlewares);
  },
  configurePreviewServer(server) {
    registerLocalClaudeSessionApi(server.middlewares);
    registerLocalCodexSessionApi(server.middlewares);
  }
});
var vite_config_default = ({ command, mode }) => {
  const envParams = loadEnv(mode, "./");
  const VITE_BUILD_ENV = envParams.VITE_BUILD_ENV;
  return {
    server: {
      proxy: {
        "/auth-service": {
          target: "http://localhost:18000",
          changeOrigin: true
        },
        "/eat-service": {
          target: "http://localhost:18000",
          changeOrigin: true
        },
        "/bookkeeping-service": {
          target: "http://localhost:18000",
          changeOrigin: true
        },
        "/points-service": {
          target: "http://localhost:18000",
          changeOrigin: true
        },
        // Remote sharing bypasses iw-core locally so streamed ciphertext never reaches its compatibility proxy.
        "/external-service/api/remote-share": {
          target: "http://localhost:18006",
          changeOrigin: true
        },
        "/external-service/wb/remote-share": {
          target: "ws://localhost:18006",
          changeOrigin: true,
          ws: true
        },
        // Keep zhaogang aligned with production routing: iw-external directly, without the iw-core compatibility hop.
        "/external-service/api/zhaogang": {
          target: process.env.IW_LOCAL_ZHAOGANG_PROXY || "http://127.0.0.1:18006",
          changeOrigin: true
        },
        "/external-service": {
          target: "http://localhost:18000",
          changeOrigin: true
        }
      }
    },
    plugins: [
      vue(),
      svgLoader(),
      // 直接加载 SVG
      localAiSessionPlugin()
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url3))
      }
    }
  };
};
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic2NyaXB0cy9sb2NhbENsYXVkZVNlc3Npb25EcmFmdHMubWpzIiwgInNjcmlwdHMvbG9jYWxDb2RleFNlc3Npb25EcmFmdHMubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3dhbmdmYXJ1aS93b3Jrc3BhY2VzL3dmci9pdy1taXhlc19haS9pdy1taXhlcy13ZWItcGxhdGZvcm1cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy93YW5nZmFydWkvd29ya3NwYWNlcy93ZnIvaXctbWl4ZXNfYWkvaXctbWl4ZXMtd2ViLXBsYXRmb3JtL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy93YW5nZmFydWkvd29ya3NwYWNlcy93ZnIvaXctbWl4ZXNfYWkvaXctbWl4ZXMtd2ViLXBsYXRmb3JtL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHtmaWxlVVJMVG9QYXRoLCBVUkx9IGZyb20gJ25vZGU6dXJsJ1xuXG5pbXBvcnQge2xvYWRFbnZ9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcbmltcG9ydCBzdmdMb2FkZXIgZnJvbSAndml0ZS1zdmctbG9hZGVyJ1xuaW1wb3J0IHtyZWFkTG9jYWxDbGF1ZGVTZXNzaW9uRHJhZnRzfSBmcm9tICcuL3NjcmlwdHMvbG9jYWxDbGF1ZGVTZXNzaW9uRHJhZnRzLm1qcydcbmltcG9ydCB7cmVhZExvY2FsQ29kZXhTZXNzaW9uRHJhZnRzfSBmcm9tICcuL3NjcmlwdHMvbG9jYWxDb2RleFNlc3Npb25EcmFmdHMubWpzJ1xuXG5jb25zdCByZWdpc3RlckxvY2FsQ2xhdWRlU2Vzc2lvbkFwaSA9IChtaWRkbGV3YXJlczogYW55KSA9PiB7XG4gIG1pZGRsZXdhcmVzLnVzZSgnL2FwaS9sb2NhbC9jbGF1ZGUtc2Vzc2lvbnMnLCBhc3luYyAocmVxOiBhbnksIHJlczogYW55KSA9PiB7XG4gICAgaWYgKHJlcS5tZXRob2QgIT09ICdHRVQnKSB7XG4gICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNVxuICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnKVxuICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1lc3NhZ2U6ICdNZXRob2QgTm90IEFsbG93ZWQnXG4gICAgICB9KSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwgfHwgJy8nLCAnaHR0cDovLzEyNy4wLjAuMScpXG4gICAgICBjb25zdCBsaW1pdCA9IE51bWJlcih1cmwuc2VhcmNoUGFyYW1zLmdldCgnbGltaXQnKSB8fCAnMTInKVxuICAgICAgY29uc3QgZHJhZnRzID0gYXdhaXQgcmVhZExvY2FsQ2xhdWRlU2Vzc2lvbkRyYWZ0cyh7bGltaXR9KVxuXG4gICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMFxuICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnKVxuICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHNvdXJjZTogJ2xvY2FsLWNsYXVkZS1maWxlcycsXG4gICAgICAgIGdlbmVyYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIGRyYWZ0c1xuICAgICAgfSkpXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDBcbiAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04JylcbiAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdlOiBlcnJvcj8ubWVzc2FnZSB8fCAnRmFpbGVkIHRvIHJlYWQgbG9jYWwgQ2xhdWRlIHNlc3Npb24gZmlsZXMnXG4gICAgICB9KSlcbiAgICB9XG4gIH0pXG59XG5cbmNvbnN0IHJlZ2lzdGVyTG9jYWxDb2RleFNlc3Npb25BcGkgPSAobWlkZGxld2FyZXM6IGFueSkgPT4ge1xuICBtaWRkbGV3YXJlcy51c2UoJy9hcGkvbG9jYWwvY29kZXgtc2Vzc2lvbnMnLCBhc3luYyAocmVxOiBhbnksIHJlczogYW55KSA9PiB7XG4gICAgaWYgKHJlcS5tZXRob2QgIT09ICdHRVQnKSB7XG4gICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNVxuICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnKVxuICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1lc3NhZ2U6ICdNZXRob2QgTm90IEFsbG93ZWQnXG4gICAgICB9KSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwgfHwgJy8nLCAnaHR0cDovLzEyNy4wLjAuMScpXG4gICAgICBjb25zdCBsaW1pdCA9IE51bWJlcih1cmwuc2VhcmNoUGFyYW1zLmdldCgnbGltaXQnKSB8fCAnMTInKVxuICAgICAgY29uc3QgZHJhZnRzID0gYXdhaXQgcmVhZExvY2FsQ29kZXhTZXNzaW9uRHJhZnRzKHtsaW1pdH0pXG5cbiAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwXG4gICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcpXG4gICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgc291cmNlOiAnbG9jYWwtY29kZXgtZmlsZXMnLFxuICAgICAgICBnZW5lcmF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICBkcmFmdHNcbiAgICAgIH0pKVxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwXG4gICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcpXG4gICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbWVzc2FnZTogZXJyb3I/Lm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byByZWFkIGxvY2FsIENvZGV4IHNlc3Npb24gZmlsZXMnXG4gICAgICB9KSlcbiAgICB9XG4gIH0pXG59XG5cbmNvbnN0IGxvY2FsQWlTZXNzaW9uUGx1Z2luID0gKCkgPT4gKHtcbiAgbmFtZTogJ2xvY2FsLWFpLXNlc3Npb24tYXBpJyxcbiAgY29uZmlndXJlU2VydmVyKHNlcnZlcjogYW55KSB7XG4gICAgcmVnaXN0ZXJMb2NhbENsYXVkZVNlc3Npb25BcGkoc2VydmVyLm1pZGRsZXdhcmVzKVxuICAgIHJlZ2lzdGVyTG9jYWxDb2RleFNlc3Npb25BcGkoc2VydmVyLm1pZGRsZXdhcmVzKVxuICB9LFxuICBjb25maWd1cmVQcmV2aWV3U2VydmVyKHNlcnZlcjogYW55KSB7XG4gICAgcmVnaXN0ZXJMb2NhbENsYXVkZVNlc3Npb25BcGkoc2VydmVyLm1pZGRsZXdhcmVzKVxuICAgIHJlZ2lzdGVyTG9jYWxDb2RleFNlc3Npb25BcGkoc2VydmVyLm1pZGRsZXdhcmVzKVxuICB9XG59KVxuXG5leHBvcnQgZGVmYXVsdCAoeyBjb21tYW5kLCBtb2RlIH06IGFueSkgPT4ge1xuICAvLyBcdTgzQjdcdTUzRDZcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0ZcbiAgY29uc3QgZW52UGFyYW1zID0gbG9hZEVudihtb2RlLCAnLi8nKTtcbiAgY29uc3QgVklURV9CVUlMRF9FTlYgPSBlbnZQYXJhbXMuVklURV9CVUlMRF9FTlY7XG5cbiAgcmV0dXJuIHtcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIHByb3h5OiB7XG4gICAgICAgICcvYXV0aC1zZXJ2aWNlJzoge1xuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MTgwMDAnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICAnL2VhdC1zZXJ2aWNlJzoge1xuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MTgwMDAnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICAnL2Jvb2trZWVwaW5nLXNlcnZpY2UnOiB7XG4gICAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDoxODAwMCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgICcvcG9pbnRzLXNlcnZpY2UnOiB7XG4gICAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDoxODAwMCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIC8vIFJlbW90ZSBzaGFyaW5nIGJ5cGFzc2VzIGl3LWNvcmUgbG9jYWxseSBzbyBzdHJlYW1lZCBjaXBoZXJ0ZXh0IG5ldmVyIHJlYWNoZXMgaXRzIGNvbXBhdGliaWxpdHkgcHJveHkuXG4gICAgICAgICcvZXh0ZXJuYWwtc2VydmljZS9hcGkvcmVtb3RlLXNoYXJlJzoge1xuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MTgwMDYnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICAnL2V4dGVybmFsLXNlcnZpY2Uvd2IvcmVtb3RlLXNoYXJlJzoge1xuICAgICAgICAgIHRhcmdldDogJ3dzOi8vbG9jYWxob3N0OjE4MDA2JyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgd3M6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgLy8gS2VlcCB6aGFvZ2FuZyBhbGlnbmVkIHdpdGggcHJvZHVjdGlvbiByb3V0aW5nOiBpdy1leHRlcm5hbCBkaXJlY3RseSwgd2l0aG91dCB0aGUgaXctY29yZSBjb21wYXRpYmlsaXR5IGhvcC5cbiAgICAgICAgJy9leHRlcm5hbC1zZXJ2aWNlL2FwaS96aGFvZ2FuZyc6IHtcbiAgICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LklXX0xPQ0FMX1pIQU9HQU5HX1BST1hZIHx8ICdodHRwOi8vMTI3LjAuMC4xOjE4MDA2JyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgJy9leHRlcm5hbC1zZXJ2aWNlJzoge1xuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MTgwMDAnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICB2dWUoKSxcbiAgICAgIHN2Z0xvYWRlcigpLCAvLyBcdTc2RjRcdTYzQTVcdTUyQTBcdThGN0QgU1ZHXG4gICAgICBsb2NhbEFpU2Vzc2lvblBsdWdpbigpXG4gICAgXSxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICAnQCc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMnLCBpbXBvcnQubWV0YS51cmwpKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvd2FuZ2ZhcnVpL3dvcmtzcGFjZXMvd2ZyL2l3LW1peGVzX2FpL2l3LW1peGVzLXdlYi1wbGF0Zm9ybS9zY3JpcHRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvd2FuZ2ZhcnVpL3dvcmtzcGFjZXMvd2ZyL2l3LW1peGVzX2FpL2l3LW1peGVzLXdlYi1wbGF0Zm9ybS9zY3JpcHRzL2xvY2FsQ2xhdWRlU2Vzc2lvbkRyYWZ0cy5tanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3dhbmdmYXJ1aS93b3Jrc3BhY2VzL3dmci9pdy1taXhlc19haS9pdy1taXhlcy13ZWItcGxhdGZvcm0vc2NyaXB0cy9sb2NhbENsYXVkZVNlc3Npb25EcmFmdHMubWpzXCI7aW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgZnNwIGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnXG5pbXBvcnQgb3MgZnJvbSAnbm9kZTpvcydcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCByZWFkbGluZSBmcm9tICdub2RlOnJlYWRsaW5lJ1xuXG5jb25zdCBDTEFVREVfUFJPSkVDVFNfRElSID0gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5jbGF1ZGUnLCAncHJvamVjdHMnKVxuY29uc3QgREVGQVVMVF9MSU1JVCA9IDEyXG5cbmZ1bmN0aW9uIGNsYW1wVGV4dCh0ZXh0LCBtYXhMZW5ndGggPSA3Mikge1xuICBpZiAoIXRleHQpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuICBjb25zdCBub3JtYWxpemVkID0gdGV4dC5yZXBsYWNlKC9cXHMrL2csICcgJykudHJpbSgpXG4gIGlmIChub3JtYWxpemVkLmxlbmd0aCA8PSBtYXhMZW5ndGgpIHtcbiAgICByZXR1cm4gbm9ybWFsaXplZFxuICB9XG4gIHJldHVybiBgJHtub3JtYWxpemVkLnNsaWNlKDAsIG1heExlbmd0aCAtIDEpfS4uLmBcbn1cblxuZnVuY3Rpb24gYnVpbGROdW1lcmljSWQoc2Vzc2lvbklkKSB7XG4gIGxldCBoYXNoID0gMFxuICBmb3IgKGNvbnN0IGNoYXIgb2Ygc2Vzc2lvbklkKSB7XG4gICAgaGFzaCA9IChoYXNoICogMzEgKyBjaGFyLmNoYXJDb2RlQXQoMCkpICUgMjE0NzQ4MzY0N1xuICB9XG4gIHJldHVybiBoYXNoXG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RUZXh0Q29udGVudChjb250ZW50KSB7XG4gIGlmICghY29udGVudCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBjb250ZW50XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheShjb250ZW50KSkge1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBjb250ZW50KSB7XG4gICAgICBpZiAoIWl0ZW0gfHwgdHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBpZiAoaXRlbS50eXBlID09PSAndGV4dCcgJiYgdHlwZW9mIGl0ZW0udGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGl0ZW0udGV4dFxuICAgICAgfVxuICAgICAgaWYgKCFpdGVtLnR5cGUgJiYgdHlwZW9mIGl0ZW0udGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGl0ZW0udGV4dFxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGNvbnRlbnQudGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gY29udGVudC50ZXh0XG4gIH1cblxuICByZXR1cm4gJydcbn1cblxuZnVuY3Rpb24gZmFsbGJhY2tQcm9qZWN0UGF0aEZyb21GaWxlKGZpbGVQYXRoKSB7XG4gIGNvbnN0IHByb2plY3REaXJOYW1lID0gcGF0aC5iYXNlbmFtZShwYXRoLmRpcm5hbWUoZmlsZVBhdGgpKVxuICByZXR1cm4gcHJvamVjdERpck5hbWVcbiAgICAucmVwbGFjZSgvXi0vLCAnLycpXG4gICAgLnJlcGxhY2UoLy0vZywgJy8nKVxufVxuXG5hc3luYyBmdW5jdGlvbiBjb2xsZWN0SnNvbmxGaWxlcygpIHtcbiAgY29uc3QgcHJvamVjdERpcnMgPSBhd2FpdCBmc3AucmVhZGRpcihDTEFVREVfUFJPSkVDVFNfRElSLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSlcbiAgY29uc3QgZmlsZXMgPSBbXVxuXG4gIGZvciAoY29uc3QgZW50cnkgb2YgcHJvamVjdERpcnMpIHtcbiAgICBpZiAoIWVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGNvbnN0IHByb2plY3REaXIgPSBwYXRoLmpvaW4oQ0xBVURFX1BST0pFQ1RTX0RJUiwgZW50cnkubmFtZSlcbiAgICBjb25zdCBjaGlsZHJlbiA9IGF3YWl0IGZzcC5yZWFkZGlyKHByb2plY3REaXIsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KVxuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgIGlmICghY2hpbGQuaXNGaWxlKCkgfHwgIWNoaWxkLm5hbWUuZW5kc1dpdGgoJy5qc29ubCcpKSB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihwcm9qZWN0RGlyLCBjaGlsZC5uYW1lKVxuICAgICAgY29uc3Qgc3RhdCA9IGF3YWl0IGZzcC5zdGF0KGZ1bGxQYXRoKVxuICAgICAgZmlsZXMucHVzaCh7XG4gICAgICAgIGZ1bGxQYXRoLFxuICAgICAgICBtdGltZU1zOiBzdGF0Lm10aW1lTXNcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZpbGVzLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5tdGltZU1zIC0gbGVmdC5tdGltZU1zKVxufVxuXG5hc3luYyBmdW5jdGlvbiBwYXJzZVNlc3Npb25GaWxlKGZpbGVQYXRoLCBtdGltZU1zKSB7XG4gIGNvbnN0IGlucHV0ID0gZnMuY3JlYXRlUmVhZFN0cmVhbShmaWxlUGF0aCwgeyBlbmNvZGluZzogJ3V0ZjgnIH0pXG4gIGNvbnN0IHJsID0gcmVhZGxpbmUuY3JlYXRlSW50ZXJmYWNlKHtcbiAgICBpbnB1dCxcbiAgICBjcmxmRGVsYXk6IEluZmluaXR5XG4gIH0pXG5cbiAgY29uc3Qgc2Vzc2lvbklkID0gcGF0aC5iYXNlbmFtZShmaWxlUGF0aCwgJy5qc29ubCcpXG4gIGxldCBjd2QgPSAnJ1xuICBsZXQgZ2l0QnJhbmNoID0gJydcbiAgbGV0IGZpcnN0UHJvbXB0ID0gJydcbiAgbGV0IGxhc3RVc2VyVGV4dCA9ICcnXG4gIGxldCBsYXN0QXNzaXN0YW50VGV4dCA9ICcnXG4gIGxldCBtb2RlbE5hbWUgPSAnQ2xhdWRlIENvZGUnXG4gIGxldCBjcmVhdGVkQXQgPSAnJ1xuICBsZXQgbGFzdEFjdGl2ZUF0ID0gbmV3IERhdGUobXRpbWVNcykudG9JU09TdHJpbmcoKVxuXG4gIHRyeSB7XG4gICAgZm9yIGF3YWl0IChjb25zdCBsaW5lIG9mIHJsKSB7XG4gICAgICBpZiAoIWxpbmUudHJpbSgpKSB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIGxldCBlbnRyeVxuICAgICAgdHJ5IHtcbiAgICAgICAgZW50cnkgPSBKU09OLnBhcnNlKGxpbmUpXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICBpZiAoIWN3ZCAmJiB0eXBlb2YgZW50cnkuY3dkID09PSAnc3RyaW5nJykge1xuICAgICAgICBjd2QgPSBlbnRyeS5jd2RcbiAgICAgIH1cbiAgICAgIGlmICghZ2l0QnJhbmNoICYmIHR5cGVvZiBlbnRyeS5naXRCcmFuY2ggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGdpdEJyYW5jaCA9IGVudHJ5LmdpdEJyYW5jaFxuICAgICAgfVxuICAgICAgaWYgKCFjcmVhdGVkQXQgJiYgdHlwZW9mIGVudHJ5LnRpbWVzdGFtcCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY3JlYXRlZEF0ID0gZW50cnkudGltZXN0YW1wXG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGVudHJ5LnRpbWVzdGFtcCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgbGFzdEFjdGl2ZUF0ID0gZW50cnkudGltZXN0YW1wXG4gICAgICB9XG5cbiAgICAgIGlmIChlbnRyeS50eXBlID09PSAndXNlcicgJiYgZW50cnkudXNlclR5cGUgPT09ICdleHRlcm5hbCcpIHtcbiAgICAgICAgY29uc3QgdXNlclRleHQgPSBjbGFtcFRleHQoZXh0cmFjdFRleHRDb250ZW50KGVudHJ5Lm1lc3NhZ2U/LmNvbnRlbnQpLCAxODApXG4gICAgICAgIGlmICh1c2VyVGV4dCkge1xuICAgICAgICAgIGlmICghZmlyc3RQcm9tcHQpIHtcbiAgICAgICAgICAgIGZpcnN0UHJvbXB0ID0gdXNlclRleHRcbiAgICAgICAgICB9XG4gICAgICAgICAgbGFzdFVzZXJUZXh0ID0gdXNlclRleHRcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZW50cnkudHlwZSA9PT0gJ2Fzc2lzdGFudCcpIHtcbiAgICAgICAgY29uc3QgYXNzaXN0YW50VGV4dCA9IGNsYW1wVGV4dChleHRyYWN0VGV4dENvbnRlbnQoZW50cnkubWVzc2FnZT8uY29udGVudCksIDE4MClcbiAgICAgICAgaWYgKGFzc2lzdGFudFRleHQpIHtcbiAgICAgICAgICBsYXN0QXNzaXN0YW50VGV4dCA9IGFzc2lzdGFudFRleHRcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGVudHJ5Lm1lc3NhZ2U/Lm1vZGVsID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIG1vZGVsTmFtZSA9IGVudHJ5Lm1lc3NhZ2UubW9kZWxcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBmaW5hbGx5IHtcbiAgICBybC5jbG9zZSgpXG4gICAgaW5wdXQuY2xvc2UoKVxuICB9XG5cbiAgY29uc3QgdGl0bGVTb3VyY2UgPSBmaXJzdFByb21wdCB8fCBsYXN0VXNlclRleHQgfHwgbGFzdEFzc2lzdGFudFRleHQgfHwgc2Vzc2lvbklkXG4gIGNvbnN0IHN1bW1hcnlTb3VyY2UgPVxuICAgIGxhc3RBc3Npc3RhbnRUZXh0IHx8XG4gICAgbGFzdFVzZXJUZXh0IHx8XG4gICAgZmlyc3RQcm9tcHQgfHxcbiAgICAnXHU2OEMwXHU2RDRCXHU1MjMwXHU2NzJDXHU1NzMwIENsYXVkZSBDb2RlIFx1NEYxQVx1OEJERFx1RkYwQ1x1NEY0Nlx1NjY4Mlx1NjVGNlx1NkNBMVx1NjcwOVx1NjJCRFx1NTNENlx1NTIzMFx1NjYwRVx1Nzg2RVx1NjQ1OFx1ODk4MVx1MzAwMidcbiAgY29uc3QgcmVzb2x2ZWRDd2QgPSBjd2QgfHwgZmFsbGJhY2tQcm9qZWN0UGF0aEZyb21GaWxlKGZpbGVQYXRoKVxuXG4gIHJldHVybiB7XG4gICAgaWQ6IGJ1aWxkTnVtZXJpY0lkKHNlc3Npb25JZCksXG4gICAgdGl0bGVIaW50OiBjbGFtcFRleHQodGl0bGVTb3VyY2UsIDQ4KSxcbiAgICB0b29sVHlwZTogJ0NsYXVkZSBDb2RlJyxcbiAgICBtb2RlbE5hbWUsXG4gICAgc2Vzc2lvbktleTogc2Vzc2lvbklkLFxuICAgIHJlc3VtZUNvbW1hbmQ6IGBjbGF1ZGUgLS1yZXN1bWUgJHtzZXNzaW9uSWR9YCxcbiAgICBjd2Q6IHJlc29sdmVkQ3dkLFxuICAgIGdpdEJyYW5jaDogZ2l0QnJhbmNoIHx8ICd1bmtub3duJyxcbiAgICB0cmFuc2NyaXB0UGF0aDogZmlsZVBhdGgsXG4gICAgY3VycmVudFN1bW1hcnk6IHN1bW1hcnlTb3VyY2UsXG4gICAgbmV4dEFjdGlvbjogJ1x1NUJGQ1x1NTE2NVx1NTQwRVx1NjMwOVx1NEY2MFx1NzY4NFx1NEVGQlx1NTJBMVx1OEJFRFx1NEU0OVx1ODg2NVx1NTE0NVx1NjgwN1x1OTg5OFx1MzAwMVx1NUY1M1x1NTI0RFx1OEZEQlx1NUM1NVx1NTQ4Q1x1NEUwQlx1NEUwMFx1NkI2NVx1MzAwMicsXG4gICAgbGFzdEFjdGl2ZUF0LFxuICAgIGNyZWF0ZWRBdDogY3JlYXRlZEF0IHx8IGxhc3RBY3RpdmVBdFxuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkTG9jYWxDbGF1ZGVTZXNzaW9uRHJhZnRzKG9wdGlvbnMgPSB7fSkge1xuICBjb25zdCBsaW1pdCA9IE51bWJlci5pc0Zpbml0ZShvcHRpb25zLmxpbWl0KSA/IE51bWJlcihvcHRpb25zLmxpbWl0KSA6IERFRkFVTFRfTElNSVRcbiAgY29uc3QgZmlsZXMgPSBhd2FpdCBjb2xsZWN0SnNvbmxGaWxlcygpXG4gIGNvbnN0IGNhbmRpZGF0ZUZpbGVzID0gZmlsZXMuc2xpY2UoMCwgTWF0aC5tYXgobGltaXQgKiAzLCBERUZBVUxUX0xJTUlUKSlcbiAgY29uc3QgZHJhZnRzID0gW11cblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgY2FuZGlkYXRlRmlsZXMpIHtcbiAgICBjb25zdCBkcmFmdCA9IGF3YWl0IHBhcnNlU2Vzc2lvbkZpbGUoZmlsZS5mdWxsUGF0aCwgZmlsZS5tdGltZU1zKVxuICAgIGRyYWZ0cy5wdXNoKGRyYWZ0KVxuICAgIGlmIChkcmFmdHMubGVuZ3RoID49IGxpbWl0KSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkcmFmdHMuc29ydCgobGVmdCwgcmlnaHQpID0+IHtcbiAgICByZXR1cm4gbmV3IERhdGUocmlnaHQubGFzdEFjdGl2ZUF0KS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShsZWZ0Lmxhc3RBY3RpdmVBdCkuZ2V0VGltZSgpXG4gIH0pXG59XG5cbmlmIChpbXBvcnQubWV0YS51cmwgPT09IGBmaWxlOi8vJHtwcm9jZXNzLmFyZ3ZbMV19YCkge1xuICBjb25zdCBsaW1pdEFyZyA9IHByb2Nlc3MuYXJndi5maW5kKChpdGVtKSA9PiBpdGVtLnN0YXJ0c1dpdGgoJy0tbGltaXQ9JykpXG4gIGNvbnN0IGxpbWl0ID0gbGltaXRBcmcgPyBOdW1iZXIobGltaXRBcmcuc3BsaXQoJz0nKVsxXSkgOiBERUZBVUxUX0xJTUlUXG4gIGNvbnN0IGRyYWZ0cyA9IGF3YWl0IHJlYWRMb2NhbENsYXVkZVNlc3Npb25EcmFmdHMoeyBsaW1pdCB9KVxuICBwcm9jZXNzLnN0ZG91dC53cml0ZShgJHtKU09OLnN0cmluZ2lmeShkcmFmdHMsIG51bGwsIDIpfVxcbmApXG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy93YW5nZmFydWkvd29ya3NwYWNlcy93ZnIvaXctbWl4ZXNfYWkvaXctbWl4ZXMtd2ViLXBsYXRmb3JtL3NjcmlwdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy93YW5nZmFydWkvd29ya3NwYWNlcy93ZnIvaXctbWl4ZXNfYWkvaXctbWl4ZXMtd2ViLXBsYXRmb3JtL3NjcmlwdHMvbG9jYWxDb2RleFNlc3Npb25EcmFmdHMubWpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy93YW5nZmFydWkvd29ya3NwYWNlcy93ZnIvaXctbWl4ZXNfYWkvaXctbWl4ZXMtd2ViLXBsYXRmb3JtL3NjcmlwdHMvbG9jYWxDb2RleFNlc3Npb25EcmFmdHMubWpzXCI7aW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgZnNwIGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnXG5pbXBvcnQgb3MgZnJvbSAnbm9kZTpvcydcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCByZWFkbGluZSBmcm9tICdub2RlOnJlYWRsaW5lJ1xuXG5jb25zdCBDT0RFWF9IT01FX0RJUiA9IHBhdGguam9pbihvcy5ob21lZGlyKCksICcuY29kZXgnKVxuY29uc3QgQ09ERVhfU0VTU0lPTl9JTkRFWF9GSUxFID0gcGF0aC5qb2luKENPREVYX0hPTUVfRElSLCAnc2Vzc2lvbl9pbmRleC5qc29ubCcpXG5jb25zdCBDT0RFWF9TRVNTSU9OU19ESVIgPSBwYXRoLmpvaW4oQ09ERVhfSE9NRV9ESVIsICdzZXNzaW9ucycpXG5jb25zdCBDT0RFWF9BUkNISVZFRF9TRVNTSU9OU19ESVIgPSBwYXRoLmpvaW4oQ09ERVhfSE9NRV9ESVIsICdhcmNoaXZlZF9zZXNzaW9ucycpXG5jb25zdCBERUZBVUxUX0xJTUlUID0gMTJcblxuZnVuY3Rpb24gY2xhbXBUZXh0KHRleHQsIG1heExlbmd0aCA9IDcyKSB7XG4gIGlmICghdGV4dCkge1xuICAgIHJldHVybiAnJ1xuICB9XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSB0ZXh0LnJlcGxhY2UoL1xccysvZywgJyAnKS50cmltKClcbiAgaWYgKG5vcm1hbGl6ZWQubGVuZ3RoIDw9IG1heExlbmd0aCkge1xuICAgIHJldHVybiBub3JtYWxpemVkXG4gIH1cbiAgcmV0dXJuIGAke25vcm1hbGl6ZWQuc2xpY2UoMCwgbWF4TGVuZ3RoIC0gMSl9Li4uYFxufVxuXG5mdW5jdGlvbiBidWlsZE51bWVyaWNJZChzZXNzaW9uSWQpIHtcbiAgbGV0IGhhc2ggPSAwXG4gIGZvciAoY29uc3QgY2hhciBvZiBzZXNzaW9uSWQpIHtcbiAgICBoYXNoID0gKGhhc2ggKiAzMSArIGNoYXIuY2hhckNvZGVBdCgwKSkgJSAyMTQ3NDgzNjQ3XG4gIH1cbiAgcmV0dXJuIGhhc2hcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFRleHRGcm9tTWVzc2FnZUNvbnRlbnQoY29udGVudCkge1xuICBpZiAoIWNvbnRlbnQpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gY29udGVudFxuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkoY29udGVudCkpIHtcbiAgICByZXR1cm4gY29udGVudFxuICAgICAgLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICBpZiAoIWl0ZW0gfHwgdHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgcmV0dXJuICcnXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBpdGVtLnRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmV0dXJuIGl0ZW0udGV4dFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJ1xuICAgICAgfSlcbiAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgIC5qb2luKCcgJylcbiAgfVxuXG4gIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGNvbnRlbnQudGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gY29udGVudC50ZXh0XG4gIH1cblxuICByZXR1cm4gJydcbn1cblxuZnVuY3Rpb24gcmVjb3JkTWVzc2FnZVRleHQodGFyZ2V0LCB0ZXh0KSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWRUZXh0ID0gY2xhbXBUZXh0KHRleHQsIDE4MClcbiAgaWYgKCFub3JtYWxpemVkVGV4dCkge1xuICAgIHJldHVyblxuICB9XG4gIGlmICghdGFyZ2V0LmZpcnN0VGV4dCkge1xuICAgIHRhcmdldC5maXJzdFRleHQgPSBub3JtYWxpemVkVGV4dFxuICB9XG4gIHRhcmdldC5sYXN0VGV4dCA9IG5vcm1hbGl6ZWRUZXh0XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RTZXNzaW9uSWRGcm9tRmlsZU5hbWUoZmlsZVBhdGgpIHtcbiAgY29uc3QgbWF0Y2ggPSBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKS5tYXRjaCgvKFswLTlhLWZdezh9LVswLTlhLWZdezR9LVswLTlhLWZdezR9LVswLTlhLWZdezR9LVswLTlhLWZdezEyfSkvaSlcbiAgcmV0dXJuIG1hdGNoPy5bMV0gfHwgJydcbn1cblxuYXN5bmMgZnVuY3Rpb24gd2Fsa0pzb25sRmlsZXMocm9vdERpcikge1xuICB0cnkge1xuICAgIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmc3AucmVhZGRpcihyb290RGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSlcbiAgICBjb25zdCBmaWxlcyA9IFtdXG5cbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKHJvb3REaXIsIGVudHJ5Lm5hbWUpXG4gICAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICBmaWxlcy5wdXNoKC4uLmF3YWl0IHdhbGtKc29ubEZpbGVzKGZ1bGxQYXRoKSlcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIGlmICghZW50cnkuaXNGaWxlKCkgfHwgIWVudHJ5Lm5hbWUuZW5kc1dpdGgoJy5qc29ubCcpKSB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBmaWxlcy5wdXNoKGZ1bGxQYXRoKVxuICAgIH1cblxuICAgIHJldHVybiBmaWxlc1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gW11cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBidWlsZFNlc3Npb25GaWxlTWFwKCkge1xuICBjb25zdCBmaWxlUGF0aExpc3QgPSBbXG4gICAgLi4uYXdhaXQgd2Fsa0pzb25sRmlsZXMoQ09ERVhfU0VTU0lPTlNfRElSKSxcbiAgICAuLi5hd2FpdCB3YWxrSnNvbmxGaWxlcyhDT0RFWF9BUkNISVZFRF9TRVNTSU9OU19ESVIpXG4gIF1cbiAgY29uc3Qgc2Vzc2lvbkZpbGVNYXAgPSBuZXcgTWFwKClcblxuICBmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGZpbGVQYXRoTGlzdCkge1xuICAgIGNvbnN0IHNlc3Npb25JZCA9IGV4dHJhY3RTZXNzaW9uSWRGcm9tRmlsZU5hbWUoZmlsZVBhdGgpXG4gICAgaWYgKCFzZXNzaW9uSWQpIHtcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuICAgIGlmICghc2Vzc2lvbkZpbGVNYXAuaGFzKHNlc3Npb25JZCkpIHtcbiAgICAgIHNlc3Npb25GaWxlTWFwLnNldChzZXNzaW9uSWQsIGZpbGVQYXRoKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBzZXNzaW9uRmlsZU1hcFxufVxuXG5hc3luYyBmdW5jdGlvbiByZWFkU2Vzc2lvbkluZGV4KCkge1xuICBjb25zdCByYXdUZXh0ID0gYXdhaXQgZnNwLnJlYWRGaWxlKENPREVYX1NFU1NJT05fSU5ERVhfRklMRSwgJ3V0ZjgnKVxuICByZXR1cm4gcmF3VGV4dFxuICAgIC5zcGxpdCgnXFxuJylcbiAgICAuZmlsdGVyKChsaW5lKSA9PiBsaW5lLnRyaW0oKSlcbiAgICAubWFwKChsaW5lKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShsaW5lKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgICB9XG4gICAgfSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiB7XG4gICAgICByZXR1cm4gbmV3IERhdGUocmlnaHQudXBkYXRlZF9hdCB8fCAwKS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShsZWZ0LnVwZGF0ZWRfYXQgfHwgMCkuZ2V0VGltZSgpXG4gICAgfSlcbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VTZXNzaW9uRmlsZShmaWxlUGF0aCwgc2Vzc2lvbkluZGV4RW50cnkpIHtcbiAgY29uc3QgaW5wdXQgPSBmcy5jcmVhdGVSZWFkU3RyZWFtKGZpbGVQYXRoLCB7IGVuY29kaW5nOiAndXRmOCcgfSlcbiAgY29uc3QgcmwgPSByZWFkbGluZS5jcmVhdGVJbnRlcmZhY2Uoe1xuICAgIGlucHV0LFxuICAgIGNybGZEZWxheTogSW5maW5pdHlcbiAgfSlcblxuICBjb25zdCBzZXNzaW9uSWQgPSBzZXNzaW9uSW5kZXhFbnRyeS5pZFxuICBjb25zdCB1c2VyTWVzc2FnZVN0YXRlID0ge1xuICAgIGZpcnN0VGV4dDogJycsXG4gICAgbGFzdFRleHQ6ICcnXG4gIH1cbiAgY29uc3QgYXNzaXN0YW50TWVzc2FnZVN0YXRlID0ge1xuICAgIGZpcnN0VGV4dDogJycsXG4gICAgbGFzdFRleHQ6ICcnXG4gIH1cblxuICBsZXQgY3dkID0gJydcbiAgbGV0IG1vZGVsTmFtZSA9ICdDb2RleCdcbiAgbGV0IGNyZWF0ZWRBdCA9IHNlc3Npb25JbmRleEVudHJ5LnVwZGF0ZWRfYXQgfHwgJydcbiAgbGV0IGxhc3RBY3RpdmVBdCA9IHNlc3Npb25JbmRleEVudHJ5LnVwZGF0ZWRfYXQgfHwgJydcblxuICB0cnkge1xuICAgIGZvciBhd2FpdCAoY29uc3QgbGluZSBvZiBybCkge1xuICAgICAgaWYgKCFsaW5lLnRyaW0oKSkge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICBsZXQgZW50cnlcbiAgICAgIHRyeSB7XG4gICAgICAgIGVudHJ5ID0gSlNPTi5wYXJzZShsaW5lKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgZW50cnkudGltZXN0YW1wID09PSAnc3RyaW5nJykge1xuICAgICAgICBpZiAoIWNyZWF0ZWRBdCkge1xuICAgICAgICAgIGNyZWF0ZWRBdCA9IGVudHJ5LnRpbWVzdGFtcFxuICAgICAgICB9XG4gICAgICAgIGxhc3RBY3RpdmVBdCA9IGVudHJ5LnRpbWVzdGFtcFxuICAgICAgfVxuXG4gICAgICBpZiAoZW50cnkudHlwZSA9PT0gJ3Nlc3Npb25fbWV0YScpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBlbnRyeS5wYXlsb2FkPy5jd2QgPT09ICdzdHJpbmcnICYmIGVudHJ5LnBheWxvYWQuY3dkKSB7XG4gICAgICAgICAgY3dkID0gZW50cnkucGF5bG9hZC5jd2RcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGVudHJ5LnBheWxvYWQ/LnRpbWVzdGFtcCA9PT0gJ3N0cmluZycgJiYgZW50cnkucGF5bG9hZC50aW1lc3RhbXApIHtcbiAgICAgICAgICBjcmVhdGVkQXQgPSBlbnRyeS5wYXlsb2FkLnRpbWVzdGFtcFxuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIGlmIChlbnRyeS50eXBlID09PSAndHVybl9jb250ZXh0Jykge1xuICAgICAgICBpZiAodHlwZW9mIGVudHJ5LnBheWxvYWQ/LmN3ZCA9PT0gJ3N0cmluZycgJiYgZW50cnkucGF5bG9hZC5jd2QpIHtcbiAgICAgICAgICBjd2QgPSBlbnRyeS5wYXlsb2FkLmN3ZFxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZW50cnkucGF5bG9hZD8ubW9kZWwgPT09ICdzdHJpbmcnICYmIGVudHJ5LnBheWxvYWQubW9kZWwpIHtcbiAgICAgICAgICBtb2RlbE5hbWUgPSBlbnRyeS5wYXlsb2FkLm1vZGVsXG4gICAgICAgIH1cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgaWYgKGVudHJ5LnR5cGUgPT09ICdldmVudF9tc2cnKSB7XG4gICAgICAgIGlmIChlbnRyeS5wYXlsb2FkPy50eXBlID09PSAndXNlcl9tZXNzYWdlJyAmJiB0eXBlb2YgZW50cnkucGF5bG9hZD8ubWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZWNvcmRNZXNzYWdlVGV4dCh1c2VyTWVzc2FnZVN0YXRlLCBlbnRyeS5wYXlsb2FkLm1lc3NhZ2UpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVudHJ5LnBheWxvYWQ/LnR5cGUgPT09ICdhZ2VudF9tZXNzYWdlJyAmJiB0eXBlb2YgZW50cnkucGF5bG9hZD8ubWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZWNvcmRNZXNzYWdlVGV4dChhc3Npc3RhbnRNZXNzYWdlU3RhdGUsIGVudHJ5LnBheWxvYWQubWVzc2FnZSlcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICBpZiAoZW50cnkudHlwZSA9PT0gJ3Jlc3BvbnNlX2l0ZW0nICYmIGVudHJ5LnBheWxvYWQ/LnR5cGUgPT09ICdtZXNzYWdlJykge1xuICAgICAgICBjb25zdCBtZXNzYWdlVGV4dCA9IGV4dHJhY3RUZXh0RnJvbU1lc3NhZ2VDb250ZW50KGVudHJ5LnBheWxvYWQuY29udGVudClcbiAgICAgICAgaWYgKGVudHJ5LnBheWxvYWQucm9sZSA9PT0gJ3VzZXInKSB7XG4gICAgICAgICAgcmVjb3JkTWVzc2FnZVRleHQodXNlck1lc3NhZ2VTdGF0ZSwgbWVzc2FnZVRleHQpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVudHJ5LnBheWxvYWQucm9sZSA9PT0gJ2Fzc2lzdGFudCcpIHtcbiAgICAgICAgICByZWNvcmRNZXNzYWdlVGV4dChhc3Npc3RhbnRNZXNzYWdlU3RhdGUsIG1lc3NhZ2VUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGZpbmFsbHkge1xuICAgIHJsLmNsb3NlKClcbiAgICBpbnB1dC5jbG9zZSgpXG4gIH1cblxuICBjb25zdCB0aXRsZVNvdXJjZSA9XG4gICAgc2Vzc2lvbkluZGV4RW50cnkudGhyZWFkX25hbWUgfHxcbiAgICB1c2VyTWVzc2FnZVN0YXRlLmZpcnN0VGV4dCB8fFxuICAgIHVzZXJNZXNzYWdlU3RhdGUubGFzdFRleHQgfHxcbiAgICBhc3Npc3RhbnRNZXNzYWdlU3RhdGUubGFzdFRleHQgfHxcbiAgICBzZXNzaW9uSWRcbiAgY29uc3Qgc3VtbWFyeVNvdXJjZSA9XG4gICAgYXNzaXN0YW50TWVzc2FnZVN0YXRlLmxhc3RUZXh0IHx8XG4gICAgdXNlck1lc3NhZ2VTdGF0ZS5sYXN0VGV4dCB8fFxuICAgIHVzZXJNZXNzYWdlU3RhdGUuZmlyc3RUZXh0IHx8XG4gICAgJ1x1NjhDMFx1NkQ0Qlx1NTIzMFx1NjcyQ1x1NTczMCBDb2RleCBcdTRGMUFcdThCRERcdUZGMENcdTRGNDZcdTY2ODJcdTY1RjZcdTZDQTFcdTY3MDlcdTYyQkRcdTUzRDZcdTUyMzBcdTY2MEVcdTc4NkVcdTY0NThcdTg5ODFcdTMwMDInXG5cbiAgcmV0dXJuIHtcbiAgICBpZDogYnVpbGROdW1lcmljSWQoc2Vzc2lvbklkKSxcbiAgICB0aXRsZUhpbnQ6IGNsYW1wVGV4dCh0aXRsZVNvdXJjZSwgNDgpLFxuICAgIHRvb2xUeXBlOiAnQ29kZXgnLFxuICAgIG1vZGVsTmFtZSxcbiAgICBzZXNzaW9uS2V5OiBzZXNzaW9uSWQsXG4gICAgcmVzdW1lQ29tbWFuZDogYGNvZGV4IHJlc3VtZSAke3Nlc3Npb25JZH1gLFxuICAgIGN3ZDogY3dkIHx8ICcnLFxuICAgIGdpdEJyYW5jaDogJycsXG4gICAgdHJhbnNjcmlwdFBhdGg6IGZpbGVQYXRoLFxuICAgIGN1cnJlbnRTdW1tYXJ5OiBzdW1tYXJ5U291cmNlLFxuICAgIG5leHRBY3Rpb246ICdcdTVCRkNcdTUxNjVcdTU0MEVcdTYzMDlcdTRGNjBcdTc2ODRcdTRFRkJcdTUyQTFcdThCRURcdTRFNDlcdTg4NjVcdTUxNDVcdTY4MDdcdTk4OThcdTMwMDFcdTVGNTNcdTUyNERcdThGREJcdTVDNTVcdTU0OENcdTRFMEJcdTRFMDBcdTZCNjVcdTMwMDInLFxuICAgIGxhc3RBY3RpdmVBdDogbGFzdEFjdGl2ZUF0IHx8IGNyZWF0ZWRBdCxcbiAgICBjcmVhdGVkQXQ6IGNyZWF0ZWRBdCB8fCBsYXN0QWN0aXZlQXRcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZEZhbGxiYWNrRHJhZnQoc2Vzc2lvbkluZGV4RW50cnksIHRyYW5zY3JpcHRQYXRoKSB7XG4gIGNvbnN0IHNlc3Npb25JZCA9IHNlc3Npb25JbmRleEVudHJ5LmlkXG4gIHJldHVybiB7XG4gICAgaWQ6IGJ1aWxkTnVtZXJpY0lkKHNlc3Npb25JZCksXG4gICAgdGl0bGVIaW50OiBjbGFtcFRleHQoc2Vzc2lvbkluZGV4RW50cnkudGhyZWFkX25hbWUgfHwgc2Vzc2lvbklkLCA0OCksXG4gICAgdG9vbFR5cGU6ICdDb2RleCcsXG4gICAgbW9kZWxOYW1lOiAnQ29kZXgnLFxuICAgIHNlc3Npb25LZXk6IHNlc3Npb25JZCxcbiAgICByZXN1bWVDb21tYW5kOiBgY29kZXggcmVzdW1lICR7c2Vzc2lvbklkfWAsXG4gICAgY3dkOiAnJyxcbiAgICBnaXRCcmFuY2g6ICcnLFxuICAgIHRyYW5zY3JpcHRQYXRoOiB0cmFuc2NyaXB0UGF0aCB8fCAnJyxcbiAgICBjdXJyZW50U3VtbWFyeTogJ1x1NEVDNVx1NEVDRSBDb2RleCBcdTdEMjJcdTVGMTVcdTRFMkRcdThCRkJcdTUzRDZcdTUyMzBcdTRGMUFcdThCRERcdTUxNDNcdTRGRTFcdTYwNkZcdUZGMENcdTVFRkFcdThCQUVcdTVCRkNcdTUxNjVcdTU0MEVcdTYyNEJcdTVERTVcdTg4NjVcdTUxNDVcdTVGNTNcdTUyNERcdThGREJcdTVDNTVcdTMwMDInLFxuICAgIG5leHRBY3Rpb246ICdcdTVCRkNcdTUxNjVcdTU0MEVcdTYzMDlcdTRGNjBcdTc2ODRcdTRFRkJcdTUyQTFcdThCRURcdTRFNDlcdTg4NjVcdTUxNDVcdTY4MDdcdTk4OThcdTMwMDFcdTVGNTNcdTUyNERcdThGREJcdTVDNTVcdTU0OENcdTRFMEJcdTRFMDBcdTZCNjVcdTMwMDInLFxuICAgIGxhc3RBY3RpdmVBdDogc2Vzc2lvbkluZGV4RW50cnkudXBkYXRlZF9hdCB8fCAnJyxcbiAgICBjcmVhdGVkQXQ6IHNlc3Npb25JbmRleEVudHJ5LnVwZGF0ZWRfYXQgfHwgJydcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZExvY2FsQ29kZXhTZXNzaW9uRHJhZnRzKG9wdGlvbnMgPSB7fSkge1xuICBjb25zdCBsaW1pdCA9IE51bWJlci5pc0Zpbml0ZShvcHRpb25zLmxpbWl0KSA/IE51bWJlcihvcHRpb25zLmxpbWl0KSA6IERFRkFVTFRfTElNSVRcbiAgY29uc3Qgc2Vzc2lvbkluZGV4TGlzdCA9IGF3YWl0IHJlYWRTZXNzaW9uSW5kZXgoKVxuICBjb25zdCBzZXNzaW9uRmlsZU1hcCA9IGF3YWl0IGJ1aWxkU2Vzc2lvbkZpbGVNYXAoKVxuICBjb25zdCBkcmFmdHMgPSBbXVxuXG4gIGZvciAoY29uc3Qgc2Vzc2lvbkluZGV4RW50cnkgb2Ygc2Vzc2lvbkluZGV4TGlzdCkge1xuICAgIGlmICghc2Vzc2lvbkluZGV4RW50cnk/LmlkKSB7XG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIGNvbnN0IHRyYW5zY3JpcHRQYXRoID0gc2Vzc2lvbkZpbGVNYXAuZ2V0KHNlc3Npb25JbmRleEVudHJ5LmlkKVxuICAgIGlmICghdHJhbnNjcmlwdFBhdGgpIHtcbiAgICAgIGRyYWZ0cy5wdXNoKGJ1aWxkRmFsbGJhY2tEcmFmdChzZXNzaW9uSW5kZXhFbnRyeSwgJycpKVxuICAgIH0gZWxzZSB7XG4gICAgICBkcmFmdHMucHVzaChhd2FpdCBwYXJzZVNlc3Npb25GaWxlKHRyYW5zY3JpcHRQYXRoLCBzZXNzaW9uSW5kZXhFbnRyeSkpXG4gICAgfVxuXG4gICAgaWYgKGRyYWZ0cy5sZW5ndGggPj0gbGltaXQpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRyYWZ0cy5zb3J0KChsZWZ0LCByaWdodCkgPT4ge1xuICAgIHJldHVybiBuZXcgRGF0ZShyaWdodC5sYXN0QWN0aXZlQXQpLmdldFRpbWUoKSAtIG5ldyBEYXRlKGxlZnQubGFzdEFjdGl2ZUF0KS5nZXRUaW1lKClcbiAgfSlcbn1cblxuaWYgKGltcG9ydC5tZXRhLnVybCA9PT0gYGZpbGU6Ly8ke3Byb2Nlc3MuYXJndlsxXX1gKSB7XG4gIGNvbnN0IGxpbWl0QXJnID0gcHJvY2Vzcy5hcmd2LmZpbmQoKGl0ZW0pID0+IGl0ZW0uc3RhcnRzV2l0aCgnLS1saW1pdD0nKSlcbiAgY29uc3QgbGltaXQgPSBsaW1pdEFyZyA/IE51bWJlcihsaW1pdEFyZy5zcGxpdCgnPScpWzFdKSA6IERFRkFVTFRfTElNSVRcbiAgY29uc3QgZHJhZnRzID0gYXdhaXQgcmVhZExvY2FsQ29kZXhTZXNzaW9uRHJhZnRzKHsgbGltaXQgfSlcbiAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkoZHJhZnRzLCBudWxsLCAyKX1cXG5gKVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFxWCxTQUFRLGVBQWUsV0FBVTtBQUV0WixTQUFRLGVBQWM7QUFDdEIsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sZUFBZTs7O0FDSm1aLE9BQU8sUUFBUTtBQUN4YixPQUFPLFNBQVM7QUFDaEIsT0FBTyxRQUFRO0FBQ2YsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sY0FBYztBQUptUCxJQUFNLDJDQUEyQztBQU16VCxJQUFNLHNCQUFzQixLQUFLLEtBQUssR0FBRyxRQUFRLEdBQUcsV0FBVyxVQUFV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ZCxJQUFJO0FBQUEsUUFDTjtBQUFBO0FBQUEsUUFFQSxrQ0FBa0M7QUFBQSxVQUNoQyxRQUFRLFFBQVEsSUFBSSwyQkFBMkI7QUFBQSxVQUMvQyxjQUFjO0FBQUEsUUFDaEI7QUFBQSxRQUNBLHFCQUFxQjtBQUFBLFVBQ25CLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxRQUNoQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxJQUFJO0FBQUEsTUFDSixVQUFVO0FBQUE7QUFBQSxNQUNWLHFCQUFxQjtBQUFBLElBQ3ZCO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLGNBQWMsSUFBSSxJQUFJLFNBQVNBLHlDQUFlLENBQUM7QUFBQSxNQUN0RDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7IiwKICAibmFtZXMiOiBbImZzIiwgImZzcCIsICJvcyIsICJwYXRoIiwgInJlYWRsaW5lIiwgIl9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwiLCAicGF0aCIsICJvcyIsICJERUZBVUxUX0xJTUlUIiwgImNsYW1wVGV4dCIsICJidWlsZE51bWVyaWNJZCIsICJmc3AiLCAicGFyc2VTZXNzaW9uRmlsZSIsICJmcyIsICJyZWFkbGluZSIsICJfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsIl0KfQo=
