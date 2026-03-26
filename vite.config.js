import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Chunk splitting — firebase split into auth (eager) vs firestore (lazy)
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('firebase/app') || id.includes('firebase/auth')) {
            return 'firebase-core'
          }
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor'
          }
        },
      },
    },
    // Compression
    target: 'es2020',
    minify: 'esbuild',
    // Chunk size warning
    chunkSizeWarningLimit: 500,
    // Source maps off for production
    sourcemap: false,
  },
  // Dev server
  server: {
    host: true,
    port: 3000,
  },
})
