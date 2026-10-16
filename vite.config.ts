import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  //设置代理
  server: {
    proxy: {
      '/api':{
        target: 'http://localhost:8080',
        changeOrigin: true,
        // 不重写路径：后端本身就挂在 /api/** 下，
        // 前端 service 里写的 /api/web/... 原样转发即可命中。
      }
    }
  }
})
