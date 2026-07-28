import {fileURLToPath, URL} from 'node:url'

import {loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'
import {readLocalClaudeSessionDrafts} from './scripts/localClaudeSessionDrafts.mjs'
import {readLocalCodexSessionDrafts} from './scripts/localCodexSessionDrafts.mjs'

const registerLocalClaudeSessionApi = (middlewares: any) => {
  middlewares.use('/api/local/claude-sessions', async (req: any, res: any) => {
    if (req.method !== 'GET') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({
        message: 'Method Not Allowed'
      }))
      return
    }

    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      const limit = Number(url.searchParams.get('limit') || '12')
      const drafts = await readLocalClaudeSessionDrafts({limit})

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({
        source: 'local-claude-files',
        generatedAt: new Date().toISOString(),
        drafts
      }))
    } catch (error: any) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({
        message: error?.message || 'Failed to read local Claude session files'
      }))
    }
  })
}

const registerLocalCodexSessionApi = (middlewares: any) => {
  middlewares.use('/api/local/codex-sessions', async (req: any, res: any) => {
    if (req.method !== 'GET') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({
        message: 'Method Not Allowed'
      }))
      return
    }

    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      const limit = Number(url.searchParams.get('limit') || '12')
      const drafts = await readLocalCodexSessionDrafts({limit})

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({
        source: 'local-codex-files',
        generatedAt: new Date().toISOString(),
        drafts
      }))
    } catch (error: any) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({
        message: error?.message || 'Failed to read local Codex session files'
      }))
    }
  })
}

const localAiSessionPlugin = () => ({
  name: 'local-ai-session-api',
  configureServer(server: any) {
    registerLocalClaudeSessionApi(server.middlewares)
    registerLocalCodexSessionApi(server.middlewares)
  },
  configurePreviewServer(server: any) {
    registerLocalClaudeSessionApi(server.middlewares)
    registerLocalCodexSessionApi(server.middlewares)
  }
})

export default ({ command, mode }: any) => {
  // 获取环境变量
  const envParams = loadEnv(mode, './');
  const VITE_BUILD_ENV = envParams.VITE_BUILD_ENV;

  return {
    server: {
      proxy: {
        '/auth-service': {
          target: 'http://localhost:18000',
          changeOrigin: true
        },
        '/eat-service': {
          target: 'http://localhost:18000',
          changeOrigin: true
        },
        '/bookkeeping-service': {
          target: 'http://localhost:18000',
          changeOrigin: true
        },
        '/points-service': {
          target: 'http://localhost:18000',
          changeOrigin: true
        },
        // Remote sharing bypasses iw-core locally so streamed ciphertext never reaches its compatibility proxy.
        '/external-service/api/remote-share': {
          target: 'http://localhost:18006',
          changeOrigin: true
        },
        '/external-service/wb/remote-share': {
          target: 'ws://localhost:18006',
          changeOrigin: true,
          ws: true
        },
        '/external-service': {
          target: 'http://localhost:18000',
          changeOrigin: true
        }
      }
    },
    plugins: [
      vue(),
      svgLoader(), // 直接加载 SVG
      localAiSessionPlugin()
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
}
