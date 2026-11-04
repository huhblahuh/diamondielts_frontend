import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA || new Date().toISOString().replace(/[^0-9]/g, '')),
  },
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'parsonical-expertly-cherry.ngrok-free.dev',
    ],
    proxy: {
      '/api': {
        target: 'https://localhost:7053',
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: 'https://localhost:7053',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
