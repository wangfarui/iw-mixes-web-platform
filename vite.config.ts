import {fileURLToPath, URL} from 'node:url'

import {loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'

// const baseUrl = {
//   dev: `./`,
//   prod: `https://eat.itwray.com`
// };

export default ({ command, mode }) => {
  // 获取环境变量
  const envParams = loadEnv(mode, './');
  const VITE_BUILD_ENV = envParams.VITE_BUILD_ENV;

  return {
    server: {
      proxy: {
        // with options: http://localhost:5173/api/bar-> http://jsonplaceholder.typicode.com/bar
        '/iw-auth': {
          target: 'http://localhost:18001',
          changeOrigin: true,
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/iw-eat': {
          target: 'http://localhost:18003',
          changeOrigin: true,
          // rewrite: (path) => path.replace(/^\/api/, ''),
        }
      },
    },
    // base: baseUrl[VITE_BUILD_ENV],
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
