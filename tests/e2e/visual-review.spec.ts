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
const startupSelectionKey = "stugx.casl.startup-selection.v1";
const applicationPreferenceKey = "stugx.casl.preferences.v1";
const lessonProgressKey = "stugx.casl.lesson-progress.v1";
const localeStorageKey = "stugx.casl.locale";
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
  await expect(page.getByTestId("focus-current-instruction-panel")).toBeVisible();
  await expect(page.getByTestId("focus-circuit-panel")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window")).toBeVisible();
  await expect(page.getByTestId("focus-signal-probe")).toBeVisible();
  await expect(page.getByTestId("focus-step-timeline")).toBeVisible();
}

async function selectObservationMode(page: Page, mode: "cpu-flow" | "register-stack" | "code-machine") {
  if (mode === "register-stack") {
    await page.getByTestId("auxiliary-observation-stack").click();
    return;
  }
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
    const rawDetails = page.getByTestId("diagnostic-context").locator(".diagnostic-context-details");
    if (await rawDetails.count()) await rawDetails.locator("summary").click();
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
    const rawDetails = page.getByTestId("diagnostic-context").locator(".diagnostic-context-details");
    if (await rawDetails.count()) await rawDetails.locator("summary").click();
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
    const rawDetails = page.getByTestId("diagnostic-context").locator(".diagnostic-context-details");
    if (await rawDetails.count()) await rawDetails.locator("summary").click();
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
  await expect(page.getByTestId("focus-memory-window-row")).toHaveCount(10);
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
  await page.getByTestId("auxiliary-observation-trace").click();
  await expect(page.getByTestId("focus-trace-panel")).toContainText("CALL");
  await expect(page.getByTestId("focus-source-context-text")).toContainText("result = add(2, 3);");
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

async function captureStartupSelectionStates(page: Page, viewport: Viewport) {
  if (!viewport.primary && viewport.name !== "1280x720") return;

  const seedAndReload = async (
    startupValue: string | null,
    options: { locale?: "en" | "ja" | "zh-CN"; observationMode?: "cpu-flow" | "register-stack" | "code-machine"; circuitFocusEnabled?: boolean } = {}
  ) => {
    await page.evaluate(({ startupKey, preferenceKey, startupValue, options }) => {
      sessionStorage.setItem("visual-startup-seed-active", "true");
      if (startupValue === null) localStorage.removeItem(startupKey);
      else localStorage.setItem(startupKey, startupValue);
      localStorage.setItem("stugx.casl.locale", options.locale ?? "en");
      localStorage.setItem(preferenceKey, JSON.stringify({
        version: 1,
        observationMode: options.observationMode ?? "cpu-flow",
        circuitFocusEnabled: options.circuitFocusEnabled ?? false,
        inspectorActiveTab: "registers",
        outputDockActiveTab: "output"
      }));
    }, { startupKey: startupSelectionKey, preferenceKey: applicationPreferenceKey, startupValue, options });
    await page.reload();
    await expect(page.getByTestId("backend-label")).toHaveText("Mock Core");
  };

  const valid = (lastExampleId: string) => JSON.stringify({ version: 1, lastExampleId });

  if (viewport.primary) {
    await seedAndReload(null);
    await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-gr2-addition");
    await capture(page, viewport, "startup-example-default.png");

    await seedAndReload(valid("casl-call-return"));
    await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-call-return");
    await capture(page, viewport, "startup-example-restored-casl.png");

    await seedAndReload(valid("cpp-addition"));
    await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
    await capture(page, viewport, "startup-example-restored-cpp.png");

    await seedAndReload(valid("invalid-id"));
    await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-gr2-addition");
    await capture(page, viewport, "startup-example-invalid-id-fallback.png");

    await seedAndReload(valid("deleted-example"));
    await capture(page, viewport, "startup-example-deleted-id-fallback.png");

    await seedAndReload("{");
    await capture(page, viewport, "startup-example-malformed-storage.png");

    await seedAndReload(JSON.stringify({ version: 1, lastExampleId: "x".repeat(5000) }));
    await capture(page, viewport, "startup-example-oversized-storage.png");

    await seedAndReload(valid("cpp-addition"), { locale: "ja" });
    await capture(page, viewport, "startup-example-with-ja-locale.png");

    await seedAndReload(valid("cpp-addition"), { locale: "zh-CN" });
    await capture(page, viewport, "startup-example-with-zh-cn-locale.png");

    await seedAndReload(valid("casl-call-return"), { observationMode: "register-stack", circuitFocusEnabled: true });
    await expect(page.getByTestId("circuit-focus-layout")).toHaveAttribute("data-observation-mode", "register-stack");
    await capture(page, viewport, "startup-example-with-register-stack-preference.png");

    await seedAndReload(valid("casl-call-return"), { observationMode: "code-machine", circuitFocusEnabled: true });
    await expect(page.getByTestId("circuit-focus-layout")).toHaveAttribute("data-observation-mode", "code-machine");
    await capture(page, viewport, "startup-example-with-code-machine-preference.png");
    await capture(page, viewport, "startup-example-with-circuit-focus.png");
  }

  if (viewport.name === "1280x720") {
    await seedAndReload(valid("cpp-addition"));
    await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
    await capture(page, viewport, "startup-example-1280.png");
  }

  await page.evaluate(({ startupKey, preferenceKey }) => {
    sessionStorage.removeItem("visual-startup-seed-active");
    localStorage.removeItem(startupKey);
    localStorage.removeItem(preferenceKey);
  }, { startupKey: startupSelectionKey, preferenceKey: applicationPreferenceKey });
}

async function captureLessonProgressStates(page: Page, viewport: Viewport) {
  if (!viewport.primary && viewport.name !== "1280x720") return;

  const payload = (completedStepIds: string[], compatibilityVersion = 1) => JSON.stringify({
    version: 1,
    entries: [{ lessonId: "casl-gr2-addition", exampleId: "casl-gr2-addition", progressCompatibilityVersion: compatibilityVersion, completedStepIds }]
  });
  const seedAndReload = async (progressValue: string | null, locale: "en" | "ja" | "zh-CN" = "en") => {
    await page.evaluate(({ startupKey, preferenceKey, progressKey, progressValue, locale }) => {
      sessionStorage.setItem("visual-lesson-progress-seed-active", "true");
      localStorage.setItem(startupKey, JSON.stringify({ version: 1, lastExampleId: "casl-gr2-addition" }));
      localStorage.setItem(preferenceKey, JSON.stringify({ version: 1, observationMode: "cpu-flow", circuitFocusEnabled: false, inspectorActiveTab: "registers", outputDockActiveTab: "output" }));
      localStorage.setItem("stugx.casl.locale", locale);
      if (progressValue === null) localStorage.removeItem(progressKey);
      else localStorage.setItem(progressKey, progressValue);
    }, { startupKey: startupSelectionKey, preferenceKey: applicationPreferenceKey, progressKey: lessonProgressKey, progressValue, locale });
    await page.reload();
    await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-gr2-addition");
    await page.getByTestId("guided-lesson-summary").click();
  };

  if (viewport.primary) {
    await seedAndReload(null);
    await capture(page, viewport, "lesson-progress-empty.png");

    await seedAndReload(payload(["assemble", "step-ld"]));
    await expect(page.getByTestId("study-mode-progress")).toContainText("2 / 4");
    await capture(page, viewport, "lesson-progress-partial.png");

    await seedAndReload(payload(["assemble", "step-ld", "step-adda", "step-st"]));
    await capture(page, viewport, "lesson-progress-complete.png");

    await seedAndReload(payload(["assemble", "step-ld"]));
    await capture(page, viewport, "lesson-progress-restored-en.png");

    await seedAndReload(payload(["assemble", "step-ld"]), "ja");
    await capture(page, viewport, "lesson-progress-restored-ja.png");

    await seedAndReload(payload(["assemble", "step-ld"]), "zh-CN");
    await capture(page, viewport, "lesson-progress-restored-zh-cn.png");

    await seedAndReload(payload(["assemble", "step-ld"]));
    await page.getByTestId("study-mode-reset").click();
    await capture(page, viewport, "lesson-progress-reset.png");

    await seedAndReload(JSON.stringify({ version: 2, entries: [] }));
    await capture(page, viewport, "lesson-progress-invalid-version.png");

    await seedAndReload(payload(["assemble", "deleted-step"]));
    await expect(page.getByTestId("study-mode-progress")).toContainText("1 / 4");
    await capture(page, viewport, "lesson-progress-deleted-step.png");

    await seedAndReload(payload(["assemble"], 2));
    await capture(page, viewport, "lesson-progress-version-mismatch.png");

    await seedAndReload(payload(["assemble"]));
    await setOpenFile(page, "external.cas", "MAIN START\n RET\n END");
    await expect(page.getByTestId("demo-guide")).toHaveCount(0);
    await capture(page, viewport, "lesson-progress-external-source.png");
  }

  if (viewport.name === "1280x720") {
    await seedAndReload(payload(["assemble", "step-ld"]));
    await capture(page, viewport, "lesson-progress-1280.png");
  }

  await page.evaluate(({ startupKey, preferenceKey, progressKey }) => {
    sessionStorage.removeItem("visual-lesson-progress-seed-active");
    localStorage.removeItem(startupKey);
    localStorage.removeItem(preferenceKey);
    localStorage.removeItem(progressKey);
  }, { startupKey: startupSelectionKey, preferenceKey: applicationPreferenceKey, progressKey: lessonProgressKey });
}

async function capturePersistenceQualityGateStates(page: Page, viewport: Viewport) {
  const validPreferences = JSON.stringify({ version: 1, observationMode: "register-stack", circuitFocusEnabled: false, inspectorActiveTab: "memory", outputDockActiveTab: "messages" });
  const validStartup = JSON.stringify({ version: 1, lastExampleId: "casl-gr2-addition" });
  const validProgress = JSON.stringify({ version: 1, entries: [{ lessonId: "casl-gr2-addition", exampleId: "casl-gr2-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble", "step-ld"] }] });
  const seedAndReload = async (values: { locale?: string | null; preferences?: string | null; startup?: string | null; progress?: string | null }) => {
    await page.evaluate(({ keys, values }) => {
      sessionStorage.setItem("visual-persistence-seed-active", "true");
      const entries = [
        [keys.locale, values.locale],
        [keys.preferences, values.preferences],
        [keys.startup, values.startup],
        [keys.progress, values.progress]
      ] as const;
      for (const [key, value] of entries) {
        if (value === null || value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
    }, {
      keys: { locale: localeStorageKey, preferences: applicationPreferenceKey, startup: startupSelectionKey, progress: lessonProgressKey },
      values
    });
    await page.reload();
    await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-gr2-addition");
    await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);
    await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "Idle");
    await expect(page.locator(".diagnostic")).toHaveCount(0);
    const lesson = page.getByTestId("guided-lesson");
    if ((await lesson.getAttribute("open")) === null) await page.getByTestId("guided-lesson-summary").click();
  };
  const valid = (locale: "en" | "ja" | "zh-CN" = "en") => ({ locale, preferences: validPreferences, startup: validStartup, progress: validProgress });

  if (viewport.primary) {
    await seedAndReload({ locale: null, preferences: null, startup: null, progress: null });
    await capture(page, viewport, "persistence-all-default.png");

    await seedAndReload(valid("en"));
    await expect(page.getByTestId("study-mode-progress")).toContainText("2 / 4");
    await capture(page, viewport, "persistence-all-valid-en.png");

    await seedAndReload(valid("ja"));
    await capture(page, viewport, "persistence-all-valid-ja.png");

    await seedAndReload(valid("zh-CN"));
    await capture(page, viewport, "persistence-all-valid-zh-cn.png");

    await seedAndReload({ ...valid(), locale: "invalid" });
    await capture(page, viewport, "persistence-invalid-locale.png");

    await seedAndReload({ ...valid(), preferences: '{"version":2}' });
    await capture(page, viewport, "persistence-invalid-preferences.png");

    await seedAndReload({ ...valid(), startup: '{"version":2}' });
    await capture(page, viewport, "persistence-invalid-startup.png");

    await seedAndReload({ ...valid(), progress: '{"version":2}' });
    await expect(page.getByTestId("study-mode-progress")).toContainText("0 / 4");
    await capture(page, viewport, "persistence-invalid-lesson-progress.png");

    await seedAndReload({ locale: "invalid", preferences: '{"version":2}', startup: '{"version":2}', progress: '{"version":2}' });
    await capture(page, viewport, "persistence-all-invalid.png");

    await seedAndReload(valid("ja"));
    await page.evaluate((progressKey) => localStorage.removeItem(progressKey), lessonProgressKey);
    await page.reload();
    await page.getByTestId("guided-lesson-summary").click();
    await expect(page.getByTestId("study-mode-progress")).toContainText("0 / 4");
    await capture(page, viewport, "persistence-reset-isolation.png");

    await seedAndReload({ ...valid("zh-CN"), preferences: "{" });
    await capture(page, viewport, "persistence-cross-key-failure.png");

    await page.addInitScript(() => {
      if (window.name === "visual-storage-unavailable") {
        Object.defineProperty(window, "localStorage", { configurable: true, get: () => { throw new DOMException("blocked", "SecurityError"); } });
      }
    });
    await page.evaluate(() => { window.name = "visual-storage-unavailable"; });
    await page.reload();
    await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-gr2-addition");
    await capture(page, viewport, "persistence-storage-unavailable.png");
    await page.evaluate(() => { window.name = ""; });
    await page.reload();
  }

  await seedAndReload(valid());
  await capture(page, viewport, `persistence-${viewport.name.split("x")[0]}.png`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.evaluate((keys) => {
    sessionStorage.removeItem("visual-persistence-seed-active");
    localStorage.removeItem(keys.locale);
    localStorage.removeItem(keys.preferences);
    localStorage.removeItem(keys.startup);
    localStorage.removeItem(keys.progress);
  }, { locale: localeStorageKey, preferences: applicationPreferenceKey, startup: startupSelectionKey, progress: lessonProgressKey });
}

async function capturePhase18A1DesktopPolish(page: Page, viewport: Viewport) {
  if (!viewport.primary) return;
  const compactViewport: Viewport = { name: "1180x700", width: 1180, height: 700 };
  const standardViewport: Viewport = { name: "1280x720", width: 1280, height: 720 };
  const maximizedViewport: Viewport = { name: "1920x1080", width: 1920, height: 1080 };

  await page.setViewportSize({ width: compactViewport.width, height: compactViewport.height });
  await openStudio(page, "Mock Core");
  await page.getByTestId("locale-en").click();
  await capture(page, compactViewport, "tauri-toolbar-en-1180.png", false);
  await page.getByTestId("locale-ja").click();
  await capture(page, compactViewport, "tauri-toolbar-ja-1180.png", false);
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, compactViewport, "tauri-toolbar-zh-cn-1180.png", false);

  await page.setViewportSize({ width: standardViewport.width, height: standardViewport.height });
  await page.getByTestId("locale-en").click();
  await capture(page, standardViewport, "source-header-en-1280.png", false);
  await page.getByTestId("locale-ja").click();
  await capture(page, standardViewport, "source-header-ja-1280.png", false);
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, standardViewport, "source-header-zh-cn-1280.png", false);

  const invalidLines = Array.from({ length: 28 }, (_, index) => `     BAD${index} GR9`).join("\n");
  const captureManyDiagnostics = async (
    localeId: "locale-en" | "locale-ja" | "locale-zh-CN",
    fileName: string
  ) => {
    const scenarioPage = await page.context().newPage();
    try {
      await scenarioPage.setViewportSize({ width: standardViewport.width, height: standardViewport.height });
      await openStudio(scenarioPage, "Mock Core");
      await scenarioPage.getByTestId(localeId).click();
      await setSource(scenarioPage, `MAIN START\n${invalidLines}\n     END`);
      await scenarioPage.getByTestId("assemble-button").click();
      await scenarioPage.evaluate(() => window.scrollTo(0, 0));
      await capture(scenarioPage, standardViewport, fileName, false);
    } finally {
      await scenarioPage.close();
    }
  };
  await captureManyDiagnostics("locale-en", "diagnostics-many-en-1280.png");
  await captureManyDiagnostics("locale-ja", "diagnostics-many-ja-1280.png");
  await captureManyDiagnostics("locale-zh-CN", "diagnostics-many-zh-cn-1280.png");
  await page.getByTestId("locale-en").click();
  await page.reload();
  await expect(page.getByTestId("backend-label")).toHaveText("Mock Core");
  await setSource(page, `MAIN START\n${invalidLines}\n     END`);
  await page.getByTestId("assemble-button").click();
  await page.locator(".diagnostic").last().click();
  await capture(page, standardViewport, "diagnostics-context-selected.png", false);
  await page.getByTestId("source-mode-casl").click();
  await setSource(page, "MAIN START\nA DC 1\nA DC 2\n END");
  await page.getByTestId("assemble-button").click();
  await page.locator('.diagnostic[data-diagnostic-code="assembler.duplicateLabel"]').click();
  const contextDetails = page.getByTestId("diagnostic-context").locator(".diagnostic-context-details");
  await contextDetails.locator("summary").click();
  await capture(page, standardViewport, "diagnostics-details-expanded.png", false);

  await page.setViewportSize({ width: maximizedViewport.width, height: maximizedViewport.height });
  await page.getByTestId("locale-en").click();
  await capture(page, maximizedViewport, "tauri-maximized-layout.png", false);
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
}

async function captureChangelogStates(page: Page, viewport: Viewport) {
  if (!viewport.primary) return;
  const standardViewport: Viewport = { name: "1440x900", width: 1440, height: 900 };
  const compactViewport: Viewport = { name: "1280x720", width: 1280, height: 720 };
  const openChangelog = async () => {
    const overview = page.getByTestId("project-overview");
    const overviewOpen = await overview.evaluate((element) => (element as HTMLDetailsElement).open);
    if (!overviewOpen) await page.getByTestId("project-overview-summary").click();
    await page.getByTestId("changelog-trigger").click();
    await expect(page.getByTestId("changelog-body")).toBeVisible();
  };

  await page.setViewportSize({ width: standardViewport.width, height: standardViewport.height });
  await openStudio(page, "Mock Core");
  await page.getByTestId("locale-en").click();
  await openChangelog();
  await capture(page, standardViewport, "changelog-current-en.png", false);
  await page.locator('[data-release-version="v1.0-rc10"] summary').click();
  await capture(page, standardViewport, "changelog-multiple-releases.png", false);
  await page.locator(".changelog-section-known-issues").first().scrollIntoViewIfNeeded();
  await capture(page, standardViewport, "changelog-known-issues.png", false);
  await capture(page, standardViewport, "changelog-long-technical-text.png", false);
  await page.locator('[data-release-version="v1.0-rc10"] summary').focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await capture(page, standardViewport, "changelog-keyboard-focus.png", false);
  await page.keyboard.press("Escape");

  await page.getByTestId("locale-ja").click();
  await openChangelog();
  await capture(page, standardViewport, "changelog-current-ja.png", false);
  await page.keyboard.press("Escape");
  await page.getByTestId("locale-zh-CN").click();
  await openChangelog();
  await capture(page, standardViewport, "changelog-current-zh-cn.png", false);
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: compactViewport.width, height: compactViewport.height });
  await page.getByTestId("locale-en").click();
  await openChangelog();
  await capture(page, compactViewport, "changelog-1280.png", false);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
}

async function captureCppDoubleStorageStates(page: Page, viewport: Viewport) {
  if (!viewport.primary) return;
  const standardViewport: Viewport = { name: "1440x900", width: 1440, height: 900, primary: true };
  const compactViewport: Viewport = { name: "1280x720", width: 1280, height: 720 };
  const minimumViewport: Viewport = { name: "1180x700", width: 1180, height: 700 };

  await page.setViewportSize({ width: standardViewport.width, height: standardViewport.height });
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-double-storage");
  await capture(page, standardViewport, "cpp-double-storage-source.png", false);
  await assemble(page);
  await openOutputTab(page, "Generated CASL");
  await capture(page, standardViewport, "cpp-double-storage-generated-casl.png", false);

  await openOutputTab(page, "Memory");
  await page.getByTestId("memory-object-select").selectOption({ label: "x" });
  await capture(page, standardViewport, "cpp-double-storage-memory-before.png", false);
  await step(page);
  await step(page);
  await expect(page.getByTestId("double-value-inspector")).toContainText("400C000000000000");
  await capture(page, standardViewport, "cpp-double-storage-memory-word-copy.png", false);

  await run(page);
  await page.getByTestId("memory-object-select").selectOption({ label: "y" });
  await expect(page.getByTestId("double-value-inspector")).toContainText("400C000000000000");
  await capture(page, standardViewport, "cpp-double-storage-memory-after.png", false);
  await capture(page, standardViewport, "cpp-double-inspector-en.png", false);
  await page.getByTestId("double-value-inspector").locator("details").evaluate((element) => {
    (element as HTMLDetailsElement).open = true;
  });
  await capture(page, standardViewport, "cpp-double-storage-inspector-details.png", false);

  await page.getByTestId("locale-ja").click();
  await capture(page, standardViewport, "cpp-double-inspector-ja.png", false);
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, standardViewport, "cpp-double-inspector-zh-cn.png", false);
  await page.getByTestId("locale-en").click();

  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-double-operation").filter({ hasText: "y = x" }).first()).toBeVisible();
  await capture(page, standardViewport, "cpp-double-trace.png", false);
  await openOutputTab(page, "Machine Code");
  await capture(page, standardViewport, "cpp-double-code-machine.png", false);

  await page.setViewportSize({ width: compactViewport.width, height: compactViewport.height });
  await openOutputTab(page, "Memory");
  await page.getByTestId("memory-object-select").selectOption({ label: "y" });
  await capture(page, compactViewport, "cpp-double-1280.png", false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: standardViewport.width, height: standardViewport.height });
  await setSource(page, "int main() { double x = 1.0; x = x + x; return 0; }");
  await page.getByTestId("assemble-button").click();
  await expect(page.locator('[data-diagnostic-code="semantic.unsupportedDoubleArithmetic"]')).toBeVisible();
  await capture(page, standardViewport, "cpp-double-unsupported-diagnostic.png", false);
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
}

async function captureCaslCompatibilityStates(page: Page, viewport: Viewport) {
  if (!viewport.primary) return;
  const standardViewport: Viewport = { name: "1440x900", width: 1440, height: 900, primary: true };
  const compactViewport: Viewport = { name: "1280x720", width: 1280, height: 720 };
  const macroIoSource = `MAIN START
     LAD GR3,#FFFF
     RPUSH
     RPOP
     IN BUF,LEN
     OUT BUF,LEN
     RET
BUF DS 256
LEN DS 1
     END`;

  await page.setViewportSize({ width: standardViewport.width, height: standardViewport.height });
  await openStudio(page, "Mock Core");
  await setSource(page, macroIoSource);
  await assemble(page);
  await page.getByTestId("casl-mode-toggle").click();
  await page.getByTestId("observation-mode-register-stack").click();
  await page.getByTestId("casl-numeric-hex").click();
  await capture(page, standardViewport, "casl-mode-hex.png", false);
  await step(page);

  await page.getByTestId("casl-numeric-signed").click();
  await capture(page, standardViewport, "casl-mode-signed-decimal.png", false);
  await page.getByTestId("casl-numeric-unsigned").click();
  await capture(page, standardViewport, "casl-mode-unsigned-decimal.png", false);
  await page.getByTestId("casl-numeric-binary").click();
  await capture(page, standardViewport, "casl-mode-binary.png", false);

  await step(page);
  await page.getByTestId("auxiliary-observation-stack").click();
  await capture(page, standardViewport, "casl-mode-stack.png", false);
  await capture(page, standardViewport, "casl-mode-rpush-rpop.png", false);
  await page.getByTestId("auxiliary-observation-console").click();
  await run(page);
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "WaitingInput");
  await capture(page, standardViewport, "casl-mode-input-waiting.png", false);
  await page.getByTestId("casl-console-input").fill("CASL");
  await page.getByTestId("casl-console-submit").click();
  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await capture(page, standardViewport, "casl-mode-output.png", false);
  await page.getByTestId("observation-mode-code-machine").click();
  const assemblerOutput = page.getByTestId("casl-assembler-output");
  await assemblerOutput.scrollIntoViewIfNeeded();
  await assemblerOutput.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await capture(page, standardViewport, "assembler-output-symbol-table.png", false);

  await page.getByTestId("modern-mode-toggle").click();
  await setSource(page, `MAIN START
     LAD GR2,1
     LD GR1,DATA,GR2
     RET
DATA DC 10,20
     END`);
  await assemble(page);
  await page.getByTestId("casl-mode-toggle").click();
  await step(page);
  await step(page);
  await capture(page, standardViewport, "casl-mode-index-addressing.png", false);

  await page.setViewportSize({ width: compactViewport.width, height: compactViewport.height });
  await page.getByTestId("locale-ja").click();
  await capture(page, compactViewport, "casl-mode-ja-1280.png", false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, compactViewport, "casl-mode-zh-cn-1280.png", false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByTestId("locale-en").click();
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
}

async function captureDebuggerEditingStates(page: Page, viewport: Viewport) {
  if (!viewport.primary) return;
  const standardViewport: Viewport = { name: "1440x900", width: 1440, height: 900, primary: true };
  const compactViewport: Viewport = { name: "1280x720", width: 1280, height: 720 };
  const minimumViewport: Viewport = { name: "1180x700", width: 1180, height: 700 };
  const source = `MAIN START
     LAD GR2,#0003
     ST GR2,DATA
     RET
DATA DS 1
     END`;

  await page.setViewportSize({ width: standardViewport.width, height: standardViewport.height });
  await openStudio(page, "Mock Core");
  await setSource(page, source);
  await assemble(page);
  await page.getByTestId("casl-mode-toggle").click();
  await page.getByTestId("observation-mode-register-stack").click();

  await page.getByTestId("casl-register-gr2").getByRole("button").click();
  await capture(page, standardViewport, "casl-edit-register-hex.png", false);
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await page.getByTestId("casl-numeric-signed").click();
  await page.getByTestId("casl-register-gr2").getByRole("button").click();
  await capture(page, standardViewport, "casl-edit-register-signed.png", false);
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await page.getByTestId("casl-numeric-hex").click();

  await page.getByTestId("observation-mode-cpu-flow").click();
  await page.getByTestId("casl-memory-row-0025").click();
  await page.getByRole("button", { name: "Edit memory word" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("FFFF");
  await page.getByRole("dialog").getByRole("button", { name: "Apply" }).click();
  await capture(page, standardViewport, "casl-edit-memory-data.png", false);

  await page.getByTestId("casl-memory-row-0020").click();
  await page.getByRole("button", { name: "Edit memory word" }).click();
  const programDialog = page.getByRole("dialog");
  await programDialog.getByRole("textbox").fill("0000");
  await capture(page, standardViewport, "casl-edit-memory-program-warning.png", false);
  await programDialog.locator('.debugger-program-warning input[type="checkbox"]').check();
  await programDialog.getByRole("button", { name: "Apply" }).click();
  await capture(page, standardViewport, "casl-runtime-override.png", false);

  await page.getByTestId("observation-mode-register-stack").click();
  await page.getByRole("button", { name: /Edit register PR/ }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("1234");
  await page.getByRole("dialog").getByRole("button", { name: "Apply" }).click();
  await capture(page, standardViewport, "casl-edit-pr-unmapped.png", false);

  await page.getByRole("button", { name: /Edit register SP/ }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("FFFC");
  await page.getByRole("dialog").getByRole("button", { name: "Apply" }).click();
  await capture(page, standardViewport, "casl-edit-sp-stack.png", false);

  await capture(page, standardViewport, "casl-fr-display.png", false);
  await page.getByTestId("casl-register-fr-edit").click();
  await page.getByRole("dialog").getByRole("checkbox", { name: "OF" }).check();
  await page.getByRole("dialog").getByRole("checkbox", { name: "ZF" }).check();
  await capture(page, standardViewport, "casl-fr-edit-en.png", false);
  await page.getByRole("dialog").locator(".file-dialog-actions button").first().click();
  await page.getByTestId("locale-ja").click();
  await page.getByTestId("casl-register-fr-edit").click();
  await capture(page, standardViewport, "casl-fr-edit-ja.png", false);
  await page.getByRole("dialog").locator(".file-dialog-actions button").first().click();
  await page.getByTestId("locale-zh-CN").click();
  await page.getByTestId("casl-register-fr-edit").click();
  await capture(page, standardViewport, "casl-fr-edit-zh-cn.png", false);
  await page.getByRole("dialog").locator(".file-dialog-actions button").first().click();
  await page.getByTestId("locale-en").click();
  await page.setViewportSize({ width: minimumViewport.width, height: minimumViewport.height });
  await page.getByTestId("casl-register-fr-edit").click();
  await capture(page, minimumViewport, "casl-fr-edit-1180.png", false);
  await page.getByRole("dialog").locator(".file-dialog-actions button").first().click();
  await page.setViewportSize({ width: compactViewport.width, height: compactViewport.height });
  await page.getByTestId("casl-register-fr-edit").click();
  await capture(page, compactViewport, "casl-fr-edit-1280.png", false);
  await page.getByRole("dialog").locator(".file-dialog-actions button").first().click();
  await page.setViewportSize({ width: standardViewport.width, height: standardViewport.height });

  await page.getByRole("button", { name: "Full Clear" }).click();
  await capture(page, standardViewport, "casl-full-clear-dialog-en.png", false);
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await page.getByTestId("locale-ja").click();
  await page.getByRole("button", { name: "完全クリア" }).click();
  await capture(page, standardViewport, "casl-full-clear-dialog-ja.png", false);
  await page.getByRole("dialog").getByRole("button", { name: "キャンセル" }).click();
  await page.getByTestId("locale-zh-CN").click();
  await page.getByRole("button", { name: "完全清除" }).click();
  await capture(page, standardViewport, "casl-full-clear-dialog-zh-cn.png", false);
  await page.getByRole("dialog").getByRole("button", { name: "完全清除" }).click();
  await capture(page, standardViewport, "casl-full-clear-result.png", false);

  await openStudio(page, "Mock Core");
  await page.getByTestId("locale-en").click();
  await setSource(page, `MAIN START
     LAD GR1,#8000
     SLL GR1,1
     RET
     END`);
  await assemble(page);
  await page.getByTestId("casl-mode-toggle").click();
  await page.getByTestId("observation-mode-register-stack").click();
  await step(page);
  await step(page);
  await capture(page, standardViewport, "casl-shift-of.png", false);

  await page.setViewportSize({ width: minimumViewport.width, height: minimumViewport.height });
  await capture(page, minimumViewport, "casl-editing-1180.png", false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.setViewportSize({ width: compactViewport.width, height: compactViewport.height });
  await capture(page, compactViewport, "casl-editing-1280.png", false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
}

async function captureCometMicrocycleStates(page: Page, viewport: Viewport) {
  if (!viewport.primary) return;
  const standardViewport: Viewport = { name: "1440x900", width: 1440, height: 900, primary: true };
  const compactViewport: Viewport = { name: "1280x720", width: 1280, height: 720 };
  const minimumViewport: Viewport = { name: "1180x700", width: 1180, height: 700 };

  async function prepare(source: string, targetViewport = standardViewport) {
    await page.setViewportSize({ width: targetViewport.width, height: targetViewport.height });
    await openStudio(page, "Mock Core");
    await page.getByTestId("locale-en").click();
    await setSource(page, source);
    await assemble(page);
    await page.getByTestId("comet-mode-toggle").click();
    await expect(page.getByTestId("comet-mode-workspace")).toHaveAttribute("data-execution-granularity", "microcycle");
  }

  await prepare(`MAIN START
     LD GR1,DATA
     RET
DATA DC #8000
     END`);
  await step(page);
  await capture(page, standardViewport, "comet-fetch.png");
  await page.getByTestId("reverse-microstep-button").click();
  await capture(page, standardViewport, "comet-reverse-fetch.png");
  await step(page);
  await step(page);
  await capture(page, standardViewport, "comet-decode.png");
  await page.getByTestId("reverse-microstep-button").click();
  await capture(page, standardViewport, "comet-reverse-decode.png");
  await step(page);
  await step(page);
  await capture(page, standardViewport, "comet-effective-address.png");
  await step(page);
  await capture(page, standardViewport, "comet-memory-read.png");
  await capture(page, standardViewport, "comet-memory.png");
  await step(page);
  await step(page);
  await capture(page, standardViewport, "comet-write-back.png");
  await page.getByTestId("reverse-microstep-button").click();
  await capture(page, standardViewport, "comet-reverse-writeback.png");
  await capture(page, standardViewport, "comet-reverse-restored-circuit.png");
  await step(page);
  await step(page);
  await step(page);
  await capture(page, standardViewport, "comet-instruction-complete.png");

  await prepare(`MAIN START
     CALL SUB
     RET
SUB  RET
     END`);
  for (let index = 0; index < 5; index += 1) await step(page);
  await capture(page, standardViewport, "comet-call.png");
  await page.getByTestId("reverse-microstep-button").click();
  await capture(page, standardViewport, "comet-reverse-call-stack.png");
  await step(page);
  await step(page);
  for (let index = 0; index < 5; index += 1) await step(page);
  await capture(page, standardViewport, "comet-ret.png");

  await prepare(`MAIN START
     LAD GR1,#8001
     SLL GR1,1
     RET
     END`);
  await page.getByTestId("modern-mode-toggle").click();
  await step(page);
  await page.getByTestId("comet-mode-toggle").click();
  for (let index = 0; index < 6; index += 1) await step(page);
  await capture(page, standardViewport, "comet-shift.png");
  await step(page);
  await page.getByTestId("reverse-microstep-button").click();
  await capture(page, standardViewport, "comet-reverse-shift-flags.png");

  await prepare(`MAIN START
     JUMP TARGET
     NOP
TARGET RET
     END`);
  for (let index = 0; index < 4; index += 1) await step(page);
  await capture(page, standardViewport, "comet-branch.png");
  await page.getByTestId("reverse-microstep-button").click();
  await capture(page, standardViewport, "comet-reverse-branch.png");

  await prepare(`MAIN START
     LAD GR1,#0042
     ST GR1,DATA
     RET
DATA DS 1
     END`);
  for (let index = 0; index < 6; index += 1) await step(page);
  for (let index = 0; index < 5; index += 1) await step(page);
  await page.getByTestId("reverse-microstep-button").click();
  await capture(page, standardViewport, "comet-reverse-memory-write.png");
  await page.getByTestId("reset-button").click();
  await capture(page, standardViewport, "comet-reverse-barrier.png");

  await prepare(`MAIN START
     LD GR1,DATA
     RET
DATA DC 1
     END`, compactViewport);
  await step(page);
  await capture(page, compactViewport, "comet-1280-en.png");
  await page.getByTestId("locale-ja").click();
  await capture(page, compactViewport, "comet-1280-ja.png");
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, compactViewport, "comet-1280-zh-cn.png");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await capture(page, compactViewport, "comet-reverse-1280.png");

  await page.setViewportSize({ width: minimumViewport.width, height: minimumViewport.height });
  await page.getByTestId("locale-ja").click();
  await capture(page, minimumViewport, "comet-reverse-ja-1180.png");
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, minimumViewport, "comet-reverse-zh-cn-1180.png");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: standardViewport.width, height: standardViewport.height });
  await capture(page, standardViewport, "comet-1440.png");

  await page.setViewportSize({ width: standardViewport.width, height: standardViewport.height });
  await openStudio(page, "Mock Core");
  await page.getByTestId("locale-en").click();
  await setSource(page, `MAIN START
     LD GR1,DATA
     ST GR1,TARGET
     RET
DATA DC #0042
TARGET DS 1
     END`);
  await assemble(page);
  await page.getByTestId("casl-mode-toggle").click();
  await page.getByTestId("observation-mode-cpu-flow").click();
  await step(page);
  await capture(page, standardViewport, "reverse-instruction-casl-mode.png", false);

  await page.getByTestId("comet-mode-toggle").click();
  await page.getByTestId("reverse-instruction-button").click();
  for (let index = 0; index < 3; index += 1) await step(page);
  await capture(page, standardViewport, "reverse-instruction-mid-instruction.png");
  await page.getByTestId("reverse-instruction-button").click();
  await capture(page, standardViewport, "reverse-instruction-comet-mode.png");

  for (let index = 0; index < 8; index += 1) await step(page);
  await capture(page, standardViewport, "reverse-instruction-after-complete.png");
  await page.getByTestId("reverse-instruction-button").click();
  for (let index = 0; index < 8; index += 1) await step(page);
  for (let index = 0; index < 6; index += 1) await step(page);
  await page.getByTestId("reverse-instruction-button").click();
  await capture(page, standardViewport, "reverse-instruction-memory.png");

  await prepare(`MAIN START
     JUMP TARGET
     NOP
TARGET RET
     END`);
  for (let index = 0; index < 5; index += 1) await step(page);
  await page.getByTestId("reverse-instruction-button").click();
  await capture(page, standardViewport, "reverse-instruction-branch.png");

  await prepare(`MAIN START
     CALL SUB
     RET
SUB  RET
     END`);
  for (let index = 0; index < 7; index += 1) await step(page);
  await page.getByTestId("reverse-instruction-button").click();
  await capture(page, standardViewport, "reverse-instruction-call-ret.png");

  await prepare(`MAIN START
     RPUSH
     RPOP
     RET
     END`);
  for (let index = 0; index < 6; index += 1) await step(page);
  await page.getByTestId("reverse-instruction-button").click();
  await capture(page, standardViewport, "reverse-instruction-macro-expanded.png");

  await prepare(`MAIN START
     LD GR1,DATA
     RET
DATA DC 1
     END`);
  await step(page);
  await page.getByTestId("reset-button").click();
  await capture(page, standardViewport, "reverse-instruction-barrier.png");

  await prepare(`MAIN START
     SVC 2
     RET
     END`);
  for (let index = 0; index < 4; index += 1) await step(page);
  await capture(page, standardViewport, "reverse-instruction-svc-blocked.png");

  await prepare(`MAIN START
     JUMP MAIN
     END`);
  await run(page);
  await capture(page, standardViewport, "reverse-instruction-capacity-floor.png");

  await prepare(`MAIN START
     LD GR1,DATA
     RET
DATA DC 1
     END`, minimumViewport);
  await step(page);
  await page.getByTestId("locale-ja").click();
  await capture(page, minimumViewport, "reverse-instruction-ja-1180.png");
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, minimumViewport, "reverse-instruction-zh-cn-1180.png");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: compactViewport.width, height: compactViewport.height });
  await page.getByTestId("locale-en").click();
  await capture(page, compactViewport, "reverse-instruction-1280.png");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
}

async function captureUnifiedObservationWorkspace(page: Page, viewport: Viewport) {
  if (!viewport.primary) return;

  const wideViewport: Viewport = { name: "1920x1080", width: 1920, height: 1080 };
  const standardViewport: Viewport = { name: "1440x900", width: 1440, height: 900, primary: true };
  const compactViewport: Viewport = { name: "1280x720", width: 1280, height: 720 };
  const minimumViewport: Viewport = { name: "1180x700", width: 1180, height: 700 };
  const source = `MAIN START
     LD GR2,DATA
     ST GR2,TARGET
     RET
DATA DC #0061
TARGET DS 1
     END`;

  async function prepare(targetViewport: Viewport, comet = false) {
    await page.setViewportSize({ width: targetViewport.width, height: targetViewport.height });
    await openStudio(page, "Mock Core");
    await page.getByTestId("locale-en").click();
    await setSource(page, source);
    await assemble(page);
    await enterCircuitFocusMode(page);
    if (comet) {
      await page.getByTestId("comet-mode-toggle").click();
      await expect(page.getByTestId("comet-mode-workspace")).toBeVisible();
    }
  }

  await prepare(wideViewport);
  await page.getByTestId("observation-mode-register-stack").click();
  await capture(page, wideViewport, "unified-workspace-registers-1920.png", false);

  await prepare(standardViewport);
  await page.getByTestId("observation-mode-cpu-flow").click();
  await capture(page, standardViewport, "unified-workspace-memory-1440.png", false);

  await prepare(compactViewport);
  await page.getByTestId("auxiliary-observation-stack").click();
  await capture(page, compactViewport, "unified-workspace-stack-1280.png", false);
  await page.getByTestId("observation-mode-code-machine").click();
  await capture(page, compactViewport, "unified-workspace-code-machine-1280.png", false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await prepare(minimumViewport);
  await page.getByTestId("auxiliary-observation-trace").click();
  await capture(page, minimumViewport, "unified-workspace-trace-1180.png", false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await prepare(standardViewport, true);
  await page.getByTestId("observation-mode-code-machine").click();
  await step(page);
  await capture(page, standardViewport, "unified-workspace-comet-fetch.png", false);
  await page.getByTestId("reverse-microstep-button").click();
  await capture(page, standardViewport, "unified-workspace-reverse-microstep.png", false);
  for (let index = 0; index < 5; index += 1) await step(page);
  await page.getByTestId("observation-mode-cpu-flow").click();
  await capture(page, standardViewport, "unified-workspace-comet-memory-read.png", false);
  for (let index = 0; index < 2; index += 1) await step(page);
  await page.getByTestId("observation-mode-register-stack").click();
  await capture(page, standardViewport, "unified-workspace-comet-writeback.png", false);
  await page.getByTestId("reverse-instruction-button").click();
  await capture(page, standardViewport, "unified-workspace-reverse-instruction.png", false);

  await page.getByTestId("workspace-layout-circuit-focus").click();
  await capture(page, standardViewport, "unified-workspace-focus-circuit.png", false);
  await page.getByTestId("workspace-layout-data-focus").click();
  await capture(page, standardViewport, "unified-workspace-focus-data.png", false);
  await page.getByTestId("workspace-layout-show-both").click();

  await page.setViewportSize({ width: minimumViewport.width, height: minimumViewport.height });
  await page.getByTestId("locale-ja").click();
  await capture(page, minimumViewport, "unified-workspace-ja-1180.png", false);
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, minimumViewport, "unified-workspace-zh-cn-1180.png", false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
}

async function captureMultiProgramLinker(page: Page, viewport: Viewport) {
  if (!viewport.primary) return;

  const mainSource = `MAIN START
     CALL SUB
     RET
     END`;
  const subSource = `SUB START
     LAD GR1,#0042
     RET
     END`;
  const projectPanel = page.getByTestId("project-modules-panel");

  const assembleActiveModule = async (source: string) => {
    await setSource(page, source);
    await page.getByTestId("project-assemble-current").click();
    const activeModule = page.locator('[data-testid="project-module-select"][aria-pressed="true"]');
    await expect(activeModule).toHaveAttribute("data-assembly-status", "ready");
  };
  const selectModule = async (index: number) => {
    const moduleSelectors = page.getByTestId("project-module-select");
    await expect(moduleSelectors).toHaveCount(2);
    await moduleSelectors.nth(index).click();
  };

  await page.setViewportSize({ width: 1920, height: 1080 });
  await openStudio(page, "Mock Core");
  await page.getByTestId("locale-en").click();
  await page.getByTestId("project-new-module").click();
  await assembleActiveModule(subSource);
  await selectModule(0);
  await assembleActiveModule(mainSource);
  await page.getByTestId("project-link").click();
  await expect(projectPanel).toHaveAttribute("data-link-state", "linked");
  await capture(page, { name: "1920x1080", width: 1920, height: 1080, primary: true }, "linker-project-modules-1920.png", false);

  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, { name: "1440x900", width: 1440, height: 900, primary: true }, "linker-main-submodule-1440.png", false);
  await page.getByTestId("casl-mode-toggle").click();
  await page.getByTestId("auxiliary-observation-source-mapping").click();
  await step(page);
  await expect(page.getByTestId("casl-source-module")).toHaveText("Module2.cas");
  await capture(page, { name: "1440x900", width: 1440, height: 900, primary: true }, "linker-cross-module-call.png", false);
  await capture(page, { name: "1440x900", width: 1440, height: 900, primary: true }, "linker-source-mapping-callee.png", false);
  await run(page);
  await capture(page, { name: "1440x900", width: 1440, height: 900, primary: true }, "linker-cross-module-ret.png", false);
  await capture(page, { name: "1440x900", width: 1440, height: 900, primary: true }, "linker-unified-circuit.png", false);

  await page.getByTestId("modern-mode-toggle").click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await capture(page, { name: "1280x720", width: 1280, height: 720, primary: true }, "linker-placement-table-1280.png", false);
  await capture(page, { name: "1280x720", width: 1280, height: 720, primary: true }, "linker-relocation-table-1280.png", false);

  await selectModule(0);
  await setSource(page, `${mainSource}\n; source edit makes the linked image stale`);
  await expect(projectPanel).toHaveAttribute("data-link-state", "stale");
  await capture(page, { name: "1280x720", width: 1280, height: 720, primary: true }, "linker-link-stale.png", false);

  await assembleActiveModule(`MAIN START
     CALL MISSING
     RET
     END`);
  await page.getByTestId("project-link").click();
  await expect(projectPanel).toHaveAttribute("data-link-state", "error");
  await capture(page, { name: "1280x720", width: 1280, height: 720, primary: true }, "linker-unresolved-symbol.png", false);

  await selectModule(1);
  await assembleActiveModule(`MAIN START
     RET
     END`);
  await selectModule(0);
  await assembleActiveModule(`MAIN START
     RET
     END`);
  await page.getByTestId("project-link").click();
  await expect(projectPanel).toHaveAttribute("data-link-state", "error");
  await capture(page, { name: "1280x720", width: 1280, height: 720, primary: true }, "linker-duplicate-export.png", false);

  await selectModule(1);
  await assembleActiveModule(`SUB START
PAD  DS 40000
     END`);
  await selectModule(0);
  await assembleActiveModule(`MAIN START
PAD  DS 40000
     END`);
  await page.getByTestId("project-link").click();
  await expect(projectPanel).toHaveAttribute("data-link-state", "error");
  await capture(page, { name: "1280x720", width: 1280, height: 720, primary: true }, "linker-memory-overflow.png", false);

  await page.setViewportSize({ width: 1180, height: 700 });
  await page.getByTestId("locale-ja").click();
  await capture(page, { name: "1180x700", width: 1180, height: 700, primary: true }, "linker-ja-1180.png", false);
  await page.getByTestId("locale-zh-CN").click();
  await capture(page, { name: "1180x700", width: 1180, height: 700, primary: true }, "linker-zh-cn-1180.png", false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
}

test.describe("visual review screenshot gallery", () => {
  for (const viewport of viewports) {
    test(`captures visual review gallery at ${viewport.name}`, async ({ page }) => {
      test.setTimeout(720_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript(() => {
        const startupSeed = sessionStorage.getItem("visual-startup-seed-active") === "true";
        const lessonSeed = sessionStorage.getItem("visual-lesson-progress-seed-active") === "true";
        const persistenceSeed = sessionStorage.getItem("visual-persistence-seed-active") === "true";
        if (!startupSeed && !lessonSeed && !persistenceSeed) {
          localStorage.removeItem("stugx.casl.preferences.v1");
          localStorage.removeItem("stugx.casl.startup-selection.v1");
        }
        if (!lessonSeed && !persistenceSeed) localStorage.removeItem("stugx.casl.lesson-progress.v1");
      });

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
      await captureStartupSelectionStates(page, viewport);
      await captureLessonProgressStates(page, viewport);
      await capturePersistenceQualityGateStates(page, viewport);
      await capturePhase18A1DesktopPolish(page, viewport);
      await captureChangelogStates(page, viewport);
      await captureCppDoubleStorageStates(page, viewport);
      await captureCaslCompatibilityStates(page, viewport);
      await captureDebuggerEditingStates(page, viewport);
      await captureCometMicrocycleStates(page, viewport);
      await captureUnifiedObservationWorkspace(page, viewport);
      await captureMultiProgramLinker(page, viewport);
    });
  }
});
