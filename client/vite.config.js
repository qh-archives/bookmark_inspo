import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_BASE = process.env.VITE_API_URL || 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': API_BASE,
      '/bookmarks': API_BASE,
      '/proxy': API_BASE,
    },
  },
})
