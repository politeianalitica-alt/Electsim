/**
 * Playwright config para smoke tests del workspace.
 *
 * Activar con:
 *   npm i -D @playwright/test
 *   npx playwright install chromium
 *   npm run test:smoke
 *
 * Los tests viven en `tests/smoke/*.spec.ts`. Por defecto apuntan al dev
 * server local en :3001. En CI pueden apuntar a una preview URL via
 * `PLAYWRIGHT_BASE_URL`.
 */

import type { PlaywrightTestConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

const config: PlaywrightTestConfig = {
  testDir: "./tests/smoke",
  timeout: 30_000,
  expect: { timeout: 6_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1440, height: 900 },
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        port: 3001,
        timeout: 60_000,
        reuseExistingServer: !process.env.CI,
        env: { DEV_MODE: "true" },
      },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
};

export default config;
