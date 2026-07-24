import os from 'node:os'
import path from 'node:path'

export const LAUNCHER_VERSION = '1.2.1'
export const LAUNCHER_HOST = '127.0.0.1'
export const LAUNCHER_PORT = 17321
export const LAUNCHER_ORIGINS = [
  'https://web.itwray.com',
  'http://127.0.0.1:5173',
  'http://localhost:5173'
]
export const LAUNCHER_LABEL = 'com.itwray.ai-session-launcher'

export const getLauncherPaths = (homeDir = os.homedir()) => {
  const rootDir = path.join(homeDir, 'Library', 'Application Support', 'IW AI Launcher')
  return {
    rootDir,
    appDir: path.join(rootDir, 'app'),
    configPath: path.join(rootDir, 'config.json'),
    logsDir: path.join(rootDir, 'logs'),
    stdoutPath: path.join(rootDir, 'logs', 'launcher.log'),
    stderrPath: path.join(rootDir, 'logs', 'launcher-error.log'),
    plistPath: path.join(homeDir, 'Library', 'LaunchAgents', `${LAUNCHER_LABEL}.plist`)
  }
}
