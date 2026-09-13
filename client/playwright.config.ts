import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  outputDir: "./test-results/playwright-artifacts",
  fullyParallel: false,
  workers: 1,
  timeout: 20_000,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off"
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }]
});
