import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/react-vite_app/', // ← This tells Vite to prefix all assets with this path
  server: {
    proxy: {
      '/send-email': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/wp-json': {
        target: 'https://klarrion.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const origin = req.headers.origin;
            if (origin && (origin.includes('localhost') || origin.includes('192.168.'))) {
              proxyReq.setHeader('Origin', 'https://klarrion.com/react-vite_app');
            }
          });
        }
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
