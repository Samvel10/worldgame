import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results-audit',
  testMatch: 'audit.spec.ts',
  workers: 1,
  timeout: 40000,
  use: { baseURL: 'http://127.0.0.1:5182', trace: 'retain-on-failure' },
  webServer: [
    {
      command:
        'NODE_ENV=test PORT=18887 BARRIK_DATA_DIR=/tmp/barrik-browser-audit node server/index.mjs',
      url: 'http://127.0.0.1:18887',
      reuseExistingServer: false,
    },
    {
      command: process.env.AUDIT_PREVIEW === '1' ? 'BATTLE_PORT=18887 npm run preview -- --port 5182' : 'BATTLE_PORT=18887 npm run dev -- --port 5182',
      url: 'http://127.0.0.1:5182',
      reuseExistingServer: false,
    },
  ],
});
