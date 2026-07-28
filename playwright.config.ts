import { defineConfig, devices } from "@playwright/test";

const targetBackend = process.env.E2E_BACKEND ?? "all";
const runVisualReview = targetBackend === "visual-review";
const runMock = !runVisualReview && (targetBackend === "all" || targetBackend === "mock");
const runWasm = !runVisualReview && (targetBackend === "all" || targetBackend === "wasm");

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "artifacts/e2e-results",
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  retries: 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: [
    ...(runMock
      ? [
          {
            command: "pnpm exec vite --host 127.0.0.1 --port 5173",
            url: "http://127.0.0.1:5173",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000
          }
        ]
      : []),
    ...(runWasm
      ? [
          {
            command: "powershell -NoProfile -ExecutionPolicy Bypass -Command \"$env:VITE_CORE_BACKEND='wasm'; pnpm exec vite --host 127.0.0.1 --port 5174\"",
            url: "http://127.0.0.1:5174",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000
          }
        ]
      : []),
    ...(runVisualReview
      ? [
          {
            command: "pnpm exec vite --host 127.0.0.1 --port 5175",
            url: "http://127.0.0.1:5175",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000
          }
        ]
      : [])
  ],
  projects: [
    ...(runMock
      ? [
          {
            name: "mock",
            testMatch: /(?:mock-smoke|debugger-editing)\.spec\.ts/,
            use: { baseURL: "http://127.0.0.1:5173" }
          }
        ]
      : []),
    ...(runWasm
      ? [
        {
          name: "wasm",
          testMatch: /(?:wasm-smoke|debugger-editing)\.spec\.ts/,
          use: { baseURL: "http://127.0.0.1:5174" }
        }
        ]
      : []),
    ...(runVisualReview
      ? [
          {
            name: "visual-review",
            testMatch: /visual-review\.spec\.ts/,
            use: { baseURL: "http://127.0.0.1:5175" }
          }
        ]
      : [])
  ]
});
