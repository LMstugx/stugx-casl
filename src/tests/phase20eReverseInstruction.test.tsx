import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CaslCompatibilityMode from "../components/CaslCompatibilityMode";
import CometMicrocyclePanel from "../components/CometMicrocyclePanel";
import { createCometStateFromDto } from "../core/coreStateAdapter";
import { MockCoreAdapter } from "../core/mockCoreAdapter";
import { WasmCoreAdapter } from "../core/wasmCoreAdapter";
import type { SourceUnitId } from "../documents/types";
import { I18nProvider } from "../i18n/I18nProvider";

const root = resolve(process.cwd());

const loadStoreSource = `MAIN START
     LD GR1,VALUE
     ST GR1,TARGET
     RET
VALUE DC #0042
TARGET DS 1
     END`;

const branchSource = `MAIN START
     JUMP TARGET
     NOP
TARGET RET
     END`;

async function advanceMicrosteps(adapter: MockCoreAdapter, count: number) {
  let state = await adapter.getState();
  for (let index = 0; index < count; index += 1) {
    state = (await adapter.microStep()).state;
  }
  return state;
}

function architecturalWindow(state: Awaited<ReturnType<MockCoreAdapter["getState"]>>) {
  return {
    runState: state.runState,
    stepCount: state.stepCount,
    pr: state.pr,
    sp: state.sp,
    gr: state.gr,
    frOF: state.frOF,
    frSF: state.frSF,
    frZF: state.frZF,
    ir0: state.ir0,
    ir1: state.ir1,
    mar: state.mar,
    mdr: state.mdr,
    lastMemoryReadAddress: state.lastMemoryReadAddress,
    lastMemoryWriteAddress: state.lastMemoryWriteAddress,
    lastRegisterWriteIndex: state.lastRegisterWriteIndex
  };
}

describe("Phase 20E instruction grouping and atomic reverse", () => {
  it("reverse_instruction_after_ea_restores_before_fetch", async () => {
    const adapter = new MockCoreAdapter();
    const assembled = await adapter.assemble(loadStoreSource);
    const partial = await advanceMicrosteps(adapter, 3);

    expect(partial.microcyclePhase).toBe("effective-address");
    expect(partial.reverseInstructionAvailability).toMatchObject({
      available: true,
      complete: false,
      instructionKind: "LD",
      reversibleMicrosteps: 3
    });

    const reversed = await adapter.reverseInstruction(
      partial.historyEpoch!,
      partial.timelineRevision!
    );
    expect(reversed.status).toBe("reversed");
    expect(reversed.reversedMicrostepCount).toBe(3);
    expect(reversed.timelineRevision).toBe(partial.timelineRevision! + 1);
    expect(architecturalWindow(reversed.state)).toEqual(architecturalWindow(assembled.state));
    expect(reversed.state.microcycleHistorySummary?.retainedEntries).toBe(0);
  });

  it("instruction_step_creates_a_complete_machine_group", async () => {
    const adapter = new MockCoreAdapter();
    const assembled = await adapter.assemble(loadStoreSource);
    const stepped = await adapter.step();

    expect(stepped.state.reverseInstructionAvailability).toMatchObject({
      available: true,
      complete: true,
      instructionKind: "LD",
      reversibleMicrosteps: 8
    });
    const reversed = await adapter.reverseInstruction(
      stepped.state.historyEpoch!,
      stepped.state.timelineRevision!
    );
    expect(reversed.status).toBe("reversed");
    expect(reversed.state.stepCount).toBe(0);
    expect(reversed.state.gr[1]).toBe(0);
    expect(reversed.state.pr).toBe(assembled.state.pr);
  });

  it("repeated_reverse_instruction_walks_machine_boundaries", async () => {
    const adapter = new MockCoreAdapter();
    const assembled = await adapter.assemble(loadStoreSource);
    const first = await adapter.step();
    const second = await adapter.step();
    const reverseStore = await adapter.reverseInstruction(
      second.state.historyEpoch!,
      second.state.timelineRevision!
    );
    const reverseLoad = await adapter.reverseInstruction(
      reverseStore.state.historyEpoch!,
      reverseStore.state.timelineRevision!
    );

    expect(reverseStore.status).toBe("reversed");
    expect(reverseStore.mnemonic).toBe("ST");
    expect(reverseLoad.status).toBe("reversed");
    expect(reverseLoad.mnemonic).toBe("LD");
    expect(architecturalWindow(reverseLoad.state)).toEqual(architecturalWindow(assembled.state));
  });

  it("reverse_instruction_restores_memory_atomically", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(loadStoreSource);
    await adapter.step();
    const stored = await adapter.step();
    const target = stored.state.sourceRows.find((row) => row.label === "TARGET")!.address;
    expect(stored.state.memoryWindow.find((row) => row.address === target)?.value).toBe(0x0042);

    const reversed = await adapter.reverseInstruction(
      stored.state.historyEpoch!,
      stored.state.timelineRevision!
    );
    expect(reversed.status).toBe("reversed");
    expect(reversed.state.memoryWindow.find((row) => row.address === target)?.value).toBe(0);
    expect(reversed.state.gr[1]).toBe(0x0042);
  });

  it("reverse_taken_branch_restores_pr", async () => {
    const adapter = new MockCoreAdapter();
    const assembled = await adapter.assemble(branchSource);
    const jumped = await adapter.step();
    expect(jumped.state.pr).not.toBe(assembled.state.pr);

    const reversed = await adapter.reverseInstruction(
      jumped.state.historyEpoch!,
      jumped.state.timelineRevision!
    );
    expect(reversed.status).toBe("reversed");
    expect(reversed.state.pr).toBe(assembled.state.pr);
  });

  it("stale_group_reverse_is_rejected_without_partial_restore", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(loadStoreSource);
    const stepped = await adapter.step();
    const stale = await adapter.reverseInstruction(
      stepped.state.historyEpoch!,
      stepped.state.timelineRevision! + 1
    );
    expect(stale.status).toBe("stale");
    expect(architecturalWindow(stale.state)).toEqual(architecturalWindow(stepped.state));
    expect(stale.state.microcycleHistorySummary).toEqual(stepped.state.microcycleHistorySummary);
  });

  it("debugger_mutation_and_svc_reuse_phase20d_barriers", async () => {
    const mutationAdapter = new MockCoreAdapter();
    await mutationAdapter.assemble(loadStoreSource);
    await mutationAdapter.step();
    const mutation = await mutationAdapter.mutateDebuggerState({
      mutationId: "phase20e-mutation",
      sourceUnitId: "phase20e-source" as SourceUnitId,
      assemblyId: "phase20e-assembly",
      executionEpoch: 1,
      target: { kind: "general-register", register: "GR1" },
      nextWord: 0x1234
    });
    expect(mutation.state.reverseInstructionAvailability?.reason).toBe("mutation-boundary");

    const svcAdapter = new MockCoreAdapter();
    await svcAdapter.assemble("MAIN START\n     SVC 2\n     RET\n     END");
    const svc = await advanceMicrosteps(svcAdapter, 4);
    expect(svc.reverseInstructionAvailability?.reason).toBe("svc-boundary");
  });

  it("reverse_microstep_remains_available_after_phase20e", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(loadStoreSource);
    const fetched = await adapter.microStep();
    const reversed = await adapter.reverseMicrostep(
      fetched.state.historyEpoch!,
      fetched.state.timelineRevision!
    );
    expect(reversed.status).toBe("reversed");
    expect(reversed.restoredPhase).toBe("none");
  });
});

describe("Phase 20E Core, WASM, and presentation contracts", () => {
  it("wasm_reverse_instruction_matches_mock_architecture", async () => {
    const mock = new MockCoreAdapter();
    const wasm = new WasmCoreAdapter();
    try {
      await mock.assemble(loadStoreSource);
      await wasm.assemble(loadStoreSource);
      const mockStep = await mock.step();
      const wasmStep = await wasm.step();
      const mockReverse = await mock.reverseInstruction(
        mockStep.state.historyEpoch!,
        mockStep.state.timelineRevision!
      );
      const wasmReverse = await wasm.reverseInstruction(
        wasmStep.state.historyEpoch!,
        wasmStep.state.timelineRevision!
      );

      expect(wasmReverse.status).toBe("reversed");
      expect(wasmReverse.reversedMicrostepCount).toBe(mockReverse.reversedMicrostepCount);
      expect(architecturalWindow(wasmReverse.state)).toEqual(architecturalWindow(mockReverse.state));
    } finally {
      await wasm.dispose();
    }
  });

  it("cpp_core_is_authority_and_adapters_do_not_build_inverse_patches", () => {
    const core = readFileSync(resolve(root, "cpp-core/src/CometVm.cpp"), "utf8");
    const bridge = readFileSync(resolve(root, "cpp-core/wasm/wasm_bridge.cpp"), "utf8");
    const wasm = readFileSync(resolve(root, "src/core/wasmCoreAdapter.ts"), "utf8");
    expect(core).toContain("candidate->reverseMicrocycle");
    expect(core).toContain("originalTimelineRevision + 1");
    expect(bridge).toContain("rt.vm.reverseInstruction");
    expect(wasm).toContain("core.reverseInstruction(historyEpoch, timelineRevision)");
    expect(wasm).not.toContain("memoryChanges");
  });

  it("history_group_identity_is_machine_owned_and_macro_units_remain_expanded_instructions", () => {
    const header = readFileSync(resolve(root, "cpp-core/include/CometVm.hpp"), "utf8");
    const implementation = readFileSync(resolve(root, "cpp-core/src/CometVm.cpp"), "utf8");
    expect(header).toContain("std::uint64_t instructionId");
    expect(header).toContain("bool startsAtFetch");
    expect(header).toContain("bool endsAtInstructionComplete");
    expect(implementation).toContain("active.instructionId");
    expect(implementation).not.toContain("ReverseMacro");
  });

  it("casl_mode_exposes_instruction_reverse_without_microstep_reverse", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(loadStoreSource);
    const stepped = await adapter.step();
    const state = createCometStateFromDto(stepped.state);
    const markup = renderToStaticMarkup(
      createElement(I18nProvider, {
        initialLocale: "en",
        children: createElement(CaslCompatibilityMode, {
          state,
          sourceText: loadStoreSource,
          isSourceDirty: false,
          onReset: () => undefined,
          onReload: () => undefined,
          onSubmitConsoleInput: () => undefined,
          onReverseInstruction: async () => "reversed" as const
        })
      })
    );
    expect(markup).toContain('data-testid="reverse-instruction-button"');
    expect(markup).not.toContain('data-testid="reverse-microstep-button"');
  });

  it("comet_mode_exposes_both_reverse_units_in_three_locales", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(loadStoreSource);
    const fetched = await adapter.microStep();
    const state = createCometStateFromDto(fetched.state);

    for (const locale of ["en", "ja", "zh-CN"] as const) {
      const markup = renderToStaticMarkup(
        createElement(I18nProvider, {
          initialLocale: locale,
          children: createElement(CometMicrocyclePanel, {
            state,
            onReverse: async () => "reversed" as const,
            onReverseInstruction: async () => "reversed" as const
          })
        })
      );
      expect(markup).toContain('data-testid="reverse-microstep-button"');
      expect(markup).toContain('data-testid="reverse-instruction-button"');
      expect(markup).not.toContain("undefined");
    }
  });

  it("reverse_instruction_adds_no_redo_reverse_run_network_or_persistence", () => {
    const files = [
      "src/core/reverseInstruction.ts",
      "src/components/ReverseInstructionControl.tsx",
      "src/store/useAppStore.tsx"
    ].map((file) => readFileSync(resolve(root, file), "utf8")).join("\n");
    expect(files).not.toMatch(/\bfetch\s*\(|localStorage|sessionStorage|Alt\+Left|Backspace/);
    expect(files).not.toContain("reverseRun");
    expect(files).not.toContain("timelineScrubber");
  });
});
