import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  outputDir: "../../.artifacts/browser-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    [
      "html",
      { outputFolder: "../../.artifacts/browser-report", open: "never" },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      command: "node tests/browser/server.mjs",
      cwd: "../..",
      url: "http://127.0.0.1:4174/health",
      timeout: 120_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    },
    {
      command: "pnpm exec vite --config tests/browser/vite.config.ts",
      cwd: "../..",
      url: "http://127.0.0.1:4173",
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
  ],
});
