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

  it("assemble_ld_with_index and reject_gr0_as_index_register", () => {
    const state = mockCaslCore.assemble(`MAIN START
     LD    GR1,A,GR2
     JUMP  MAIN,GR3
A    DC    10
     END`);

    expect(state.runState).toBe("Ready");
    expect(state.memory[0x20]).toBe(0x1012);
    expect(state.memory[0x22]).toBe(0x6403);
    expect(state.program?.find((instruction) => instruction.address === 0x20)?.indexRegister).toBe(2);

    const invalid = mockCaslCore.assemble(`MAIN START
     LD    GR1,A,GR0
A    DC    10
     END`);
    expect(invalid.runState).toBe("Error");
    expect(invalid.diagnostics.some((diagnostic) => diagnostic.message.includes("GR0 cannot be used as an index register"))).toBe(true);
  });

  it("reject_index_on_dc_ds", () => {
    const state = mockCaslCore.assemble(`MAIN START
A    DS    1,GR1
     END`);

    expect(state.runState).toBe("Error");
    expect(state.diagnostics.some((diagnostic) => diagnostic.message.includes("DS does not support index operands"))).toBe(true);
  });
});
