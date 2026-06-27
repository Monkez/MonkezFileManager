import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

const apiTarget = process.env.MONKEZ_API_TARGET || 'http://localhost:3001'
const devPort = Number(process.env.MONKEZ_FRONTEND_PORT || 3000)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: devPort,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      }
    }
  }
})
