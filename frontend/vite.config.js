import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Server E2E (Playwright) memakai folder cache sendiri agar tidak bentrok dengan server dev harian.
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src')
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    testTimeout: 10000,
  },
});
