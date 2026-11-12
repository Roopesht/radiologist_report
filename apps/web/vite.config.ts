// Vite: React plugin, dev server on PORT (default 5173), production build to dist/.
// /api is proxied to the API (API_URL, default http://localhost:3000) so the app and the API share one origin in development.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT ?? 5173),
    // Listen on IPv4 and IPv6 so http://localhost, http://127.0.0.1 and http://[::1] all reach the app.
    host: true,
    proxy: { '/api': { target: process.env.API_URL ?? 'http://localhost:3000', changeOrigin: true } }
  },
  build: { outDir: 'dist', sourcemap: true }
});
