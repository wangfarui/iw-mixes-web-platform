import path from "node:path";

export const getWindowsStartupPath = (homeDir) =>
  path.win32.join(
    homeDir,
    "AppData",
    "Roaming",
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup",
    "IW AI Launcher.lnk",
  );
const psString = (value) => `'${String(value).replaceAll("'", "''")}'`;
export const buildWindowsStartupScript = ({
  nodePath,
  serverPath,
  configPath,
  shortcutPath,
}) => {
  const args = `"${serverPath}" --config "${configPath}"`;
  return [
    "$shell = New-Object -ComObject WScript.Shell",
    `$shortcut = $shell.CreateShortcut(${psString(shortcutPath)})`,
    `$shortcut.TargetPath = ${psString(nodePath)}`,
    `$shortcut.Arguments = ${psString(args)}`,
    `$shortcut.WorkingDirectory = ${psString(path.win32.dirname(serverPath))}`,
    "$shortcut.WindowStyle = 7",
    "$shortcut.Save()",
  ].join("\r\n");
};
