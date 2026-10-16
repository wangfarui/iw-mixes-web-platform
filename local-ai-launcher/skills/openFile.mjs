import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

export const createSkillFileOpener = ({
  platform = process.platform,
  home = os.homedir(),
  environment = process.env,
  spawnProcess = spawn,
} = {}) => {
  const open = async (command, args) => {
    const child = spawnProcess(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    child.unref();
  };
  return async (file) => {
    const candidates =
      platform === "win32"
        ? [
            path.win32.join(
              home,
              "AppData",
              "Local",
              "Programs",
              "Microsoft VS Code",
              "Code.exe",
            ),
            ...(environment.ProgramFiles
              ? [
                  path.win32.join(
                    environment.ProgramFiles,
                    "Microsoft VS Code",
                    "Code.exe",
                  ),
                ]
              : []),
          ]
        : ["code"];
    for (const executable of candidates) {
      try {
        await open(executable, ["--reuse-window", file]);
        return;
      } catch {
        /* Try the next installed editor. */
      }
    }
    if (platform === "win32") await open("notepad.exe", [file]);
    else if (platform === "darwin") await open("/usr/bin/open", ["-t", file]);
    else await open("xdg-open", [file]);
  };
};
