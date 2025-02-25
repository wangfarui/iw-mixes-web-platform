import {fileURLToPath, URL} from 'node:url'

import {loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

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
        }
      }
    },
    plugins: [
      vue(),
      svgLoader() // 直接加载 SVG
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
}
