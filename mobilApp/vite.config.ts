import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,  // 👈 allows network access
    port: 2403
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
