/*
 * playwright.config.ts | Layer: none (end-to-end tooling)
 * Boots the API and the web app for the end-to-end test, or reuses them if they are already running.
 * PostgreSQL must already be up (docker compose up -d); `npm run test:e2e` reseeds it first.
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5173' },
  webServer: [
    {
      name: 'api',
      command: 'npm run dev -w api',
      url: 'http://localhost:4000/orders/queue',
      reuseExistingServer: true,
    },
    {
      name: 'web',
      command: 'npm run dev -w web',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  ],
});
