import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import {
  LAUNCHER_HOST,
  LAUNCHER_LABEL,
  LAUNCHER_ORIGINS,
  LAUNCHER_PORT,
  getLauncherPaths
} from '../local-ai-launcher/constants.mjs'
import { discoverToolExecutables } from '../local-ai-launcher/executables.mjs'

const execFileAsync = promisify(execFile)
const command = process.argv[2]
const projectRoot = process.cwd()
const sourceAppDir = path.join(projectRoot, 'local-ai-launcher')
const paths = getLauncherPaths()

const xmlEscape = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const readExistingConfig = async () => {
  try {
    return JSON.parse(await readFile(paths.configPath, 'utf8'))
  } catch {
    return null
  }
}

const runLaunchctl = async (args, ignoreFailure = false) => {
  try {
    return await execFileAsync('/bin/launchctl', args)
  } catch (error) {
    if (ignoreFailure) {
      return null
    }
    throw error
  }
}

const buildPlist = () => {
  const serverPath = path.join(paths.appDir, 'server.mjs')
  const values = {
    label: xmlEscape(LAUNCHER_LABEL),
    node: xmlEscape(process.execPath),
    server: xmlEscape(serverPath),
    config: xmlEscape(paths.configPath),
    stdout: xmlEscape(paths.stdoutPath),
    stderr: xmlEscape(paths.stderrPath)
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${values.label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${values.node}</string>
    <string>${values.server}</string>
    <string>--config</string>
    <string>${values.config}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${values.stdout}</string>
  <key>StandardErrorPath</key>
  <string>${values.stderr}</string>
</dict>
</plist>
`
}

const install = async () => {
  if (process.platform !== 'darwin') {
    throw new Error('IW AI Launcher 目前只支持 macOS')
  }
  await access(sourceAppDir)
  const existingConfig = await readExistingConfig()
  const executables = await discoverToolExecutables(existingConfig?.executables)
  const config = {
    allowedOrigins: LAUNCHER_ORIGINS,
    token: existingConfig?.token || randomBytes(32).toString('hex'),
    executables
  }

  await mkdir(paths.rootDir, { recursive: true, mode: 0o700 })
  await mkdir(paths.logsDir, { recursive: true, mode: 0o700 })
  await mkdir(path.dirname(paths.plistPath), { recursive: true })
  await rm(paths.appDir, { recursive: true, force: true })
  await cp(sourceAppDir, paths.appDir, { recursive: true })
  await writeFile(paths.configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
  await writeFile(paths.plistPath, buildPlist(), 'utf8')

  const domain = `gui/${process.getuid()}`
  await runLaunchctl(['bootout', domain, paths.plistPath], true)
  await runLaunchctl(['bootstrap', domain, paths.plistPath])
  await runLaunchctl(['kickstart', '-k', `${domain}/${LAUNCHER_LABEL}`])

  process.stdout.write('IW AI Launcher 已安装并启动。\n')
  process.stdout.write(`允许来源：${LAUNCHER_ORIGINS.join(', ')}\n`)
  process.stdout.write(`本地地址：http://${LAUNCHER_HOST}:${LAUNCHER_PORT}\n`)
  process.stdout.write(`配对令牌：${config.token}\n`)
}

const uninstall = async () => {
  const domain = `gui/${process.getuid()}`
  await runLaunchctl(['bootout', domain, paths.plistPath], true)
  await rm(paths.plistPath, { force: true })
  await rm(paths.rootDir, { recursive: true, force: true })
  process.stdout.write('IW AI Launcher 已卸载。\n')
}

const status = async () => {
  const config = await readExistingConfig()
  if (!config) {
    throw new Error('IW AI Launcher 尚未安装')
  }
  const response = await fetch(`http://${LAUNCHER_HOST}:${LAUNCHER_PORT}/v1/status`, {
    headers: {
      'X-IW-Launcher-Token': config.token
    }
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body.message || '本地启动器状态异常')
  }
  process.stdout.write(`${JSON.stringify(body, null, 2)}\n`)
}

const pair = async () => {
  const config = await readExistingConfig()
  if (!config) {
    throw new Error('IW AI Launcher 尚未安装')
  }
  process.stdout.write(`${config.token}\n`)
}

const commandMap = {
  install,
  uninstall,
  status,
  pair
}

if (!commandMap[command]) {
  process.stderr.write('用法：node scripts/aiLauncher.mjs <install|uninstall|status|pair>\n')
  process.exitCode = 1
} else {
  commandMap[command]().catch((error) => {
    process.stderr.write(`${error?.message || error}\n`)
    process.exitCode = 1
  })
}
