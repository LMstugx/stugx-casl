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
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1440x900", width: 1440, height: 900, primary: true },
  { name: "1920x1080", width: 1920, height: 1080 }
];

async function capture(page: Page, viewport: Viewport, fileName: string) {
  await page.evaluate(() => {
    document.documentElement.classList.add("visual-review-static");
    document.body.classList.add("visual-review-static");
  });
  await page.waitForTimeout(220);
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

async function enterCircuitFocusMode(page: Page) {
  await page.getByTestId("circuit-focus-toggle").click();
  await expect(page.getByTestId("circuit-focus-layout")).toBeVisible();
  await expect(page.getByTestId("observation-mode-selector")).toBeVisible();
  await expect(page.getByTestId("focus-program-panel")).toBeVisible();
  await expect(page.getByTestId("focus-display-panel")).toBeVisible();
  await expect(page.getByTestId("focus-current-instruction-panel")).toBeVisible();
  await expect(page.getByTestId("focus-circuit-panel")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window")).toBeVisible();
  await expect(page.getByTestId("focus-signal-probe")).toBeVisible();
  await expect(page.getByTestId("focus-trace-panel")).toBeVisible();
  await expect(page.getByTestId("focus-step-timeline")).toBeVisible();
}

async function selectObservationMode(page: Page, mode: "cpu-flow" | "register-stack" | "code-machine") {
  await page.getByTestId(`observation-mode-${mode}`).click();
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
  await enterCircuitFocusMode(page);
  await selectObservationMode(page, "cpu-flow");
  await assemble(page);

  await step(page);
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='register-gr2']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("comet-circuit-svg")).toContainText("DATA BUS");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-lane", "data-bypass");
  await capture(page, viewport, "casl-gr2-ld.png");

  await step(page);
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-gr-to-alu']")).toHaveAttribute("data-lane", "data-compute");
  await capture(page, viewport, "casl-gr2-adda.png");

  await step(page);
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='memory-row-0029']")).toHaveAttribute("data-write", "true");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-gr-to-mdr']")).toHaveAttribute("data-lane", "data-bypass");
  await capture(page, viewport, "casl-gr2-st.png");
}

async function captureObservationCpuFlow(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-gr2-addition");
  await enterCircuitFocusMode(page);
  await selectObservationMode(page, "cpu-flow");
  await assemble(page);
  await step(page);
  await expect(page.getByTestId("focus-circuit-panel")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window-row")).toHaveCount(9);
  await capture(page, viewport, "observation-cpu-flow.png");
}

async function captureObservationRegisterStack(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-call-return");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await step(page);
  await step(page);
  await selectObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr0")).toBeVisible();
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr7")).toBeVisible();
  await expect(page.getByTestId("focus-stack-preview")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window-row")).toHaveCount(10);
  await capture(page, viewport, "observation-register-stack.png");
}

async function captureStackFrameViewPreview(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await selectObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr0")).toBeVisible();
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr7")).toBeVisible();
  await expect(page.getByTestId("focus-stack-preview")).toBeVisible();
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("Stack Frame View");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("Design preview");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("Not runtime state");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("Simple static locals");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("GR1 / GR2 / GR3");
  await expect(page.getByTestId("stack-frame-function-select")).toContainText("add");
  await expect(page.getByTestId("focus-memory-window-row")).toHaveCount(10);
  await capture(page, viewport, "stack-frame-view-preview.png");
}

async function captureObservationCodeMachine(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await step(page);
  await step(page);
  await step(page);
  await selectObservationMode(page, "code-machine");
  await expect(page.getByTestId("focus-generated-casl-panel")).toContainText("FUNC_ADD");
  await expect(page.getByTestId("focus-machine-code-panel")).toContainText("CALL FUNC_ADD");
  await expect(page.getByTestId("focus-trace-panel")).toContainText("CALL");
  await capture(page, viewport, "observation-code-machine.png");
}

async function captureStackPreviewFocus(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-gr2-addition");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-guide-sp-to-mar-preview']")).toHaveCount(0);
  await selectObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-stack-preview")).toContainText("Stack path preview only.");
  await expect(page.getByTestId("focus-stack-preview")).toContainText("SP FFFE");
  await capture(page, viewport, "stack-preview-focus.png");
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

async function captureShiftOperationsCircuit(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-shift-operations");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await step(page);
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("SLL");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='alu-shift-badge']")).toContainText("SLL");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-shift-count-to-alu']")).toBeVisible();
  await capture(page, viewport, "shift-operations-circuit.png");
}

async function captureShiftOperationsMachineCode(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-shift-operations");
  await assemble(page);
  await openOutputTab(page, "Machine Code");
  await expect(page.getByTestId("machine-code-output")).toContainText("SLL GR1,1");
  await page.getByTestId("machine-code-row-0022").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("Logical left shift");
  await capture(page, viewport, "shift-operations-machine-code.png");
}

async function captureIndexAddressingCircuit(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-index-addressing");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await step(page);
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("LD");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='effective-address-unit']")).toContainText("Address Unit");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='effective-address-base-row']")).toContainText("0027");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='effective-address-index-row']")).toContainText("GR2=0001");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='effective-address-ea-row']")).toContainText("0028");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='memory-row-0028']")).toHaveAttribute("data-read", "true");
  await capture(page, viewport, "index-addressing-circuit.png");
}

async function captureIndexAddressingMachineCode(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-index-addressing");
  await assemble(page);
  await step(page);
  await step(page);
  await openOutputTab(page, "Machine Code");
  await page.getByTestId("machine-code-row-0022").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("x = GR2");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("0001");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("0028");
  await capture(page, viewport, "index-addressing-machine-code.png");
}

async function capturePushPopStackCircuit(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-push-pop-stack");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await step(page);
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("PUSH");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='memory-row-FFFD']")).toHaveAttribute("data-write", "true");
  await selectObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-stack-preview")).toContainText("Stack write");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("Stack");
  await capture(page, viewport, "push-pop-stack-circuit.png");
}

async function capturePushPopStackMachineCode(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-push-pop-stack");
  await assemble(page);
  await openOutputTab(page, "Machine Code");
  await expect(page.getByTestId("machine-code-output")).toContainText("PUSH A,GR2");
  await expect(page.getByTestId("machine-code-output")).toContainText("POP GR1");
  await page.getByTestId("machine-code-row-0022").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("PUSH");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("effective address");
  await capture(page, viewport, "push-pop-stack-machine-code.png");
}

async function captureCallReturnCall(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-call-return");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await step(page);
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("CALL");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-return-address-to-mdr']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-eau-to-pr']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("Return");
  await selectObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-call-stack")).toContainText("Depth 1");
  await expect(page.getByTestId("focus-call-stack")).toContainText("0024");
  await expect(page.getByTestId("focus-call-stack")).toContainText("Call target SUB");
  await capture(page, viewport, "call-return-call.png");
}

async function captureCallReturnRetStack(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-call-return");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await step(page);
  await step(page);
  await step(page);
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("RET");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-mdr-to-pr']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ST GR1,RESULT");
  await selectObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-call-stack")).toContainText("Return to 0024 from MEM[FFFD]");
  await capture(page, viewport, "call-return-ret-stack.png");
}

async function captureCallReturnFinish(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-call-return");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("RET");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await selectObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-call-stack")).toContainText("Top-level finish");
  await capture(page, viewport, "call-return-finish.png");
}

async function captureCallReturnMachineCode(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-call-return");
  await assemble(page);
  await openOutputTab(page, "Machine Code");
  await expect(page.getByTestId("machine-code-output")).toContainText("CALL SUB");
  await page.getByTestId("machine-code-row-0022").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("CALL");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("return address");
  await capture(page, viewport, "call-return-machine-code.png");
}

async function captureNestedCallReturn(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-nested-call-return");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await step(page);
  await step(page);
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("CALL");
  await selectObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-call-stack")).toContainText("Depth 2");
  await expect(page.getByTestId("focus-call-stack")).toContainText("SUB2");
  await expect(page.getByTestId("focus-call-stack")).toContainText("0029");
  await capture(page, viewport, "nested-call-return.png");
}

async function captureCppFunctionCallGeneratedCasl(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-call");
  await assemble(page);
  await openOutputTab(page, "Generated CASL");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FUNC_ADDONE");
  await expect(page.getByTestId("generated-casl-output")).toContainText("CALL");
  await capture(page, viewport, "cpp-function-call-generated-casl.png");
}

async function captureCppFunctionCallTrace(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-call");
  await assemble(page);
  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await openOutputTab(page, "Trace");
  await expect(page.getByTestId("trace-list")).toContainText("CALL");
  await expect(page.getByTestId("trace-list")).toContainText("RET");
  await capture(page, viewport, "cpp-function-call-trace.png");
}

async function captureCppFunctionCallMachineCode(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-call");
  await assemble(page);
  await step(page);
  await openOutputTab(page, "Machine Code");
  await page.getByTestId("machine-code-output").locator('[data-testid^="machine-code-row-"]').filter({ hasText: "CALL FUNC_ADDONE" }).first().click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("CALL");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("Return Addr");
  await capture(page, viewport, "cpp-function-call-machine-code.png");
}

async function captureCppFunctionArgumentGeneratedCasl(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-argument");
  await assemble(page);
  await openOutputTab(page, "Generated CASL");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,5");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,FUNC_ADDONE_X");
  await capture(page, viewport, "cpp-function-argument-generated-casl.png");
}

async function captureCppFunctionArgumentTrace(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-argument");
  await assemble(page);
  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await openOutputTab(page, "Trace");
  await expect(page.getByTestId("trace-list")).toContainText("CALL");
  await expect(page.getByTestId("trace-list")).toContainText("RET");
  await capture(page, viewport, "cpp-function-argument-trace.png");
}

async function captureCppFunctionArgumentMachineCode(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-argument");
  await assemble(page);
  await step(page);
  await step(page);
  await openOutputTab(page, "Machine Code");
  await page.getByTestId("machine-code-output").locator('[data-testid^="machine-code-row-"]').filter({ hasText: "CALL FUNC_ADDONE" }).first().click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("CALL");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("Return Addr");
  await capture(page, viewport, "cpp-function-argument-machine-code.png");
}

async function captureCppFunctionArgumentsGeneratedCasl(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await selectObservationMode(page, "code-machine");
  await expect(page.getByTestId("focus-generated-casl-panel")).toContainText("GR1,2");
  await expect(page.getByTestId("focus-generated-casl-panel")).toContainText("GR2,3");
  await expect(page.getByTestId("focus-generated-casl-panel")).toContainText("FUNC_ADD_A");
  await expect(page.getByTestId("focus-generated-casl-panel")).toContainText("FUNC_ADD_B");
  await capture(page, viewport, "cpp-function-arguments-generated-casl.png");
}

async function captureCppFunctionArgumentsTrace(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await step(page);
  await step(page);
  await step(page);
  await selectObservationMode(page, "code-machine");
  await expect(page.getByTestId("focus-trace-panel")).toContainText("CALL");
  await expect(page.getByTestId("focus-source-mapping-panel").first()).toContainText("result = add(2, 3);");
  await capture(page, viewport, "cpp-function-arguments-trace.png");
}

async function captureCppFunctionArgumentsMachineCode(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await step(page);
  await step(page);
  await step(page);
  await selectObservationMode(page, "code-machine");
  await expect(page.getByTestId("focus-machine-code-panel")).toContainText("CALL FUNC_ADD");
  await expect(page.getByTestId("focus-source-mapping-panel").first()).toContainText("result = add(2, 3);");
  await capture(page, viewport, "cpp-function-arguments-machine-code.png");
}

test.describe("visual review screenshot gallery", () => {
  for (const viewport of viewports) {
    test(`captures visual review gallery at ${viewport.name}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await captureProjectOverview(page, viewport);
      await captureCaslGr2Flow(page, viewport);
      await captureObservationCpuFlow(page, viewport);
      await captureObservationRegisterStack(page, viewport);
      await captureStackFrameViewPreview(page, viewport);
      await captureObservationCodeMachine(page, viewport);
      await captureStackPreviewFocus(page, viewport);
      await captureCppAdditionGeneratedCasl(page, viewport);
      await captureMachineCodeExplanation(page, viewport);
      await captureForSumControlFlow(page, viewport);
      await captureBreakContinueTrace(page, viewport);
      await captureLogicOperationsMachineCode(page, viewport);
      await captureLogicalAddCompareJov(page, viewport);
      await captureShiftOperationsCircuit(page, viewport);
      await captureShiftOperationsMachineCode(page, viewport);
      await captureIndexAddressingCircuit(page, viewport);
      await captureIndexAddressingMachineCode(page, viewport);
      await capturePushPopStackCircuit(page, viewport);
      await capturePushPopStackMachineCode(page, viewport);
      await captureCallReturnCall(page, viewport);
      await captureCallReturnRetStack(page, viewport);
      await captureCallReturnFinish(page, viewport);
      await captureCallReturnMachineCode(page, viewport);
      await captureNestedCallReturn(page, viewport);
      await captureCppFunctionCallGeneratedCasl(page, viewport);
      await captureCppFunctionCallTrace(page, viewport);
      await captureCppFunctionCallMachineCode(page, viewport);
      await captureCppFunctionArgumentGeneratedCasl(page, viewport);
      await captureCppFunctionArgumentTrace(page, viewport);
      await captureCppFunctionArgumentMachineCode(page, viewport);
      await captureCppFunctionArgumentsGeneratedCasl(page, viewport);
      await captureCppFunctionArgumentsTrace(page, viewport);
      await captureCppFunctionArgumentsMachineCode(page, viewport);
    });
  }
});
