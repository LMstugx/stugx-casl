import { expect, test } from "@playwright/test";
import { assemble, expectSourceContains, run, step } from "./caslSmokeHelpers";

test("Cloudflare Pages runs the verified WASM application", async ({ page, baseURL }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];
  const thirdPartyRequests: string[] = [];
  const deployedHost = new URL(baseURL!).host;
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => { if (new URL(request.url()).host !== deployedHost) thirdPartyRequests.push(request.url()); });
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}`));
  page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });

  await page.addInitScript(() => {
    localStorage.setItem("stugx.casl.locale", "en");
    localStorage.setItem("stugx.casl.preferences.v1", JSON.stringify({ version: 1, observationMode: "register-stack", circuitFocusEnabled: false, inspectorActiveTab: "memory", outputDockActiveTab: "messages" }));
    localStorage.setItem("stugx.casl.startup-selection.v1", JSON.stringify({ version: 1, lastExampleId: "cpp-addition" }));
    localStorage.setItem("stugx.casl.lesson-progress.v1", JSON.stringify({ version: 1, entries: [{ lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] }] }));
  });

  await page.goto("?phase17b=1#production");
  await expect(page.getByTestId("source-editor")).toBeVisible();
  await expect(page.getByTestId("backend-label")).toHaveText("WASM Core");
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
  await expectSourceContains(page, "int a = 10;");
  await expect(page.locator(".inspector-panel")).toHaveAttribute("data-active-tab", "memory");
  await expect(page.locator(".output-panel")).toHaveAttribute("data-active-tab", "messages");
  const lesson = page.getByTestId("guided-lesson");
  if ((await lesson.getAttribute("open")) === null) await page.getByTestId("guided-lesson-summary").click();
  await expect(page.getByTestId("study-mode-progress")).toContainText("1 / 3");

  await assemble(page);
  await step(page);
  await page.getByTestId("reset-button").click();
  await run(page);
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "Finished");
  await page.getByTestId("reset-button").click();
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "Ready");
  await expect(page.getByTestId("comet-circuit-svg").locator("path.circuit-wire[marker-start], path.circuit-wire[marker-mid], path.circuit-wire[marker-end]")).toHaveCount(0);

  await page.getByTestId("circuit-focus-toggle").click();
  await expect(page.getByTestId("circuit-focus-layout")).toHaveAttribute("data-observation-mode", "register-stack");
  await page.getByTestId("observation-mode-code-machine").click();
  await expect(page.getByTestId("circuit-focus-layout")).toHaveAttribute("data-observation-mode", "code-machine");
  await page.getByTestId("circuit-focus-toggle").click();

  for (const locale of ["ja", "zh-CN", "en"] as const) {
    await page.getByTestId(`locale-${locale}`).click();
    await expect(page.getByTestId(`locale-${locale}`)).toHaveAttribute("aria-pressed", "true");
  }
  await expect(page.getByTestId("new-document-button")).toBeVisible();
  await expect(page.getByTestId("open-file-button")).toBeVisible();
  await expect(page.getByTestId("save-file-button")).toBeVisible();

  const changelogTrigger = page.getByTestId("changelog-trigger");
  await changelogTrigger.click();
  await expect(page.getByRole("dialog", { name: "Changelog" })).toBeVisible();
  await expect(page.getByTestId("changelog-current-version")).toHaveText("0.1.0");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Changelog" })).toBeHidden();
  await expect(changelogTrigger).toBeFocused();

  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect({ consoleErrors, pageErrors, failedRequests, failedResponses, thirdPartyRequests }).toEqual({ consoleErrors: [], pageErrors: [], failedRequests: [], failedResponses: [], thirdPartyRequests: [] });
});
