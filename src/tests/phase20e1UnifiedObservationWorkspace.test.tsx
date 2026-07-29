// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import CircuitFocusLayout from "../components/CircuitFocusLayout";
import { mockCaslCore } from "../core/mockCaslCore";
import type { CometState } from "../core/types";
import { getDemoProgram } from "../examples/demoPrograms";
import { resources } from "../i18n/resources";
import {
  AUXILIARY_OBSERVATIONS,
  auxiliaryObservationFromLegacyMode,
  legacyModeForAuxiliaryObservation
} from "../observation/workspace";

const source = getDemoProgram("casl-gr2-addition")!.source;
const css = readFileSync("src/styles/app.css", "utf8");
const appSource = readFileSync("src/App.tsx", "utf8");
const workspaceSource = readFileSync("src/components/CircuitFocusLayout.tsx", "utf8");
const caslModeSource = readFileSync("src/components/CaslCompatibilityMode.tsx", "utf8");
const preferenceTypes = readFileSync("src/preferences/types.ts", "utf8");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderWorkspaceMarkup(state: CometState, initialAuxiliaryObservation?: typeof AUXILIARY_OBSERVATIONS[number]): string {
  return renderToStaticMarkup(
    <CircuitFocusLayout
      state={state}
      sourceMode="casl"
      sourceText={source}
      generatedCaslSource=""
      cppToCaslMapping={[]}
      isSourceDirty={false}
      timelineItems={[]}
      initialAuxiliaryObservation={initialAuxiliaryObservation}
    />
  );
}

async function mountWorkspace(state: CometState, onObservationModeChange = vi.fn()) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <CircuitFocusLayout
        state={state}
        sourceMode="casl"
        sourceText={source}
        generatedCaslSource=""
        cppToCaslMapping={[]}
        isSourceDirty={false}
        timelineItems={[]}
        onObservationModeChange={onObservationModeChange}
      />
    );
  });
  return { container, onObservationModeChange };
}

async function click(testId: string) {
  const button = container?.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
  expect(button).not.toBeNull();
  await act(async () => button?.click());
}

describe("Phase 20E.1 persistent Circuit workspace", () => {
  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    container?.remove();
    container = null;
  });

  it.each([
    ["registers", "focus-register-bank"],
    ["memory", "focus-memory-window"],
    ["stack", "focus-stack-preview"],
    ["code-machine", "focus-machine-code-panel"],
    ["source-mapping", "focus-source-mapping-panel"],
    ["trace", "focus-trace-panel"],
    ["console", "focus-display-panel"],
    ["inspector", "focus-signal-probe"]
  ] as const)("circuit_remains_visible_in_%s_view", (observation, panelTestId) => {
    const markup = renderWorkspaceMarkup(mockCaslCore.assemble(source), observation);
    expect(markup).toContain('data-testid="comet-circuit-svg"');
    expect(markup).toContain(`data-testid="${panelTestId}"`);
  });

  it("auxiliary_tab_switch_does_not_remount_runtime_or_circuit", async () => {
    const state = mockCaslCore.assemble(source);
    await mountWorkspace(state);
    const circuit = container!.querySelector('[data-testid="comet-circuit-svg"]');
    await click("observation-mode-register-stack");
    expect(container!.querySelector('[data-testid="comet-circuit-svg"]')).toBe(circuit);
    await click("observation-mode-code-machine");
    expect(container!.querySelector('[data-testid="comet-circuit-svg"]')).toBe(circuit);
    expect(state.stepIndex).toBe(0);
    expect(state.pr).toBe(0x0020);
  });

  it("execution_mode_is_independent_from_observation_tab", () => {
    expect(appSource).toContain('executionMode="comet"');
    expect(appSource).toContain('executionMode="modern"');
    expect(caslModeSource).toContain('executionMode="casl"');
    expect(workspaceSource).toContain("data-execution-mode={executionMode}");
  });

  it("old_observation_mode_migrates_safely", () => {
    expect(auxiliaryObservationFromLegacyMode("cpu-flow")).toBe("memory");
    expect(auxiliaryObservationFromLegacyMode("register-stack")).toBe("registers");
    expect(auxiliaryObservationFromLegacyMode("code-machine")).toBe("code-machine");
    expect(legacyModeForAuxiliaryObservation("stack")).toBe("register-stack");
    expect(legacyModeForAuxiliaryObservation("trace")).toBe("cpu-flow");
  });

  it("layout_and_follow_controls_do_not_change_vm_or_dirty_state", async () => {
    const state = mockCaslCore.step(mockCaslCore.assemble(source));
    await mountWorkspace(state);
    const before = {
      pr: state.pr,
      stepIndex: state.stepIndex,
      gr: [...state.gr],
      memory: state.memory
    };
    await click("workspace-layout-circuit-focus");
    await click("workspace-layout-show-both");
    const follow = container!.querySelector<HTMLInputElement>('[data-testid="follow-execution-toggle"]')!;
    await act(async () => follow.click());
    expect({ pr: state.pr, stepIndex: state.stepIndex, gr: [...state.gr], memory: state.memory }).toEqual(before);
    expect(workspaceSource).not.toContain("isSourceDirtySet");
  });

  it("focus_layouts_keep_the_real_circuit_accessible", () => {
    expect(workspaceSource).toContain('compact={workspaceLayout === "data-focus"}');
    expect(workspaceSource).toContain('<PersistentCircuitPane');
    expect(workspaceSource.match(/<PersistentCircuitPane/g)).toHaveLength(1);
    expect(workspaceSource).not.toMatch(/mini.*runtime/i);
  });

  it("linked_runtime_state_uses_core_dto_fields", () => {
    const state = mockCaslCore.step(mockCaslCore.assemble(source));
    const memoryMarkup = renderWorkspaceMarkup(state, "memory");
    const registerMarkup = renderWorkspaceMarkup(state, "registers");
    expect(memoryMarkup).toContain('data-read="true"');
    expect(memoryMarkup).toContain('data-change-kind="read"');
    expect(registerMarkup).toContain('class="changed" data-testid="register-gr2"');
    expect(workspaceSource).toContain("state.lastMemoryReadAddress");
    expect(workspaceSource).toContain("state.lastMemoryWriteAddress");
  });

  it("reverse_and_manual_edit_have_distinct_observation_states", () => {
    const state = mockCaslCore.assemble(source);
    const markup = renderToStaticMarkup(
      <CircuitFocusLayout
        state={state}
        sourceMode="casl"
        sourceText={source}
        generatedCaslSource=""
        cppToCaslMapping={[]}
        isSourceDirty={false}
        timelineItems={[]}
        reverseNotice="microstep"
        manualEditActive
      />
    );
    expect(markup).toContain('data-change-kind="restored-by-reverse"');
    expect(markup).toContain('data-change-kind="manual-edit"');
  });

  it("memory_and_trace_are_bounded", () => {
    const memory = renderWorkspaceMarkup(mockCaslCore.assemble(source), "memory");
    expect(memory.match(/data-testid="focus-memory-window-row"/g)).toHaveLength(10);
    expect(css).toContain(".workspace-observation-content");
    expect(css).toContain("overflow: auto");
    expect(css).toContain(".focus-trace-list");
    expect(workspaceSource).not.toContain("65536");
  });

  it("responsive_contract_covers_1180_1280_1440_and_1920", () => {
    expect(css).toContain("@media (min-width: 1600px)");
    expect(css).toContain("@media (max-width: 1320px)");
    expect(css).toContain("minmax(620px, 1.62fr)");
    expect(css).toContain("minmax(330px, 0.9fr)");
    expect(css).toContain("minmax(700px, 1.8fr)");
    expect(css).toContain("minmax(380px, 1fr)");
  });

  it("workspace_labels_exist_in_all_three_locales", () => {
    const keys = [
      "workspace.title",
      "workspace.circuit",
      "workspace.observationData",
      "workspace.showBoth",
      "workspace.focusCircuit",
      "workspace.focusData",
      "workspace.followExecution",
      "workspace.restored",
      "workspace.manualEdit"
    ] as const;
    for (const locale of ["en", "ja", "zh-CN"] as const) {
      for (const key of keys) expect(resources[locale][key]).toBeTruthy();
    }
  });

  it("no_new_persistence_key_or_network_request_is_added", () => {
    expect(preferenceTypes).toContain('"observationMode"');
    expect(preferenceTypes).not.toMatch(/workspaceLayout|followExecution|auxiliaryObservation/);
    expect(workspaceSource + caslModeSource).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|localStorage/);
  });
});
