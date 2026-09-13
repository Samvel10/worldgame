import { defineConfig, devices } from '@playwright/test';
const preview = process.env.PLAYWRIGHT_PREVIEW === '1';
const url = `http://127.0.0.1:${preview ? 4173 : 5173}`;
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: url, trace: 'retain-on-failure' },
  webServer: {
    command: preview ? 'npm run preview -- --port 4173' : 'npm run dev -- --port 5173',
    url,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
