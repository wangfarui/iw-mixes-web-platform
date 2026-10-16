import os from 'node:os'
import path from 'node:path'

export const LAUNCHER_VERSION = '1.5.3'
export const LAUNCHER_HOST = '127.0.0.1'
export const LAUNCHER_PORT = 17321
export const LAUNCHER_ORIGINS = [
  'https://web.itwray.com',
  'http://127.0.0.1:5173',
  'http://localhost:5173'
]
export const LAUNCHER_LABEL = 'com.itwray.ai-session-launcher'

export const getLauncherPaths = (homeDir = os.homedir(), platform = process.platform) => {
  const pathApi = platform === 'win32' ? path.win32 : path
  const rootDir = platform === 'win32'
    ? pathApi.join(homeDir, 'AppData', 'Local', 'IW AI Launcher')
    : pathApi.join(homeDir, 'Library', 'Application Support', 'IW AI Launcher')
  return {
    rootDir,
    appDir: pathApi.join(rootDir, 'app'),
    configPath: pathApi.join(rootDir, 'config.json'),
    logsDir: pathApi.join(rootDir, 'logs'),
    stdoutPath: pathApi.join(rootDir, 'logs', 'launcher.log'),
    stderrPath: pathApi.join(rootDir, 'logs', 'launcher-error.log'),
    plistPath: pathApi.join(homeDir, 'Library', 'LaunchAgents', `${LAUNCHER_LABEL}.plist`)
  }
}
