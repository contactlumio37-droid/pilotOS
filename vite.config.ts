import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // State + data fetching
          'vendor-query': ['@tanstack/react-query'],
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          // UI / animation
          'vendor-ui': ['framer-motion', 'lucide-react'],
          // Charts
          'vendor-charts': ['recharts'],
          // Forms
          'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          // Flow diagrams
          'vendor-flow': ['reactflow'],
        },
      },
    },
  },
})
