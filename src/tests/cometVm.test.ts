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
    expect(state.fr).toEqual({ z: false, c: false, n: false, o: false });
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
});
