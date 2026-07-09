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
});
