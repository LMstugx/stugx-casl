import { expect, type Page } from "@playwright/test";

export const defaultSource = `MAIN START
     LD    GR1,A
     ADDA  GR1,B
     ST    GR1,C
     RET
A    DC    10
B    DC    20
C    DS    1
     END`;

export const sourceWithA100 = `MAIN START
     LD    GR1,A
     ADDA  GR1,B
     ST    GR1,C
     RET
A    DC    100
B    DC    20
C    DS    1
     END`;

export const gr2SourceWithA100 = `MAIN START
     LD    GR2,A
     ADDA  GR2,B
     ST    GR2,C
     RET
A    DC    100
B    DC    20
C    DS    1
     END`;

export async function openStudio(page: Page, backendLabel: "Mock Core" | "WASM Core") {
  await page.goto("/");
  await expect(page.getByTestId("source-editor")).toBeVisible();
  await expect(page.getByTestId("backend-label")).toHaveText(backendLabel);
  await expectSourceContains(page, "MAIN START");
}

export async function setSource(page: Page, sourceText: string) {
  await page.waitForFunction(() => Boolean((globalThis as { monaco?: unknown }).monaco));
  await page.evaluate((text) => {
    const monaco = (globalThis as { monaco?: { editor?: { getModels?: () => Array<{ setValue: (value: string) => void }> } } }).monaco;
    const model = monaco?.editor?.getModels?.()[0];
    if (!model) throw new Error("Monaco model is not available.");
    model.setValue(text);
  }, sourceText);
}

export async function expectSourceContains(page: Page, sourceText: string) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const monaco = (globalThis as { monaco?: { editor?: { getModels?: () => Array<{ getValue: () => string }> } } }).monaco;
        return monaco?.editor?.getModels?.()[0]?.getValue() ?? "";
      })
    )
    .toContain(sourceText);
}

export async function expectRegister(page: Page, registerTestId: string, value: string) {
  const inspector = page.locator(".inspector-panel");
  await page.getByRole("tab", { name: "Registers" }).click();
  await expect(inspector.getByTestId(registerTestId)).toContainText(value);
}

export async function expectCurrentSourceInstruction(page: Page, instructionPattern: RegExp) {
  await page.getByRole("tab", { name: "Source Map" }).click();
  await expect(page.getByTestId("source-row-current")).toHaveAttribute("data-instruction", instructionPattern);
}

export async function assemble(page: Page) {
  await page.getByTestId("assemble-button").click();
  await expect(page.getByTestId("run-state")).toHaveText("Ready");
}

export async function step(page: Page) {
  await page.getByTestId("step-button").click();
}
