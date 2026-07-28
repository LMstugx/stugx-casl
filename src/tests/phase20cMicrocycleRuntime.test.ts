import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MICROCYCLE_PHASES_BY_INSTRUCTION,
  TEACHING_MICROARCHITECTURE_NAME,
  phasesForInstruction,
  type MicrocyclePhase
} from "../core/microcycle";
import { mockCaslCore } from "../core/mockCaslCore";
import type { AssembledInstruction, CometState } from "../core/types";

const OFFICIAL_INSTRUCTIONS = [
  "NOP", "LD", "ST", "LAD",
  "ADDA", "SUBA", "ADDL", "SUBL",
  "AND", "OR", "XOR", "CPA", "CPL",
  "SLA", "SRA", "SLL", "SRL",
  "JMI", "JNZ", "JZE", "JUMP", "JPL", "JOV",
  "PUSH", "POP", "CALL", "RET", "SVC"
] as const;

type Matrix = {
  schemaVersion: number;
  profile: string;
  runtimeEnabled: boolean;
  phaseVocabulary: string[];
  instructions: Array<{
    mnemonic: typeof OFFICIAL_INSTRUCTIONS[number];
    cyclePhases: Exclude<MicrocyclePhase, "none">[];
  }>;
};

const matrix = JSON.parse(
  readFileSync(resolve("docs/comet-instruction-cycle-matrix-v1.json"), "utf8")
) as Matrix;

const firstInstructionSource: Readonly<Record<typeof OFFICIAL_INSTRUCTIONS[number], string>> = {
  NOP: "NOP",
  LD: "LD GR1,DATA",
  ST: "ST GR1,DATA",
  LAD: "LAD GR1,DATA",
  ADDA: "ADDA GR1,DATA",
  SUBA: "SUBA GR1,DATA",
  ADDL: "ADDL GR1,DATA",
  SUBL: "SUBL GR1,DATA",
  AND: "AND GR1,DATA",
  OR: "OR GR1,DATA",
  XOR: "XOR GR1,DATA",
  CPA: "CPA GR1,DATA",
  CPL: "CPL GR1,DATA",
  SLA: "SLA GR1,1",
  SRA: "SRA GR1,1",
  SLL: "SLL GR1,1",
  SRL: "SRL GR1,1",
  JMI: "JMI TARGET",
  JNZ: "JNZ TARGET",
  JZE: "JZE TARGET",
  JUMP: "JUMP TARGET",
  JPL: "JPL TARGET",
  JOV: "JOV TARGET",
  PUSH: "PUSH 0,GR1",
  POP: "POP GR1",
  CALL: "CALL TARGET",
  RET: "RET",
  SVC: "SVC 2"
};

function sourceForFirstInstruction(instruction: typeof OFFICIAL_INSTRUCTIONS[number]): string {
  return `MAIN START
     ${firstInstructionSource[instruction]}
TARGET RET
DATA DC 1
     END`;
}

function runOneInstructionByMicrocycles(initial: CometState): {
  state: CometState;
  phases: MicrocyclePhase[];
} {
  let state = initial;
  const phases: MicrocyclePhase[] = [];
  for (let guard = 0; guard < 16; guard += 1) {
    state = mockCaslCore.microStep(state);
    phases.push(state.microcycle.phase);
    if (state.microcycle.instructionComplete) return { state, phases };
  }
  throw new Error("Microcycle instruction did not complete within the bounded phase count.");
}

function architecturalState(state: CometState) {
  return {
    runState: state.runState,
    pr: state.pr,
    sp: state.sp,
    callDepth: state.callDepth,
    ir: state.ir,
    mar: state.mar,
    mdr: state.mdr,
    fr: state.fr,
    gr: state.gr,
    memory: state.memory,
    stepIndex: state.stepIndex,
    consoleOutput: state.consoleOutput
  };
}

describe("Phase 20C microcycle contract", () => {
  it("microcycle_matrix_matches_runtime_phase_plans", () => {
    expect(matrix.schemaVersion).toBe(1);
    expect(matrix.profile).toBe(TEACHING_MICROARCHITECTURE_NAME);
    expect(matrix.runtimeEnabled).toBe(true);
    expect(matrix.phaseVocabulary).toEqual([
      "fetch", "decode", "effective-address", "operand-read",
      "execute", "write-back", "flag-update", "complete"
    ]);
    expect(matrix.instructions.map((entry) => entry.mnemonic)).toEqual(OFFICIAL_INSTRUCTIONS);
    for (const entry of matrix.instructions) {
      expect(MICROCYCLE_PHASES_BY_INSTRUCTION[entry.mnemonic]).toEqual(entry.cyclePhases);
    }
  });

  it("all_official_instructions_execute_as_microcycles", () => {
    for (const instruction of OFFICIAL_INSTRUCTIONS) {
      const initial = mockCaslCore.assemble(sourceForFirstInstruction(instruction));
      expect(initial.runState, instruction).toBe("Ready");
      const first = initial.program?.[0];
      expect(first?.op, instruction).toBe(instruction);
      const result = runOneInstructionByMicrocycles(initial);
      expect(result.phases, instruction).toEqual(phasesForInstruction(first!));
      expect(result.state.executionGranularity, instruction).toBe("microcycle");
      expect(result.state.microcycle.instructionComplete, instruction).toBe(true);
      expect(result.state.stepIndex, instruction).toBe(1);
      expect(result.state.microcycleHistory, instruction).toHaveLength(
        instruction === "SVC" ? 1 : result.phases.length
      );
    }
  });

  it("register_forms_skip_effective_address_and_data_memory_read", () => {
    const initial = mockCaslCore.assemble(`MAIN START
     LAD GR2,#1234
     LD GR1,GR2
     RET
     END`);
    const afterLad = runOneInstructionByMicrocycles(initial).state;
    const ld = afterLad.program?.find((instruction) => instruction.op === "LD") as AssembledInstruction;
    const result = runOneInstructionByMicrocycles(afterLad);

    expect(phasesForInstruction(ld)).not.toContain("effective-address");
    expect(result.phases).not.toContain("effective-address");
    expect(result.state.gr[1]).toBe(0x1234);
    expect(result.state.lastMemoryReadAddress).toBeUndefined();
    expect(result.state.lastEffectiveAddress).toBeUndefined();
  });

  it("ld_commits_architectural_state_only_in_the_frozen_phases", () => {
    let state = mockCaslCore.assemble(`MAIN START
     LD GR1,DATA
     RET
DATA DC #8000
     END`);
    const dataAddress = state.symbols.DATA;
    const initialPr = state.pr;

    state = mockCaslCore.microStep(state);
    expect(state.microcycle.phase).toBe("fetch");
    expect(state.ir).toBe(state.memory[initialPr]);
    expect(state.gr[1]).toBe(0);

    state = mockCaslCore.microStep(state);
    expect(state.microcycle.phase).toBe("decode");
    expect(state.gr[1]).toBe(0);

    state = mockCaslCore.microStep(state);
    expect(state.microcycle.phase).toBe("effective-address");
    expect(state.mar).toBe(dataAddress);

    state = mockCaslCore.microStep(state);
    expect(state.microcycle.phase).toBe("operand-read");
    expect(state.mdr).toBe(0x8000);
    expect(state.gr[1]).toBe(0);

    state = mockCaslCore.microStep(state);
    expect(state.microcycle.phase).toBe("execute");
    expect(state.gr[1]).toBe(0);

    state = mockCaslCore.microStep(state);
    expect(state.microcycle.phase).toBe("write-back");
    expect(state.gr[1]).toBe(0x8000);
    expect(state.fr).toEqual({ o: false, n: false, z: false });

    state = mockCaslCore.microStep(state);
    expect(state.microcycle.phase).toBe("flag-update");
    expect(state.fr).toEqual({ o: false, n: true, z: false });

    state = mockCaslCore.microStep(state);
    expect(state.microcycle.phase).toBe("complete");
    expect(state.pr).toBe(initialPr + 2);
    expect(state.stepIndex).toBe(1);
  });

  it("branch_call_ret_and_shift_change_state_in_their_declared_phases", () => {
    let branch = mockCaslCore.assemble(`MAIN START
     JUMP TARGET
     NOP
TARGET RET
     END`);
    const branchTarget = branch.symbols.TARGET;
    branch = mockCaslCore.microStep(branch);
    branch = mockCaslCore.microStep(branch);
    branch = mockCaslCore.microStep(branch);
    expect(branch.pr).not.toBe(branchTarget);
    branch = mockCaslCore.microStep(branch);
    expect(branch.microcycle.phase).toBe("execute");
    expect(branch.pr).toBe(branchTarget);

    let call = mockCaslCore.assemble(`MAIN START
     CALL SUB
     RET
SUB  RET
     END`);
    const initialSp = call.sp;
    const callResult = runOneInstructionByMicrocycles(call);
    call = callResult.state;
    expect(callResult.phases).toEqual(["fetch", "decode", "effective-address", "execute", "write-back", "complete"]);
    expect(call.sp).toBe((initialSp - 1) & 0xffff);
    expect(call.callDepth).toBe(1);

    const retResult = runOneInstructionByMicrocycles(call);
    expect(retResult.phases).toEqual(["fetch", "decode", "operand-read", "execute", "write-back", "complete"]);
    expect(retResult.state.sp).toBe(initialSp);
    expect(retResult.state.callDepth).toBe(0);

    let shift = mockCaslCore.assemble(`MAIN START
     LAD GR1,#8001
     SLL GR1,1
     RET
     END`);
    shift = runOneInstructionByMicrocycles(shift).state;
    const shifted = runOneInstructionByMicrocycles(shift).state;
    expect(shifted.gr[1]).toBe(0x0002);
    expect(shifted.fr.o).toBe(true);
  });

  it("instruction_and_microcycle_execution_reach_the_same_architectural_state", () => {
    const source = `MAIN START
     LD GR1,A
     ADDA GR1,B
     ST GR1,C
     SLL GR1,1
     RET
A DC 10
B DC 20
C DS 1
     END`;
    let instructionState = mockCaslCore.assemble(source);
    let microcycleState = mockCaslCore.assemble(source);

    for (let instruction = 0; instruction < 5; instruction += 1) {
      instructionState = mockCaslCore.step(instructionState);
      microcycleState = runOneInstructionByMicrocycles(microcycleState).state;
      expect(architecturalState(microcycleState)).toEqual(architecturalState(instructionState));
    }
  });

  it("macro_expansion_microcycles_execute_machine_instructions_not_macro_tokens", () => {
    let state = mockCaslCore.assemble(`MAIN START
     RPUSH
     RPOP
     RET
     END`);
    expect(state.program?.[0].op).toBe("PUSH");
    const result = runOneInstructionByMicrocycles(state);
    state = result.state;
    expect(state.microcycle.instructionKind).toBe("PUSH");
    expect(state.trace.filter((event) => event.kind === "microcycle").every((event) => event.instruction === "PUSH")).toBe(true);
    expect(state.microcycle.detail).not.toMatch(/RPUSH begin|animation/i);
  });

  it("microcycle_history_is_bounded_ordered_and_cleared_by_reset", () => {
    let state = mockCaslCore.assemble(`MAIN START
     NOP
     RET
     END`);
    for (let index = 0; index < 4; index += 1) state = mockCaslCore.microStep(state);
    expect(state.microcycleHistory.map((entry) => entry.sequence)).toEqual([4, 3, 2, 1]);
    expect(state.microcycleHistory.every((entry) => entry.instructionAddress === 0x20)).toBe(true);
    state = mockCaslCore.reset(state);
    expect(state.microcycleHistory).toEqual([]);
    expect(state.microcycle.phase).toBe("none");
  });
});
