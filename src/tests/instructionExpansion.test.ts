import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../core/mockCaslCore";
import { VisualPathKind } from "../core/types";
import { getDemoProgram } from "../examples/demoPrograms";

const ladSource = `MAIN START
     LAD   GR1,VALUE
     RET
VALUE DC   10
     END`;

const subaSource = `MAIN START
     LD    GR1,A
     SUBA  GR1,B
     RET
A    DC    20
B    DC    5
     END`;

const cpaEqualSource = `MAIN START
     LD    GR1,A
     CPA   GR1,B
     RET
A    DC    10
B    DC    10
     END`;

const cpaNegativeSource = `MAIN START
     LD    GR1,A
     CPA   GR1,B
     RET
A    DC    5
B    DC    10
     END`;

const jumpSource = `MAIN START
     JUMP  TARGET
     LAD   GR1,0
TARGET LAD GR1,1
     RET
     END`;

const jzeTakenSource = `MAIN START
     LD    GR1,A
     CPA   GR1,B
     JZE   SAME
     LAD   GR2,0
     RET
SAME LAD   GR2,1
     RET
A    DC    10
B    DC    10
     END`;

const jzeNotTakenSource = `MAIN START
     LD    GR1,A
     CPA   GR1,B
     JZE   SAME
     LAD   GR2,0
     RET
SAME LAD   GR2,1
     RET
A    DC    10
B    DC    20
     END`;

const jmiTakenSource = `MAIN START
     LD    GR1,A
     CPA   GR1,B
     JMI   LESS
     LAD   GR2,0
     RET
LESS LAD   GR2,1
     RET
A    DC    5
B    DC    10
     END`;

const nopSource = `MAIN START
     NOP
     RET
     END`;

const addlSublSource = `MAIN START
     LD    GR1,A
     ADDL  GR1,B
     SUBL  GR1,C
     RET
A    DC    1
B    DC    2
C    DC    1
     END`;

const logicSource = `MAIN START
     LD    GR1,A
     AND   GR1,MASK
     OR    GR1,B
     XOR   GR1,C
     ST    GR1,RESULT
     RET
A    DC    #00F0
MASK DC    #0F0F
B    DC    #0003
C    DC    #0001
RESULT DS  1
     END`;

const cplSource = `MAIN START
     LD    GR1,A
     CPL   GR1,B
     RET
A    DC    #FFFF
B    DC    2
     END`;

const jovTakenSource = `MAIN START
     LD    GR1,A
     ADDL  GR1,B
     JOV   OVER
     LAD   GR2,0
     RET
OVER LAD   GR2,1
     RET
A    DC    #FFFF
B    DC    1
     END`;

const jovNotTakenSource = `MAIN START
     LD    GR1,A
     ADDL  GR1,B
     JOV   OVER
     ST    GR1,RESULT
     RET
OVER LAD   GR1,999
     ST    GR1,RESULT
     RET
A    DC    1
B    DC    2
RESULT DS  1
     END`;

const shiftSource = `MAIN START
     LD    GR1,A
     SLL   GR1,1
     SRL   GR1,1
     SLA   GR1,1
     SRA   GR1,1
     ST    GR1,RESULT
     RET
A    DC    3
RESULT DS  1
     END`;

const pushPopSource = `MAIN START
     LAD   GR2,1
     PUSH  A,GR2
     POP   GR1
     ST    GR1,RESULT
     RET
A    DC    10
B    DC    20
RESULT DS  1
     END`;

const callReturnSource = `MAIN START
     LAD   GR1,5
     CALL  SUB
     ST    GR1,RESULT
     RET
SUB  ADDA  GR1,ONE
     RET
ONE  DC    1
RESULT DS  1
     END`;

function stepTimes(source: string, count: number) {
  let state = mockCaslCore.assemble(source);
  for (let index = 0; index < count; index += 1) {
    state = mockCaslCore.step(state);
  }
  return state;
}

describe("Phase 5A instruction expansion", () => {
  it("assemble_nop", () => {
    const state = mockCaslCore.assemble(nopSource);

    expect(state.runState).toBe("Ready");
    expect(state.memory[0x20]).toBe(0x0000);
    expect(state.sourceMap.find((row) => row.address === 0x20)?.instruction).toBe("NOP");
  });

  it("execute_nop_advances_pr", () => {
    const state = stepTimes(nopSource, 1);

    expect(state.pr).toBe(0x21);
    expect(state.gr).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(state.fr).toEqual({ z: false, c: false, n: false, o: false });
    expect(state.visualPath).toBe(VisualPathKind.None);
  });

  it("assembles LAD", () => {
    const state = mockCaslCore.assemble(ladSource);

    expect(state.runState).toBe("Ready");
    expect(state.memory[0x20]).toBe(0x1210);
    expect(state.memory[0x21]).toBe(state.symbols.VALUE);
    expect(state.sourceMap.find((row) => row.address === 0x20)?.instruction).toBe("LAD");
  });

  it("steps LAD", () => {
    const state = stepTimes(ladSource, 1);

    expect(state.gr[1]).toBe(state.symbols.VALUE);
    expect(state.pr).toBe(0x22);
    expect(state.visualPath).toBe(VisualPathKind.LAD_AddressToGr);
    expect(state.lastStep?.executedInstruction).toContain("LAD");
  });

  it("steps SUBA", () => {
    const state = stepTimes(subaSource, 2);

    expect(state.gr[1]).toBe(0x000f);
    expect(state.pr).toBe(0x24);
    expect(state.fr).toEqual({ z: false, c: false, n: false, o: false });
    expect(state.visualPath).toBe(VisualPathKind.SUBA_GrMdrToAluToGr);
  });

  it("assemble_addl_subl", () => {
    const state = mockCaslCore.assemble(addlSublSource);

    expect(state.runState).toBe("Ready");
    expect(state.memory[0x22]).toBe(0x2210);
    expect(state.memory[0x24]).toBe(0x2310);
    expect(state.sourceMap.find((row) => row.address === 0x22)?.instruction).toBe("ADDL");
    expect(state.sourceMap.find((row) => row.address === 0x24)?.instruction).toBe("SUBL");
  });

  it("execute_addl_unsigned", () => {
    const state = stepTimes(`MAIN START
     LD    GR1,A
     ADDL  GR1,B
     RET
A    DC    #FFFF
B    DC    1
     END`, 2);

    expect(state.gr[1]).toBe(0x0000);
    expect(state.fr).toEqual({ z: true, c: true, n: false, o: true });
    expect(state.visualPath).toBe(VisualPathKind.ADDA_GrMdrToAluToGr);
  });

  it("execute_subl_unsigned", () => {
    const state = stepTimes(`MAIN START
     LD    GR1,A
     SUBL  GR1,B
     RET
A    DC    0
B    DC    1
     END`, 2);

    expect(state.gr[1]).toBe(0xffff);
    expect(state.fr).toEqual({ z: false, c: true, n: true, o: true });
    expect(state.visualPath).toBe(VisualPathKind.SUBA_GrMdrToAluToGr);
  });

  it("execute_and", () => {
    const state = stepTimes(logicSource, 2);

    expect(state.gr[1]).toBe(0x0000);
    expect(state.fr).toEqual({ z: true, c: false, n: false, o: false });
    expect(state.visualPath).toBe(VisualPathKind.ADDA_GrMdrToAluToGr);
  });

  it("execute_or", () => {
    const state = stepTimes(logicSource, 3);

    expect(state.gr[1]).toBe(0x0003);
    expect(state.fr).toEqual({ z: false, c: false, n: false, o: false });
  });

  it("execute_xor", () => {
    const state = stepTimes(logicSource, 4);

    expect(state.gr[1]).toBe(0x0002);
    expect(state.fr).toEqual({ z: false, c: false, n: false, o: false });
  });

  it("steps CPA equal", () => {
    const state = stepTimes(cpaEqualSource, 2);

    expect(state.gr[1]).toBe(0x000a);
    expect(state.fr).toEqual({ z: true, c: false, n: false, o: false });
    expect(state.visualPath).toBe(VisualPathKind.CPA_GrMdrToAluToFr);
  });

  it("steps CPA negative", () => {
    const state = stepTimes(cpaNegativeSource, 2);

    expect(state.gr[1]).toBe(0x0005);
    expect(state.fr).toEqual({ z: false, c: false, n: true, o: false });
    expect(state.visualPath).toBe(VisualPathKind.CPA_GrMdrToAluToFr);
  });

  it("execute_cpl_equal", () => {
    const state = stepTimes(`MAIN START
     LD    GR1,A
     CPL   GR1,B
     RET
A    DC    #FFFF
B    DC    #FFFF
     END`, 2);

    expect(state.gr[1]).toBe(0xffff);
    expect(state.fr).toEqual({ z: true, c: false, n: false, o: false });
    expect(state.visualPath).toBe(VisualPathKind.CPA_GrMdrToAluToFr);
  });

  it("execute_cpl_less_greater", () => {
    const less = stepTimes(`MAIN START
     LD    GR1,A
     CPL   GR1,B
     RET
A    DC    1
B    DC    2
     END`, 2);
    const greater = stepTimes(cplSource, 2);

    expect(less.fr).toEqual({ z: false, c: false, n: true, o: false });
    expect(greater.fr).toEqual({ z: false, c: false, n: false, o: false });
  });

  it("steps JUMP", () => {
    const state = stepTimes(jumpSource, 1);

    expect(state.pr).toBe(state.symbols.TARGET);
    expect(state.currentInstruction).toContain("LAD GR1,1");
    expect(state.visualPath).toBe(VisualPathKind.Jump_AddressToPr);
  });

  it("steps JZE taken", () => {
    const afterJump = stepTimes(jzeTakenSource, 3);

    expect(afterJump.pr).toBe(afterJump.symbols.SAME);
    expect(afterJump.currentInstruction).toContain("LAD GR2,1");
    expect(afterJump.visualPath).toBe(VisualPathKind.ConditionalJump_AddressToPr);

    const afterTarget = mockCaslCore.step(afterJump);
    expect(afterTarget.gr[2]).toBe(0x0001);
  });

  it("steps JZE not taken", () => {
    const afterJump = stepTimes(jzeNotTakenSource, 3);

    expect(afterJump.pr).toBe(0x26);
    expect(afterJump.currentInstruction).toContain("LAD GR2,0");
    expect(afterJump.visualPath).toBe(VisualPathKind.ConditionalJump_NotTaken);

    const afterNext = mockCaslCore.step(afterJump);
    expect(afterNext.gr[2]).toBe(0x0000);
  });

  it("steps JMI taken", () => {
    const afterJump = stepTimes(jmiTakenSource, 3);

    expect(afterJump.pr).toBe(afterJump.symbols.LESS);
    expect(afterJump.currentInstruction).toContain("LAD GR2,1");
    expect(afterJump.visualPath).toBe(VisualPathKind.ConditionalJump_AddressToPr);

    const afterTarget = mockCaslCore.step(afterJump);
    expect(afterTarget.gr[2]).toBe(0x0001);
  });

  it("execute_jov_taken", () => {
    const afterJump = stepTimes(jovTakenSource, 3);

    expect(afterJump.pr).toBe(afterJump.symbols.OVER);
    expect(afterJump.visualPath).toBe(VisualPathKind.ConditionalJump_AddressToPr);
    const afterTarget = mockCaslCore.step(afterJump);
    expect(afterTarget.gr[2]).toBe(0x0001);
  });

  it("execute_jov_not_taken", () => {
    const afterJump = stepTimes(jovNotTakenSource, 3);

    expect(afterJump.pr).toBe(0x26);
    expect(afterJump.visualPath).toBe(VisualPathKind.ConditionalJump_NotTaken);
    const afterStore = mockCaslCore.step(afterJump);
    expect(afterStore.memory[afterStore.symbols.RESULT]).toBe(0x0003);
  });

  it("assemble_sla_sra_sll_srl", () => {
    const state = mockCaslCore.assemble(shiftSource);

    expect(state.runState).toBe("Ready");
    expect(state.memory[0x22]).toBe(0x5210);
    expect(state.memory[0x24]).toBe(0x5310);
    expect(state.memory[0x26]).toBe(0x5010);
    expect(state.memory[0x28]).toBe(0x5110);
    expect(state.sourceMap.find((row) => row.address === 0x22)?.instruction).toBe("SLL");
  });

  it("execute_sll_basic", () => {
    const state = stepTimes(`MAIN START
     LD    GR1,A
     SLL   GR1,1
     RET
A    DC    3
     END`, 2);

    expect(state.gr[1]).toBe(0x0006);
    expect(state.fr).toEqual({ z: false, c: false, n: false, o: false });
    expect(state.visualPath).toBe(VisualPathKind.Shift_AddressToAluToGr);
  });

  it("execute_srl_basic", () => {
    const state = stepTimes(`MAIN START
     LD    GR1,A
     SRL   GR1,1
     RET
A    DC    6
     END`, 2);

    expect(state.gr[1]).toBe(0x0003);
    expect(state.fr).toEqual({ z: false, c: false, n: false, o: false });
  });

  it("execute_sla_basic", () => {
    const state = stepTimes(`MAIN START
     LD    GR1,A
     SLA   GR1,1
     RET
A    DC    #8001
     END`, 2);

    expect(state.gr[1]).toBe(0x8002);
    expect(state.fr).toEqual({ z: false, c: false, n: true, o: false });
  });

  it("execute_sra_preserves_sign", () => {
    const state = stepTimes(`MAIN START
     LD    GR1,A
     SRA   GR1,1
     RET
A    DC    #8002
     END`, 2);

    expect(state.gr[1]).toBe(0xc001);
    expect(state.fr).toEqual({ z: false, c: false, n: true, o: false });
  });

  it("shift_updates_gr", () => {
    const state = stepTimes(shiftSource, 2);

    expect(state.gr[1]).toBe(0x0006);
    expect(state.changedRegisters).toEqual(expect.arrayContaining(["GR1", "FR"]));
  });

  it("shift_updates_fr_zero", () => {
    const state = stepTimes(`MAIN START
     LD    GR1,A
     SRL   GR1,1
     RET
A    DC    1
     END`, 2);

    expect(state.gr[1]).toBe(0x0000);
    expect(state.fr).toEqual({ z: true, c: false, n: false, o: true });
  });

  it("shift_updates_fr_overflow_when_bit_shifted_out", () => {
    const state = stepTimes(`MAIN START
     LD    GR1,A
     SLL   GR1,1
     RET
A    DC    #8000
     END`, 2);

    expect(state.gr[1]).toBe(0x0000);
    expect(state.fr.o).toBe(true);
  });

  it("shift_count_zero_no_change_except_fr_consistent", () => {
    const state = stepTimes(`MAIN START
     LD    GR1,A
     SLL   GR1,0
     RET
A    DC    #8001
     END`, 2);

    expect(state.gr[1]).toBe(0x8001);
    expect(state.fr).toEqual({ z: false, c: false, n: true, o: false });
  });

  it("shift_count_large_is_stable", () => {
    const logical = stepTimes(`MAIN START
     LD    GR1,A
     SLL   GR1,16
     RET
A    DC    #0001
     END`, 2);
    const arithmetic = stepTimes(`MAIN START
     LD    GR1,A
     SRA   GR1,16
     RET
A    DC    #8000
     END`, 2);

    expect(logical.gr[1]).toBe(0x0000);
    expect(arithmetic.gr[1]).toBe(0xffff);
  });

  it("shift_does_not_read_memory_as_data", () => {
    const state = stepTimes(`MAIN START
     LD    GR1,A
     SLL   GR1,1
     RET
A    DC    3
     END`, 2);

    expect(state.lastMemoryReadAddress).toBeUndefined();
    expect(state.changedRegisters).not.toContain("MDR");
    expect(state.mdr).toBe(0x0003);
  });

  it("trace_records_logic_instruction", () => {
    const state = stepTimes(logicSource, 2);

    expect(state.trace[0]).toEqual(expect.objectContaining({
      instruction: "AND",
      detail: expect.stringContaining("AND")
    }));
  });

  it("demo_logic_operations_runs", () => {
    const program = getDemoProgram("casl-logic-operations");
    expect(program).toBeDefined();
    let state = mockCaslCore.assemble(program!.source);
    for (let step = 0; step < 10 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[1]).toBe(0x0002);
    expect(state.memory[state.symbols.RESULT]).toBe(0x0002);
  });

  it("demo_logical_add_compare_runs", () => {
    const program = getDemoProgram("casl-logical-add-compare");
    expect(program).toBeDefined();
    let state = mockCaslCore.assemble(program!.source);
    for (let step = 0; step < 12 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.RESULT]).toBe(0x0003);
    expect(state.gr[1]).toBe(0x0003);
  });

  it("trace_records_shift_instruction", () => {
    const state = stepTimes(shiftSource, 2);

    expect(state.trace[0]).toEqual(expect.objectContaining({
      instruction: "SLL",
      detail: expect.stringContaining("shifted by")
    }));
  });

  it("demo_shift_operations_runs", () => {
    const program = getDemoProgram("casl-shift-operations");
    expect(program).toBeDefined();
    let state = mockCaslCore.assemble(program!.source);
    for (let step = 0; step < 12 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[1]).toBe(0x0003);
    expect(state.memory[state.symbols.RESULT]).toBe(0x0003);
  });

  it("assemble_push_address", () => {
    const state = mockCaslCore.assemble(pushPopSource);

    expect(state.runState).toBe("Ready");
    expect(state.memory[0x22]).toBe(0x7002);
    expect(state.memory[0x23]).toBe(state.symbols.A);
    expect(state.sourceMap.find((row) => row.address === 0x22)?.instruction).toBe("PUSH");
  });

  it("assemble_push_with_index_and_pop_register", () => {
    const state = mockCaslCore.assemble(pushPopSource);

    expect(state.memory[0x22]).toBe(0x7002);
    expect(state.memory[0x24]).toBe(0x7110);
    expect(state.sourceMap.find((row) => row.address === 0x24)?.instruction).toBe("POP");
  });

  it("reject_push_without_address", () => {
    const state = mockCaslCore.assemble(`MAIN START
     PUSH
     END`);

    expect(state.runState).toBe("Error");
    expect(state.diagnostics.map((diagnostic) => diagnostic.message).join(" ")).toContain("PUSH requires an address operand");
  });

  it("reject_pop_without_register_and_with_index", () => {
    const missing = mockCaslCore.assemble(`MAIN START
     POP
     END`);
    const indexed = mockCaslCore.assemble(`MAIN START
     POP   GR1,GR2
     END`);

    expect(missing.runState).toBe("Error");
    expect(indexed.runState).toBe("Error");
    expect(missing.diagnostics.map((diagnostic) => diagnostic.message).join(" ")).toContain("POP requires a register operand");
    expect(indexed.diagnostics.map((diagnostic) => diagnostic.message).join(" ")).toContain("POP does not support index operands");
  });

  it("execute_push_decrements_sp_and_writes_effective_address_to_stack", () => {
    const state = stepTimes(pushPopSource, 2);

    expect(state.sp).toBe(0xfffd);
    expect(state.memory[0xfffd]).toBe(state.symbols.B);
    expect(state.lastMemoryWriteAddress).toBe(0xfffd);
    expect(state.mdr).toBe(state.symbols.B);
    expect(state.fr).toEqual({ z: false, c: false, n: false, o: false });
    expect(state.visualPath).toBe(VisualPathKind.PUSH_EffectiveAddressToStack);
    expect(state.trace[0].detail).toContain("SP: FFFE -> FFFD");
  });

  it("execute_pop_reads_memory_at_sp_increments_sp_and_writes_target_register", () => {
    const state = stepTimes(pushPopSource, 3);

    expect(state.gr[1]).toBe(state.symbols.B);
    expect(state.sp).toBe(0xfffe);
    expect(state.lastMemoryReadAddress).toBe(0xfffd);
    expect(state.lastMemoryWriteAddress).toBeUndefined();
    expect(state.fr).toEqual({ z: false, c: false, n: false, o: false });
    expect(state.visualPath).toBe(VisualPathKind.POP_StackToGr);
    expect(state.trace[0].detail).toContain("Read MEM[FFFD]");
  });

  it("push_pop_round_trip_demo_runs", () => {
    const program = getDemoProgram("casl-push-pop-stack");
    expect(program).toBeDefined();
    let state = mockCaslCore.assemble(program!.source);
    for (let step = 0; step < 10 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[1]).toBe(state.symbols.B);
    expect(state.memory[state.symbols.RESULT]).toBe(state.symbols.B);
  });

  it("sp_wrap_behavior_is_stable", () => {
    let state = mockCaslCore.assemble(`MAIN START
     PUSH  VALUE
     POP   GR1
     RET
VALUE DC   1
     END`);
    state.sp = 0x0000;
    state = mockCaslCore.step(state);
    expect(state.sp).toBe(0xffff);
    expect(state.lastMemoryWriteAddress).toBe(0xffff);
    state = mockCaslCore.step(state);
    expect(state.sp).toBe(0x0000);
    expect(state.gr[1]).toBe(state.symbols.VALUE);
  });

  it("assemble_call", () => {
    const state = mockCaslCore.assemble(callReturnSource);

    expect(state.runState).toBe("Ready");
    expect(state.memory[0x22]).toBe(0x8000);
    expect(state.memory[0x23]).toBe(state.symbols.SUB);
    expect(state.sourceMap.find((row) => row.address === 0x22)?.instruction).toBe("CALL");
  });

  it("assemble_call_with_index", () => {
    const state = mockCaslCore.assemble(`MAIN START
     LAD   GR2,1
     CALL  SUB,GR2
     RET
SUB  RET
     END`);

    expect(state.runState).toBe("Ready");
    expect(state.memory[0x22]).toBe(0x8002);
  });

  it("reject_call_without_address", () => {
    const state = mockCaslCore.assemble(`MAIN START
     CALL
     END`);

    expect(state.runState).toBe("Error");
    expect(state.diagnostics.map((diagnostic) => diagnostic.message).join(" ")).toContain("CALL requires an address operand");
  });

  it("execute_call_pushes_return_address_and_jumps_to_target", () => {
    const state = stepTimes(callReturnSource, 2);

    expect(state.pr).toBe(state.symbols.SUB);
    expect(state.sp).toBe(0xfffd);
    expect(state.memory[0xfffd]).toBe(0x0024);
    expect(state.lastMemoryWriteAddress).toBe(0xfffd);
    expect(state.callDepth).toBe(1);
    expect(state.fr).toEqual({ z: false, c: false, n: false, o: false });
    expect(state.visualPath).toBe(VisualPathKind.CALL_ReturnAddressToStackAndPr);
    expect(state.trace[0].detail).toContain("return: 0024");
    expect(state.trace[0].detail).toContain("callDepth: 0 -> 1");
  });

  it("trace_call_row_shows_target_return_sp_depth", () => {
    const state = stepTimes(callReturnSource, 2);
    const trace = state.trace[0];

    expect(trace.instruction).toBe("CALL");
    expect(trace.detail).toContain("target: 0027");
    expect(trace.detail).toContain("return: 0024");
    expect(trace.detail).toContain("SP: FFFE -> FFFD");
    expect(trace.detail).toContain("MEM[FFFD]");
    expect(trace.detail).toContain("callDepth: 0 -> 1");
  });

  it("execute_call_with_index", () => {
    const source = `MAIN START
     LAD   GR2,1
     CALL  BASE,GR2
     LAD   GR1,9
     RET
BASE RET
SUB  LAD   GR1,7
     RET
     END`;
    const state = stepTimes(source, 2);

    expect(state.pr).toBe(state.symbols.BASE + 1);
    expect(state.callDepth).toBe(1);
    expect(state.memory[0xfffd]).toBe(0x0024);
  });

  it("execute_ret_with_call_depth_returns_to_stack_address", () => {
    const state = stepTimes(callReturnSource, 4);

    expect(state.pr).toBe(0x0024);
    expect(state.sp).toBe(0xfffe);
    expect(state.callDepth).toBe(0);
    expect(state.lastMemoryReadAddress).toBe(0xfffd);
    expect(state.visualPath).toBe(VisualPathKind.RET_StackToPr);
    expect(state.trace[0].detail).toContain("RET stack return");
  });

  it("trace_stack_ret_row_shows_memory_to_pr", () => {
    const state = stepTimes(callReturnSource, 4);
    const trace = state.trace[0];

    expect(trace.instruction).toBe("RET");
    expect(trace.detail).toContain("RET stack return");
    expect(trace.detail).toContain("MEM[FFFD]");
    expect(trace.detail).toContain("PR <- MEM[FFFD] = 0024");
    expect(trace.detail).toContain("SP: FFFD -> FFFE");
    expect(trace.detail).toContain("callDepth: 1 -> 0");
  });

  it("execute_ret_without_call_depth_finishes_program", () => {
    const state = stepTimes(nopSource, 2);

    expect(state.runState).toBe("Finished");
    expect(state.callDepth).toBe(0);
    expect(state.visualPath).toBe(VisualPathKind.Finished_None);
    expect(state.trace[0].detail).toContain("RET program finish");
  });

  it("trace_top_level_ret_row_shows_finish", () => {
    const state = stepTimes(nopSource, 2);

    expect(state.trace[0].instruction).toBe("RET");
    expect(state.trace[0].detail).toContain("RET program finish");
    expect(state.lastMemoryReadAddress).toBeUndefined();
    expect(state.lastMemoryWriteAddress).toBeUndefined();
  });

  it("nested_call_return_order", () => {
    const source = `MAIN START
     CALL  SUB
     ST    GR1,RESULT
     RET
SUB  CALL  INNER
     RET
INNER LAD   GR1,7
     RET
RESULT DS  1
     END`;
    let state = mockCaslCore.assemble(source);
    for (let step = 0; step < 12 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.callDepth).toBe(0);
    expect(state.gr[1]).toBe(7);
    expect(state.memory[state.symbols.RESULT]).toBe(7);
  });

  it("call_ret_does_not_update_fr", () => {
    const afterCall = stepTimes(callReturnSource, 2);
    const afterRet = stepTimes(callReturnSource, 4);

    expect(afterCall.fr).toEqual({ z: false, c: false, n: false, o: false });
    expect(afterRet.fr).toEqual({ z: false, c: false, n: false, o: false });
  });

  it("call_depth_resets_on_reset", () => {
    const state = mockCaslCore.reset(stepTimes(callReturnSource, 2));

    expect(state.callDepth).toBe(0);
    expect(state.sp).toBe(0xfffe);
  });

  it("manual_push_pop_does_not_change_call_depth", () => {
    const state = stepTimes(pushPopSource, 3);

    expect(state.callDepth).toBe(0);
  });

  it("call_return_demo_runs", () => {
    const program = getDemoProgram("casl-call-return");
    expect(program).toBeDefined();
    let state = mockCaslCore.assemble(program!.source);
    for (let step = 0; step < 12 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[1]).toBe(0x0006);
    expect(state.memory[state.symbols.RESULT]).toBe(0x0006);
    expect(state.callDepth).toBe(0);
  });

  it("nested_call_demo_runs_to_expected_result", () => {
    const program = getDemoProgram("casl-nested-call-return");
    expect(program).toBeDefined();
    let state = mockCaslCore.assemble(program!.source);
    for (let step = 0; step < 16 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[1]).toBe(0x0004);
    expect(state.memory[state.symbols.RESULT]).toBe(0x0004);
    expect(state.callDepth).toBe(0);
  });

  it("nested_call_depth_returns_to_zero", () => {
    const program = getDemoProgram("casl-nested-call-return");
    expect(program).toBeDefined();
    const afterFirstCall = stepTimes(program!.source, 2);
    const afterSecondCall = stepTimes(program!.source, 3);
    const afterSub2Ret = stepTimes(program!.source, 5);
    const finished = stepTimes(program!.source, 9);

    expect(afterFirstCall.callDepth).toBe(1);
    expect(afterSecondCall.callDepth).toBe(2);
    expect(afterSub2Ret.callDepth).toBe(1);
    expect(finished.callDepth).toBe(0);
    expect(finished.runState).toBe("Finished");
  });
});
