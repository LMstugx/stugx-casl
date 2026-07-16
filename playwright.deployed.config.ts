import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.STUGX_DEPLOYED_BASE_URL;
if (!baseURL) throw new Error("STUGX_DEPLOYED_BASE_URL is required for deployed smoke tests.");

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /deployed-smoke\.spec\.ts/,
  outputDir: "artifacts/e2e-deployed-results",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  }
});
