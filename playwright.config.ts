import { defineConfig, devices } from '@playwright/test';
const chromium = {
  ...devices['Desktop Chrome'],
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
};
export default defineConfig({
  testDir: './tests/e2e',
  snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', testIgnore: '**/compatibility.spec.ts', use: chromium },
    { name: 'chromium-compat', testMatch: '**/compatibility.spec.ts', use: chromium },
    {
      name: 'firefox',
      testMatch: '**/compatibility.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: '**/compatibility.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
