import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/cukupduit/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: { include: ['src/engine/**'] },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\\/](recharts|@reduxjs|react-redux|d3-|victory-vendor)/.test(id)) return 'charts'
        },
      },
    },
  },
})
