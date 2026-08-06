import { execFile } from 'node:child_process'
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const ITERM2_BUNDLE_ID = 'com.googlecode.iterm2'
const ITERM2_NAME = 'iTerm2'

const shellQuote = (value) => `'${String(value).replaceAll("'", "'\"'\"'")}'`

export const buildTerminalScript = ({
  executable,
  args,
  workspacePath,
  commandPath,
  tempDir,
  sessionName = ''
}) => {
  const command = [executable, ...args].map(shellQuote).join(' ')
  return [
    '#!/bin/zsh',
    `rm -f -- ${shellQuote(commandPath)}`,
    `rmdir -- ${shellQuote(tempDir)} 2>/dev/null || true`,
    `cd -- ${shellQuote(workspacePath)} || exit 1`,
    ...(sessionName ? [`printf '\\033]0;%s\\007' ${shellQuote(sessionName)}`] : []),
    `exec ${command}`,
    ''
  ].join('\n')
}

export const createTerminalAdapter = ({
  tempRoot = path.join(os.tmpdir(), 'iw-ai-launcher'),
  executeFile = execFileAsync
} = {}) => ({
  async open(spec) {
    const tempDir = path.join(
      tempRoot,
      `${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2)}`
    )
    const commandPath = path.join(tempDir, 'launch.command')
    await mkdir(tempDir, { recursive: true, mode: 0o700 })
    const script = buildTerminalScript({
      ...spec,
      commandPath,
      tempDir
    })
    await writeFile(commandPath, script, { encoding: 'utf8', mode: 0o700 })
    await chmod(commandPath, 0o700)
    try {
      await executeFile('/usr/bin/open', ['-b', ITERM2_BUNDLE_ID, commandPath])
    } catch (error) {
      throw Object.assign(
        new Error('无法通过 iTerm2 打开会话，请确认 iTerm2 已安装且可以正常启动'),
        { code: 'ITERM2_OPEN_FAILED', cause: error }
      )
    }
    return {
      terminalName: ITERM2_NAME,
      sessionName: spec.sessionName || '',
      sessionNameApplied: Boolean(spec.sessionName),
      commandPreview: [spec.executable, ...spec.args].join(' '),
      workspacePath: spec.workspacePath
    }
  }
})
