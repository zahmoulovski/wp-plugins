import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,  // 👈 allows network access
    port: 2403,
    proxy: {
      '/flouci': {
        target: 'https://developers.flouci.com/api/v2',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/flouci/, '')
      }
    }
  },
  plugins: [react({
    babel: {
      presets: ['@babel/preset-typescript'],
    }
  })],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
