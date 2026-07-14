import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5199,
    proxy: {
      // Local dev: talk to the production admin API (or change to localhost:3000)
      '/api': {
        target: 'https://api.grahachara.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, '/admin'),
      },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
