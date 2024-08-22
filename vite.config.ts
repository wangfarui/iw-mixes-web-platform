import {fileURLToPath, URL} from 'node:url'

import {loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'

export default ({ command, mode }) => {
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
        }
      }
    },
    plugins: [
      vue(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
}
