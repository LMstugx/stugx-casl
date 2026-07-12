import { expect, test, type Page } from "@playwright/test";
import { assemble, openStudio, run, selectDemoProgram, setSource, step } from "./caslSmokeHelpers";
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

async function capture(page: Page, viewport: Viewport, fileName: string, fullPage = true) {
  await page.evaluate(() => {
    document.documentElement.classList.add("visual-review-static");
    document.body.classList.add("visual-review-static");
  });
  await page.waitForTimeout(220);
  const viewportDir = path.join(screenshotRoot, viewport.name);
  await mkdir(viewportDir, { recursive: true });
  await page.screenshot({ path: path.join(viewportDir, fileName), fullPage });
  if (viewport.primary) {
    await page.screenshot({ path: path.join(screenshotRoot, fileName), fullPage });
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

async function captureCaslDiagnosticState(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await setSource(page, "MAIN START\n     LD GR1\n     END");
  await page.getByTestId("assemble-button").click();
  await expect(page.locator(".diagnostic").first()).toBeVisible();
  await page.locator(".diagnostic").first().click();
  await capture(page, viewport, "ui-casl-diagnostic-error.png");
  await capture(page, viewport, "diagnostics-en-casl.png");
  await capture(page, viewport, "diagnostic-baseline-en.png");
  if (viewport.primary) await capture(page, viewport, "diagnostic-range-casl.png");
  if (viewport.name === "1280x720") await capture(page, viewport, "diagnostic-1280.png");
  await page.getByTestId("locale-ja").click();
  await capture(page, viewport, "diagnostics-ja-casl.png");
  await capture(page, viewport, "diagnostic-baseline-ja.png");
  if (viewport.primary) await capture(page, viewport, "diagnostic-ja-long.png");
  if (viewport.name === "1280x720") await capture(page, viewport, "diagnostics-ja-1280.png");
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, viewport, "diagnostics-zh-cn-casl.png");
  await capture(page, viewport, "diagnostic-baseline-zh-cn.png");
  if (viewport.primary) await capture(page, viewport, "diagnostic-zh-cn-long.png");
  if (viewport.name === "1280x720") await capture(page, viewport, "diagnostics-zh-cn-1280.png");
  await page.getByTestId("locale-en").click();
  if (viewport.primary) {
    await setSource(page, "MAIN START\nA DC 1\nA DC 2\n END");
    await page.getByTestId("assemble-button").click();
    const duplicate = page.locator('.diagnostic[data-diagnostic-code="assembler.duplicateLabel"]').first();
    await duplicate.click();
    await duplicate.locator("..").locator(".diagnostic-related summary").click();
    await capture(page, viewport, "diagnostic-related-location.png");
    await setSource(page, "MAIN START\n RET");
    await page.getByTestId("assemble-button").click();
    await page.locator('.diagnostic[data-diagnostic-code="assembler.missingEnd"]').first().click();
    await capture(page, viewport, "diagnostic-eof.png");
  }
  await setSource(page, "MAIN START\nA DS 65505\n END");
  await page.getByTestId("assemble-button").click();
  await expect(page.locator(".diagnostic").first()).toBeVisible();
  await capture(page, viewport, "diagnostic-legacy-fallback.png");
  if (viewport.name === "1280x720") {
    await setSource(page, " BAD GR9");
    await page.getByTestId("assemble-button").click();
    await expect(page.locator(".diagnostic").first()).toBeVisible();
    await capture(page, viewport, "diagnostic-multiple-errors-1280.png");
    await page.locator(".diagnostic").first().click();
    await page.locator(".diagnostic-entry").first().locator(".diagnostic-related summary").click();
    await capture(page, viewport, "diagnostic-details-expanded-1280.png");
  }
}

async function captureCppDiagnosticState(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await page.getByTestId("source-mode-cpp").click();
  await setSource(page, "int main() {\n  int value = 1\n  return value;\n}");
  await page.getByTestId("assemble-button").click();
  await expect(page.locator(".diagnostic").first()).toBeVisible();
  await page.locator(".diagnostic").first().click();
  await capture(page, viewport, "ui-cpp-diagnostic-error.png");
  await capture(page, viewport, "diagnostics-en-cpp.png");
  await capture(page, viewport, "diagnostics-parser-en.png");
  if (viewport.primary) await capture(page, viewport, "diagnostic-range-cpp.png");
  await page.getByTestId("locale-ja").click();
  await capture(page, viewport, "diagnostics-ja-cpp.png");
  await capture(page, viewport, "diagnostics-parser-ja.png");
  if (viewport.name === "1280x720") await capture(page, viewport, "diagnostics-1280-ja.png");
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, viewport, "diagnostics-zh-cn-cpp.png");
  await capture(page, viewport, "diagnostics-parser-zh-cn.png");
  if (viewport.name === "1280x720") await capture(page, viewport, "diagnostics-1280-zh-cn.png");
  await page.getByTestId("locale-en").click();

  await setSource(page, "int foo() { return 0; } int FOO() { return 0; } int main() { return 0; }");
  await page.getByTestId("assemble-button").click();
  const p2Conflict = page.locator('.diagnostic[data-diagnostic-code="transpiler.generatedLabelConflict"]').first();
  await expect(p2Conflict).toBeVisible();
  await p2Conflict.click();
  await capture(page, viewport, "diagnostic-p2-en.png");
  await capture(page, viewport, "diagnostic-generated-label-conflict.png");
  await page.getByTestId("locale-ja").click();
  await capture(page, viewport, "diagnostic-p2-ja.png");
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, viewport, "diagnostic-p2-zh-cn.png");
  await page.getByTestId("locale-en").click();

  if (viewport.primary) {
    await p2Conflict.locator("..").locator(".diagnostic-related summary").click();
    await capture(page, viewport, "diagnostic-p2-related-location.png");
    const longName = "generated_label_collision_name_".repeat(5);
    await setSource(page, `int ${longName}() { return 0; } int ${longName.toUpperCase()}() { return 0; } int main() { return 0; }`);
    await page.getByTestId("assemble-button").click();
    await expect(page.locator('.diagnostic[data-diagnostic-code="transpiler.generatedLabelConflict"]').first()).toBeVisible();
    await capture(page, viewport, "diagnostic-long-technical-token.png");
    await setSource(page, `int main() { return ${"very_long_unknown_identifier_".repeat(8)}; }`);
    await page.getByTestId("assemble-button").click();
    await capture(page, viewport, "diagnostics-long-token.png");
  }
}

async function captureStoppedState(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  await page.getByTestId("source-mode-cpp").click();
  await setSource(page, `int main() {
  int i = 1;
  while (i > 0) {
    i = i + 1;
  }
  return i;
}`);
  await assemble(page);
  await page.getByTestId("run-button").click();
  await expect(page.getByTestId("run-state")).toHaveText("Stopped", { timeout: 15_000 });
  await capture(page, viewport, "ui-stopped-state.png");
}

async function captureKeyboardFocusState(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  const registersTab = page.getByRole("tab", { name: "Open Registers inspector tab" });
  await registersTab.focus();
  await page.keyboard.press("ArrowRight");
  const memoryTab = page.getByRole("tab", { name: "Open Memory inspector tab" });
  await expect(memoryTab).toBeFocused();
  await capture(page, viewport, "ui-keyboard-focus.png");
}

async function captureLocaleSelectorState(page: Page, viewport: Viewport) {
  await openStudio(page, "Mock Core");
  if (viewport.name === "1280x720") {
    await capture(page, viewport, "locale-en-1280.png");
  }
  await page.getByTestId("locale-ja").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByTestId("locale-ja")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("assemble-button")).toContainText("アセンブル");
  await capture(page, viewport, "ui-locale-selector.png");
  if (viewport.name === "1280x720") {
    await capture(page, viewport, "locale-ja-1280.png");
    await selectDemoProgram(page, "cpp-addition");
    await page.getByTestId("locale-en").click();
    await assemble(page);
    await page.getByTestId("locale-ja").click();
    await capture(page, viewport, "locale-ja-output-dock.png");

    await page.getByTestId("locale-zh-CN").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await capture(page, viewport, "locale-zh-cn-1280.png");
    await page.locator("#inspector-tab-memory").click();
    await capture(page, viewport, "locale-zh-cn-inspector-memory.png");
  }
  await page.getByTestId("locale-en").click();
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
  await expect(page.getByTestId("machine-code-explanation")).toContainText("Return address");
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
  await expect(page.getByTestId("machine-code-explanation")).toContainText("Return address");
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

async function capturePhase14cLocalizedFocus(page: Page, viewport: Viewport) {
  if (!viewport.primary && viewport.name !== "1280x720") return;

  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await enterCircuitFocusMode(page);
  await assemble(page);
  await step(page);
  await step(page);
  await step(page);

  await selectObservationMode(page, "cpu-flow");
  await capture(page, viewport, "locale-en-cpu-flow.png");

  await page.getByTestId("locale-ja").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("信号プローブ");
  await capture(page, viewport, "locale-ja-cpu-flow.png");
  await capture(page, viewport, "locale-ja-signal-probe.png");

  await selectObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("スタックフレーム表示");
  await capture(page, viewport, "locale-ja-register-stack.png");

  await selectObservationMode(page, "code-machine");
  await expect(page.getByTestId("focus-machine-code-panel")).toContainText("機械語");
  await capture(page, viewport, "locale-ja-code-machine.png");

  await page.getByTestId("locale-zh-CN").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await selectObservationMode(page, "cpu-flow");
  await capture(page, viewport, "locale-zh-cn-cpu-flow.png");

  await selectObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("栈帧视图");
  await capture(page, viewport, "locale-zh-cn-register-stack.png");
  await capture(page, viewport, "locale-zh-cn-stack-frame.png");

  await selectObservationMode(page, "code-machine");
  await expect(page.getByTestId("focus-machine-code-panel")).toContainText("机器码");
  await capture(page, viewport, "locale-zh-cn-code-machine.png");

  if (viewport.name === "1280x720") {
    await capture(page, viewport, "locale-zh-cn-1280.png");
    await page.getByTestId("locale-ja").click();
    await capture(page, viewport, "locale-ja-1280.png");
  }
  await page.getByTestId("locale-en").click();
}

async function setOpenFile(page: Page, fileName: string, text: string) {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("open-file-button").click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: fileName, mimeType: "text/plain", buffer: Buffer.from(text, "utf8") });
}

async function captureBrowserOpenFileStates(page: Page, viewport: Viewport) {
  if (!viewport.primary && viewport.name !== "1280x720") return;

  await openStudio(page, "Mock Core");
  await setOpenFile(page, "external.cpp", "int main() {\n  return 7;\n}\n");
  await expect(page.locator(".source-file-name")).toHaveText("external.cpp");
  await capture(page, viewport, "open-clean-document.png");
  await capture(page, viewport, "external-cpp-loaded.png");

  await setSource(page, "int main() { return 8; }");
  await page.getByTestId("open-file-button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await capture(page, viewport, "open-dirty-guard-en.png");
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByTestId("locale-ja").click();
  await page.getByTestId("open-file-button").click();
  await capture(page, viewport, "open-dirty-guard-ja.png");
  await page.getByRole("button", { name: "キャンセル" }).click();
  await page.getByTestId("locale-zh-CN").click();
  await page.getByTestId("open-file-button").click();
  await capture(page, viewport, "open-dirty-guard-zh-cn.png");
  await page.getByRole("button", { name: "取消" }).click();
  await page.getByTestId("locale-en").click();

  await page.reload();
  await expect(page.getByTestId("source-editor")).toBeVisible();
  const invalidChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("open-file-button").click();
  const invalidChooser = await invalidChooserPromise;
  await invalidChooser.setFiles({ name: "program.txt", mimeType: "text/plain", buffer: Buffer.from("text", "utf8") });
  await expect(page.getByTestId("file-operation-notice")).toBeVisible();
  await capture(page, viewport, "open-invalid-extension.png");
  await page.getByRole("button", { name: "Dismiss" }).click();

  const longName = `${"long_external_source_name_".repeat(5)}.cpp`;
  await setOpenFile(page, longName, "int main() { return 0; }");
  await expect(page.locator(".source-file-name")).toHaveText(longName);
  if (viewport.name === "1280x720") await capture(page, viewport, "open-long-filename-1280.png");

  await setOpenFile(page, "external.cas", "MAIN START\n RET\n END");
  await expect(page.locator(".source-file-name")).toHaveText("external.cas");
  await capture(page, viewport, "external-casl-loaded.png");
}

async function captureBrowserSaveStates(page: Page, viewport: Viewport) {
  if (!viewport.primary && viewport.name !== "1280x720") return;
  await page.addInitScript(() => {
    const browserWindow = window as unknown as {
      showSaveFilePicker: () => Promise<{ name: string; createWritable: () => Promise<{ write(data: Uint8Array): Promise<void>; close(): Promise<void> }> }>;
      __saveName: string;
      __delaySave: boolean;
      __finishSave?: () => void;
    };
    browserWindow.__saveName = "saved.cpp";
    browserWindow.__delaySave = false;
    browserWindow.showSaveFilePicker = async () => ({
      get name() { return browserWindow.__saveName; },
      createWritable: async () => ({
        write: async () => undefined,
        close: () => browserWindow.__delaySave
          ? new Promise<void>((resolve) => { browserWindow.__finishSave = resolve; })
          : Promise.resolve()
      })
    });
  });
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-addition");
  await setSource(page, "int main() { return 15; }");
  await capture(page, viewport, "save-as-untitled-en.png");
  await page.getByTestId("locale-ja").click();
  await capture(page, viewport, "save-as-untitled-ja.png");
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, viewport, "save-as-untitled-zh-cn.png");
  await page.getByTestId("locale-en").click();

  await page.getByTestId("open-file-button").click();
  await capture(page, viewport, "save-and-open-guard.png");
  await page.getByRole("button", { name: "Cancel" }).click();
  await capture(page, viewport, "save-dirty-document.png");

  await page.getByTestId("save-file-button").click();
  await expect(page.getByTestId("file-operation-notice")).toContainText("Saved");
  await capture(page, viewport, "save-success.png");

  await setSource(page, "int main() { return 16; }");
  await page.evaluate(() => { (window as unknown as { __delaySave: boolean }).__delaySave = true; });
  await page.getByTestId("save-file-button").click();
  await setSource(page, "int main() { return 17; }");
  await page.evaluate(() => (window as unknown as { __finishSave?: () => void }).__finishSave?.());
  await expect(page.getByTestId("file-operation-notice")).toContainText("still unsaved");
  await capture(page, viewport, "save-still-dirty-after-concurrent-edit.png");

  await page.reload();
  await expect(page.getByTestId("source-editor")).toBeVisible();
  await selectDemoProgram(page, "cpp-addition");
  await setSource(page, "int main() { return 16; }");
  await page.evaluate(() => {
    const browserWindow = window as unknown as { __saveName: string; __delaySave: boolean };
    browserWindow.__delaySave = false;
    browserWindow.__saveName = `${"long_saved_source_name_".repeat(5)}.cpp`;
  });
  await page.getByTestId("save-file-button").click();
  if (viewport.name === "1280x720") await capture(page, viewport, "save-long-filename-1280.png");

  await page.reload();
  await expect(page.getByTestId("source-editor")).toBeVisible();
  await selectDemoProgram(page, "cpp-addition");
  await setSource(page, "int main() { return 17; }");
  await page.evaluate(() => {
    delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
    URL.createObjectURL = () => "blob:visual-save";
    URL.revokeObjectURL = () => undefined;
    HTMLAnchorElement.prototype.click = () => undefined;
  });
  await page.getByTestId("save-file-button").click();
  await expect(page.getByTestId("file-operation-notice")).toContainText("Saved a copy");
  await capture(page, viewport, "save-copy-download.png");

  await page.reload();
  await expect(page.getByTestId("source-editor")).toBeVisible();
  await selectDemoProgram(page, "cpp-addition");
  await setSource(page, "int main() { return 18; }");
  await page.evaluate(() => {
    (window as unknown as { showSaveFilePicker: () => Promise<never> }).showSaveFilePicker = async () => {
      throw new DOMException("denied", "NotAllowedError");
    };
  });
  await page.getByTestId("save-file-button").click();
  await expect(page.getByTestId("file-operation-notice")).toContainText("Could not save file");
  await capture(page, viewport, "save-failure.png");
}

async function captureNewAndDemoReplacementStates(page: Page, viewport: Viewport) {
  if (!viewport.primary && viewport.name !== "1280x720") return;
  const captureState = (fileName: string) => capture(page, viewport, fileName, false);
  await page.addInitScript(() => {
    const browserWindow = window as unknown as {
      showSaveFilePicker: () => Promise<{ name: string; createWritable: () => Promise<{ write(data: Uint8Array): Promise<void>; close(): Promise<void> }> }>;
      __delayReplacementSave: boolean;
      __finishReplacementSave?: () => void;
    };
    browserWindow.__delayReplacementSave = false;
    browserWindow.showSaveFilePicker = async () => ({
      name: "visual-replacement.cas",
      createWritable: async () => ({
        write: async () => undefined,
        close: () => browserWindow.__delayReplacementSave
          ? new Promise<void>((resolve) => { browserWindow.__finishReplacementSave = resolve; })
          : Promise.resolve()
      })
    });
  });
  await openStudio(page, "Mock Core");

  await page.getByTestId("new-document-button").click();
  await captureState("new-document-dialog-en.png");
  await page.keyboard.press("Escape");
  await page.getByTestId("locale-ja").click();
  await page.getByTestId("new-document-button").click();
  await captureState("new-document-dialog-ja.png");
  await page.keyboard.press("Escape");
  await page.getByTestId("locale-zh-CN").click();
  await page.getByTestId("new-document-button").click();
  await captureState("new-document-dialog-zh-cn.png");
  await page.keyboard.press("Escape");
  await page.getByTestId("locale-en").click();
  await page.getByTestId("new-document-button").click();
  await page.getByRole("dialog", { name: "New document" }).locator('input[value="cpp"]').check();
  await page.getByTestId("create-document").click();
  await captureState("untitled-cpp-document.png");

  await page.getByTestId("new-document-button").click();
  await page.getByRole("dialog", { name: "New document" }).locator('input[value="casl"]').check();
  await page.getByTestId("create-document").click();
  await captureState("untitled-casl-document.png");

  await setSource(page, "MAIN START\n RET\n END\n; unsaved");
  await page.getByTestId("new-document-button").click();
  await page.getByTestId("create-document").click();
  await captureState("new-dirty-guard-save-create.png");
  await captureState("new-dirty-guard-discard-create.png");
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByTestId("demo-program-select").selectOption("cpp-function-arguments");
  await captureState("demo-switch-dirty-guard-en.png");
  await page.keyboard.press("Escape");
  await page.getByTestId("locale-ja").click();
  await page.getByTestId("demo-program-select").selectOption("cpp-function-arguments");
  await captureState("demo-switch-dirty-guard-ja.png");
  await page.keyboard.press("Escape");
  await page.getByTestId("locale-zh-CN").click();
  await page.getByTestId("demo-program-select").selectOption("cpp-function-arguments");
  await captureState("demo-switch-dirty-guard-zh-cn.png");
  await page.keyboard.press("Escape");
  await page.getByTestId("locale-en").click();

  await page.evaluate(() => { (window as unknown as { __delayReplacementSave: boolean }).__delayReplacementSave = true; });
  await page.getByTestId("demo-program-select").selectOption("cpp-function-arguments");
  await page.getByTestId("save-and-open").click();
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __finishReplacementSave?: () => void }).__finishReplacementSave))).toBe(true);
  await captureState("replacement-busy-state.png");
  await setSource(page, "MAIN START\n RET\n END\n; edited during replacement save");
  await page.evaluate(() => (window as unknown as { __finishReplacementSave?: () => void }).__finishReplacementSave?.());
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByTestId("demo-program-select").selectOption("cpp-function-arguments");
  await page.getByTestId("discard-and-open").click();
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-function-arguments");
  if (viewport.name === "1280x720") await captureState("long-example-title-1280.png");
}

test.describe("visual review screenshot gallery", () => {
  for (const viewport of viewports) {
    test(`captures visual review gallery at ${viewport.name}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript(() => localStorage.removeItem("stugx.casl.preferences.v1"));

      await captureProjectOverview(page, viewport);
      await captureCaslDiagnosticState(page, viewport);
      await captureCppDiagnosticState(page, viewport);
      await captureStoppedState(page, viewport);
      await captureKeyboardFocusState(page, viewport);
      await captureLocaleSelectorState(page, viewport);
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
      await capturePhase14cLocalizedFocus(page, viewport);
      await captureBrowserOpenFileStates(page, viewport);
      await captureBrowserSaveStates(page, viewport);
      await captureNewAndDemoReplacementStates(page, viewport);
    });
  }
});
