import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../core/mockCaslCore";
import { VisualPathKind } from "../core/types";

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

function stepTimes(source: string, count: number) {
  let state = mockCaslCore.assemble(source);
  for (let index = 0; index < count; index += 1) {
    state = mockCaslCore.step(state);
  }
  return state;
}

describe("Phase 5A instruction expansion", () => {
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
});
