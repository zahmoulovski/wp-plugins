import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,  // 👈 allows network access
    port: 2403,
    proxy: {
      '/send-email': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/wp-json': {
        target: 'https://klarrion.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        // Add headers to handle CORS for IP-based access
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Ensure proper origin handling for IP-based requests
            const origin = req.headers.origin;
            if (origin && (origin.includes('localhost') || origin.includes('192.168.'))) {
              proxyReq.setHeader('Origin', 'https://klarrion.com');
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
