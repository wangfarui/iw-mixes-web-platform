import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const executeFile = promisify(execFile);
const WINDOWS_PICKER = `
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '选择 Skills 目录或项目目录'
$dialog.ShowNewFolderButton = $false
try {
  if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::Write($dialog.SelectedPath)
  }
} finally { $dialog.Dispose() }
`;
const MAC_PICKER =
  'set selectedFolder to choose folder with prompt "选择 Skills 目录或项目目录"\nreturn POSIX path of selectedFolder';

export const createDirectoryPicker = ({
  platform = process.platform,
  execute = executeFile,
  inspect = stat,
} = {}) => {
  let picking = false,
    controller;
  const pick = async ({ signal } = {}) => {
    if (picking) throw new Error("目录选择窗口已经打开，请先完成或取消选择");
    if (!["darwin", "win32"].includes(platform))
      throw new Error("系统目录选择支持 macOS 和 Windows，请手动输入目录路径");
    picking = true;
    controller = new AbortController();
    const onAbort = () => controller?.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const command =
        platform === "darwin" ? "/usr/bin/osascript" : "powershell.exe";
      const args =
        platform === "darwin"
          ? ["-e", MAC_PICKER]
          : [
              "-NoProfile",
              "-NonInteractive",
              "-STA",
              "-EncodedCommand",
              Buffer.from(WINDOWS_PICKER, "utf16le").toString("base64"),
            ];
      let result;
      try {
        result = await execute(command, args, {
          encoding: "utf8",
          signal: controller.signal,
          windowsHide: true,
          timeout: 300000,
          maxBuffer: 64 * 1024,
        });
      } catch (error) {
        if (error.name === "AbortError") return { cancelled: true, path: "" };
        if (platform === "darwin" && /\(-128\)/.test(error.stderr || ""))
          return { cancelled: true, path: "" };
        if (
          error.code === 69 &&
          /Connection invalid|Connection Invalid/.test(error.stderr || "")
        )
          throw new Error(
            "当前助手无法连接系统窗口服务，请刷新工作台使用本机目录浏览",
          );
        if (error.killed) throw new Error("目录选择等待超时，请重新选择");
        throw new Error("无法打开系统目录选择窗口，请重试或手动输入路径");
      }
      const selected = result.stdout.trim();
      if (!selected) return { cancelled: true, path: "" };
      const pathApi = platform === "win32" ? path.win32 : path.posix;
      if (!pathApi.isAbsolute(selected))
        throw new Error("目录选择未返回有效的绝对路径");
      const directory = pathApi.resolve(selected);
      if (!(await inspect(directory)).isDirectory())
        throw new Error("选择的目录不存在或不可访问");
      return { cancelled: false, path: directory };
    } finally {
      signal?.removeEventListener("abort", onAbort);
      controller = undefined;
      picking = false;
    }
  };
  pick.close = () => controller?.abort();
  return pick;
};
