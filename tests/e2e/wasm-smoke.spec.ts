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
  step
} from "./caslSmokeHelpers";

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
