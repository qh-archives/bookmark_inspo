import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3001',
      '/bookmarks': 'http://localhost:3001',
      '/proxy': 'http://localhost:3001',
    },
  },
})
