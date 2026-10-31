import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1000 }, // recharts is large; fine for an intranet app
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
})
