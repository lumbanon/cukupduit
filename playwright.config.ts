import { defineConfig, devices } from '@playwright/test'

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:4173/cukupduit/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: externalBaseUrl ? undefined : {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/cukupduit/',
    reuseExistingServer: !process.env.CI,
  },
})
