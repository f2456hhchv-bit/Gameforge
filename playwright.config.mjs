import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

// Named .mjs (rather than relying on package.json's "type") so this stays
// ESM regardless of the rest of the package config.

// Some sandboxes ship a pinned Chromium revision that predates whatever
// build @playwright/test currently expects to auto-download. Use it when
// present; otherwise fall through to Playwright's normal browser resolution
// (run `npx playwright install` on a regular machine/CI).
const PINNED_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOptions = fs.existsSync(PINNED_CHROMIUM) ? { executablePath: PINNED_CHROMIUM } : {};
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 15000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions } },
  ],
});
