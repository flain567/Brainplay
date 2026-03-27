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
    host: '0.0.0.0',
    port: 3000,
    hmr: {
      protocol: 'ws',
      // Vite akan auto-detect host jika tidak specified
      // Fallback untuk localhost
      ...(process.env.VITE_HMR_HOST && { host: process.env.VITE_HMR_HOST }),
      ...(process.env.VITE_HMR_PORT && { port: parseInt(process.env.VITE_HMR_PORT) }),
    },
    // Additional middleware options
    middlewareMode: false,
    // Enable CORS for HMR
    cors: true,
  },
})
