import { execFile } from 'node:child_process'
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const shellQuote = (value) => `'${String(value).replaceAll("'", "'\"'\"'")}'`

export const buildTerminalScript = ({ executable, args, workspacePath, commandPath, tempDir }) => {
  const command = [executable, ...args].map(shellQuote).join(' ')
  return [
    '#!/bin/zsh',
    `rm -f -- ${shellQuote(commandPath)}`,
    `rmdir -- ${shellQuote(tempDir)} 2>/dev/null || true`,
    `cd -- ${shellQuote(workspacePath)} || exit 1`,
    `exec ${command}`,
    ''
  ].join('\n')
}

export const createTerminalAdapter = ({
  tempRoot = path.join(os.tmpdir(), 'iw-ai-launcher'),
  openTerminal = (commandPath) => execFileAsync('/usr/bin/open', ['-a', 'Terminal', commandPath])
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
    await openTerminal(commandPath)
    return {
      commandPreview: [spec.executable, ...spec.args].join(' '),
      workspacePath: spec.workspacePath
    }
  }
})
