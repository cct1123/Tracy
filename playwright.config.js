import { defineConfig, devices } from '@playwright/test';

const production = process.env.TRACY_E2E_DIST === '1';
const port = Number(process.env.TRACY_E2E_PORT || (production ? 5192 : 5191));
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('TRACY_E2E_PORT must be a valid TCP port.');
const baseURL = `http://127.0.0.1:${port}`;
const outputDir = `test-results/${production ? 'production' : 'development'}`;

export default defineConfig({
  testDir: './e2e',
  outputDir,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: `${outputDir}/results.json`,
      },
    ],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: { width: 1440, height: 1000 },
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: `node scripts/serve.mjs ${production ? '--dist ' : ''}--port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !production,
    timeout: 20_000,
  },
});
