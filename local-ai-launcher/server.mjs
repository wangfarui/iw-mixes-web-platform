import http from 'node:http'
import { pathToFileURL } from 'node:url'

import {
  LAUNCHER_HOST,
  LAUNCHER_ORIGINS,
  LAUNCHER_PORT,
  LAUNCHER_VERSION
} from './constants.mjs'
import { readLauncherConfig, resolveConfigPath } from './config.mjs'
import { discoverToolExecutables } from './executables.mjs'
import { createSessionLauncher } from './sessionLauncher.mjs'
import { createTerminalAdapter } from './terminalAdapter.mjs'

const MAX_BODY_BYTES = 16 * 1024

const sendJson = (res, statusCode, body) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

const readJsonBody = (req) => new Promise((resolve, reject) => {
  let body = ''
  let byteLength = 0
  req.setEncoding('utf8')
  req.on('data', (chunk) => {
    byteLength += Buffer.byteLength(chunk)
    if (byteLength > MAX_BODY_BYTES) {
      reject(Object.assign(new Error('请求内容过大'), { code: 'PAYLOAD_TOO_LARGE' }))
      req.destroy()
      return
    }
    body += chunk
  })
  req.on('end', () => {
    try {
      resolve(JSON.parse(body || '{}'))
    } catch {
      reject(Object.assign(new Error('请求内容不是有效 JSON'), { code: 'INVALID_JSON' }))
    }
  })
  req.on('error', reject)
})

const applyCorsHeaders = (req, res, allowedOrigins) => {
  const origin = req.headers.origin
  if (typeof origin === 'string' && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-IW-Launcher-Token')
  res.setHeader('Access-Control-Allow-Private-Network', 'true')
}

export const createLauncherServer = ({
  config,
  sessionLauncher,
  host = LAUNCHER_HOST,
  port = LAUNCHER_PORT
}) => {
  const configuredOrigins = Array.isArray(config.allowedOrigins)
    ? config.allowedOrigins
    : [config.allowedOrigin]
  const allowedOrigins = new Set(
    configuredOrigins.some((origin) => typeof origin === 'string' && origin.trim())
      ? configuredOrigins.filter((origin) => typeof origin === 'string' && origin.trim())
      : LAUNCHER_ORIGINS
  )
  const server = http.createServer(async (req, res) => {
    applyCorsHeaders(req, res, allowedOrigins)
    const origin = req.headers.origin
    const token = req.headers['x-iw-launcher-token']
    const hasValidToken = typeof token === 'string' && token === config.token
    const hasAllowedBrowserOrigin = typeof origin === 'string' && allowedOrigins.has(origin)

    if (origin && !hasAllowedBrowserOrigin) {
      sendJson(res, 403, { code: 'ORIGIN_FORBIDDEN', message: '当前网页来源不允许访问本地启动器' })
      return
    }

    if (req.method === 'OPTIONS') {
      if (!hasAllowedBrowserOrigin) {
        sendJson(res, 403, { code: 'ORIGIN_FORBIDDEN', message: '预检请求来源不受信任' })
        return
      }
      res.statusCode = 204
      res.end()
      return
    }

    const requestUrl = new URL(req.url || '/', `http://${host}:${port}`)
    if (req.method === 'GET' && requestUrl.pathname === '/v1/status') {
      if (!hasAllowedBrowserOrigin && !hasValidToken) {
        sendJson(res, 401, { code: 'UNAUTHORIZED', message: '缺少有效配对令牌' })
        return
      }
      sendJson(res, 200, {
        version: LAUNCHER_VERSION,
        paired: hasValidToken,
        tools: Object.fromEntries(
          Object.entries(config.executables || {}).map(([tool, executable]) => [tool, Boolean(executable)])
        )
      })
      return
    }

    if (req.method === 'POST' && requestUrl.pathname === '/v1/launch') {
      if (!hasValidToken) {
        sendJson(res, 401, { code: 'UNAUTHORIZED', message: '本机启动器尚未配对或令牌无效' })
        return
      }
      if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
        sendJson(res, 415, { code: 'UNSUPPORTED_MEDIA_TYPE', message: '仅支持 JSON 请求' })
        return
      }
      try {
        const request = await readJsonBody(req)
        const result = await sessionLauncher.launch(request)
        sendJson(res, 202, {
          message: '已请求 Terminal 打开会话',
          ...result
        })
      } catch (error) {
        const statusCode = error?.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400
        sendJson(res, statusCode, {
          code: error?.code || 'LAUNCH_FAILED',
          message: error?.message || '打开本地会话失败'
        })
      }
      return
    }

    sendJson(res, 404, { code: 'NOT_FOUND', message: '本地启动器接口不存在' })
  })

  return {
    server,
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(port, host, () => {
        server.off('error', reject)
        resolve()
      })
    }),
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
}

export const startLauncherServer = async (configPath = resolveConfigPath()) => {
  const config = await readLauncherConfig(configPath)
  config.executables = await discoverToolExecutables(config.executables)
  const terminalAdapter = createTerminalAdapter()
  const sessionLauncher = createSessionLauncher({
    terminalAdapter,
    configuredExecutables: config.executables
  })
  const launcherServer = createLauncherServer({
    config,
    sessionLauncher
  })
  await launcherServer.listen()
  process.stdout.write(`IW AI Launcher listening on http://${LAUNCHER_HOST}:${LAUNCHER_PORT}\n`)
  return launcherServer
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun) {
  startLauncherServer().catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`)
    process.exitCode = 1
  })
}
