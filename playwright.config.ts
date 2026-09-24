import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
// E2E_BASE_URL=https://avinerpedia.vercel.app runs the suite against a deployed site
// (no local server). The most faithful check after a deploy.
const REMOTE = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: REMOTE || `http://localhost:${PORT}`,
    locale: 'he-IL',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: REMOTE
    ? undefined
    : {
        // E2E_PROD=1 tests a local production build (npm run build first). Note: on Windows,
        // `next start` sometimes leaves prefetched dynamic routes (e.g. /series/[id]) stuck on
        // client navigation; the same flow works on Vercel, so prefer E2E_BASE_URL for that.
        command: process.env.E2E_PROD ? `npm run start -- -p ${PORT}` : `npm run dev -- -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
