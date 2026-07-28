import { describe, expect, it } from "vitest";
import type { SourceUnitId } from "../documents/types";
import {
  packDebuggerFlags,
  parseDebuggerWord,
  isDebuggerOfficialFlags,
  isValidDebuggerMutationTarget,
  type DebuggerMutationRequest,
  type DebuggerOfficialFlags,
  type DebuggerWordMutationTarget,
  type DebuggerRegisterName,
  type DebuggerMutationTarget
} from "../debugger/debuggerMutation";
import { createCometStateFromDto } from "../core/coreStateAdapter";
import { MockCoreAdapter } from "../core/mockCoreAdapter";
import { mockCaslCore } from "../core/mockCaslCore";
import { appStoreReducer, createInitialAppState } from "../store/useAppStore";

const mutationSource = `MAIN START
     LAD   GR2,#0003
     ST    GR2,DATA
     RET
DATA DS    1
     END`;

function request(
  target: DebuggerWordMutationTarget,
  nextWord: number
): DebuggerMutationRequest & { target: DebuggerWordMutationTarget; nextWord: number } {
  return {
    mutationId: `test:${target.kind}`,
    sourceUnitId: "source:test" as SourceUnitId,
    assemblyId: "assembly:test",
    executionEpoch: 1,
    target,
    nextWord
  };
}

function flagRequest(
  nextFlags: DebuggerOfficialFlags = { of: true, sf: true, zf: true }
): DebuggerMutationRequest & { target: { kind: "flag-register" }; nextFlags: DebuggerOfficialFlags } {
  return {
    mutationId: "test:flag-register",
    sourceUnitId: "source:test" as SourceUnitId,
    assemblyId: "assembly:test",
    executionEpoch: 1,
    target: { kind: "flag-register" },
    nextFlags
  };
}

describe("Phase 20B debugger word parsing", () => {
  it("parses_hexadecimal_signed_unsigned_and_grouped_binary_without_locale_rules", () => {
    expect(parseDebuggerWord("FFFF", "hex")).toEqual({ ok: true, word: 0xffff });
    expect(parseDebuggerWord("#1234", "hex")).toEqual({ ok: true, word: 0x1234 });
    expect(parseDebuggerWord("0x0042", "hex")).toEqual({ ok: true, word: 0x0042 });
    expect(parseDebuggerWord("-32768", "signed")).toEqual({ ok: true, word: 0x8000 });
    expect(parseDebuggerWord("-1", "signed")).toEqual({ ok: true, word: 0xffff });
    expect(parseDebuggerWord("65535", "unsigned")).toEqual({ ok: true, word: 0xffff });
    expect(parseDebuggerWord("0b1111 1111 0000 0000", "binary")).toEqual({ ok: true, word: 0xff00 });
  });

  it("rejects_invalid_or_out_of_range_values_without_wrapping", () => {
    expect(parseDebuggerWord("10000", "hex")).toEqual({ ok: false, reason: "invalid-format" });
    expect(parseDebuggerWord("-32769", "signed")).toEqual({ ok: false, reason: "out-of-range" });
    expect(parseDebuggerWord("65536", "unsigned")).toEqual({ ok: false, reason: "out-of-range" });
    expect(parseDebuggerWord("1,000", "unsigned")).toEqual({ ok: false, reason: "invalid-format" });
    expect(parseDebuggerWord("2", "binary")).toEqual({ ok: false, reason: "invalid-format" });
    expect(parseDebuggerWord("1 + 1", "unsigned")).toEqual({ ok: false, reason: "invalid-format" });
  });

  it("packs_only_the_existing_comet_flag_schema", () => {
    expect(packDebuggerFlags({ of: true, sf: true, zf: true })).toBe(0x0007);
    expect(packDebuggerFlags({ of: false, sf: true, zf: true })).toBe(0x0003);
    expect(isDebuggerOfficialFlags({ of: true, sf: false, zf: true })).toBe(true);
    expect(isDebuggerOfficialFlags({ of: true, sf: false, zf: true, cf: true })).toBe(false);
  });

  it("rejects_invalid_runtime_targets_without_address_wrapping", () => {
    expect(isValidDebuggerMutationTarget({ kind: "memory-word", address: 0xffff })).toBe(true);
    expect(isValidDebuggerMutationTarget({ kind: "memory-word", address: 0x10000 })).toBe(false);
    expect(isValidDebuggerMutationTarget({ kind: "memory-word", address: -1 })).toBe(false);
  });
});

describe("Phase 20B Mock debugger mutation", () => {
  it("edits_each_general_register_atomically_without_recomputing_fr", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(mutationSource);

    for (let index = 0; index < 8; index += 1) {
      const before = await adapter.getState();
      const target: DebuggerMutationTarget = {
        kind: "general-register",
        register: `GR${index}` as DebuggerRegisterName
      };
      const result = await adapter.mutateDebuggerState!(request(target, 0x1200 + index));
      expect(result.status).toBe("applied");
      expect(result.previousWord).toBe(before.gr[index]);
      expect(result.state.gr[index]).toBe(0x1200 + index);
      expect(result.state.gr.filter((value, candidate) => candidate !== index && value !== before.gr[candidate])).toEqual([]);
      expect([result.state.frOF, result.state.frZF, result.state.frSF]).toEqual([
        before.frOF,
        before.frZF,
        before.frSF
      ]);
      expect(result.state.stepCount).toBe(before.stepCount);
    }
  });

  it("edits_pr_sp_fr_and_one_memory_word_without_executing_an_instruction", async () => {
    const adapter = new MockCoreAdapter();
    const assembled = await adapter.assemble(mutationSource);
    const start = assembled.state.pr;
    const dataAddress = assembled.state.sourceRows.find((row) => row.label === "DATA")!.address;

    const pr = await adapter.mutateDebuggerState!(request({ kind: "program-register" }, start + 2));
    expect(pr.state.pr).toBe(start + 2);
    expect(pr.state.stepCount).toBe(0);

    const sp = await adapter.mutateDebuggerState!(request({ kind: "stack-pointer" }, 0x8123));
    expect(sp.state.sp).toBe(0x8123);
    expect(sp.state.stepCount).toBe(0);

    const fr = await adapter.mutateDebuggerState!(flagRequest());
    expect([fr.state.frOF, fr.state.frZF, fr.state.frSF]).toEqual([true, true, true]);
    expect(fr.state.stepCount).toBe(0);

    const memory = await adapter.mutateDebuggerState!(request({ kind: "memory-word", address: dataAddress }, 0xffff));
    expect(memory.previousWord).toBe(0);
    expect(memory.state.memoryWindow.find((row) => row.address === dataAddress)?.value).toBe(0xffff);
    expect(memory.state.stepCount).toBe(0);
  });

  it("rejects_unknown_flag_fields_without_changing_state", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(mutationSource);
    const before = await adapter.getState();
    const invalid = {
      ...flagRequest(),
      nextFlags: { of: true, sf: false, zf: true, cf: true }
    } as unknown as DebuggerMutationRequest;
    const result = await adapter.mutateDebuggerState!(invalid);
    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("invalid-value");
    expect(result.state).toEqual(before);
  });

  it("supports_all_memory_addresses_and_all_16_bit_word_values", () => {
    const ready = mockCaslCore.assemble(mutationSource);
    const low = mockCaslCore.mutate(ready, { kind: "memory-word", address: 0x0000 }, 0x0000).state;
    const high = mockCaslCore.mutate(low, { kind: "memory-word", address: 0xffff }, 0xffff).state;
    expect(high.memory[0x0000]).toBe(0x0000);
    expect(high.memory[0xffff]).toBe(0xffff);
  });

  it("rejects_adapter_mutation_before_load_or_with_an_invalid_target", async () => {
    const adapter = new MockCoreAdapter();
    const notLoaded = await adapter.mutateDebuggerState!(
      request({ kind: "general-register", register: "GR0" }, 1)
    );
    expect(notLoaded.status).toBe("rejected");

    await adapter.assemble(mutationSource);
    const before = await adapter.getState();
    const invalid = await adapter.mutateDebuggerState!(
      request({ kind: "memory-word", address: 0x10000 }, 1)
    );
    expect(invalid.status).toBe("rejected");
    expect(invalid.state).toEqual(before);
  });

  it("executes_a_modified_program_word_and_reports_invalid_opcode_as_runtime_failure", async () => {
    const adapter = new MockCoreAdapter();
    const assembled = await adapter.assemble(mutationSource);
    const start = assembled.state.pr;
    const originalWord = assembled.state.memoryWindow.find((row) => row.address === start)!.value;

    await adapter.mutateDebuggerState!(request({ kind: "memory-word", address: start }, 0x0000));
    const nop = await adapter.step();
    expect(nop.state.lastInstructionKind).toBe("NOP");
    expect(nop.state.gr[2]).toBe(0);
    expect(nop.state.pr).toBe(start + 1);

    const reloaded = await adapter.reload!("assembled");
    expect(reloaded.memoryWindow.find((row) => row.address === start)?.value).toBe(originalWord);

    await adapter.mutateDebuggerState!(request({ kind: "memory-word", address: start }, 0xffff));
    const invalid = await adapter.step();
    expect(invalid.ok).toBe(false);
    expect(invalid.state.runState).toBe("Error");
    expect(invalid.state.stepCount).toBe(0);
  });

  it("full_clear_unloads_the_machine_without_retaining_runtime_state", async () => {
    const adapter = new MockCoreAdapter();
    const assembled = await adapter.assemble(mutationSource);
    await adapter.mutateDebuggerState!(request({ kind: "general-register", register: "GR2" }, 0x0042));
    await adapter.mutateDebuggerState!(request({ kind: "memory-word", address: assembled.state.pr }, 0x0000));

    const cleared = await adapter.fullClear!();
    expect(cleared.runState).toBe("Idle");
    expect(cleared.gr).toEqual(Array(8).fill(0));
    expect(cleared.frOF || cleared.frSF || cleared.frZF).toBe(false);
    expect(cleared.stepCount).toBe(0);
    expect(cleared.sourceRows).toEqual([]);
    expect(cleared.consoleOutput).toBeUndefined();
  });

  it("finished_and_waiting_input_mutations_return_to_ready_without_executing", async () => {
    const adapter = new MockCoreAdapter();
    const assembled = await adapter.assemble(mutationSource);
    const finished = await adapter.run(20);
    expect(finished.runState).toBe("Finished");
    const resumed = await adapter.mutateDebuggerState!(
      request({ kind: "program-register" }, assembled.state.pr)
    );
    expect(resumed.state.runState).toBe("Ready");
    expect(resumed.state.stepCount).toBe(finished.stepCount);

    const inputSource = `MAIN START
     IN BUF,LEN
     RET
BUF DS 256
LEN DS 1
     END`;
    let waiting = mockCaslCore.assemble(inputSource);
    for (let index = 0; index < 5; index += 1) waiting = mockCaslCore.step(waiting);
    expect(waiting.runState).toBe("WaitingInput");
    const edited = mockCaslCore.mutate(
      waiting,
      { kind: "general-register", register: "GR2" },
      0x0042
    );
    expect(edited.applied).toBe(true);
    expect(edited.state.runState).toBe("Ready");
    expect(edited.state.stepIndex).toBe(waiting.stepIndex);
  });
});

describe("Phase 20B ownership, epoch, and Full Clear reducer barriers", () => {
  function assembledState() {
    const initial = createInitialAppState();
    const cometState = mockCaslCore.assemble(mutationSource);
    const state = appStoreReducer(initial, {
      type: "assembled",
      sourceUnitId: initial.currentDocument.sourceUnitId,
      sourceText: initial.sourceText,
      cometState,
      assembleStatus: "success",
      assemblyId: "assembly:test"
    });
    return { state, cometState };
  }

  it("requires_matching_source_assembly_and_epoch_before_mutation", () => {
    const { state } = assembledState();
    const valid = request({ kind: "general-register", register: "GR2" }, 0x0042);
    valid.sourceUnitId = state.currentDocument.sourceUnitId;
    valid.executionEpoch = state.executionEpoch;

    const wrongSource = { ...valid, sourceUnitId: "source:stale" as SourceUnitId };
    const wrongAssembly = { ...valid, assemblyId: "assembly:stale" };
    const wrongEpoch = { ...valid, executionEpoch: valid.executionEpoch + 1 };
    expect(appStoreReducer(state, { type: "mutationStarted", request: wrongSource, nextEpoch: state.executionEpoch + 1 })).toBe(state);
    expect(appStoreReducer(state, { type: "mutationStarted", request: wrongAssembly, nextEpoch: state.executionEpoch + 1 })).toBe(state);
    expect(appStoreReducer(state, { type: "mutationStarted", request: wrongEpoch, nextEpoch: state.executionEpoch + 1 })).toBe(state);

    const started = appStoreReducer(state, { type: "mutationStarted", request: valid, nextEpoch: state.executionEpoch + 1 });
    expect(started.executionEpoch).toBe(state.executionEpoch + 1);
    expect(started.historyEpoch).toBe(state.historyEpoch + 1);
    expect(started.mutationInFlight).toBe(true);
  });

  it("stale_step_cannot_overwrite_a_manual_edit_epoch", () => {
    const { state, cometState } = assembledState();
    const valid = request({ kind: "general-register", register: "GR2" }, 0x0042);
    valid.sourceUnitId = state.currentDocument.sourceUnitId;
    valid.executionEpoch = state.executionEpoch;
    const started = appStoreReducer(state, { type: "mutationStarted", request: valid, nextEpoch: state.executionEpoch + 1 });
    const mutatedCore = mockCaslCore.mutate(cometState, valid.target, valid.nextWord).state;
    const committed = appStoreReducer(started, {
      type: "mutationCommitted",
      request: valid,
      nextEpoch: started.executionEpoch,
      cometState: mutatedCore,
      previousWord: 0
    });
    const staleStep = appStoreReducer(committed, {
      type: "stepped",
      owner: {
        sourceUnitId: state.currentDocument.sourceUnitId,
        assemblyId: state.assemblyId,
        executionEpoch: state.executionEpoch
      },
      cometState
    });
    expect(staleStep).toBe(committed);
    expect(staleStep.cometState.gr[2]).toBe(0x0042);
    expect(staleStep.cometState.trace[0]?.kind).toBe("debugger-register-edit");
    expect(staleStep.cometState.trace[0]?.visualPath).toBe("None");
  });

  it("program_word_trace_is_a_non_instruction_runtime_override_event", () => {
    const { state, cometState } = assembledState();
    const mutation = request({ kind: "memory-word", address: cometState.pr }, 0x0000);
    mutation.sourceUnitId = state.currentDocument.sourceUnitId;
    mutation.executionEpoch = state.executionEpoch;
    const nextEpoch = state.executionEpoch + 1;
    const started = appStoreReducer(state, { type: "mutationStarted", request: mutation, nextEpoch });
    const changed = mockCaslCore.mutate(cometState, mutation.target, mutation.nextWord);
    const committed = appStoreReducer(started, {
      type: "mutationCommitted",
      request: mutation,
      nextEpoch,
      cometState: changed.state,
      previousWord: changed.previousWord
    });
    expect(committed.cometState.trace[0]).toMatchObject({
      kind: "debugger-memory-edit",
      instruction: "Manual machine-word override",
      visualPath: "None",
      index: cometState.stepIndex,
      sourceMappingConfidence: "runtime-word-modified"
    });
  });

  it("flag_register_trace_records_only_the_three_official_flags", () => {
    const { state, cometState } = assembledState();
    const mutation = flagRequest({ of: true, sf: false, zf: true });
    mutation.sourceUnitId = state.currentDocument.sourceUnitId;
    mutation.executionEpoch = state.executionEpoch;
    const nextEpoch = state.executionEpoch + 1;
    const started = appStoreReducer(state, { type: "mutationStarted", request: mutation, nextEpoch });
    const changed = mockCaslCore.mutate(cometState, mutation.target, packDebuggerFlags(mutation.nextFlags));
    const committed = appStoreReducer(started, {
      type: "mutationCommitted",
      request: mutation,
      nextEpoch,
      cometState: changed.state,
      previousWord: changed.previousWord
    });
    expect(committed.cometState.trace[0]?.detail).toBe("OF: 0 -> 1; SF: 0 -> 0; ZF: 0 -> 1");
    expect(committed.cometState.trace[0]?.detail).not.toMatch(/\bCF\b/);
  });

  it("full_clear_preserves_source_document_dirty_and_preferences_but_drops_machine_ownership", () => {
    const { state } = assembledState();
    const dirtyLoaded = { ...state, isSourceDirty: true };
    const nextEpoch = dirtyLoaded.executionEpoch + 1;
    const owner = {
      sourceUnitId: dirtyLoaded.currentDocument.sourceUnitId,
      assemblyId: dirtyLoaded.assemblyId,
      executionEpoch: dirtyLoaded.executionEpoch
    };
    const started = appStoreReducer(dirtyLoaded, { type: "fullClearStarted", owner, nextEpoch });
    const cleared = appStoreReducer(started, {
      type: "fullClearCommitted",
      owner,
      nextEpoch,
      cometState: createCometStateFromDto({
        runState: "Idle",
        stepCount: 0,
        pr: 0x20,
        sp: 0xfffe,
        callDepth: 0,
        ir0: 0,
        ir1: null,
        mar: 0x20,
        mdr: 0,
        gr: Array(8).fill(0),
        frOF: false,
        frSF: false,
        frZF: false,
        currentInstructionAddress: null,
        currentSourceLineIndex: null,
        currentInstructionText: null,
        lastInstructionKind: null,
        lastMemoryReadAddress: null,
        lastMemoryWriteAddress: null,
        lastRegisterWriteIndex: null,
        baseAddress: null,
        indexRegister: null,
        indexValue: null,
        effectiveAddress: null,
        memoryWindow: [],
        sourceRows: [],
        diagnostics: []
      })
    });
    expect(cleared.currentDocument).toBe(state.currentDocument);
    expect(cleared.sourceText).toBe(state.sourceText);
    expect(cleared.isSourceDirty).toBe(true);
    expect(cleared.observationMode).toBe(state.observationMode);
    expect(cleared.lessonProgress).toBe(state.lessonProgress);
    expect(cleared.assemblyId).toBeNull();
    expect(cleared.assembleResult).toBeNull();
    expect(cleared.lastAssembledSource).toBe("");
    expect(cleared.runtimeOverrides).toEqual({});
    expect(cleared.cometState.runState).toBe("Idle");
  });
});
