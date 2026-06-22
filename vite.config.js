import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash]-v20260622c.js',
        manualChunks(id) {
          if (id.includes('/src/projects/video-rank/')) return 'project-video-rank'
        },
      },
    },
  },
})
