import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Split vendor libs into separate cacheable chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-zustand': ['zustand'],
        },
      },
    },
    // 600KB is reasonable for a game app; gzip is ~170KB
    chunkSizeWarningLimit: 600,
  },
})
