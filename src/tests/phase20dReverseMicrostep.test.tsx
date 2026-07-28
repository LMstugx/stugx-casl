import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CometMicrocyclePanel from "../components/CometMicrocyclePanel";
import { createCometStateFromDto } from "../core/coreStateAdapter";
import { MockCoreAdapter } from "../core/mockCoreAdapter";
import type { ReverseMicrostepStatus } from "../core/reverseMicrocycle";
import type { SourceUnitId } from "../documents/types";

const root = resolve(process.cwd());

const loadStoreSource = `MAIN START
     LD GR1,VALUE
     ST GR1,TARGET
     RET
VALUE DC #0042
TARGET DS 1
     END`;

async function microstep(adapter: MockCoreAdapter, count: number) {
  let result = await adapter.microStep();
  for (let index = 1; index < count; index += 1) result = await adapter.microStep();
  return result;
}

describe("Phase 20D reverse microstep contract", () => {
  it("reverse_fetch_restores_pre_fetch_state", async () => {
    const adapter = new MockCoreAdapter();
    const assembled = await adapter.assemble(loadStoreSource);
    const fetched = await adapter.microStep();

    expect(fetched.state.microcyclePhase).toBe("fetch");
    expect(fetched.state.reverseAvailability?.available).toBe(true);
    const reversed = await adapter.reverseMicrostep(
      fetched.state.historyEpoch!,
      fetched.state.timelineRevision!
    );

    expect(reversed.status).toBe("reversed");
    expect(reversed.restoredPhase).toBe("none");
    expect(reversed.state.ir0).toBe(assembled.state.ir0);
    expect(reversed.state.mar).toBe(assembled.state.mar);
    expect(reversed.state.mdr).toBe(assembled.state.mdr);
    expect(reversed.state.microcycleHistorySummary?.retainedEntries).toBe(0);
  });

  it("reverse_write_back_and_flag_update_restore_register_and_fr", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(loadStoreSource);
    const writeBack = await microstep(adapter, 6);
    expect(writeBack.state.microcyclePhase).toBe("write-back");
    expect(writeBack.state.gr[1]).toBe(0x0042);

    const reversedWriteBack = await adapter.reverseMicrostep(
      writeBack.state.historyEpoch!,
      writeBack.state.timelineRevision!
    );
    expect(reversedWriteBack.status).toBe("reversed");
    expect(reversedWriteBack.state.gr[1]).toBe(0);
    expect(reversedWriteBack.state.microcyclePhase).toBe("execute");

    const replayedWriteBack = await adapter.microStep();
    const flagUpdate = await adapter.microStep();
    expect(flagUpdate.state.microcyclePhase).toBe("flag-update");
    const reversedFlags = await adapter.reverseMicrostep(
      flagUpdate.state.historyEpoch!,
      flagUpdate.state.timelineRevision!
    );
    expect(reversedFlags.state.frOF).toBe(replayedWriteBack.state.frOF);
    expect(reversedFlags.state.frSF).toBe(replayedWriteBack.state.frSF);
    expect(reversedFlags.state.frZF).toBe(replayedWriteBack.state.frZF);
  });

  it("reverse_store_restores_memory_word_atomically", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(loadStoreSource);
    await microstep(adapter, 8);
    const storeWriteBack = await microstep(adapter, 5);
    const target = storeWriteBack.state.sourceRows.find((row) => row.label === "TARGET")!.address;
    expect(storeWriteBack.state.memoryWindow.find((row) => row.address === target)?.value).toBe(0x0042);

    const reversed = await adapter.reverseMicrostep(
      storeWriteBack.state.historyEpoch!,
      storeWriteBack.state.timelineRevision!
    );
    expect(reversed.status).toBe("reversed");
    expect(reversed.state.memoryWindow.find((row) => row.address === target)?.value).toBe(0);
  });

  it("repeated_reverse_stays_in_epoch_and_forward_discards_future", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(loadStoreSource);
    const third = await microstep(adapter, 3);
    const firstReverse = await adapter.reverseMicrostep(
      third.state.historyEpoch!,
      third.state.timelineRevision!
    );
    const secondReverse = await adapter.reverseMicrostep(
      firstReverse.state.historyEpoch!,
      firstReverse.state.timelineRevision!
    );
    expect(secondReverse.status).toBe("reversed");
    expect(secondReverse.state.microcycleHistorySummary?.retainedEntries).toBe(1);

    const branched = await adapter.microStep();
    expect(branched.state.microcycleHistorySummary?.retainedEntries).toBe(2);
    expect("redo" in adapter).toBe(false);
  });

  it("stale_reverse_is_rejected_without_state_change", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(loadStoreSource);
    const fetched = await adapter.microStep();
    const stale = await adapter.reverseMicrostep(
      fetched.state.historyEpoch!,
      fetched.state.timelineRevision! + 1
    );
    expect(stale.status).toBe("stale");
    expect(stale.state.ir0).toBe(fetched.state.ir0);
    expect(stale.state.microcycleHistorySummary?.retainedEntries).toBe(1);
  });

  it("reset_reload_and_mutation_create_hard_barriers", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(loadStoreSource);
    await adapter.microStep();
    const reset = await adapter.reset();
    expect(reset.reverseAvailability?.reason).toBe("reset-boundary");

    await adapter.microStep();
    const reload = await adapter.reload("assembled");
    expect(reload.reverseAvailability?.reason).toBe("reload-boundary");

    const mutation = await adapter.mutateDebuggerState({
      mutationId: "phase20d-mutation",
      sourceUnitId: "phase20d-source" as SourceUnitId,
      assemblyId: "phase20d-assembly",
      executionEpoch: 1,
      target: { kind: "general-register", register: "GR1" },
      nextWord: 0x0042
    });
    expect(mutation.status).toBe("applied");
    expect(mutation.state.reverseAvailability?.reason).toBe("mutation-boundary");
  });

  it("svc_and_waiting_input_are_not_reversible_boundaries", async () => {
    const outputAdapter = new MockCoreAdapter();
    await outputAdapter.assemble(`MAIN START
     SVC 2
     RET
     END`);
    const outputCommit = await microstep(outputAdapter, 4);
    expect(outputCommit.state.reverseAvailability?.reason).toBe("svc-boundary");

    const inputAdapter = new MockCoreAdapter();
    await inputAdapter.assemble(`MAIN START
     SVC 1
     RET
     END`);
    const waiting = await microstep(inputAdapter, 4);
    expect(waiting.state.runState).toBe("WaitingInput");
    expect(waiting.state.reverseAvailability?.reason).toBe("io-boundary");
  });

  it("history_entries_are_sparse_bounded_transactions", () => {
    const header = readFileSync(resolve(root, "cpp-core/include/CometVm.hpp"), "utf8");
    const implementation = readFileSync(resolve(root, "cpp-core/src/CometVm.cpp"), "utf8");
    expect(header).toContain("std::vector<MemoryChange> memoryChanges");
    expect(header).not.toContain("memoryBefore");
    expect(implementation).toContain("state_.memory[change.address] != change.after");
    expect(implementation).toContain("kMaxTraceEvents");
    expect(implementation).toContain("HistoryCapacityBoundary");
  });

  it("cpp_core_is_authority_and_wasm_does_not_recompute_inverse", () => {
    const wasmAdapter = readFileSync(resolve(root, "src/core/wasmCoreAdapter.ts"), "utf8");
    const bridge = readFileSync(resolve(root, "cpp-core/wasm/wasm_bridge.cpp"), "utf8");
    expect(wasmAdapter).toContain("core.reverseMicrostep(historyEpoch, timelineRevision)");
    expect(wasmAdapter).not.toContain("memoryChanges");
    expect(bridge).toContain("rt.vm.reverseMicrocycle");
  });

  it("reverse_control_is_accessible_and_not_global_toolbar", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(loadStoreSource);
    const fetched = await adapter.microStep();
    const state = createCometStateFromDto(fetched.state);
    const markup = renderToStaticMarkup(
      createElement(CometMicrocyclePanel, {
        state,
        onReverse: async (): Promise<ReverseMicrostepStatus> => "reversed"
      })
    );
    expect(markup).toContain('data-testid="reverse-microstep-button"');
    expect(markup).toContain("Reverse Microstep");
    expect(markup).toContain("aria-describedby");
    expect(readFileSync(resolve(root, "src/components/Toolbar.tsx"), "utf8"))
      .not.toContain("reverse-microstep-button");
  });

  it("reverse_contract_adds_no_network_storage_or_browser_navigation_shortcut", () => {
    const files = [
      "src/core/reverseMicrocycle.ts",
      "src/components/CometMicrocyclePanel.tsx",
      "src/store/useAppStore.tsx"
    ].map((file) => readFileSync(resolve(root, file), "utf8")).join("\n");
    expect(files).not.toMatch(/\bfetch\s*\(|localStorage|sessionStorage|Alt\+Left|Backspace/);
    expect(files).not.toContain("redo");
    expect(files).not.toContain("reverseRun");
  });
});
