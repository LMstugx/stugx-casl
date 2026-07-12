import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PRODUCTION_PORT ?? 5180);
const basePath = process.env.PRODUCTION_BASE_PATH ?? "/";
const baseURL = process.env.PRODUCTION_BASE_URL ?? `http://127.0.0.1:${port}${basePath}`;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /production-smoke\.spec\.ts/,
  outputDir: "artifacts/e2e-production-results",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: {
    command: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/serve-production.ps1 -Port ${port} -BasePath ${basePath}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000
  }
});
