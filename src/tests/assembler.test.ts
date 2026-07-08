import { describe, expect, it } from "vitest";
import { DEFAULT_CASL_SOURCE, mockCaslCore } from "../core/mockCaslCore";

describe("mock assembler", () => {
  it("assembles the simple program at 0020", () => {
    const state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);

    expect(state.runState).toBe("Ready");
    expect(state.pr).toBe(0x20);
    expect(state.memory[0x20]).toBe(0x1010);
    expect(state.memory[0x21]).toBe(0x0027);
    expect(state.memory[0x22]).toBe(0x2010);
    expect(state.memory[0x23]).toBe(0x0028);
    expect(state.memory[0x24]).toBe(0x1110);
    expect(state.memory[0x25]).toBe(0x0029);
    expect(state.memory[0x26]).toBe(0x8100);
    expect(state.memory[0x27]).toBe(0x000a);
    expect(state.memory[0x28]).toBe(0x0014);
    expect(state.memory[0x29]).toBe(0x0000);
  });
});
