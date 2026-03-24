import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Chunk splitting — games load separately
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'react-vendor': ['react', 'react-dom'],
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
