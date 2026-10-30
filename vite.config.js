import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
