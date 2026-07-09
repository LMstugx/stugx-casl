import { describe, expect, it } from "vitest";
import { MockCoreAdapter } from "../core/mockCoreAdapter";
import { mockCaslCore } from "../core/mockCaslCore";
import { VisualPathKind } from "../core/types";

function stepSource(source: string, steps: number) {
  let state = mockCaslCore.assemble(source);
  for (let index = 0; index < steps; index += 1) {
    state = mockCaslCore.step(state);
  }
  return state;
}

describe("VM boundary behavior", () => {
  it("pr_outside_loaded_program_range_enters_error", () => {
    const state = mockCaslCore.assemble("MAIN START\n     RET\n     END");
    const invalid = mockCaslCore.step({ ...state, pr: 0x4444 });

    expect(invalid.runState).toBe("Error");
    expect(invalid.output.join("\n")).toContain("No instruction at 4444");
  });

  it("effective_address_wraps_16bit_consistently", () => {
    const state = stepSource(`MAIN START
     LAD   GR2,#FFFF
     LD    GR1,#0001,GR2
     RET
     END`, 2);

    expect(state.lastBaseAddress).toBe(0x0001);
    expect(state.lastIndexRegister).toBe(2);
    expect(state.lastIndexValue).toBe(0xffff);
    expect(state.lastEffectiveAddress).toBe(0x0000);
    expect(state.lastMemoryReadAddress).toBe(0x0000);
    expect(state.gr[1]).toBe(0x0000);
  });

  it("shift_count_boundaries_are_stable", () => {
    const cases = [
      ["SLL", 0, 0x0001, 0x0001, false],
      ["SLL", 1, 0x0001, 0x0002, false],
      ["SLL", 15, 0x0001, 0x8000, false],
      ["SLL", 16, 0xffff, 0x0000, true],
      ["SLL", 17, 0xffff, 0x0000, false],
      ["SRA", 16, 0xffff, 0xffff, true],
      ["SRL", 16, 0xffff, 0x0000, true]
    ] as const;

    for (const [op, count, sourceValue, expectedValue, expectedOverflow] of cases) {
      const sourceLiteral = `#${sourceValue.toString(16).padStart(4, "0").toUpperCase()}`;
      const state = stepSource(`MAIN START
     LD    GR1,A
     ${op}   GR1,${count}
     RET
A    DC    ${sourceLiteral}
     END`, 2);

      expect(state.runState).toBe("Ready");
      expect(state.gr[1]).toBe(expectedValue);
      expect(state.fr.o).toBe(expectedOverflow);
    }
  });

  it("arithmetic_and_logical_wrap_flags_are_stable", () => {
    const adda = stepSource(`MAIN START
     LD    GR1,A
     ADDA  GR1,B
     RET
A    DC    #7FFF
B    DC    1
     END`, 2);
    expect(adda.gr[1]).toBe(0x8000);
    expect(adda.fr.o).toBe(true);

    const addl = stepSource(`MAIN START
     LD    GR1,A
     ADDL  GR1,B
     RET
A    DC    #FFFF
B    DC    1
     END`, 2);
    expect(addl.gr[1]).toBe(0x0000);
    expect(addl.fr.c).toBe(true);
    expect(addl.fr.o).toBe(true);

    const subl = stepSource(`MAIN START
     LD    GR1,A
     SUBL  GR1,B
     RET
A    DC    0
B    DC    1
     END`, 2);
    expect(subl.gr[1]).toBe(0xffff);
    expect(subl.fr.c).toBe(true);
  });

  it("stack_pointer_wraps_for_push_pop_and_call", () => {
    const pushReady = mockCaslCore.assemble("MAIN START\n     PUSH  TARGET\nTARGET RET\n     END");
    const pushed = mockCaslCore.step({ ...pushReady, sp: 0x0000 });
    expect(pushed.sp).toBe(0xffff);
    expect(pushed.lastMemoryWriteAddress).toBe(0xffff);

    const popReady = mockCaslCore.assemble("MAIN START\n     POP   GR1\n     END");
    const popped = mockCaslCore.step({ ...popReady, sp: 0xffff, memory: { ...popReady.memory, 0xffff: 0x1234 } });
    expect(popped.sp).toBe(0x0000);
    expect(popped.gr[1]).toBe(0x1234);

    const callReady = mockCaslCore.assemble("MAIN START\n     CALL  SUB\nSUB  RET\n     END");
    const called = mockCaslCore.step({ ...callReady, sp: 0x0000 });
    expect(called.sp).toBe(0xffff);
    expect(called.callDepth).toBe(1);
    expect(called.lastMemoryWriteAddress).toBe(0xffff);
  });

  it("reset_clears_vm_state_and_call_depth", () => {
    let state = mockCaslCore.assemble("MAIN START\n     CALL  SUB\n     RET\nSUB  RET\n     END");
    state = mockCaslCore.step(state);
    expect(state.callDepth).toBe(1);

    const reset = mockCaslCore.reset(state);
    expect(reset.runState).toBe("Ready");
    expect(reset.callDepth).toBe(0);
    expect(reset.sp).toBe(0xfffe);
    expect(reset.trace).toEqual([]);
    expect(reset.visualPath).toBe(VisualPathKind.Ready_PrToMar);
  });

  it("assemble_after_run_replaces_old_runtime_state", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(`MAIN START
     LAD   GR1,1
     RET
     END`);
    const finished = await adapter.run(10);
    expect(finished.runState).toBe("Finished");
    expect(finished.gr[1]).toBe(1);

    const next = await adapter.assemble(`MAIN START
     LAD   GR1,2
     RET
     END`);
    expect(next.state.runState).toBe("Ready");
    expect(next.state.gr[1]).toBe(0);

    const stepped = await adapter.step();
    expect(stepped.state.gr[1]).toBe(2);
  });
});
