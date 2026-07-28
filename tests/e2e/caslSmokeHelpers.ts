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
    const models = monaco?.editor?.getModels?.() ?? [];
    const model = models[models.length - 1];
    if (!model) throw new Error("Monaco model is not available.");
    model.setValue(text);
  }, sourceText);
  await expectSourceContains(page, sourceText);
}

export async function selectDemoProgram(page: Page, programId: string) {
  await page.getByTestId("demo-program-select").selectOption(programId);
}

export async function expectSourceContains(page: Page, sourceText: string) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const monaco = (globalThis as { monaco?: { editor?: { getModels?: () => Array<{ getValue: () => string }> } } }).monaco;
        const models = monaco?.editor?.getModels?.() ?? [];
        return models[models.length - 1]?.getValue() ?? "";
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

export async function run(page: Page) {
  await page.getByTestId("run-button").click();
}

export async function verifyCaslCompatibilityMode(page: Page, backendLabel: "Mock Core" | "WASM Core") {
  const source = `MAIN START
     LAD GR3,#FFFF
     IN BUF,LEN
     OUT BUF,LEN
     RET
BUF DS 256
LEN DS 1
     END`;
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, backendLabel);
  await setSource(page, source);
  await assemble(page);
  await page.getByTestId("casl-mode-toggle").click();
  await expect(page.getByTestId("casl-compatibility-mode")).toBeVisible();
  await expect(page.getByTestId("casl-register-gr7")).toBeVisible();
  await expect(page.getByTestId("casl-assembler-output")).toContainText("SYMBOL TABLE");
  await expect(page.getByTestId("casl-assembler-output")).toContainText("TOTAL WORDS");

  await step(page);
  await page.getByTestId("casl-numeric-hex").click();
  await expect(page.getByTestId("casl-register-gr3")).toContainText("#FFFF");
  await page.getByTestId("casl-numeric-signed").click();
  await expect(page.getByTestId("casl-register-gr3")).toContainText("-1");
  await page.getByTestId("casl-numeric-unsigned").click();
  await expect(page.getByTestId("casl-register-gr3")).toContainText("65535");
  await page.getByTestId("casl-numeric-binary").click();
  await expect(page.getByTestId("casl-register-gr3")).toContainText("1111 1111 1111 1111");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "WaitingInput");
  await expect(page.getByTestId("casl-console-input")).toBeEnabled();
  await page.getByTestId("casl-console-input").fill("ABC");
  await page.getByTestId("casl-console-submit").click();
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "Ready");
  await run(page);
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "Finished");
  await expect(page.locator(".casl-console-output")).toContainText("ABC");

  for (const locale of ["ja", "zh-CN", "en"] as const) {
    await page.getByTestId(`locale-${locale}`).click();
    await expect(page.getByTestId("casl-compatibility-mode")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  for (const viewport of [
    { width: 1180, height: 700 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const binaryValue = page.getByTestId("casl-register-gr3").locator("code");
    expect(await binaryValue.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
}
