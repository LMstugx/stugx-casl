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
  await expect(page.getByTestId("focus-registers-panel").getByTestId("register-gr1")).toContainText("0006");
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
  await expect(circuit.locator("[data-testid='effective-address-unit']")).toContainText("Effective Address Unit");
  await expect(circuit.locator("[data-testid='effective-address-chip']")).toContainText("BASE 0027 + GR2(0001)");
  await expect(circuit.locator("[data-testid='effective-address-chip']")).toContainText("EA 0028");
  await expect(circuit.locator("[data-testid='memory-row-0028']")).toHaveAttribute("data-read", "true");
  await expect(circuit.locator("[data-testid='wire-base-to-eau']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-index-to-eau']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-eau-to-mar']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("BASE");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("EA");
  const focusInspector = page.getByTestId("focus-registers-panel");
  await expect(focusInspector.getByTestId("register-gr1")).toContainText("0014");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await page.getByTestId("machine-code-row-0022").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("x = GR2");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("0001");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("0028");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await focusInspector.getByRole("tab", { name: "Memory" }).click();
  await expect(focusInspector.getByTestId("memory-view-row-0029")).toContainText("RESULT");
  await expect(focusInspector.getByTestId("memory-view-row-0029")).toContainText("0014");
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
  await expect(page.getByTestId("focus-stack-preview").locator("[data-testid='stack-preview-row'][data-address='FFFD']")).toHaveAttribute("data-write", "true");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("SP");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("STACK");

  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("POP");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-FFFD']")).toHaveAttribute("data-read", "true");
  await expect(page.getByTestId("focus-registers-panel").getByTestId("register-gr1")).toContainText("0029");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  const focusInspector = page.getByTestId("focus-registers-panel");
  await focusInspector.getByRole("tab", { name: "Memory" }).click();
  await expect(focusInspector.getByTestId("memory-view-row-002A")).toContainText("RESULT");
  await expect(focusInspector.getByTestId("memory-view-row-002A")).toContainText("0029");
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
  await expect(page.getByTestId("focus-signal-probe")).toContainText("RETADDR");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("CALLDEPTH");
  await expect(page.getByTestId("focus-call-stack")).toBeVisible();
  await expect(page.getByTestId("call-stack-depth")).toHaveText("1");
  await expect(page.getByTestId("call-stack-return-address")).toHaveText("0024");
  await expect(page.getByTestId("call-stack-routine")).toHaveText("SUB");
  await expect(page.getByTestId("call-stack-ret-mode")).toHaveText("Stack return");
  await expect(page.getByTestId("focus-call-stack")).toContainText("CALL -> SUB; return 0024");

  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ADDA");
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("RET");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-pr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-FFFD']")).toHaveAttribute("data-read", "true");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ST GR1,RESULT");
  await expect(page.getByTestId("call-stack-depth")).toHaveText("0");
  await expect(page.getByTestId("call-stack-return-address")).toHaveText("0024");
  await expect(page.getByTestId("call-stack-ret-mode")).toHaveText("Stack return");
  await expect(page.getByTestId("focus-call-stack")).toContainText("RET -> 0024 from MEM[FFFD]");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expect(page.getByTestId("call-stack-depth")).toHaveText("0");
  await expect(page.getByTestId("call-stack-ret-mode")).toHaveText("Top-level finish");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  const focusInspector = page.getByTestId("focus-registers-panel");
  await focusInspector.getByRole("tab", { name: "Memory" }).click();
  await expect(focusInspector.getByTestId("memory-view-row-002B")).toContainText("RESULT");
  await expect(focusInspector.getByTestId("memory-view-row-002B")).toContainText("0006");
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
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("marker-end", /arrow-red/);
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
  await expect(page.getByTestId("focus-registers-panel")).toBeVisible();
  await expect(page.getByTestId("focus-signal-probe")).toBeVisible();
  await expect(page.getByTestId("focus-stack-preview")).toBeVisible();
  await expect(page.getByTestId("focus-stack-preview")).toContainText("Stack path preview only.");
  await expect(page.getByTestId("focus-stack-preview")).toContainText("SP FFFE");
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
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Current");
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
  await expect(page.getByTestId("focus-stack-preview").locator("[data-testid='stack-preview-row'][data-sp='true']")).toContainText("FFFE");

  await step(page);
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("focus-stack-preview")).toContainText("Stack path preview only.");
  await expect(page.getByTestId("focus-program-current-line")).toContainText(/ADDA\s+GR2,B/);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ADDA");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Current");
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
  await expect(page.getByTestId("focus-stack-preview")).toContainText("Stack path preview only.");
  await expect(page.getByTestId("focus-program-current-line")).toContainText(/ST\s+GR2,C/);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ST");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Current");
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
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveAttribute("marker-end", /arrow-red/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).not.toHaveAttribute("marker-mid", /.+/);
  await expect(circuit.locator("[data-testid='wire-gr-to-mdr']")).toHaveAttribute("data-lane", "data-bypass");
  await expect(circuit.locator("[data-testid='wire-gr-to-mdr']")).toHaveAttribute("data-avoids-alu", "true");
  await expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='module-fr']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='status-indicator-write']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='status-indicator-exec']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("MEM[0029]");
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
