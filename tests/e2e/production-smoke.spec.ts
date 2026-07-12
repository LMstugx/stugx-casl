import { expect, test } from "@playwright/test";
import { assemble, expectSourceContains, run, step } from "./caslSmokeHelpers";

const keys = {
  locale: "stugx.casl.locale",
  preferences: "stugx.casl.preferences.v1",
  startup: "stugx.casl.startup-selection.v1",
  lesson: "stugx.casl.lesson-progress.v1"
};

test("verified static production bundle loads WASM and preserves production contracts", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}`));
  page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });

  await page.addInitScript(({ keys }) => {
    localStorage.setItem(keys.locale, "en");
    localStorage.setItem(keys.preferences, JSON.stringify({ version: 1, observationMode: "register-stack", circuitFocusEnabled: false, inspectorActiveTab: "memory", outputDockActiveTab: "messages" }));
    localStorage.setItem(keys.startup, JSON.stringify({ version: 1, lastExampleId: "cpp-addition" }));
    localStorage.setItem(keys.lesson, JSON.stringify({ version: 1, entries: [{ lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] }] }));
  }, { keys });

  const response = await page.goto("?production-smoke=1#startup");
  expect(response?.headers()["x-stugx-static-production"]).toBe("1");
  await expect(page.getByTestId("source-editor")).toBeVisible();
  await expect(page.getByTestId("backend-label")).toHaveText("WASM Core");
  await page.waitForTimeout(1_000);
  expect({ consoleErrors, pageErrors, failedRequests, failedResponses }).toEqual({ consoleErrors: [], pageErrors: [], failedRequests: [], failedResponses: [] });
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
  await expectSourceContains(page, "int a = 10;");
  await expect(page.locator(".inspector-panel")).toHaveAttribute("data-active-tab", "memory");
  await expect(page.locator(".output-panel")).toHaveAttribute("data-active-tab", "messages");
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "Idle");
  await expect(page.locator(".diagnostic")).toHaveCount(0);
  const lesson = page.getByTestId("guided-lesson");
  if ((await lesson.getAttribute("open")) === null) await page.getByTestId("guided-lesson-summary").click();
  await expect(page.getByTestId("study-mode-progress")).toContainText("1 / 3");

  await assemble(page);
  await step(page);
  await page.getByTestId("reset-button").click();
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "Ready");
  await run(page);
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "Finished");
  await page.getByTestId("reset-button").click();
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "Ready");

  await page.getByTestId("locale-ja").click();
  await expect(page.getByTestId("locale-ja")).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("ja");
  await expect(page.getByTestId("new-document-button")).toBeVisible();
  await expect(page.getByTestId("open-file-button")).toBeVisible();
  await expect(page.getByTestId("save-file-button")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 720 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(failedResponses).toEqual([]);
});
