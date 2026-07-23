import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { createLauncherServer } from '../local-ai-launcher/server.mjs'
import { createSessionLauncher } from '../local-ai-launcher/sessionLauncher.mjs'
import { buildTerminalScript } from '../local-ai-launcher/terminalAdapter.mjs'

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'iw-ai-launcher-test-'))
const workspacePath = path.join(tempDir, "workspace with 'quote'")
const executablePath = path.join(tempDir, 'codex')
const execFileAsync = promisify(execFile)
await mkdir(workspacePath)
await writeFile(executablePath, '#!/bin/sh\nprintf "%s\\n" "$@" > "$IW_TEST_CAPTURE"\n')
await chmod(executablePath, 0o700)
const resolvedWorkspacePath = await realpath(workspacePath)

try {
  let openedSpec
  const sessionLauncher = createSessionLauncher({
    terminalAdapter: {
      async open(spec) {
        openedSpec = spec
        return {
          commandPreview: 'preview',
          workspacePath: spec.workspacePath
        }
      }
    },
    configuredExecutables: {
      codex: executablePath
    }
  })

  const launchResult = await sessionLauncher.launch({
    toolType: 'codex',
    sessionKey: 'session-123',
    workspacePath,
    modelProvider: 'provider-name'
  })
  assert.equal(launchResult.toolType, 'codex')
  assert.equal(openedSpec.executable, executablePath)
  assert.deepEqual(openedSpec.args, [
    'resume',
    'session-123',
    '-c',
    'model_provider=provider-name'
  ])
  assert.equal(openedSpec.workspacePath, resolvedWorkspacePath)

  await assert.rejects(
    () => sessionLauncher.launch({
      toolType: 'codex',
      sessionKey: 'session\nrm -rf /',
      workspacePath
    }),
    /Session格式不正确/
  )
  await assert.rejects(
    () => sessionLauncher.launch({
      toolType: 'codex',
      sessionKey: 'session-123',
      workspacePath: path.join(tempDir, 'missing')
    }),
    /工作区不存在/
  )

  const commandPath = path.join(tempDir, 'launch.command')
  const script = buildTerminalScript({
    executable: executablePath,
    args: ['resume', "session'; touch /tmp/unsafe", '-c', 'model_provider=a b'],
    workspacePath,
    commandPath,
    tempDir
  })
  assert.match(script, /cd -- '.*workspace with '"'"'quote'/)
  assert.match(script, /'session'"'"'; touch \/tmp\/unsafe'/)
  await writeFile(commandPath, script, { mode: 0o700 })
  await chmod(commandPath, 0o700)
  const capturePath = path.join(tempDir, 'args.txt')
  await execFileAsync('/bin/zsh', [commandPath], {
    env: {
      ...process.env,
      IW_TEST_CAPTURE: capturePath
    }
  })
  assert.deepEqual((await readFile(capturePath, 'utf8')).trim().split('\n'), [
    'resume',
    "session'; touch /tmp/unsafe",
    '-c',
    'model_provider=a b'
  ])

  const config = {
    allowedOrigins: [
      'https://web.itwray.com',
      'http://127.0.0.1:5173',
      'http://localhost:5173'
    ],
    token: 'test-token',
    executables: {
      codex: executablePath,
      claude: '',
      gemini: ''
    }
  }
  const launcherServer = createLauncherServer({
    config,
    sessionLauncher,
    port: 0
  })
  await launcherServer.listen()
  const address = launcherServer.server.address()
  assert.ok(address && typeof address === 'object')
  const baseUrl = `http://127.0.0.1:${address.port}`

  const statusResponse = await fetch(`${baseUrl}/v1/status`, {
    headers: {
      Origin: 'https://web.itwray.com'
    }
  })
  assert.equal(statusResponse.status, 200)
  assert.equal((await statusResponse.json()).paired, false)

  for (const origin of ['http://127.0.0.1:5173', 'http://localhost:5173']) {
    const preflightResponse = await fetch(`${baseUrl}/v1/status`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Private-Network': 'true'
      }
    })
    assert.equal(preflightResponse.status, 204)
    assert.equal(preflightResponse.headers.get('access-control-allow-origin'), origin)
  }

  const forbiddenResponse = await fetch(`${baseUrl}/v1/status`, {
    headers: {
      Origin: 'https://evil.example'
    }
  })
  assert.equal(forbiddenResponse.status, 403)

  const unauthorizedResponse = await fetch(`${baseUrl}/v1/launch`, {
    method: 'POST',
    headers: {
      Origin: 'https://web.itwray.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      toolType: 'codex',
      sessionKey: 'session-123',
      workspacePath
    })
  })
  assert.equal(unauthorizedResponse.status, 401)

  const launchResponse = await fetch(`${baseUrl}/v1/launch`, {
    method: 'POST',
    headers: {
      Origin: 'https://web.itwray.com',
      'Content-Type': 'application/json',
      'X-IW-Launcher-Token': 'test-token'
    },
    body: JSON.stringify({
      toolType: 'codex',
      sessionKey: 'session-123',
      workspacePath,
      modelProvider: 'provider-name'
    })
  })
  assert.equal(launchResponse.status, 202)
  assert.equal((await launchResponse.json()).toolType, 'codex')

  await launcherServer.close()
  process.stdout.write('AI launcher tests passed\n')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
