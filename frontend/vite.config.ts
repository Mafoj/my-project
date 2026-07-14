import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Build straight into where FastAPI serves static files from.
    outDir: '../backend/static',
    emptyOutDir: true,
  },
  server: {
    // Dev only: proxy /api to the local FastAPI so the SPA is same-origin in dev
    // exactly as it is in prod. Avoids "works in dev, CORS-breaks in prod".
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
});
