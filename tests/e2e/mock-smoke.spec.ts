import { test, expect, type Page } from "@playwright/test";
import { assemble, expectCurrentSourceInstruction, expectRegister, openStudio, run, selectDemoProgram, setSource, step } from "./caslSmokeHelpers";

async function switchObservationMode(page: Page, mode: "cpu-flow" | "register-stack" | "code-machine") {
  await page.getByTestId(`observation-mode-${mode}`).click();
}

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
  await page.getByTestId("guided-lesson-summary").click();
  await expect(page.getByTestId("study-mode-progress")).toContainText("0 /");
  await page.getByTestId("study-mode-step-checkbox").first().check();
  await expect(page.getByTestId("study-mode-progress")).toContainText("1 /");

  await selectDemoProgram(page, "cpp-break-continue");
  await expect(page.getByTestId("guided-lesson")).toContainText("FOR_CONTINUE");
  await expect(page.getByTestId("guided-lesson")).toContainText("FOR_END");
  await expect(page.getByTestId("study-mode-progress")).toContainText("0 /");
  await page.getByTestId("study-mode-step-checkbox").first().check();
  await expect(page.getByTestId("study-mode-progress")).toContainText("1 /");
  await page.getByTestId("study-mode-reset").click();
  await expect(page.getByTestId("study-mode-progress")).toContainText("0 /");

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

test("Mock backend runs CASL logic operations and shows machine code", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-logic-operations");

  await assemble(page);
  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("AND GR1,MASK");
  await expect(page.getByTestId("machine-code-output")).toContainText("OR GR1,B");
  await expect(page.getByTestId("machine-code-output")).toContainText("XOR GR1,C");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr1", "0002");
  await page.getByRole("tab", { name: "Memory" }).click();
  await expect(page.getByTestId("memory-view-row-002F")).toContainText("RESULT");
  await expect(page.getByTestId("memory-view-row-002F")).toContainText("0002");
});

test("Mock backend runs CASL shift operations and shows shifter path", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-shift-operations");
  await page.getByTestId("circuit-focus-toggle").click();

  await assemble(page);
  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("SLL GR1,1");
  await expect(page.getByTestId("machine-code-output")).toContainText("SRL GR1,1");
  await expect(page.getByTestId("machine-code-output")).toContainText("SLA GR1,1");
  await expect(page.getByTestId("machine-code-output")).toContainText("SRA GR1,1");

  const circuit = page.getByTestId("comet-circuit-svg");
  await step(page);
  await step(page);

  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("SLL");
  await expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='alu-shift-badge']")).toContainText("SLL");
  await expect(circuit.locator("[data-testid='wire-shift-count-to-alu']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-shift-count-to-alu']")).toHaveAttribute("data-lane", "data-compute");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveCount(0);
  await expect(circuit.locator("[data-testid='module-memory']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='module-mdr']")).toHaveAttribute("data-active", "false");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr1")).toContainText("0006");
});

test("Mock backend runs CASL index addressing and explains effective address", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-index-addressing");
  await page.getByTestId("circuit-focus-toggle").click();

  await assemble(page);
  await step(page);
  await step(page);

  const circuit = page.getByTestId("comet-circuit-svg");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("LD");
  await expect(circuit.locator("[data-testid='register-gr2']")).toHaveAttribute("data-index", "true");
  await expect(circuit.locator("[data-testid='effective-address-unit']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='effective-address-unit']")).toContainText("Address Unit");
  await expect(circuit.locator("[data-testid='effective-address-base-row']")).toContainText("0027");
  await expect(circuit.locator("[data-testid='effective-address-index-row']")).toContainText("GR2=0001");
  await expect(circuit.locator("[data-testid='effective-address-ea-row']")).toContainText("0028");
  await expect(circuit.locator("[data-testid='memory-row-0028']")).toHaveAttribute("data-read", "true");
  await expect(circuit.locator("[data-testid='wire-base-to-eau']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-index-to-eau']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-eau-to-mar']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("Base");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("EA");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr1")).toContainText("0014");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await page.getByTestId("machine-code-row-0022").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("x = GR2");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("0001");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("0028");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await switchObservationMode(page, "register-stack");
  await expect(page.locator("[data-testid='focus-memory-window-row'][data-address='0029']")).toContainText("RESULT");
  await expect(page.locator("[data-testid='focus-memory-window-row'][data-address='0029']")).toContainText("0014");
});

test("Mock backend runs CASL PUSH POP stack demo and shows stack path", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-push-pop-stack");
  await page.getByTestId("circuit-focus-toggle").click();

  await assemble(page);
  await step(page);
  await step(page);

  const circuit = page.getByTestId("comet-circuit-svg");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("PUSH");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-sp-to-mar-preview']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-FFFD']")).toHaveAttribute("data-write", "true");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-stack-preview").locator("[data-testid='stack-preview-row'][data-address='FFFD']")).toHaveAttribute("data-write", "true");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("SP");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("Stack");

  await switchObservationMode(page, "cpu-flow");
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("POP");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-FFFD']")).toHaveAttribute("data-read", "true");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr1")).toContainText("0029");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await switchObservationMode(page, "register-stack");
  await expect(page.locator("[data-testid='focus-memory-window-row'][data-address='002A']")).toContainText("RESULT");
  await expect(page.locator("[data-testid='focus-memory-window-row'][data-address='002A']")).toContainText("0029");
});

test("Mock backend runs CASL CALL RETURN demo and shows stack-aware RET", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-call-return");
  await page.getByTestId("circuit-focus-toggle").click();

  await assemble(page);
  await step(page);
  await step(page);

  const circuit = page.getByTestId("comet-circuit-svg");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("CALL");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='module-pr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-return-address-to-mdr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-eau-to-pr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-FFFD']")).toHaveAttribute("data-write", "true");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("Return");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("Depth");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-call-stack")).toBeVisible();
  await expect(page.getByTestId("call-stack-depth")).toHaveText("1");
  await expect(page.getByTestId("call-stack-return-address")).toHaveText("0024");
  await expect(page.getByTestId("call-stack-routine")).toHaveText("SUB");
  await expect(page.getByTestId("call-stack-ret-mode")).toHaveText("Stack return");
  await expect(page.getByTestId("focus-call-stack")).toContainText("Call target SUB; return 0024");

  await switchObservationMode(page, "cpu-flow");
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ADDA");
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("RET");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-pr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-FFFD']")).toHaveAttribute("data-read", "true");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ST GR1,RESULT");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("call-stack-depth")).toHaveText("0");
  await expect(page.getByTestId("call-stack-return-address")).toHaveText("0024");
  await expect(page.getByTestId("call-stack-ret-mode")).toHaveText("Stack return");
  await expect(page.getByTestId("focus-call-stack")).toContainText("Return to 0024 from MEM[FFFD]");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expect(page.getByTestId("call-stack-depth")).toHaveText("0");
  await expect(page.getByTestId("call-stack-ret-mode")).toHaveText("Top-level finish");
  await switchObservationMode(page, "cpu-flow");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await switchObservationMode(page, "register-stack");
  await page.getByTestId("circuit-focus-toggle").click();
  await page.getByRole("tab", { name: "Memory" }).click();
  await expect(page.getByTestId("memory-view-row-002B")).toContainText("RESULT");
  await expect(page.getByTestId("memory-view-row-002B")).toContainText("0006");
});

test("Mock backend keeps circuit focus paths anchored to rows", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-gr2-addition");
  await assemble(page);

  const circuit = page.getByTestId("comet-circuit-svg");
  await step(page);
  await expect(circuit.locator("[data-testid='register-gr2']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-0027']")).toHaveAttribute("data-read", "true");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-from-anchor", "memory.0027.left");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-to-anchor", "mdr.right");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).not.toHaveAttribute("marker-end", /.+/);
  await expect(circuit.locator("[data-testid='wire-terminal-memory-to-mdr']")).toHaveAttribute("marker-end", /arrow-red/);
  await expect(circuit.locator("[data-testid='wire-terminal-memory-to-mdr']")).toHaveAttribute("data-to-anchor", "mdr.right");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).not.toHaveAttribute("marker-mid", /.+/);
  await expect(circuit.locator("[data-testid='wire-junction-memory-to-mdr-0']")).toBeVisible();
  await expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");

  await step(page);
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-alu']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-alu-to-fr']")).toHaveClass(/circuit-wire--flag-flow/);
  await expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "true");

  await step(page);
  await expect(circuit.locator("[data-testid='memory-row-0029']")).toHaveAttribute("data-write", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
});

test("Mock backend presents Circuit Focus Mode as a teaching layout", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-gr2-addition");
  await page.getByTestId("circuit-focus-toggle").click();

  await expect(page.getByTestId("circuit-focus-layout")).toBeVisible();
  await expect(page.getByTestId("focus-program-panel")).toBeVisible();
  await expect(page.getByTestId("focus-display-panel")).toContainText("No output");
  await expect(page.getByTestId("focus-current-instruction-panel")).toBeVisible();
  await expect(page.getByTestId("focus-circuit-panel")).toContainText("Circuit Focus Mode");
  await expect(page.getByTestId("observation-mode-selector")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window")).toBeVisible();
  await expect(page.getByTestId("focus-signal-probe")).toBeVisible();
  await expect(page.getByTestId("focus-trace-panel")).toBeVisible();
  await expect(page.getByTestId("focus-step-timeline")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Output" })).toBeVisible();

  await assemble(page);
  const circuit = page.getByTestId("comet-circuit-svg");

  await step(page);
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='wire-guide-sp-to-mar-preview']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='wire-guide-mar-to-stack-memory-preview']")).toHaveAttribute("data-active", "false");
  await expect(circuit).toContainText("DATA BUS");
  await expect(circuit).toContainText("ADDR BUS");
  await expect(circuit).toContainText("CTRL");
  await expect(page.getByTestId("focus-program-current-line")).toContainText(/LD\s+GR2,A/);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("LD");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Cur PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0020");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0022");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ADDA GR2,B");
  await expect(page.getByTestId("focus-current-instruction-panel")).not.toContainText(/^Ready$/);
  await expect(page.getByTestId("source-map-highlight")).toHaveAttribute("data-current-line", "2");
  await expect(page.getByTestId("focus-source-context-text")).toContainText(/LD\s+GR2,A/);
  await expect(page.getByTestId("focus-trace-latest")).toContainText(/LD/);
  await expect(circuit.locator("[data-testid='register-gr2']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-0027']")).toHaveAttribute("data-read", "true");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-lane", "data-bypass");
  await expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-avoids-alu", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='status-indicator-read']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='status-indicator-exec']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("GR2");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("MDR");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("stack preview only");

  await step(page);
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("focus-program-current-line")).toContainText(/ADDA\s+GR2,B/);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ADDA");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Cur PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0022");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0024");
  await expect(page.getByTestId("source-map-highlight")).toHaveAttribute("data-current-line", "3");
  await expect(page.getByTestId("focus-source-context-text")).toContainText(/ADDA\s+GR2,B/);
  await expect(page.getByTestId("focus-trace-latest")).toContainText(/ADDA/);
  await expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveAttribute("data-lane", "data-compute");
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveAttribute("data-to-anchor", "alu.inputA");
  await expect(circuit.locator("[data-testid='wire-mdr-to-alu']")).toHaveAttribute("data-to-anchor", "alu.inputB");
  await expect(circuit.locator("[data-testid='wire-alu-to-gr']")).toHaveAttribute("data-from-anchor", "alu.outputY");
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid='wire-alu-to-fr']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-alu-to-fr']")).toHaveClass(/circuit-wire--flag-flow/);
  await expect(circuit.locator("[data-testid='status-indicator-exec']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='status-indicator-flag']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("ALU.Y");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("0003");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("0007");

  await step(page);
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("focus-program-current-line")).toContainText(/ST\s+GR2,C/);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ST");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Cur PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0024");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0026");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("RET");
  await expect(page.getByTestId("source-map-highlight")).toHaveAttribute("data-current-line", "4");
  await expect(page.getByTestId("focus-source-context-text")).toContainText(/ST\s+GR2,C/);
  await expect(page.getByTestId("focus-trace-latest")).toContainText(/ST/);
  await expect(circuit.locator("[data-testid='memory-row-0029']")).toHaveAttribute("data-write", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveAttribute("data-to-anchor", "memory.0029.left");
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).not.toHaveAttribute("marker-end", /.+/);
  await expect(circuit.locator("[data-testid='wire-terminal-mdr-to-memory']")).toHaveAttribute("marker-end", /arrow-red/);
  await expect(circuit.locator("[data-testid='wire-terminal-mdr-to-memory']")).toHaveAttribute("data-to-anchor", "memory.0029.left");
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).not.toHaveAttribute("marker-mid", /.+/);
  await expect(circuit.locator("[data-testid='wire-gr-to-mdr']")).toHaveAttribute("data-lane", "data-bypass");
  await expect(circuit.locator("[data-testid='wire-gr-to-mdr']")).toHaveAttribute("data-avoids-alu", "true");
  await expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='module-fr']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='status-indicator-write']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='status-indicator-exec']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("MEM[0029]");
});

test("Mock backend switches observation modes without resetting VM state", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-gr2-addition");
  await page.getByTestId("circuit-focus-toggle").click();
  await assemble(page);
  await step(page);

  await switchObservationMode(page, "cpu-flow");
  await expect(page.getByTestId("focus-circuit-panel")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window-row")).toHaveCount(9);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("LD");

  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr0")).toBeVisible();
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr7")).toBeVisible();
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-pr")).toContainText("0022");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-sp")).toContainText("FFFE");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-fr")).toBeVisible();
  await expect(page.getByTestId("focus-stack-preview")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window-row")).toHaveCount(10);

  await switchObservationMode(page, "code-machine");
  await expect(page.getByTestId("focus-generated-casl-panel")).toBeVisible();
  await expect(page.getByTestId("focus-machine-code-panel")).toBeVisible();
  await expect(page.getByTestId("focus-trace-panel")).toContainText("LD");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("LD");
});

test("Mock backend shows Stack Frame View FramePlan preview in Register Stack mode", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  const sourceEditorMarker = page.locator('[data-testid="source-editor-frame-symbol-marker"][data-slot-id="add:argument:a:1"]').first();
  await expect(sourceEditorMarker).toBeVisible();
  await sourceEditorMarker.click();
  await expect(sourceEditorMarker).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("circuit-focus-toggle").click();
  await assemble(page);
  await switchObservationMode(page, "register-stack");

  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr0")).toBeVisible();
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr7")).toBeVisible();
  await expect(page.getByTestId("focus-stack-preview")).toBeVisible();
  await expect(page.getByTestId("focus-stack-frame-view")).toBeVisible();
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("Design preview");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("Not runtime state");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("Simple static locals");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("No live stack frame locals yet");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("GR0");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("GR1 / GR2 / GR3");
  await expect(page.getByTestId("stack-frame-function-select")).toContainText("main");
  await expect(page.getByTestId("stack-frame-function-select")).toContainText("add");
  await expect(page.getByTestId("focus-memory-window-row")).toHaveCount(10);

  await page.getByTestId("stack-frame-function-select").selectOption("add");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("FUNC_ADD_A");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("FUNC_ADD_B");
  await expect(page.getByTestId("focus-stack-frame-view")).not.toContainText("live value");

  await expect(page.getByTestId("stack-frame-view-details-summary")).toHaveAttribute("aria-expanded", "false");
  await page.getByTestId("stack-frame-view-details-summary").focus();
  await expect(page.getByTestId("stack-frame-view-details-summary")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("stack-frame-view-details-summary")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("StackFramePlan");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("FrameSlot");
  await expect(page.getByTestId("stack-frame-view-state")).toHaveAttribute("data-has-live-frame", "false");
  await expect(page.getByTestId("stack-frame-view-state")).toHaveAttribute("data-runtime-state", "false");
  await expect(page.locator('[data-slot-id="add:argument:a:1"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("Source Editor");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("GR1");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("FUNC_ADD_A");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("not runtime");

  const prBeforeSlotSelection = await page.getByTestId("focus-register-bank").getByTestId("register-pr").textContent();
  await page.getByTestId("stack-frame-view-state").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.locator('[data-slot-id="add:argument:a:1"]').click();
  await expect(page.locator('[data-slot-id="add:argument:a:1"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("a");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("argument");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("static label FUNC_ADD_A");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("GR1 -> FUNC_ADD_A");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("stack frame argument slot");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("Not available in simple mode");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("a");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("GR1");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("FUNC_ADD_A");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("frame arg");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("not runtime");
  await expect(page.getByTestId("signal-probe-frame-slot-row").first()).toHaveAttribute("data-active", "false");
  await page.locator('[data-slot-id="add:argument:b:2"]').focus();
  await expect(page.locator('[data-slot-id="add:argument:b:2"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-slot-id="add:argument:b:2"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("FUNC_ADD_B");
  await page.getByTestId("stack-frame-function-select").selectOption("main");
  await expect(page.locator('[data-testid="stack-frame-future-slot"][data-selected="true"]')).toHaveCount(0);
  await page.getByTestId("stack-frame-view-state").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.locator('[data-slot-id="main:local:result:1"]').click();
  await expect(page.locator('[data-slot-id="main:local:result:1"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("result");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("MAIN_RESULT");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("frame local");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("not runtime");
  expect(await page.getByTestId("focus-register-bank").getByTestId("register-pr").textContent()).toBe(prBeforeSlotSelection);
});

test("Mock backend wires Generated CASL and source chips to FramePlan slots", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await page.getByTestId("circuit-focus-toggle").click();
  await assemble(page);
  await switchObservationMode(page, "code-machine");

  const slotBadge = page.locator('[data-testid="generated-casl-slot-badge"][data-slot-id="add:argument:a:1"]').first();
  await expect(slotBadge).toBeVisible();
  await slotBadge.click();
  await expect(slotBadge).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("a");
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("argument");
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("FUNC_ADD_A");
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("Generated CASL");
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("Not available in simple mode");

  await switchObservationMode(page, "register-stack");
  await page.getByTestId("stack-frame-view-state").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.locator('[data-slot-id="add:argument:a:1"]')).toHaveAttribute("aria-selected", "true");

  await switchObservationMode(page, "code-machine");
  await page.getByTestId("source-frame-slot-chip").first().click();
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("Source Context");

  await page.getByTestId("circuit-focus-toggle").click();
  await selectDemoProgram(page, "casl-gr2-addition");
  await page.getByTestId("circuit-focus-toggle").click();
  await switchObservationMode(page, "register-stack");
  await expect(page.locator('[data-testid="stack-frame-future-slot"][data-selected="true"]')).toHaveCount(0);
});

test("focus_mode_works_at_1280x720", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  await expect(page.getByTestId("source-editor")).toBeVisible();
  await selectDemoProgram(page, "cpp-function-arguments");
  await expect(page.getByTestId("demo-program-select")).toHaveAttribute("title", "C++: Function Arguments");
  await expect(page.getByTestId("demo-program-select")).toHaveAttribute("aria-label", "Demo program: C++: Function Arguments");
  await page.getByTestId("circuit-focus-toggle").click();
  await assemble(page);

  await expect(page.getByTestId("focus-program-panel")).toBeVisible();
  await expect(page.getByTestId("focus-circuit-panel")).toBeVisible();
  await expect(page.getByTestId("focus-signal-probe")).toBeVisible();
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-call-stack")).toBeVisible();
  await expect(page.getByTestId("focus-stack-preview")).toBeVisible();
  await expect(page.getByTestId("focus-stack-frame-view")).toBeVisible();
  await expect(page.locator(".output-panel")).toBeVisible();

  await expect(page.getByTestId("circuit-focus-toggle")).toHaveAttribute("aria-label", "Return to studio layout");
  await page.getByTestId("circuit-focus-toggle").focus();
  await expect(page.getByTestId("circuit-focus-toggle")).toBeFocused();

  await step(page);
  await step(page);
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("CALL");

  await expect(page.getByTestId("signal-probe-details-summary")).toHaveAttribute("aria-expanded", "false");
  await page.getByTestId("signal-probe-details-summary").focus();
  await expect(page.getByTestId("signal-probe-details-summary")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("signal-probe-details-summary")).toHaveAttribute("aria-expanded", "true");

  await expect(page.getByTestId("call-stack-details-summary")).toHaveAttribute("aria-expanded", "false");
  await page.getByTestId("call-stack-details-summary").focus();
  await expect(page.getByTestId("call-stack-details-summary")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("call-stack-details-summary")).toHaveAttribute("aria-expanded", "true");

  await page.getByTestId("stack-frame-view-details-summary").focus();
  await expect(page.getByTestId("stack-frame-view-details-summary")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("stack-frame-view-details-summary")).toHaveAttribute("aria-expanded", "true");

  const focusUsesPageScroll = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 24);
  expect(focusUsesPageScroll).toBe(true);

  const appShellOverflow = await page.locator(".app-shell").evaluate((element) => getComputedStyle(element).overflowY);
  expect(appShellOverflow).not.toBe("hidden");

  const signalProbeBodyOverflow = await page.locator(".signal-probe-body").first().evaluate((element) => getComputedStyle(element).overflowY);
  expect(signalProbeBodyOverflow).toBe("visible");

  const stackFrameBodyOverflow = await page.getByTestId("stack-frame-view-state").evaluate((element) => getComputedStyle(element).overflowY);
  expect(stackFrameBodyOverflow).toBe("visible");

  for (const testId of ["focus-current-instruction-panel", "focus-signal-probe", "focus-call-stack", "focus-stack-preview", "focus-stack-frame-view", "focus-trace-panel"]) {
    const hasHorizontalOverflow = await page.getByTestId(testId).evaluate((element) => element.scrollWidth > element.clientWidth + 1);
    expect(hasHorizontalOverflow, `${testId} should not overflow horizontally`).toBe(false);
  }
});

test("focus_mode_works_at_1440x900", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await page.getByTestId("circuit-focus-toggle").click();
  await assemble(page);

  await expect(page.getByTestId("focus-program-panel")).toBeVisible();
  await expect(page.getByTestId("focus-circuit-panel")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window")).toBeVisible();
  await expect(page.getByTestId("focus-trace-panel")).toBeVisible();
  await expect(page.getByTestId("focus-step-timeline")).toBeVisible();
  await expect(page.locator(".output-panel")).toBeVisible();
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(horizontalOverflow).toBe(false);
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

test("Mock backend executes C++ function call lowering", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-call");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("FUNC_ADDONE");
  await expect(page.getByTestId("generated-casl-output")).toContainText("CALL");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("CALL FUNC_ADDONE");
  await page.getByTestId("machine-code-output").locator('[data-testid^="machine-code-row-"]').filter({ hasText: "CALL FUNC_ADDONE" }).first().click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("Push return address");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0001");
  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-list")).toContainText("CALL");
  await expect(page.getByTestId("trace-list")).toContainText("RET");
});

test("Mock backend executes C++ single argument function lowering", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-argument");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,5");
  await expect(page.getByTestId("generated-casl-output")).toContainText("CALL");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FUNC_ADDONE");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,FUNC_ADDONE_X");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-list")).toContainText("CALL");
  await expect(page.getByTestId("trace-list")).toContainText("RET");
});

test("Mock backend executes C++ multi-register argument function lowering", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,2");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR2,3");
  await expect(page.getByTestId("generated-casl-output")).toContainText("CALL");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FUNC_ADD");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,FUNC_ADD_A");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR2,FUNC_ADD_B");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0005");
  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-list")).toContainText("CALL");
  await expect(page.getByTestId("trace-list")).toContainText("RET");
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
  await expect(page.getByTestId("trace-item").first().getByTestId("trace-row-effect")).toBeVisible();
  await expect(page.getByTestId("trace-item").first().getByTestId("trace-row-note")).toBeVisible();
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
