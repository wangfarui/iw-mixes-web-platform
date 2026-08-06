import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/version-polling-tests')
await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const outfile = path.join(tempDir, 'version-polling-core.mjs')
await build({
  entryPoints: [path.join(root, 'src/services/versionPollingServiceCore.ts')],
  outfile,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  logLevel: 'silent'
})

const {
  VERSION_POLLING_INTERVAL_MS,
  createVersionPollingService
} = await import(pathToFileURL(outfile).href)

let hasToken = true
let requestCount = 0
let refreshCount = 0
let currentVersion = 1
let nextTimer = 0
let scheduledCallback
const cancelledTimers = []
const errors = []

const service = createVersionPollingService({
  hasToken: () => hasToken,
  getVersion: async () => {
    requestCount += 1
    return currentVersion
  },
  refreshCache: () => {
    refreshCount += 1
  },
  schedule: (callback, intervalMs) => {
    assert.equal(intervalMs, 30_000)
    scheduledCallback = callback
    return nextTimer++
  },
  cancel: timer => {
    cancelledTimers.push(timer)
  },
  reportError: error => {
    errors.push(error)
  }
})

assert.equal(VERSION_POLLING_INTERVAL_MS, 30_000)
service.startVersionPolling()
service.startVersionPolling()
await Promise.resolve()
assert.equal(requestCount, 1, '重复启动不应创建额外请求')
assert.equal(service.isPollingActive(), true)

currentVersion = 2
scheduledCallback()
await Promise.resolve()
assert.equal(requestCount, 2)
assert.equal(refreshCount, 1, '版本变化应刷新字典缓存')

hasToken = false
scheduledCallback()
await Promise.resolve()
assert.equal(requestCount, 2, '登录失效后不应继续请求版本接口')
assert.equal(service.isPollingActive(), false)
assert.deepEqual(cancelledTimers, [0], '定时器 ID 为 0 时也应正常清理')

hasToken = true
service.startVersionPolling()
await Promise.resolve()
assert.equal(requestCount, 3, '重新登录后应恢复轮询')
service.stopVersionPolling()
service.stopVersionPolling()
assert.equal(service.isPollingActive(), false)
assert.deepEqual(cancelledTimers, [0, 1], '重复停止不应重复清理定时器')
assert.deepEqual(errors, [])

let expiredToken = true
const expiredTimers = []
const expiredErrors = []
const expiredService = createVersionPollingService({
  hasToken: () => expiredToken,
  getVersion: async () => {
    expiredToken = false
    throw new Error('401: login expired')
  },
  refreshCache: () => {},
  schedule: () => 7,
  cancel: timer => expiredTimers.push(timer),
  reportError: error => expiredErrors.push(error)
})

expiredService.startVersionPolling()
await Promise.resolve()
await Promise.resolve()
assert.equal(expiredService.isPollingActive(), false, '401 清除 token 后应立即停止轮询')
assert.deepEqual(expiredTimers, [7])
assert.deepEqual(expiredErrors, [], '登录过期不应按普通版本请求错误处理')

console.log('version polling tests passed')
