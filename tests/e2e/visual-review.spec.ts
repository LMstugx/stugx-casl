import { expect, test, type Page } from "@playwright/test";
import { assemble, openStudio, run, selectDemoProgram, step } from "./caslSmokeHelpers";
import { mkdir } from "node:fs/promises";
import path from "node:path";

type Viewport = {
  name: string;
  width: number;
  height: number;
  primary?: boolean;
};

const screenshotRoot = path.resolve("artifacts/visual-review/screenshots");
const viewports: Viewport[] = [
  { name: "1440x900", width: 1440, height: 900, primary: true },
  { name: "1920x1080", width: 1920, height: 1080 }
];

async function capture(page: Page, viewport: Viewport, fileName: string) {
  const viewportDir = path.join(screenshotRoot, viewport.name);
  await mkdir(viewportDir, { recursive: true });
  await page.screenshot({ path: path.join(viewportDir, fileName), fullPage: true });
  if (viewport.primary) {
    await page.screenshot({ path: path.join(screenshotRoot, fileName), fullPage: true });
  }
}

async function openOutputTab(page: Page, name: "Generated CASL" | "Machine Code" | "Trace" | "Memory") {
  await page.getByRole("tab", { name }).click();
}

async function captureProjectOverview(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await page.getByTestId("project-overview-summary").click();
  await page.getByTestId("guided-lesson-summary").click();
  await expect(page.getByTestId("project-overview")).toContainText("stugx.CASL");
  await capture(page, viewport, "project-overview.png");
}

async function captureCaslGr2Flow(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-gr2-addition");
  await assemble(page);

  await step(page);
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='register-gr2']")).toHaveAttribute("data-active", "true");
  await capture(page, viewport, "casl-gr2-ld.png");

  await step(page);
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "true");
  await capture(page, viewport, "casl-gr2-adda.png");

  await step(page);
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='memory-row-0029']")).toHaveAttribute("data-write", "true");
  await capture(page, viewport, "casl-gr2-st.png");
}

async function captureCppAdditionGeneratedCasl(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-addition");
  await assemble(page);
  await openOutputTab(page, "Generated CASL");
  await expect(page.getByTestId("generated-casl-output")).toContainText("Generated CASL II Assembly");
  await capture(page, viewport, "cpp-addition-generated-casl.png");
}

async function captureMachineCodeExplanation(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-addition");
  await assemble(page);
  await openOutputTab(page, "Machine Code");
  await page.getByTestId("machine-code-row-0020").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("LD");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("GR1");
  await capture(page, viewport, "machine-code-explanation.png");
}

async function captureForSumControlFlow(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-for-sum-sugar");
  await assemble(page);
  await openOutputTab(page, "Generated CASL");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_BEGIN");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_END");
  await capture(page, viewport, "for-sum-control-flow.png");
}

async function captureBreakContinueTrace(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-break-continue");
  await assemble(page);
  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await openOutputTab(page, "Trace");
  await expect(page.getByTestId("trace-list")).toContainText("FOR_CONTINUE");
  await expect(page.getByTestId("trace-list")).toContainText("FOR_END");
  await capture(page, viewport, "break-continue-trace.png");
}

async function captureLogicOperationsMachineCode(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-logic-operations");
  await assemble(page);
  await openOutputTab(page, "Machine Code");
  await expect(page.getByTestId("machine-code-output")).toContainText("AND GR1,MASK");
  await expect(page.getByTestId("machine-code-output")).toContainText("OR GR1,B");
  await expect(page.getByTestId("machine-code-output")).toContainText("XOR GR1,C");
  await page.getByText("AND GR1,MASK").first().click();
  await capture(page, viewport, "logic-operations-machine-code.png");
}

async function captureLogicalAddCompareJov(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-logical-add-compare");
  await assemble(page);
  await openOutputTab(page, "Machine Code");
  await expect(page.getByTestId("machine-code-output")).toContainText("ADDL GR1,B");
  await expect(page.getByTestId("machine-code-output")).toContainText("CPL GR1,C");
  await expect(page.getByTestId("machine-code-output")).toContainText("JOV OVER");
  await page.getByText("JOV OVER").first().click();
  await capture(page, viewport, "logical-add-compare-jov.png");
}

test.describe("visual review screenshot gallery", () => {
  for (const viewport of viewports) {
    test(`captures visual review gallery at ${viewport.name}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await captureProjectOverview(page, viewport);
      await captureCaslGr2Flow(page, viewport);
      await captureCppAdditionGeneratedCasl(page, viewport);
      await captureMachineCodeExplanation(page, viewport);
      await captureForSumControlFlow(page, viewport);
      await captureBreakContinueTrace(page, viewport);
      await captureLogicOperationsMachineCode(page, viewport);
      await captureLogicalAddCompareJov(page, viewport);
    });
  }
});
