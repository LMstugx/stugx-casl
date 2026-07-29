import { expect, test, type Page } from "@playwright/test";
import { assemble, expectSourceContains, openStudio, setSource, step } from "./caslSmokeHelpers";

const source = `MAIN START
     LAD   GR2,#0003
     ST    GR2,DATA
     RET
DATA DS    1
     END`;

async function applyWord(page: Page, value: string) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill(value);
  await dialog.getByRole("button", { name: "Apply" }).click();
  await expect(dialog).toBeHidden();
}

async function editMemoryWord(page: Page, address: string, value: string, program = false) {
  await page.getByTestId(`casl-memory-row-${address}`).click();
  await page.getByRole("button", { name: "Edit memory word" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill(value);
  if (program) {
    await dialog.locator('.debugger-program-warning input[type="checkbox"]').check();
  }
  await dialog.getByRole("button", { name: "Apply" }).click();
  await expect(dialog).toBeHidden();
}

test("CASL Mode debugger editing and Full Clear preserve document ownership", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, testInfo.project.name === "wasm" ? "WASM Core" : "Mock Core");
  await setSource(page, source);
  await assemble(page);
  await page.getByTestId("casl-mode-toggle").click();
  await page.getByTestId("observation-mode-register-stack").click();

  const gr2 = page.getByTestId("casl-register-gr2");
  await gr2.getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Cancel" })).toBeFocused();
  await applyWord(page, "0042");
  await expect(gr2).toContainText("#0042");

  await page.getByTestId("casl-numeric-signed").click();
  await expect(gr2).toContainText("66");
  await page.getByTestId("casl-numeric-unsigned").click();
  await expect(gr2).toContainText("66");
  await page.getByTestId("casl-numeric-binary").click();
  await expect(gr2).toContainText("0000 0000 0100 0010");
  await page.getByTestId("casl-numeric-hex").click();

  await page.getByRole("button", { name: /Edit register PR/ }).click();
  await applyWord(page, "0022");
  await expect(page.locator(".casl-register-cell").filter({ hasText: "PR" })).toContainText("#0022");

  await page.getByRole("button", { name: /Edit register SP/ }).click();
  await applyWord(page, "FFFC");
  await page.getByTestId("auxiliary-observation-stack").click();
  await expect(page.locator(".casl-stack-observer")).toContainText("SP FFFC");

  await page.getByTestId("observation-mode-register-stack").click();
  await page.getByRole("button", { name: "Edit register FR" }).click();
  const frDialog = page.getByRole("dialog");
  for (const flag of ["OF", "SF", "ZF"]) {
    await frDialog.getByRole("checkbox", { name: flag }).check();
  }
  await frDialog.getByRole("button", { name: "Apply" }).click();
  await expect(page.locator(".casl-fr-grid")).toContainText("OF1");
  await expect(page.locator(".casl-fr-grid")).toContainText("SF1");

  await page.getByTestId("observation-mode-cpu-flow").click();
  await editMemoryWord(page, "0025", "FFFF");
  await expect(page.getByTestId("casl-memory-row-0025")).toContainText("#FFFF");
  await expect(page.locator(".casl-runtime-status")).toContainText("Data modified");

  await page.getByTestId("casl-memory-row-0020").click();
  await page.getByRole("button", { name: "Edit memory word" }).click();
  const programDialog = page.getByRole("dialog");
  await expect(programDialog.getByText("This changes the loaded machine code only. Source and assembled output are not modified.")).toBeVisible();
  await expect(programDialog.getByRole("button", { name: "Apply" })).toBeDisabled();
  await programDialog.getByRole("textbox").fill("0000");
  await programDialog.locator('.debugger-program-warning input[type="checkbox"]').check();
  await programDialog.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByTestId("casl-memory-selection")).toContainText("runtime-word-modified");
  await expect(page.locator(".casl-runtime-status")).toContainText("Program modified");

  await page.getByTestId("observation-mode-register-stack").click();
  await page.getByRole("button", { name: /Edit register PR/ }).click();
  await applyWord(page, "0020");
  await step(page);
  await expect(page.getByTestId("casl-register-gr2")).toContainText("#0042");

  await page.getByTestId("observation-mode-cpu-flow").click();
  await page.locator(".casl-reload-actions").getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByTestId("casl-memory-row-0020")).toContainText("#0000");
  await expect(page.getByTestId("casl-memory-row-0025")).toContainText("#FFFF");
  await expect(page.locator(".casl-runtime-status")).toContainText("Program modified");

  await page.getByRole("button", { name: "Reload image" }).click();
  await expect(page.locator(".casl-runtime-status")).toHaveCount(0);
  await expect(page.getByTestId("casl-memory-row-0020")).toContainText("#1220");

  await page.getByRole("button", { name: "Full Clear" }).click();
  const clearDialog = page.getByRole("dialog");
  await expect(clearDialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await clearDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("run-state")).toHaveText("Ready");

  await page.getByRole("button", { name: "Full Clear" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Full Clear" }).click();
  await expect(page.getByTestId("run-state")).toHaveText("Idle");
  await expect(page.locator(".casl-source-observer")).toContainText("LAD   GR2,#0003");
  await page.getByTestId("modern-mode-toggle").click();
  await expectSourceContains(page, "LAD   GR2,#0003");
  await expect(page.getByTestId("assemble-button")).toBeEnabled();
});

test("CASL debugger controls fit three locales at compact viewports", async ({ page }, testInfo) => {
  await openStudio(page, testInfo.project.name === "wasm" ? "WASM Core" : "Mock Core");
  await setSource(page, source);
  await assemble(page);
  await page.getByTestId("casl-mode-toggle").click();
  await page.getByTestId("observation-mode-register-stack").click();

  for (const viewport of [
    { width: 1180, height: 700 },
    { width: 1280, height: 720 }
  ]) {
    await page.setViewportSize(viewport);
    for (const locale of ["en", "ja", "zh-CN"] as const) {
      await page.getByTestId(`locale-${locale}`).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await expect(page.locator(".casl-destructive-actions button")).toBeVisible();
      await expect(page.getByRole("button", { name: /GR7/ })).toBeVisible();
    }
  }
});
