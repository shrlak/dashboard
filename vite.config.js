import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so the static build also works under a sub-path
  // (e.g. GitHub Pages at /dashboard/).
  base: './',
  server: {
    proxy: {
      // `npm run dev` proxies API calls to the backend (`npm run dev:server`).
      '/api': 'http://localhost:8787',
    },
  },
})
