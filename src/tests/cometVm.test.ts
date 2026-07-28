import { describe, expect, it } from "vitest";
import { DEFAULT_CASL_SOURCE, mockCaslCore } from "../core/mockCaslCore";
import { VisualPathKind } from "../core/types";

describe("mock COMET VM", () => {
  it("steps LD", () => {
    const state = mockCaslCore.step(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    expect(state.lastStep?.executedInstruction).toContain("LD");
    expect(state.pr).toBe(0x22);
    expect(state.gr[1]).toBe(0x000a);
    expect(state.currentInstruction).toContain("ADDA");
    expect(state.visualPath).toBe(VisualPathKind.LD_MemoryToMdrToGr);
  });

  it("steps ADDA", () => {
    const afterLd = mockCaslCore.step(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const state = mockCaslCore.step(afterLd);

    expect(state.lastStep?.executedInstruction).toContain("ADDA");
    expect(state.pr).toBe(0x24);
    expect(state.gr[1]).toBe(0x001e);
    expect(state.fr).toEqual({ z: false, n: false, o: false });
    expect(state.currentInstruction).toContain("ST");
    expect(state.visualPath).toBe(VisualPathKind.ADDA_GrMdrToAluToGr);
  });

  it("steps ST", () => {
    const afterLd = mockCaslCore.step(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const afterAdda = mockCaslCore.step(afterLd);
    const state = mockCaslCore.step(afterAdda);

    expect(state.lastStep?.executedInstruction).toContain("ST");
    expect(state.pr).toBe(0x26);
    expect(state.memory[0x29]).toBe(0x001e);
    expect(state.currentInstruction).toContain("RET");
    expect(state.visualPath).toBe(VisualPathKind.ST_GrToMdrToMemory);
  });

  it("finishes on RET without jumping to a random address", () => {
    let state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);

    expect(state.runState).toBe("Finished");
    expect(state.pr).toBe(0x26);
    expect(state.visualPath).toBe(VisualPathKind.Finished_None);
  });

  it("execute_ld_with_index_reads_effective_address", () => {
    let state = mockCaslCore.assemble(`MAIN START
     LAD   GR2,1
     LD    GR1,A,GR2
     RET
A    DC    10
B    DC    20
     END`);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);

    expect(state.gr[1]).toBe(20);
    expect(state.lastBaseAddress).toBe(0x25);
    expect(state.lastIndexRegister).toBe(2);
    expect(state.lastIndexValue).toBe(1);
    expect(state.lastEffectiveAddress).toBe(0x26);
    expect(state.lastMemoryReadAddress).toBe(0x26);
    expect(state.trace[0].detail).toContain("base:");
    expect(state.trace[0].detail).toContain("effective:");
  });

  it("execute_st_adda_cpa_lad_jump_and_shift_with_index", () => {
    let state = mockCaslCore.assemble(`MAIN START
     LAD   GR2,1
     LD    GR1,A,GR2
     ADDA  GR1,A,GR2
     CPA   GR1,C,GR2
     ST    GR1,RESULT,GR2
     LAD   GR3,A,GR2
     SLL   GR3,0,GR2
     JUMP  DONE,GR2
SKIP RET
DONE RET
A    DC    10
B    DC    20
C    DC    39
PAD  DS    1
RESULT DS  2
     END`);

    state = mockCaslCore.step(state); // LAD GR2,1
    state = mockCaslCore.step(state); // LD reads B
    state = mockCaslCore.step(state); // ADDA reads B
    expect(state.gr[1]).toBe(40);
    expect(state.lastMemoryReadAddress).toBe(state.lastEffectiveAddress);

    state = mockCaslCore.step(state); // CPA compares with PAD? C + 1
    expect(state.lastMemoryReadAddress).toBe(state.lastEffectiveAddress);

    state = mockCaslCore.step(state); // ST writes RESULT + 1
    expect(state.lastMemoryWriteAddress).toBe(state.lastEffectiveAddress);
    expect(state.memory[state.lastEffectiveAddress!]).toBe(40);

    state = mockCaslCore.step(state); // LAD writes A + GR2
    expect(state.gr[3]).toBe(state.lastEffectiveAddress);
    expect(state.lastMemoryReadAddress).toBeUndefined();

    state = mockCaslCore.step(state); // SLL count 1 via 0,GR2
    expect(state.gr[3]).toBe(0x0066);
    expect(state.lastMemoryReadAddress).toBeUndefined();

    state = mockCaslCore.step(state); // JUMP DONE + 1 wraps to data? just verifies effective target
    expect(state.pr).toBe(state.lastEffectiveAddress);
  });
});
