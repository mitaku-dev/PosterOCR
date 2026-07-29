import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/musixplora': {
        target: 'https://musixplora.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/musixplora/, ''),
      },
    },
  },
})
