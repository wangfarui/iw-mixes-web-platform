import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { createLauncherServer } from '../local-ai-launcher/server.mjs'
import {
  createMetadataOptimizer,
  loadInteractiveShellEnvironment
} from '../local-ai-launcher/metadataOptimizer.mjs'
import { createSessionInspector, parseResumeCommand } from '../local-ai-launcher/sessionInspector.mjs'
import { createSessionLauncher } from '../local-ai-launcher/sessionLauncher.mjs'
import { buildTerminalScript } from '../local-ai-launcher/terminalAdapter.mjs'

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'iw-ai-launcher-test-'))
const workspacePath = path.join(tempDir, "workspace with 'quote'")
const executablePath = path.join(tempDir, 'codex')
const optimizerExecutablePath = path.join(tempDir, 'codex-optimizer')
const optimizerCapturePath = path.join(tempDir, 'optimizer-args.txt')
const codexHomeDir = path.join(tempDir, '.codex')
const codexSessionId = '01900000-1234-7000-8000-000000000001'
const codexSessionDir = path.join(codexHomeDir, 'sessions', '2026', '07', '23')
const codexTranscriptPath = path.join(codexSessionDir, `rollout-${codexSessionId}.jsonl`)
const execFileAsync = promisify(execFile)
await mkdir(workspacePath)
await mkdir(codexSessionDir, { recursive: true })
const shellHomeDir = path.join(tempDir, 'shell-home')
await mkdir(shellHomeDir)
await writeFile(
  path.join(shellHomeDir, '.zshrc'),
  'export IW_TEST_ZSHRC_VALUE="loaded-from-zshrc"\n'
)
await writeFile(executablePath, '#!/bin/sh\nprintf "%s\\n" "$@" > "$IW_TEST_CAPTURE"\n')
await chmod(executablePath, 0o700)
await writeFile(optimizerExecutablePath, `#!/bin/sh
if [ -z "$IW_TEST_PROVIDER_KEY" ]; then
  echo "Missing environment variable: IW_TEST_PROVIDER_KEY" >&2
  exit 2
fi
printf "%s\\n" "$@" > "$IW_TEST_OPTIMIZER_CAPTURE"
output_file=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output-last-message" ]; then
    shift
    output_file="$1"
  fi
  shift
done
cat >/dev/null
printf '%s\\n' '{"title":"AI 优化后的名称","description":"AI 优化后的任务描述。"}' > "$output_file"
`)
await chmod(optimizerExecutablePath, 0o700)
await writeFile(path.join(codexHomeDir, 'session_index.jsonl'), [
  JSON.stringify({
    id: codexSessionId,
    thread_name: '实现本地会话识别',
    updated_at: '2026-07-23T10:00:00.000Z'
  }),
  'invalid json line'
].join('\n'))
await writeFile(codexTranscriptPath, [
  JSON.stringify({
    timestamp: '2026-07-23T09:00:00.000Z',
    type: 'session_meta',
    payload: {
      cwd: workspacePath,
      model_provider: 'local-provider',
      git: { branch: 'feature/session-inspector' }
    }
  }),
  JSON.stringify({
    timestamp: '2026-07-23T09:01:00.000Z',
    type: 'turn_context',
    payload: {
      cwd: workspacePath,
      model: 'gpt-test-model'
    }
  }),
  JSON.stringify({
    timestamp: '2026-07-23T09:02:00.000Z',
    type: 'event_msg',
    payload: {
      type: 'user_message',
      message: '请实现本地会话识别功能'
    }
  }),
  JSON.stringify({
    timestamp: '2026-07-23T09:03:00.000Z',
    type: 'event_msg',
    payload: {
      type: 'agent_message',
      message: '已经完成本地会话检查模块设计。'
    }
  }),
  JSON.stringify({
    timestamp: '2026-07-23T09:04:00.000Z',
    type: 'event_msg',
    payload: {
      type: 'user_message',
      message: '补充要求：识别过程必须使用本地启动器。'
    }
  }),
  JSON.stringify({
    timestamp: '2026-07-23T09:05:00.000Z',
    type: 'event_msg',
    payload: {
      type: 'task_complete',
      last_agent_message: '功能和测试均已完成。'
    }
  })
].join('\n'))
const resolvedWorkspacePath = await realpath(workspacePath)

try {
  const interactiveShellEnvironment = await loadInteractiveShellEnvironment({
    baseEnvironment: {
      HOME: shellHomeDir,
      PATH: process.env.PATH
    }
  })
  assert.equal(interactiveShellEnvironment.IW_TEST_ZSHRC_VALUE, 'loaded-from-zshrc')

  assert.deepEqual(parseResumeCommand(`codex resume ${codexSessionId}`), {
    toolType: 'codex',
    sessionKey: codexSessionId,
    modelProvider: '',
    resumeCommand: `codex resume ${codexSessionId}`
  })
  const quotedWorkspacePath = `'${workspacePath.split("'").join("'\"'\"'")}'`
  const copiedScript = `cd -- ${quotedWorkspacePath} && codex resume '${codexSessionId}' -c model_provider='local-provider'`
  assert.deepEqual(parseResumeCommand(copiedScript), {
    toolType: 'codex',
    sessionKey: codexSessionId,
    modelProvider: 'local-provider',
    resumeCommand: copiedScript
  })
  await assert.rejects(
    async () => parseResumeCommand(`codex resume ${codexSessionId}; touch /tmp/unsafe`),
    /命令格式应为/
  )

  const sessionInspector = createSessionInspector({ codexHomeDir })
  const inspectedSession = await sessionInspector.inspect({
    resumeCommand: `codex resume ${codexSessionId} -c model_provider=command-provider`
  })
  assert.deepEqual(inspectedSession, {
    toolType: 'codex',
    title: '实现本地会话识别',
    description: '请实现本地会话识别功能；补充：补充要求：识别过程必须使用本地启动器。',
    modelName: 'gpt-test-model',
    modelProvider: 'command-provider',
    sessionKey: codexSessionId,
    workspacePath,
    projectName: path.basename(workspacePath),
    gitBranch: 'feature/session-inspector',
    transcriptPath: codexTranscriptPath,
    resumeCommand: `codex resume ${codexSessionId} -c model_provider=command-provider`,
    lastActiveAt: '2026-07-23T09:05:00.000Z',
    warnings: []
  })
  await assert.rejects(
    () => sessionInspector.inspect({
      resumeCommand: 'codex resume 01900000-1234-7000-8000-000000000002'
    }),
    /本机未找到对应的 Codex 会话/
  )

  process.env.IW_TEST_OPTIMIZER_CAPTURE = optimizerCapturePath
  const metadataOptimizer = createMetadataOptimizer({
    sessionInspector,
    codexExecutable: optimizerExecutablePath,
    resolveEnvironment: async () => ({
      ...process.env,
      IW_TEST_PROVIDER_KEY: 'test-provider-key'
    })
  })
  const optimizedMetadata = await metadataOptimizer.optimize({
    resumeCommand: `codex resume ${codexSessionId}`,
    currentTitle: inspectedSession.title,
    currentDescription: inspectedSession.description
  })
  assert.deepEqual(optimizedMetadata, {
    title: 'AI 优化后的名称',
    description: 'AI 优化后的任务描述。',
    metadataSource: 'ai'
  })
  const optimizerArgs = (await readFile(optimizerCapturePath, 'utf8')).trim().split('\n')
  assert.ok(optimizerArgs.includes('--ephemeral'))
  assert.ok(optimizerArgs.includes('--output-schema'))
  assert.ok(optimizerArgs.includes('read-only'))
  assert.ok(optimizerArgs.includes('model_provider=local-provider'))
  assert.ok(optimizerArgs.includes('gpt-test-model'))

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
    sessionInspector,
    metadataOptimizer,
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

  const unauthorizedInspectResponse = await fetch(`${baseUrl}/v1/session/inspect`, {
    method: 'POST',
    headers: {
      Origin: 'https://web.itwray.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      resumeCommand: `codex resume ${codexSessionId}`
    })
  })
  assert.equal(unauthorizedInspectResponse.status, 401)

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

  const inspectResponse = await fetch(`${baseUrl}/v1/session/inspect`, {
    method: 'POST',
    headers: {
      Origin: 'https://web.itwray.com',
      'Content-Type': 'application/json',
      'X-IW-Launcher-Token': 'test-token'
    },
    body: JSON.stringify({
      resumeCommand: `codex resume ${codexSessionId}`
    })
  })
  assert.equal(inspectResponse.status, 200)
  const inspectBody = await inspectResponse.json()
  assert.equal(inspectBody.sessionKey, codexSessionId)
  assert.equal(inspectBody.modelProvider, 'local-provider')
  assert.equal(inspectBody.projectName, path.basename(workspacePath))

  const invalidInspectResponse = await fetch(`${baseUrl}/v1/session/inspect`, {
    method: 'POST',
    headers: {
      Origin: 'https://web.itwray.com',
      'Content-Type': 'application/json',
      'X-IW-Launcher-Token': 'test-token'
    },
    body: JSON.stringify({
      resumeCommand: `codex resume ${codexSessionId}; open -a Calculator`
    })
  })
  assert.equal(invalidInspectResponse.status, 400)
  assert.equal((await invalidInspectResponse.json()).code, 'INVALID_COMMAND')

  const optimizeResponse = await fetch(`${baseUrl}/v1/session/optimize-metadata`, {
    method: 'POST',
    headers: {
      Origin: 'https://web.itwray.com',
      'Content-Type': 'application/json',
      'X-IW-Launcher-Token': 'test-token'
    },
    body: JSON.stringify({
      resumeCommand: `codex resume ${codexSessionId}`,
      currentTitle: inspectedSession.title,
      currentDescription: inspectedSession.description
    })
  })
  assert.equal(optimizeResponse.status, 200)
  assert.deepEqual(await optimizeResponse.json(), {
    title: 'AI 优化后的名称',
    description: 'AI 优化后的任务描述。',
    metadataSource: 'ai'
  })

  await launcherServer.close()
  process.stdout.write('AI launcher tests passed\n')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
