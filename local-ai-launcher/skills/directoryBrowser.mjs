import { readdir, realpath, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Only list directories. This works in background helpers without GUI/XPC access.
export const createDirectoryBrowser = ({
  home = os.homedir(),
  platform = process.platform,
  readEntries = readdir,
  inspect = stat,
  resolvePath = realpath,
} = {}) => {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const roots = async () => {
    const result = [{ label: "用户目录", path: home }];
    if (platform !== "win32")
      return [...result, { label: "文件系统", path: "/" }];
    const drives = await Promise.all(
      Array.from({ length: 26 }, async (_, index) => {
        const drive = `${String.fromCharCode(65 + index)}:\\`;
        try {
          const info = await Promise.race([
            inspect(drive),
            new Promise((resolve) => {
              const timer = setTimeout(() => resolve(null), 300);
              timer.unref?.();
            }),
          ]);
          return info?.isDirectory() ? { label: drive, path: drive } : null;
        } catch {
          return null;
        }
      }),
    );
    return [...result, ...drives.filter(Boolean)];
  };
  return async ({ path: requested = "", showHidden = false } = {}) => {
    if (
      typeof requested !== "string" ||
      requested.length > 4096 ||
      requested.includes("\0")
    )
      throw new Error("目录路径无效");
    const directory = requested || home;
    if (!pathApi.isAbsolute(directory)) throw new Error("请输入目录绝对路径");
    let actual, entries;
    try {
      actual = await resolvePath(directory);
      entries = await readEntries(actual, { withFileTypes: true });
    } catch {
      throw new Error("目录不存在或无法访问，请选择其他目录");
    }
    const folders = [];
    let truncated = false;
    for (const entry of entries) {
      if (!showHidden && entry.name.startsWith(".")) continue;
      let isDirectory = entry.isDirectory();
      if (!isDirectory && entry.isSymbolicLink()) {
        try {
          isDirectory = (
            await inspect(pathApi.join(actual, entry.name))
          ).isDirectory();
        } catch {
          continue;
        }
      }
      if (!isDirectory) continue;
      if (folders.length >= 2000) {
        truncated = true;
        break;
      }
      folders.push({
        name: entry.name,
        path: pathApi.join(actual, entry.name),
        symbolicLink: entry.isSymbolicLink(),
      });
    }
    folders.sort((a, b) => a.name.localeCompare(b.name));
    const parent = pathApi.dirname(actual);
    return {
      path: actual,
      parent: parent === actual ? "" : parent,
      roots: await roots(),
      entries: folders,
      truncated,
    };
  };
};
