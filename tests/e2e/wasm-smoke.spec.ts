import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  assemble,
  expectCurrentSourceInstruction,
  expectRegister,
  gr2SourceWithA100,
  openStudio,
  run,
  selectDemoProgram,
  setSource,
  sourceWithA100,
  step,
  verifyCaslCompatibilityMode
} from "./caslSmokeHelpers";

test("WASM backend completes the CASL compatibility mode workflow", async ({ page }) => {
  await verifyCaslCompatibilityMode(page, "WASM Core");
});

test.beforeAll(() => {
  mkdirSync("artifacts/e2e", { recursive: true });
});

test("WASM backend completes assemble, step, reset, dirty, and edited-source loops in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");

  await expect(page.getByTestId("step-button")).toBeDisabled();
  await assemble(page);
  await expectRegister(page, "register-pr", "0020");
  await expectCurrentSourceInstruction(page, /LD\s+GR2,A/);
  await page.screenshot({ path: "artifacts/e2e/wasm-ready.png", fullPage: true });

  await step(page);
  await expectRegister(page, "register-gr2", "0003");
  await expectRegister(page, "register-pr", "0022");
  await expectCurrentSourceInstruction(page, /ADDA\s+GR2,B/);
  await page.screenshot({ path: "artifacts/e2e/wasm-step1.png", fullPage: true });

  await page.getByTestId("reset-button").click();
  await expect(page.getByTestId("run-state")).toHaveText("Ready");
  await expectRegister(page, "register-gr2", "0000");
  await expectRegister(page, "register-pr", "0020");

  await setSource(page, sourceWithA100);
  await expect(page.getByTestId("run-state")).toHaveText("Dirty");
  await expect(page.getByTestId("step-button")).toBeDisabled();

  await assemble(page);
  await step(page);
  await expectRegister(page, "register-gr1", "0064");
  await page.screenshot({ path: "artifacts/e2e/wasm-edited.png", fullPage: true });

  await setSource(page, gr2SourceWithA100);
  await expect(page.getByTestId("run-state")).toHaveText("Dirty");

  await assemble(page);
  await step(page);
  await expectRegister(page, "register-gr2", "0064");
  await expectRegister(page, "register-gr1", "0000");
});

test("WASM backend runs C++ subset while sum in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "cpp-while-sum");

  await assemble(page);
  await expect(page.getByTestId("generated-casl-output")).toContainText("LOOP_BEGIN_0");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
});

test("WASM backend runs C++ subset function call in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "cpp-function-call");

  await assemble(page);
  await expect(page.getByTestId("generated-casl-output")).toContainText("FUNC_ADDONE");
  await expect(page.getByTestId("generated-casl-output")).toContainText("CALL");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0001");
});

test("WASM backend runs C++ subset single argument function in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "cpp-function-argument");

  await assemble(page);
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,5");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,FUNC_ADDONE_X");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
});

test("WASM backend runs C++ subset multi-register argument function in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "cpp-function-arguments");

  await assemble(page);
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,2");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR2,3");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,FUNC_ADD_A");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR2,FUNC_ADD_B");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0005");
});

test("WASM backend runs C++ subset for sum in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "cpp-for-sum");

  await assemble(page);
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_BEGIN_0");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
});

test("WASM backend runs C++ subset for sum syntax sugar in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "cpp-for-sum-sugar");

  await assemble(page);
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_BEGIN_0");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
});

test("WASM backend runs C++ subset break and continue in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "cpp-break-continue");

  await assemble(page);
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_CONTINUE_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_END_0");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0004");
});

test("WASM backend runs double storage and copy with the same logical words", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "cpp-double-storage");
  await assemble(page);
  await run(page);

  await page.getByRole("tab", { name: "Memory" }).click();
  await page.getByTestId("memory-object-select").selectOption({ label: "x" });
  await expect(page.getByTestId("double-value-inspector")).toContainText("400C000000000000");
  await page.getByTestId("memory-object-select").selectOption({ label: "y" });
  await expect(page.getByTestId("double-value-inspector")).toContainText("400C000000000000");
  await expect(page.getByTestId("double-value-inspector")).toContainText("3.5");
  await expect(page.locator('[data-double-object="cpp-storage:main:y"]')).toHaveCount(4);
});

test("WASM backend runs CASL logical add compare in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "casl-logical-add-compare");

  await assemble(page);
  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("ADDL GR1,B");
  await expect(page.getByTestId("machine-code-output")).toContainText("CPL GR1,C");
  await expect(page.getByTestId("machine-code-output")).toContainText("JOV OVER");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr1", "0003");
});

test("WASM backend runs CASL shift operations in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "casl-shift-operations");

  await assemble(page);
  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("SLL GR1,1");
  await expect(page.getByTestId("machine-code-output")).toContainText("SRA GR1,1");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr1", "0003");
});

test("WASM backend runs CASL index addressing in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "casl-index-addressing");

  await assemble(page);
  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("LD GR1,A,GR2");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr1", "0014");
  await page.getByRole("tab", { name: "Memory" }).click();
  await expect(page.getByTestId("memory-view-row-0029")).toContainText("RESULT");
  await expect(page.getByTestId("memory-view-row-0029")).toContainText("0014");
});

test("WASM backend runs CASL PUSH POP stack demo in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "casl-push-pop-stack");

  await assemble(page);
  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("PUSH A,GR2");
  await expect(page.getByTestId("machine-code-output")).toContainText("POP GR1");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr1", "0029");
  await page.getByRole("tab", { name: "Memory" }).click();
  await expect(page.getByTestId("memory-view-row-002A")).toContainText("RESULT");
  await expect(page.getByTestId("memory-view-row-002A")).toContainText("0029");
});

test("WASM backend runs CASL CALL RETURN demo in the browser UI", async ({ page }) => {
  await openStudio(page, "WASM Core");
  await selectDemoProgram(page, "casl-call-return");

  await assemble(page);
  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("CALL SUB");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr1", "0006");
  await page.getByRole("tab", { name: "Memory" }).click();
  await expect(page.getByTestId("memory-view-row-002B")).toContainText("RESULT");
  await expect(page.getByTestId("memory-view-row-002B")).toContainText("0006");
});
