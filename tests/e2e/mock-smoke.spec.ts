import { test, expect } from "@playwright/test";
import { assemble, expectCurrentSourceInstruction, expectRegister, openStudio, run, selectDemoProgram, setSource, step } from "./caslSmokeHelpers";

test("Mock backend completes assemble and first step in the browser UI", async ({ page }) => {
  await openStudio(page, "Mock Core");

  await expect(page.getByTestId("step-button")).toBeDisabled();
  await assemble(page);
  await expectRegister(page, "register-pr", "0020");
  await expectCurrentSourceInstruction(page, /LD\s+GR2,A/);

  await step(page);
  await expectRegister(page, "register-gr2", "0003");
  await expectRegister(page, "register-pr", "0022");
  await expectCurrentSourceInstruction(page, /ADDA\s+GR2,B/);
});

test("Mock backend shows project overview and keeps learning demo views working", async ({ page }) => {
  await openStudio(page, "Mock Core");

  await page.getByTestId("project-overview-summary").click();
  await expect(page.getByTestId("project-overview")).toContainText("stugx.CASL");
  await expect(page.getByTestId("project-overview")).toContainText("Learning Studio");
  await expect(page.getByTestId("project-overview")).toContainText("C++ subset -> Generated CASL II Assembly -> COMET II Machine Code");
  await expect(page.getByTestId("project-overview")).not.toContainText(/contest|hackathon/i);

  await expect(page.getByTestId("guided-lesson")).toBeVisible();
  await selectDemoProgram(page, "cpp-break-continue");
  await page.getByTestId("guided-lesson-summary").click();
  await expect(page.getByTestId("guided-lesson")).toContainText("FOR_CONTINUE");
  await expect(page.getByTestId("guided-lesson")).toContainText("FOR_END");

  await selectDemoProgram(page, "cpp-addition");
  await expect(page.getByTestId("guided-lesson")).toContainText("Generated CASL");
  await expect(page.getByTestId("guided-lesson")).toContainText("Machine Code");

  await selectDemoProgram(page, "cpp-break-continue");
  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_CONTINUE_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("break -> FOR_END_0");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("JUMP FOR_CONTINUE_0");
  await expect(page.getByTestId("machine-code-output")).toContainText("JUMP FOR_END_0");
});

test("Mock backend executes C++ subset if else lowering in the browser UI", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await page.getByTestId("source-mode-cpp").click();
  await setSource(
    page,
    `int main() {
    int a = 10;
    int b = 10;
    int c;
    if (a == b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`
  );

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("JZE");

  for (let index = 0; index < 7; index += 1) {
    await step(page);
  }

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0001");
});

test("Mock backend shows generated CASL and machine code for C++ addition", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-addition");

  await assemble(page);
  await expect(page.getByTestId("generated-casl-output")).toContainText("Generated CASL II Assembly");
  await expect(page.getByTestId("generated-casl-output")).toContainText("LD");
  await expect(page.getByTestId("generated-casl-output")).toContainText("ADDA");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("0020");
  await expect(page.getByTestId("machine-code-output")).toContainText("1010");
  await expect(page.getByTestId("machine-code-output")).toContainText("0027");
  await expect(page.getByTestId("machine-code-output")).toContainText("LD GR1,A");
  await expect(page.getByTestId("machine-code-row-0020")).toHaveAttribute("data-pr", "true");
  await page.getByTestId("machine-code-row-0020").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("LD");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("GR1");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("Operand");
  await page.getByTestId("machine-code-row-0021").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("operand word");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("address of A");

  await step(page);
  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-row-0022")).toHaveAttribute("data-pr", "true");
});

test("Mock backend executes C++ subset while sum in the browser UI", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-while-sum");
  await expect(page.getByTestId("run-state")).toHaveText("Dirty");
  await expect(page.getByTestId("demo-guide-expected-result")).toContainText("GR0 = 0006");

  await assemble(page);
  await expect(page.getByTestId("generated-casl-heading")).toHaveText("This CASL II code was generated from the C++ subset source.");
  await expect(page.getByTestId("generated-casl-output")).toContainText("LOOP_BEGIN_0");

  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-list")).toContainText("Step 36");
  await expect(page.getByTestId("trace-item").first()).toContainText("Changes:");
  await page.getByRole("tab", { name: "Memory" }).click();
  await expect(page.locator(".inspector-panel")).toContainText("SUM");
  await page.getByRole("tab", { name: "Output" }).click();
  await expect(page.getByText("Run finished after")).toBeVisible();
});

test("Mock backend executes C++ subset for sum and shows generated machine code", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-for-sum");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_BEGIN_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_BODY_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_END_0");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("JUMP FOR_BEGIN_0");
  await page.getByTestId("machine-code-row-0020").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("Opcode");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
});

test("Mock backend executes C++ subset for sum syntax sugar", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-for-sum-sugar");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_BEGIN_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("ADDA");
  await expect(page.getByTestId("generated-casl-output")).toContainText("ST");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("ADDA GR1,CONST_1");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
});

test("Mock backend executes C++ subset break and continue lowering", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-break-continue");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_CONTINUE_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_END_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("continue -> FOR_CONTINUE_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("break -> FOR_END_0");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("JUMP FOR_CONTINUE_0");
  await expect(page.getByTestId("machine-code-output")).toContainText("JUMP FOR_END_0");
  await page.getByTestId("machine-code-output").locator('[data-testid^="machine-code-row-"]').filter({ hasText: "JUMP FOR_CONTINUE_0" }).first().click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("FOR_CONTINUE_0");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("continue");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0004");
  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-list")).toContainText("FOR_CONTINUE_0");
  await expect(page.getByTestId("trace-list")).toContainText("FOR_END_0");
});

test("Mock backend stops runaway while programs at maxSteps and can reset", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await page.getByTestId("source-mode-cpp").click();
  await setSource(
    page,
    `int main() {
    int i = 1;
    while (i > 0) {
        i = i + 1;
    }
    return i;
}`
  );

  await assemble(page);
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Stopped", { timeout: 15_000 });
  await page.getByRole("tab", { name: "Output" }).click();
  await expect(page.getByText("Max steps reached. Possible infinite loop.")).toBeVisible();
  await expect(page.getByTestId("run-button")).toBeDisabled();
  await expect(page.getByTestId("step-button")).toBeDisabled();
  await expect(page.getByTestId("reset-button")).toBeEnabled();

  await page.getByTestId("reset-button").click();
  await expect(page.getByTestId("run-state")).toHaveText("Ready");
});

test("Mock backend memory viewer can inspect an extended range and highlight writes", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await assemble(page);

  await page.getByRole("tab", { name: "Memory" }).click();
  await page.getByTestId("memory-start-input").fill("0020");
  await page.getByTestId("memory-row-count").selectOption("64");
  await page.getByTestId("memory-go-button").click();

  await expect(page.getByTestId("memory-view-row-0020")).toContainText("0020");
  await expect(page.getByTestId("memory-view-row-002B")).toContainText("002B");

  await step(page);
  await step(page);
  await step(page);

  const cRow = page.getByTestId("memory-view-row-0029");
  await expect(cRow).toContainText("0007");
  await expect(cRow).toContainText("C");
  await expect(cRow).toHaveAttribute("data-write", "true");
});
