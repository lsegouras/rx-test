/*
 * vite.config.ts | Layer: Web (tooling)
 * Dev server on port 5173. Requests to /orders are proxied to the API on port 4000,
 * so the browser talks to one origin and the API needs no CORS setup.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/orders': 'http://localhost:4000' },
  },
  // Component tests (Vitest) render in a simulated browser.
  test: { environment: 'jsdom' },
});
