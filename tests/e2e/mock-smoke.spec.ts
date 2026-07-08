import { test, expect } from "@playwright/test";
import { assemble, expectCurrentSourceInstruction, expectRegister, openStudio, run, setSource, step } from "./caslSmokeHelpers";

test("Mock backend completes assemble and first step in the browser UI", async ({ page }) => {
  await openStudio(page, "Mock Core");

  await expect(page.getByTestId("step-button")).toBeDisabled();
  await assemble(page);
  await expectRegister(page, "register-pr", "0020");
  await expectCurrentSourceInstruction(page, /LD\s+GR1,A/);

  await step(page);
  await expectRegister(page, "register-gr1", "000A");
  await expectRegister(page, "register-pr", "0022");
  await expectCurrentSourceInstruction(page, /ADDA\s+GR1,B/);
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

test("Mock backend executes C++ subset while sum in the browser UI", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await page.getByTestId("source-mode-cpp").click();
  await setSource(
    page,
    `int main() {
    int i = 3;
    int sum = 0;
    while (i > 0) {
        sum = sum + i;
        i = i - 1;
    }
    return sum;
}`
  );

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("LOOP_BEGIN_0");

  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
  await page.getByRole("tab", { name: "Output" }).click();
  await expect(page.getByText("Run finished after")).toBeVisible();
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
  await expect(cRow).toContainText("001E");
  await expect(cRow).toContainText("C");
  await expect(cRow).toHaveAttribute("data-write", "true");
});
