import { describe, expect, it } from "vitest";
import cpaEqual from "../../tests/golden/cpa.equal.json";
import gr2Step1 from "../../tests/golden/gr2.step1.json";
import jmiTaken from "../../tests/golden/jmi.taken.json";
import jumpTaken from "../../tests/golden/jump.taken.json";
import jzeNotTaken from "../../tests/golden/jze.not-taken.json";
import jzeTaken from "../../tests/golden/jze.taken.json";
import ladaStep1 from "../../tests/golden/lada.step1.json";
import simpleFinished from "../../tests/golden/simple.finished.json";
import simpleReady from "../../tests/golden/simple.ready.json";
import simpleStep1 from "../../tests/golden/simple.step1.json";
import simpleStep2 from "../../tests/golden/simple.step2.json";
import simpleStep3 from "../../tests/golden/simple.step3.json";
import subaStep1 from "../../tests/golden/suba.step1.json";
import { normalizeCoreStateForGolden, type CometStateDto } from "../core/coreDto";
import { DEFAULT_CASL_SOURCE, mockCaslCore } from "../core/mockCaslCore";

const gr2Source = `MAIN START
     LD    GR2,X
     ADDA  GR2,Y
     ST    GR2,Z
     RET
X    DC    3
Y    DC    4
Z    DS    1
     END`;

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

function expectGolden(actual: CometStateDto, expected: CometStateDto) {
  expect(actual).toEqual(expected);
}

function mockAfterSteps(source: string, steps: number): CometStateDto {
  let state = mockCaslCore.assemble(source);
  for (let index = 0; index < steps; index += 1) {
    state = mockCaslCore.step(state);
  }
  return normalizeCoreStateForGolden(state);
}

describe("core golden parity", () => {
  it("simple program ready matches golden", () => {
    const state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);

    expectGolden(normalizeCoreStateForGolden(state), simpleReady as CometStateDto);
  });

  it("simple program step1 matches golden", () => {
    const state = mockCaslCore.step(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    expectGolden(normalizeCoreStateForGolden(state), simpleStep1 as CometStateDto);
  });

  it("simple program step2 matches golden", () => {
    const ready = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const step1 = mockCaslCore.step(ready);
    const step2 = mockCaslCore.step(step1);

    expectGolden(normalizeCoreStateForGolden(step2), simpleStep2 as CometStateDto);
  });

  it("simple program step3 matches golden", () => {
    const ready = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const step1 = mockCaslCore.step(ready);
    const step2 = mockCaslCore.step(step1);
    const step3 = mockCaslCore.step(step2);

    expectGolden(normalizeCoreStateForGolden(step3), simpleStep3 as CometStateDto);
  });

  it("simple program finished matches golden", () => {
    let state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);

    expectGolden(normalizeCoreStateForGolden(state), simpleFinished as CometStateDto);
  });

  it("GR2 program step1 matches golden", () => {
    const state = mockCaslCore.step(mockCaslCore.assemble(gr2Source));

    expectGolden(normalizeCoreStateForGolden(state), gr2Step1 as CometStateDto);
  });

  it("LAD step1 matches golden", () => {
    expectGolden(mockAfterSteps(ladSource, 1), ladaStep1 as CometStateDto);
  });

  it("SUBA step matches golden", () => {
    expectGolden(mockAfterSteps(subaSource, 2), subaStep1 as CometStateDto);
  });

  it("CPA equal matches golden", () => {
    expectGolden(mockAfterSteps(cpaEqualSource, 2), cpaEqual as CometStateDto);
  });

  it("JUMP taken matches golden", () => {
    expectGolden(mockAfterSteps(jumpSource, 1), jumpTaken as CometStateDto);
  });

  it("JZE taken matches golden", () => {
    expectGolden(mockAfterSteps(jzeTakenSource, 3), jzeTaken as CometStateDto);
  });

  it("JZE not taken matches golden", () => {
    expectGolden(mockAfterSteps(jzeNotTakenSource, 3), jzeNotTaken as CometStateDto);
  });

  it("JMI taken matches golden", () => {
    expectGolden(mockAfterSteps(jmiTakenSource, 3), jmiTaken as CometStateDto);
  });
});
